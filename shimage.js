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
// image space. Uses applyTransform4x4, defined below.
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

// -----------------------------------------------------------------------
// Matrix helpers - column-major flat 4x4 (index = col*4 + row), the same
// layout WebGL/OpenGL (and so p5.js's applyMatrix() in WEBGL mode) use
// natively. A column-major array is usable directly as applyMatrix(...M);
// no transpose/conversion step needed. Moved here from
// davidchatting/opencv-featurematch-js, which still uses these (and
// depends on this file for them) but no longer defines them itself.
// -----------------------------------------------------------------------

const identityMatrix = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

function applyTransform4x4(px, py, M) {
  if (!Array.isArray(M) || M.length !== 16) return [px, py];

  const X = M[0] * px + M[4] * py + M[8] * 0 + M[12];
  const Y = M[1] * px + M[5] * py + M[9] * 0 + M[13];
  const W = M[3] * px + M[7] * py + M[11] * 0 + M[15];

  if (!isFinite(W) || Math.abs(W) < 1e-12) return [X, Y];
  return [X / W, Y / W];
}

/**
 * Converts a flat 16-element column-major 4x4 matrix into the flat
 * 6-element array [a, b, c, d, e, f] that both the HTML5 canvas API's
 * setTransform() and p5.js's applyMatrix() (2D mode) expect, where:
 *   | a c e |
 *   | b d f |
 *   | 0 0 1 |
 * Only the matrix's 2D affine part (rotation/scale/shear/translation in the
 * XY plane) survives - any Z or perspective terms are dropped.
 * @param {Array} M - flat 16-element column-major 4x4 matrix
 * @returns {Array|null} - [a, b, c, d, e, f], or null if M isn't a flat 16-element array
 */
function to2dAffine(M) {
  if (!Array.isArray(M) || M.length !== 16) return null;
  return [M[0], M[1], M[4], M[5], M[12], M[13]];
}

/**
 * Multiplies two 4x4 column-major flat matrices and returns the literal
 * matrix product A * B. applyTransform4x4 applies a matrix to a column
 * vector (M * p), so to compose "apply A to a point first, then apply B to
 * the result" - i.e. B * (A * p) - call multiplyMatrix4x4(B, A), not (A, B).
 * @param {Array} A - flat 16-element column-major 4x4 matrix
 * @param {Array} B - flat 16-element column-major 4x4 matrix
 * @returns {Array} - flat 16-element column-major 4x4 matrix (A * B)
 */
function multiplyMatrix4x4(A, B) {
  let result = null;

  if (!A || A.length !== 16 || !B || B.length !== 16) {
  }
  else {
    result = new Array(16);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += A[k * 4 + row] * B[col * 4 + k];
        }
        result[col * 4 + row] = sum;
      }
    }
  }

  return result;
}

/**
 * Inverts a flat 6-element [a, b, c, d, e, f] 2D affine matrix - the same
 * shape to2dAffine() produces, and the one both the canvas API's
 * setTransform() and p5.js's applyMatrix() (2D mode) expect:
 *   | a c e |
 *   | b d f |
 *   | 0 0 1 |
 * @param {Array} M - flat 6-element [a, b, c, d, e, f] 2D affine matrix
 * @returns {Array|null} - flat 6-element [a, b, c, d, e, f] inverse, or null
 *   if M isn't a flat 6-element array or isn't invertible (det === 0)
 */
function invertMatrix2D(M) {
  if (!Array.isArray(M) || M.length !== 6) return null;

  const [a, b, c, d, e, f] = M;
  const det = a * d - b * c;
  if (det === 0) return null;

  const invDet = 1 / det;
  return [
    d * invDet, -b * invDet,
    -c * invDet, a * invDet,
    (c * f - d * e) * invDet, (b * e - a * f) * invDet
  ];
}

function invertMatrix4x4(A) {
  const inv = new Array(16);
  const det = determinant4x4(A);
  if (det === 0) {
    return null;
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      inv[j * 4 + i] = cofactor4x4(A, i, j) / det;
    }
  }
  return inv;
}

function determinant4x4(m) {
  if (!m || m.length !== 16) return null;

  // Helper for 3x3 determinant
  function det3(a, b, c, d, e, f, g, h, i) {
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }

  const m0 = m[0],  m1 = m[1],  m2 = m[2],  m3 = m[3],
        m4 = m[4],  m5 = m[5],  m6 = m[6],  m7 = m[7],
        m8 = m[8],  m9 = m[9],  m10 = m[10], m11 = m[11],
        m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];

  return (
    m0 * det3(m5, m6, m7,  m9, m10, m11,  m13, m14, m15)
    - m1 * det3(m4, m6, m7,  m8, m10, m11,  m12, m14, m15)
    + m2 * det3(m4, m5, m7,  m8, m9, m11,  m12, m13, m15)
    - m3 * det3(m4, m5, m6,  m8, m9, m10,  m12, m13, m14)
  );
}

function cofactor4x4(m, row, col) {
  // Build the 3x3 minor by skipping the given row and column
  const minor = [];
  for (let i = 0; i < 4; i++) {
    if (i === row) continue;
    for (let j = 0; j < 4; j++) {
      if (j === col) continue;
      minor.push(m[i * 4 + j]);
    }
  }
  // Compute the determinant of the 3x3 minor
  const det =
    minor[0] * (minor[4] * minor[8] - minor[5] * minor[7]) -
    minor[1] * (minor[3] * minor[8] - minor[5] * minor[6]) +
    minor[2] * (minor[3] * minor[7] - minor[4] * minor[6]);
  // Apply the checkerboard sign
  return ((row + col) % 2 === 0 ? 1 : -1) * det;
}