# shimage

Image shims for [p5.js](https://p5js.org/): small helpers for converting between `ImageBitmap`/`HTMLCanvasElement`/`cv.Mat` and `p5.Image`, WEBGL texture helpers, and column-major 4x4/2D matrix math - things p5 has no built-in way to do directly.

## Usage

```html
<script src="https://cdn.jsdelivr.net/gh/davidchatting/shimage@1.3.0/shimage.js"></script>
```

Pin to a version tag (`@1.3.0`) rather than `@main` so updates here can't silently change behaviour for existing consumers. See [davidchatting/cdn](https://github.com/davidchatting/cdn) for other vendored libraries served the same way.

### `canvasToP5Image(canvas, p5img, options)`

Copies pixel data from a `<canvas>` into a `p5.Image`, resizing the `p5.Image` to match if needed. `options.flipX`/`options.flipY` optionally mirror the copy.

### `imageBitmapToP5Image(bitmap, p5img, options)`

Same, but from an `ImageBitmap` - draws it to a temporary canvas first, then calls `canvasToP5Image`.

### `cvMatToP5Image(mat, p5img)`

Same idea, but from an OpenCV.js `cv.Mat` - requires OpenCV.js (`cv`) to already be loaded.

### `getTextureFromElement(el)`

Converts an `HTMLImageElement` to a `p5.Graphics` usable as a WEBGL `texture()` source, using its natural pixel dimensions rather than `el.width`/`height` (which reflect CSS layout, and go wrong for hidden or CSS-sized images). Cached per element.

### `drawProjectedImage(srcImg, x, y, Hproj, zDepth)`

Draws `srcImg` as a texture warped by a flat 16-element column-major 4x4 matrix `Hproj` (see the matrix helpers below).

## Matrix helpers

Column-major flat 4x4 (`index = col*4 + row`) - the same layout WebGL/OpenGL (and so p5.js's `applyMatrix()` in WEBGL mode) use natively. A column-major array is usable directly as `applyMatrix(...M)`, no transpose/conversion step needed.

### `identityMatrix`

The flat 16-element identity matrix.

### `applyTransform4x4(px, py, M)`

Applies `M` to a point, returning `[x, y]` (after perspective divide, if `M` has a non-affine bottom row).

### `multiplyMatrix4x4(A, B)`

Returns the matrix product `A * B`. Since `applyTransform4x4` applies a matrix to a column vector (`M * p`), composing "apply A first, then B" means calling `multiplyMatrix4x4(B, A)`, not `(A, B)`.

### `invertMatrix4x4(A)`

Inverts a flat 16-element column-major 4x4 matrix, via cofactor expansion. Returns `null` if `A` isn't invertible.

### `to2dAffine(M)`

Converts a flat 16-element column-major 4x4 matrix into the flat 6-element `[a, b, c, d, e, f]` array that both the canvas API's `setTransform()` and p5.js's `applyMatrix()` (2D mode) expect. Only the matrix's 2D affine part survives - any Z or perspective terms are dropped.

### `invertMatrix2D(M)`

Inverts a flat 6-element `[a, b, c, d, e, f]` 2D affine matrix - the same shape `to2dAffine()` produces. Returns `null` if `M` isn't invertible.

## License

MIT - see [LICENSE](LICENSE).
