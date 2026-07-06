# shimage

Image shims for [p5.js](https://p5js.org/): small helpers for converting between `ImageBitmap`/`HTMLCanvasElement`/`cv.Mat` and `p5.Image`, plus WEBGL texture helpers - things p5 has no built-in way to do directly.

## Usage

```html
<script src="https://cdn.jsdelivr.net/gh/davidchatting/shimage@1.2.0/shimage.js"></script>
```

Pin to a version tag (`@1.2.0`) rather than `@main` so updates here can't silently change behaviour for existing consumers. See [davidchatting/cdn](https://github.com/davidchatting/cdn) for other vendored libraries served the same way.

### `canvasToP5Image(canvas, p5img, options)`

Copies pixel data from a `<canvas>` into a `p5.Image`, resizing the `p5.Image` to match if needed. `options.flipX`/`options.flipY` optionally mirror the copy.

### `imageBitmapToP5Image(bitmap, p5img, options)`

Same, but from an `ImageBitmap` - draws it to a temporary canvas first, then calls `canvasToP5Image`.

### `cvMatToP5Image(mat, p5img)`

Same idea, but from an OpenCV.js `cv.Mat` - requires OpenCV.js (`cv`) to already be loaded.

### `getTextureFromElement(el)`

Converts an `HTMLImageElement` to a `p5.Graphics` usable as a WEBGL `texture()` source, using its natural pixel dimensions rather than `el.width`/`height` (which reflect CSS layout, and go wrong for hidden or CSS-sized images). Cached per element.

### `drawProjectedImage(srcImg, x, y, Hproj, zDepth)`

Draws `srcImg` as a texture warped by a flat 16-element row-major 4x4 matrix `Hproj`. Requires `applyTransform4x4` to be defined - typically via [davidchatting/opencv-featurematch](https://github.com/davidchatting/opencv-featurematch)'s `imgproc.js`.

## License

MIT - see [LICENSE](LICENSE).
