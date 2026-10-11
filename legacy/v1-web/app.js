/* Charlie MJ PhotoStory — offline canvas photo-grid editor
   No backend, no accounts. Everything happens in the browser. */

const EXPORT_W = 1080, EXPORT_H = 1920;
const FONTS = ["Arial","Georgia","Times New Roman","Courier New","Verdana","Trebuchet MS","Impact","Comic Sans MS"];

const previewCanvas = document.getElementById("previewCanvas");
const exportCanvas  = document.getElementById("exportCanvas");
const pctx = previewCanvas.getContext("2d");
const fileInput = document.getElementById("fileInput");
const projectInput = document.getElementById("projectInput");
const propContent = document.getElementById("propContent");

function defaultCell(){
  return {src:null, img:null, offX:0, offY:0, zoom:1, rotation:0, flipH:false, flipV:false,
          brightness:100, contrast:100, saturation:100, grayscale:0};
}
function cellsForTemplate(tmpl, existing){
  const count = tmpl === "2x3" ? 6 : 4;
  const cells = [];
  for(let i=0;i<count;i++) cells.push((existing && existing[i]) ? existing[i] : defaultCell());
  return cells;
}
function gridDims(tmpl){ return tmpl === "2x3" ? {cols:2, rows:3} : {cols:2, rows:2}; }

let state = {
  template: "2x2",
  cells: cellsForTemplate("2x2"),
  texts: []
};
let selected = {type:null, index:null}; // type: 'cell' | 'text'
let pendingCellForFile = null;

/* ---------- History (undo/redo) ---------- */
let history = [], historyIndex = -1;
function snapshot(){
  return JSON.stringify({
    template: state.template,
    cells: state.cells.map(c => ({...c, img: undefined})),
    texts: state.texts
  });
}
function pushHistory(){
  history = history.slice(0, historyIndex + 1);
  history.push(snapshot());
  if(history.length > 60) history.shift();
  historyIndex = history.length - 1;
}
function restoreFromSnapshot(json){
  const data = JSON.parse(json);
  state.template = data.template;
  state.texts = data.texts;
  const cells = data.cells;
  let toLoad = cells.filter(c => c.src).length;
  if(toLoad === 0){
    state.cells = cells.map(c => ({...c, img:null}));
    render(); buildPropertyPanel();
    return;
  }
  state.cells = cells.map(c => ({...c, img:null}));
  cells.forEach((c, i) => {
    if(!c.src) return;
    const img = new Image();
    img.onload = () => { state.cells[i].img = img; toLoad--; if(toLoad===0){ render(); } };
    img.src = c.src;
  });
  buildPropertyPanel();
}
function undo(){ if(historyIndex>0){ historyIndex--; restoreFromSnapshot(history[historyIndex]); } }
function redo(){ if(historyIndex<history.length-1){ historyIndex++; restoreFromSnapshot(history[historyIndex]); } }

/* ---------- Rendering ---------- */
function cellRects(tmpl, W, H){
  const {cols, rows} = gridDims(tmpl);
  const gap = Math.round(W * 0.012);
  const cw = (W - gap*(cols+1)) / cols;
  const ch = (H - gap*(rows+1)) / rows;
  const rects = [];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      rects.push({x: gap + c*(cw+gap), y: gap + r*(ch+gap), w: cw, h: ch});
    }
  }
  return rects;
}

