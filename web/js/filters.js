/* filters.js — photo enhancement: CSS-filter string, preset looks, sharpen kernel */
(function (PS) {
  PS.filterString = function (a, scale) {
    const f = [];
    if (a.brightness !== 100) f.push('brightness(' + a.brightness + '%)');
    if (a.contrast !== 100) f.push('contrast(' + a.contrast + '%)');
    if (a.saturation !== 100) f.push('saturate(' + a.saturation + '%)');
    if (a.grayscale) f.push('grayscale(' + a.grayscale + '%)');
    if (a.blur) f.push('blur(' + (a.blur * scale).toFixed(2) + 'px)');
    return f.length ? f.join(' ') : 'none';
  };
  PS.PRESETS = {
    None:    { brightness: 100, contrast: 100, saturation: 100, warmth: 0, sharpness: 0, grayscale: 0, blur: 0 },
    'B&W':   { brightness: 105, contrast: 115, saturation: 100, warmth: 0, sharpness: 20, grayscale: 100, blur: 0 },
    Vivid:   { brightness: 105, contrast: 112, saturation: 140, warmth: 5, sharpness: 25, grayscale: 0, blur: 0 },
    Warm:    { brightness: 105, contrast: 105, saturation: 110, warmth: 45, sharpness: 0, grayscale: 0, blur: 0 },
    Cool:    { brightness: 100, contrast: 105, saturation: 105, warmth: -45, sharpness: 0, grayscale: 0, blur: 0 },
    Fade:    { brightness: 112, contrast: 82, saturation: 85, warmth: 10, sharpness: 0, grayscale: 0, blur: 0 },
    Vintage: { brightness: 100, contrast: 90, saturation: 75, warmth: 55, sharpness: 0, grayscale: 15, blur: 0 },
    Drama:   { brightness: 92, contrast: 140, saturation: 115, warmth: -8, sharpness: 40, grayscale: 0, blur: 0 },
    Dreamy:  { brightness: 110, contrast: 92, saturation: 115, warmth: 15, sharpness: 0, grayscale: 0, blur: 1.5 }
  };
  /* 3x3 unsharp-style convolution, amount 0-100 */
  PS.sharpen = function (ctx, w, h, amount) {
    const a = amount / 100 * 1.2, src = ctx.getImageData(0, 0, w, h), d = src.data, o = new Uint8ClampedArray(d);
    const k = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        o[p + c] = k[4] * d[p + c] + k[1] * d[p - w * 4 + c] + k[3] * d[p - 4 + c] + k[5] * d[p + 4 + c] + k[7] * d[p + w * 4 + c];
      }
    }
    src.data.set(o); ctx.putImageData(src, 0, 0);
  };
})(window.PS);
