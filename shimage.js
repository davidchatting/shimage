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

// Requires OpenCV.js (cv) to be loaded - converts a cv.Mat to a p5.Image via a
// temporary canvas and cv.imshow().
function cvMatToP5Image(mat, image) {
  //mat to canvas
  let tempCanvas = document.createElement('canvas');
  tempCanvas.id = 'tempCanvas';
  tempCanvas.classList.add('hide');
  document.body.appendChild(tempCanvas);

  let resultSize = mat.size();
  tempCanvas.width = resultSize.width;
  tempCanvas.height = resultSize.height;

  cv.imshow('tempCanvas', mat);

  canvasToP5Image(tempCanvas, image, { flipX: false, flipY: false });
  tempCanvas.remove();
}

// cache for converted images (HTMLImageElement -> p5.Graphics)
const textureCache = new WeakMap();

// Converts an HTMLImageElement to a p5.Graphics usable as a WEBGL texture()
// source, using its natural pixel dimensions rather than el.width/height -
// which reflect CSS layout, and go wrong for hidden or CSS-sized images
// (naturalWidth/naturalHeight are the actual decoded image dimensions,
// unaffected by display:none or visibility:hidden).
function getTextureFromElement(el) {
  if (!el) return null;

  const w = el.naturalWidth || el.width;
  const h = el.naturalHeight || el.height;

  // check cache first
  if (textureCache.has(el)) {
    const cached = textureCache.get(el);
    // check if image size changed (unlikely but safe)
    if (cached.width === w && cached.height === h) {
      return cached;
    }
    // size changed, remove old and recreate
    cached.remove();
  }

  // convert HTMLImageElement to p5.Graphics
  const g = createGraphics(w, h);
  g.drawingContext.drawImage(el, 0, 0);
  textureCache.set(el, g);
  return g;
}

// Draws a textured quad: srcImg projected by homography Hproj into target
// image space. Requires applyTransform4x4 to be defined - typically via
// davidchatting/opencv-featurematch's imgproc.js.
function drawProjectedImage(srcImg, x, y, Hproj, zDepth = 0) {
  if (!srcImg || !Hproj) return;

  const img = getTextureFromElement(srcImg);
  if (!img) return;

  const w = img.width, h = img.height;
  const corners = [0, 0, w, 0, w, h, 0, h];
  // project corners into target image pixel coords (corners is a flat array [x0,y0,...])
  const dst = [];
  for (let i = 0; i < corners.length; i += 2) {
    const p = applyTransform4x4(corners[i], corners[i + 1], Hproj) || [0, 0];
    dst.push(p[0] + x, p[1] + y);
  }
  // draw textured polygon in WEBGL using normalized texture coords (0..1)
  push();
    noStroke();
    texture(img);
    beginShape();
      // vertex(x, y, z, u, v)
      vertex(dst[0], dst[1], zDepth, 0, 0);
      vertex(dst[2], dst[3], zDepth, 1, 0);
      vertex(dst[4], dst[5], zDepth, 1, 1);
      vertex(dst[6], dst[7], zDepth, 0, 1);
    endShape(CLOSE);
  pop();
}