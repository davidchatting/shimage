# shimage

Image shims for [p5.js](https://p5js.org/): small helpers for converting between `ImageBitmap`/`HTMLCanvasElement` and `p5.Image`, since p5 has no built-in way to load pixel data from those sources directly.

## Usage

```html
<script src="https://cdn.jsdelivr.net/gh/davidchatting/shimage@1.0.0/shimage.js"></script>
```

Pin to a version tag (`@1.0.0`) rather than `@main` so updates here can't silently change behaviour for existing consumers.

### `canvasToP5Image(canvas, p5img, options)`

Copies pixel data from a `<canvas>` into a `p5.Image`, resizing the `p5.Image` to match if needed. `options.flipX`/`options.flipY` optionally mirror the copy.

### `imageBitmapToP5Image(bitmap, image, options)`

Same, but from an `ImageBitmap` - draws it to a temporary canvas first, then calls `canvasToP5Image`.

## Versioning

Tagged with [semver](https://semver.org/). Originally developed inside [davidchatting/p5js-experiments](https://github.com/davidchatting/p5js-experiments) (`js/shimage.js`), which had no version numbers of its own - `1.0.0` here is the first tagged release.

## License

MIT - see [LICENSE](LICENSE).
