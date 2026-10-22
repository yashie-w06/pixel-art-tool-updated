# PixelDesk

PixelDesk is a polished, browser-only pixel-art editor styled after classic desktop paint programs. Artwork is stored as an RGBA buffer, rendered with Canvas 2D, and autosaved locally with IndexedDB. No artwork leaves the browser.

## Setup and commands

Requires Node.js 20+ and pnpm.

```sh
pnpm install
pnpm dev
pnpm test
pnpm test:e2e
pnpm build
pnpm preview
```

## Features

- 1–256 px custom canvases plus 16×16, 32×32, and 64×64 presets
- Pencil, eraser, flood fill, eyedropper, touch-friendly pan, grid, fit, and zoom
- Gap-free pointer strokes and action-level undo/redo
- HEX picker, recent colors, and reusable palettes
- Debounced local autosave and versioned JSON project import/export
- Clean PNG export at 1×, 2×, 4×, or 8× with transparency or a chosen background
- Mouse, pen, touch, responsive controls, and accessible labels

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Pencil / eraser / fill / eyedropper | `B` / `E` / `F` / `I` |
| Undo / redo | `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` |
| Zoom | `+` / `-` |
| Temporary pan | Hold `Space` and drag |

Shortcuts are ignored while typing in an input.

## Local storage

Autosaves live in IndexedDB for this browser and origin. Clearing site data, using private browsing, or changing the GitHub Pages URL can remove or isolate autosaves. Download a `.pixeldesk.json` project for a portable backup. If IndexedDB fails, PixelDesk shows an error while project and PNG downloads remain available.

## GitHub Pages

The included workflow tests and builds on pushes to `main`, then deploys `dist` to Pages. In repository **Settings → Pages**, choose **GitHub Actions** as the source.

For a project site such as `https://owner.github.io/repository/`, set the repository path variable before building:

```sh
VITE_BASE_PATH=/repository/ pnpm build
```

The workflow derives this path automatically from the repository name. Use `/` for a root or custom-domain deployment. The local reference images are ignored and are not included in `dist`.