function renderToContext(ctx, W, H, interactive){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "#0c0c0f";
  ctx.fillRect(0,0,W,H);

  const rects = cellRects(state.template, W, H);
  rects.forEach((rect, i) => {
    const cell = state.cells[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    if(cell.img){
      ctx.filter = `brightness(${cell.brightness}%) contrast(${cell.contrast}%) saturate(${cell.saturation}%) grayscale(${cell.grayscale}%)`;
      const iw = cell.img.naturalWidth, ih = cell.img.naturalHeight;
      const baseScale = Math.max(rect.w/iw, rect.h/ih);
      const scale = baseScale * cell.zoom;
      const dw = iw*scale, dh = ih*scale;
      ctx.translate(rect.x + rect.w/2, rect.y + rect.h/2);
      const rot = (cell.rotation||0) * Math.PI/180;
      ctx.rotate(rot);
      ctx.scale(cell.flipH?-1:1, cell.flipV?-1:1);
      ctx.drawImage(cell.img, -dw/2 + cell.offX*rect.w, -dh/2 + cell.offY*rect.h, dw, dh);
      ctx.filter = "none";
    } else {
      ctx.fillStyle = "#1c1c21";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "#3a3a42";
      ctx.lineWidth = Math.max(2, W*0.002);
      ctx.setLineDash([8,6]);
      ctx.strokeRect(rect.x+2, rect.y+2, rect.w-4, rect.h-4);
      ctx.setLineDash([]);
      if(interactive){
        ctx.fillStyle = "#5a5a64";
        ctx.font = `${Math.round(rect.w*0.16)}px Arial`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("+", rect.x+rect.w/2, rect.y+rect.h/2);
      }
    }
    ctx.restore();

    if(interactive && selected.type==="cell" && selected.index===i){
      ctx.save();
      ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 3;
      ctx.strokeRect(rect.x+1.5, rect.y+1.5, rect.w-3, rect.h-3);
      ctx.restore();
    }
  });

  // texts
  state.texts.forEach((t, i) => {
    ctx.save();
    const x = t.x*W, y = t.y*H;
    ctx.translate(x, y);
    ctx.rotate((t.rotation||0)*Math.PI/180);
    const fs = t.fontSize * (W/EXPORT_W);
    ctx.font = `${t.italic?"italic ":""}${t.bold?"bold ":""}${fs}px "${t.fontFamily}"`;
    ctx.fillStyle = t.color;
    ctx.textAlign = t.align; ctx.textBaseline = "middle";
    const lines = String(t.content).split("\n");
    lines.forEach((line, li) => ctx.fillText(line, 0, (li - (lines.length-1)/2) * fs*1.2));
    ctx.restore();

    if(interactive && selected.type==="text" && selected.index===i){
      const metrics = measureTextBlock(ctx, t, fs);
      ctx.save();
      ctx.strokeStyle = "#ff5c8a"; ctx.lineWidth = 2; ctx.setLineDash([5,4]);
      ctx.strokeRect(x - metrics.w/2 - 6, y - metrics.h/2 - 6, metrics.w+12, metrics.h+12);
      ctx.setLineDash([]);
      ctx.restore();
    }
  });
}
function measureTextBlock(ctx, t, fs){
  ctx.font = `${t.italic?"italic ":""}${t.bold?"bold ":""}${fs}px "${t.fontFamily}"`;
  const lines = String(t.content).split("\n");
  let w = 0; lines.forEach(l => w = Math.max(w, ctx.measureText(l).width));
  return {w, h: lines.length*fs*1.2};
}
function render(){ renderToContext(pctx, previewCanvas.width, previewCanvas.height, true); }

/* ---------- Property panel ---------- */
function buildPropertyPanel(){
  propContent.innerHTML = "";
  if(selected.type === "cell"){
    const cell = state.cells[selected.index];
    if(!cell || !cell.img){ propContent.innerHTML = `<div class="prop-empty">This cell is empty. Click it on the canvas to add a photo.</div>`; return; }
    propContent.appendChild(sliderField("Zoom", cell.zoom, 1, 4, 0.01, v => { cell.zoom = v; render(); }, true));
    propContent.appendChild(sliderField("Brightness", cell.brightness, 40, 160, 1, v => { cell.brightness = v; render(); }, true));
    propContent.appendChild(sliderField("Contrast", cell.contrast, 40, 160, 1, v => { cell.contrast = v; render(); }, true));
    propContent.appendChild(sliderField("Saturation", cell.saturation, 0, 200, 1, v => { cell.saturation = v; render(); }, true));
    propContent.appendChild(sliderField("Grayscale", cell.grayscale, 0, 100, 1, v => { cell.grayscale = v; render(); }, true));
  } else if(selected.type === "text"){
    const t = state.texts[selected.index];
    if(!t) return;
    const wrap = document.createElement("div");

    const ta = document.createElement("div"); ta.className="field";
    ta.innerHTML = `<label>Text</label>`;
    const textarea = document.createElement("textarea"); textarea.value = t.content;
    textarea.oninput = () => { t.content = textarea.value; render(); };
    textarea.onblur = () => pushHistory();
    ta.appendChild(textarea); wrap.appendChild(ta);

    const fontField = document.createElement("div"); fontField.className="field";
    fontField.innerHTML = `<label>Font</label>`;
    const sel = document.createElement("select");
    FONTS.forEach(f => { const o=document.createElement("option"); o.value=f; o.textContent=f; if(f===t.fontFamily) o.selected=true; sel.appendChild(o); });
    sel.onchange = () => { t.fontFamily = sel.value; render(); pushHistory(); };
    fontField.appendChild(sel); wrap.appendChild(fontField);

    wrap.appendChild(sliderField("Size", t.fontSize, 20, 200, 1, v => { t.fontSize = v; render(); }, true));

    const colorField = document.createElement("div"); colorField.className="field";
    colorField.innerHTML = `<label>Color</label>`;
    const colorInput = document.createElement("input"); colorInput.type="color"; colorInput.value = t.color;
    colorInput.oninput = () => { t.color = colorInput.value; render(); };
    colorInput.onchange = () => pushHistory();
    colorField.appendChild(colorInput); wrap.appendChild(colorField);

    const styleField = document.createElement("div"); styleField.className="field";
    styleField.innerHTML = `<label>Style</label>`;
    const row = document.createElement("div"); row.className="toggle-row";
    const bBtn = toggleBtn("B", t.bold, () => { t.bold=!t.bold; render(); pushHistory(); buildPropertyPanel(); });
    const iBtn = toggleBtn("I", t.italic, () => { t.italic=!t.italic; render(); pushHistory(); buildPropertyPanel(); });
    row.appendChild(bBtn); row.appendChild(iBtn);
    styleField.appendChild(row); wrap.appendChild(styleField);

    const alignField = document.createElement("div"); alignField.className="field";
    alignField.innerHTML = `<label>Align</label>`;
    const arow = document.createElement("div"); arow.className="toggle-row";
    ["left","center","right"].forEach(a => arow.appendChild(toggleBtn(a[0].toUpperCase(), t.align===a, () => { t.align=a; render(); pushHistory(); buildPropertyPanel(); })));
    alignField.appendChild(arow); wrap.appendChild(alignField);

    propContent.appendChild(wrap);
  } else {
    propContent.innerHTML = `<div class="prop-empty">Select a photo or a text box to edit its properties.</div>`;
  }
}
function sliderField(label, value, min, max, step, onInput, pushOnEnd){
  const f = document.createElement("div"); f.className="field";
  f.innerHTML = `<label>${label}</label>`;
  const input = document.createElement("input");
  input.type="range"; input.min=min; input.max=max; input.step=step; input.value=value;
  input.oninput = () => onInput(parseFloat(input.value));
  if(pushOnEnd) input.onchange = () => pushHistory();
  f.appendChild(input);
  return f;
}
function toggleBtn(label, active, onClick){
  const b = document.createElement("button");
  b.textContent = label; if(active) b.classList.add("active");
  b.onclick = onClick;
  return b;
}

/* ---------- Selection / hit-testing (preview space) ---------- */
function hitTestText(px, py){
  for(let i=state.texts.length-1;i>=0;i--){
    const t = state.texts[i];
    const fs = t.fontSize * (previewCanvas.width/EXPORT_W);
    const m = measureTextBlock(pctx, t, fs);
    const x = t.x*previewCanvas.width, y = t.y*previewCanvas.height;
    if(px >= x-m.w/2-8 && px <= x+m.w/2+8 && py >= y-m.h/2-8 && py <= y+m.h/2+8) return i;
  }
  return -1;
}
function hitTestCell(px, py){
  const rects = cellRects(state.template, previewCanvas.width, previewCanvas.height);
  for(let i=0;i<rects.length;i++){
    const r = rects[i];
    if(px>=r.x && px<=r.x+r.w && py>=r.y && py<=r.y+r.h) return i;
  }
  return -1;
}
function toCanvasCoords(evt){
  const rect = previewCanvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (previewCanvas.width/rect.width);
  const y = (evt.clientY - rect.top) * (previewCanvas.height/rect.height);
  return {x,y};
}

let drag = null; // {mode:'text'|'photo', index, startX, startY, orig}
previewCanvas.addEventListener("mousedown", e => {
  const {x,y} = toCanvasCoords(e);
  const ti = hitTestText(x,y);
  if(ti >= 0){
    selected = {type:"text", index:ti};
    drag = {mode:"text", index:ti, startX:x, startY:y, orig:{x:state.texts[ti].x, y:state.texts[ti].y}};
    buildPropertyPanel(); render();
    return;
  }
  const ci = hitTestCell(x,y);
  if(ci >= 0){
    const cell = state.cells[ci];
    if(cell.img){
      selected = {type:"cell", index:ci};
      const rects = cellRects(state.template, previewCanvas.width, previewCanvas.height);
      drag = {mode:"photo", index:ci, startX:x, startY:y, orig:{offX:cell.offX, offY:cell.offY}, rect:rects[ci]};
      buildPropertyPanel(); render();
    } else {
      selected = {type:"cell", index:ci};
      pendingCellForFile = ci;
      fileInput.click();
      buildPropertyPanel(); render();
    }
  }
});
window.addEventListener("mousemove", e => {
  if(!drag) return;
  const {x,y} = toCanvasCoords(e);
  if(drag.mode === "text"){
    const t = state.texts[drag.index];
    t.x = drag.orig.x + (x-drag.startX)/previewCanvas.width;
    t.y = drag.orig.y + (y-drag.startY)/previewCanvas.height;
    render();
  } else if(drag.mode === "photo"){
    const cell = state.cells[drag.index];
    cell.offX = drag.orig.offX + (x-drag.startX)/drag.rect.w;
    cell.offY = drag.orig.offY + (y-drag.startY)/drag.rect.h;
    render();
  }
});
window.addEventListener("mouseup", () => { if(drag){ drag=null; pushHistory(); } });

previewCanvas.addEventListener("wheel", e => {
  const {x,y} = toCanvasCoords(e);
  const ci = hitTestCell(x,y);
  if(ci < 0 || !state.cells[ci].img) return;
  e.preventDefault();
  const cell = state.cells[ci];
  cell.zoom = Math.min(4, Math.max(1, cell.zoom - e.deltaY*0.001));
  selected = {type:"cell", index:ci};
  buildPropertyPanel(); render();
}, {passive:false});

let wheelTimer = null;
previewCanvas.addEventListener("wheel", () => {
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(pushHistory, 300);
});

previewCanvas.addEventListener("dragover", e => e.preventDefault());
previewCanvas.addEventListener("drop", e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if(!file || !file.type.startsWith("image/")) return;
  const {x,y} = toCanvasCoords(e);
  const ci = hitTestCell(x,y);
  if(ci < 0) return;
  loadImageIntoCell(file, ci);
});

