//shimage - image shims for p5js
//David Chatting - davidchatting.com -  29th January 2023

function imageBitmapToP5Image(bitmap, p5img, options = { flipX: false, flipY: false }) {
  let s = p5img.width / bitmap.width;

  //bitmap to canvas
  let tempCanvas = document.createElement('canvas');
  tempCanvas.id = 'tempCanvas';
  tempCanvas.width = bitmap.width * s;
  tempCanvas.height = bitmap.height * s;
  //tempCanvas.classList.add('hide');
  document.body.appendChild(tempCanvas);
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, bitmap.width * s, bitmap.height * s);

  canvasToP5Image(tempCanvas, p5img, options);
  tempCanvas.remove();
}

function canvasToP5Image(canvas, p5img, options = { flipX: false, flipY: false }) {
  if (!canvas || !p5img) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const src = ctx.getImageData(0, 0, w, h).data; // Uint8ClampedArray (RGBA, top-left origin)

  // ensure p5 image is correct size
  if (p5img.width !== w || p5img.height !== h) {
    p5img.resize(w, h);
  }

  p5img.loadPixels();
  const dst = p5img.pixels; // Uint8ClampedArray

  const flipX = !!options.flipX;
  const flipY = !!options.flipY;

  if (!flipX && !flipY) {
    // fast path: identical layout
    dst.set(src);
  } else {
    // copy with optional flips
    for (let y = 0; y < h; ++y) {
      const ty = flipY ? (h - 1 - y) : y;
      for (let x = 0; x < w; ++x) {
        const tx = flipX ? (w - 1 - x) : x;
        const sIdx = (ty * w + tx) * 4;
        const dIdx = (y * w + x) * 4;
        dst[dIdx]     = src[sIdx];
        dst[dIdx + 1] = src[sIdx + 1];
        dst[dIdx + 2] = src[sIdx + 2];
        dst[dIdx + 3] = src[sIdx + 3];
      }
    }
  }

  p5img.updatePixels();
}