/* ---------- Photo loading ---------- */
function loadImageIntoCell(file, index){
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const cell = defaultCell();
      cell.src = reader.result; cell.img = img;
      state.cells[index] = cell;
      selected = {type:"cell", index};
      buildPropertyPanel(); render(); pushHistory();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if(file && pendingCellForFile !== null) loadImageIntoCell(file, pendingCellForFile);
  fileInput.value = "";
  pendingCellForFile = null;
});

/* ---------- Toolbar actions ---------- */
document.querySelectorAll(".tmpl-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tmpl-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    state.cells = cellsForTemplate(btn.dataset.tmpl, state.cells);
    state.template = btn.dataset.tmpl;
    selected = {type:null,index:null};
    buildPropertyPanel(); render(); pushHistory();
  });
});
document.getElementById("btnAddPhoto").addEventListener("click", () => {
  let idx = selected.type==="cell" ? selected.index : state.cells.findIndex(c=>!c.img);
  if(idx < 0){ alert("Grid is full. Remove a photo first, or select one to replace."); return; }
  pendingCellForFile = idx; fileInput.click();
});
document.getElementById("btnRemovePhoto").addEventListener("click", () => {
  if(selected.type!=="cell") { alert("Select a photo cell first."); return; }
  state.cells[selected.index] = defaultCell();
  buildPropertyPanel(); render(); pushHistory();
});
document.getElementById("btnRotate").addEventListener("click", () => {
  if(selected.type!=="cell" || !state.cells[selected.index].img) return;
  const c = state.cells[selected.index]; c.rotation = ((c.rotation||0)+90)%360;
  render(); pushHistory();
});
document.getElementById("btnFlipH").addEventListener("click", () => {
  if(selected.type!=="cell" || !state.cells[selected.index].img) return;
  state.cells[selected.index].flipH = !state.cells[selected.index].flipH; render(); pushHistory();
});
document.getElementById("btnFlipV").addEventListener("click", () => {
  if(selected.type!=="cell" || !state.cells[selected.index].img) return;
  state.cells[selected.index].flipV = !state.cells[selected.index].flipV; render(); pushHistory();
});
document.getElementById("btnResetCell").addEventListener("click", () => {
  if(selected.type!=="cell" || !state.cells[selected.index].img) return;
  const c = state.cells[selected.index];
  c.offX=0; c.offY=0; c.zoom=1; c.rotation=0; c.flipH=false; c.flipV=false;
  buildPropertyPanel(); render(); pushHistory();
});
document.getElementById("btnAddText").addEventListener("click", () => {
  state.texts.push({content:"Your text", x:0.5, y:0.5, fontSize:64, fontFamily:"Arial", color:"#ffffff", bold:true, italic:false, align:"center", rotation:0});
  selected = {type:"text", index: state.texts.length-1};
  buildPropertyPanel(); render(); pushHistory();
});
document.getElementById("btnDeleteText").addEventListener("click", () => {
  if(selected.type!=="text") return;
  state.texts.splice(selected.index,1);
  selected = {type:null,index:null};
  buildPropertyPanel(); render(); pushHistory();
});
document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnRedo").addEventListener("click", redo);
window.addEventListener("keydown", e => {
  const tag = document.activeElement.tagName;
  if(tag==="TEXTAREA" || tag==="INPUT") return;
  if((e.ctrlKey||e.metaKey) && e.key==="z"){ e.preventDefault(); undo(); }
  if((e.ctrlKey||e.metaKey) && (e.key==="y" || (e.shiftKey&&e.key==="Z"))){ e.preventDefault(); redo(); }
  if(e.key==="Delete" || e.key==="Backspace"){
    if(selected.type==="text"){ state.texts.splice(selected.index,1); selected={type:null,index:null}; buildPropertyPanel(); render(); pushHistory(); }
    else if(selected.type==="cell"){ state.cells[selected.index]=defaultCell(); buildPropertyPanel(); render(); pushHistory(); }
  }
});

/* ---------- New / Save / Open / Export ---------- */
document.getElementById("btnNew").addEventListener("click", () => {
  if(!confirm("Start a new project? Unsaved changes will be lost.")) return;
  state = {template:"2x2", cells: cellsForTemplate("2x2"), texts: []};
  selected = {type:null,index:null};
  document.querySelectorAll(".tmpl-btn").forEach(b=>b.classList.toggle("active", b.dataset.tmpl==="2x2"));
  buildPropertyPanel(); render(); pushHistory();
});
document.getElementById("btnSave").addEventListener("click", () => {
  const data = { template: state.template, cells: state.cells.map(c => ({...c, img:undefined})), texts: state.texts };
  const blob = new Blob([JSON.stringify(data)], {type:"application/json"});
  downloadBlob(blob, "CharlieMJ-Project.cmjproj.json");
});
document.getElementById("btnOpen").addEventListener("click", () => projectInput.click());
projectInput.addEventListener("change", () => {
  const file = projectInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      restoreFromSnapshot(reader.result);
      document.querySelectorAll(".tmpl-btn").forEach(b=>b.classList.toggle("active", b.dataset.tmpl===state.template));
      pushHistory();
    } catch(err){ alert("Could not read this project file."); }
  };
  reader.readAsText(file);
  projectInput.value = "";
});
document.getElementById("btnExport").addEventListener("click", () => {
  const ectx = exportCanvas.getContext("2d");
  renderToContext(ectx, EXPORT_W, EXPORT_H, false);
  exportCanvas.toBlob(blob => downloadBlob(blob, "CharlieMJ-Story.jpg"), "image/jpeg", 0.95);
});
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

/* ---------- Init ---------- */
document.querySelector('.tmpl-btn[data-tmpl="2x2"]').classList.add("active");
render();
pushHistory();
