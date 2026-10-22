export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'pan'
export type Point = { x: number; y: number }
export type Palette = { name: string; colors: string[] }

export interface ProjectData {
  version: 1
  name: string
  width: number
  height: number
  pixels: number[]
  palettes: Palette[]
  updatedAt: string
}

export const MAX_SIZE = 256
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export function pixelOffset(width: number, x: number, y: number) {
  return (y * width + x) * 4
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(clean)) throw new Error('Use a 6-digit HEX color.')
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16), 255]
}

export function rgbaToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function getPixel(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = pixelOffset(width, x, y)
  return pixels.slice(offset, offset + 4)
}

export function setPixel(pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number, rgba: ArrayLike<number>) {
  if (x < 0 || y < 0 || x >= width || y >= height) return false
  const offset = pixelOffset(width, x, y)
  const changed = pixels[offset] !== rgba[0] || pixels[offset + 1] !== rgba[1] || pixels[offset + 2] !== rgba[2] || pixels[offset + 3] !== rgba[3]
  pixels[offset] = rgba[0]
  pixels[offset + 1] = rgba[1]
  pixels[offset + 2] = rgba[2]
  pixels[offset + 3] = rgba[3]
  return changed
}

export function linePoints(from: Point, to: Point): Point[] {
  const points: Point[] = []
  let x = from.x
  let y = from.y
  const dx = Math.abs(to.x - x)
  const sx = x < to.x ? 1 : -1
  const dy = -Math.abs(to.y - y)
  const sy = y < to.y ? 1 : -1
  let error = dx + dy
  while (true) {
    points.push({ x, y })
    if (x === to.x && y === to.y) break
    const e2 = error * 2
    if (e2 >= dy) { error += dy; x += sx }
    if (e2 <= dx) { error += dx; y += sy }
  }
  return points
}

export function paintLine(pixels: Uint8ClampedArray, width: number, height: number, from: Point, to: Point, rgba: ArrayLike<number>) {
  let changed = false
  for (const point of linePoints(from, to)) changed = setPixel(pixels, width, height, point.x, point.y, rgba) || changed
  return changed
}

export function floodFill(pixels: Uint8ClampedArray, width: number, height: number, start: Point, replacement: ArrayLike<number>) {
  if (start.x < 0 || start.y < 0 || start.x >= width || start.y >= height) return false
  const startOffset = pixelOffset(width, start.x, start.y)
  const target = [pixels[startOffset], pixels[startOffset + 1], pixels[startOffset + 2], pixels[startOffset + 3]]
  if (target.every((value, index) => value === replacement[index])) return false
  const matches = (offset: number) => target.every((value, index) => pixels[offset + index] === value)
  const seen = new Uint8Array(width * height)
  const stack: number[] = [start.y * width + start.x]
  while (stack.length) {
    const index = stack.pop()!
    if (seen[index]) continue
    seen[index] = 1
    const offset = index * 4
    if (!matches(offset)) continue
    pixels.set(replacement, offset)
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) stack.push(index - 1)
    if (x < width - 1) stack.push(index + 1)
    if (y > 0) stack.push(index - width)
    if (y < height - 1) stack.push(index + width)
  }
  return true
}

export function validateProject(value: unknown): ProjectData {
  if (!value || typeof value !== 'object') throw new Error('This is not a PixelDesk project.')
  const data = value as Partial<ProjectData>
  if (data.version !== 1) throw new Error('Unsupported project version.')
  if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width! < 1 || data.height! < 1 || data.width! > MAX_SIZE || data.height! > MAX_SIZE) {
    throw new Error('Project dimensions must be between 1 and 256 pixels.')
  }
  if (!Array.isArray(data.pixels) || data.pixels.length !== data.width! * data.height! * 4 || data.pixels.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error('Pixel data is missing or malformed.')
  }
  const palettes = Array.isArray(data.palettes)
    ? data.palettes.filter((p): p is Palette => Boolean(p && typeof p.name === 'string' && Array.isArray(p.colors) && p.colors.every((c) => /^#[\da-f]{6}$/i.test(c)))).slice(0, 20)
    : []
  return {
    version: 1,
    name: typeof data.name === 'string' ? data.name.slice(0, 80) : 'Untitled',
    width: data.width!, height: data.height!, pixels: data.pixels, palettes,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  }
}

export function projectToBlob(data: ProjectData) {
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

export function exportDimensions(width: number, height: number, scale: number) {
  return { width: width * scale, height: height * scale }
}

export function renderExportCanvas(width: number, height: number, pixels: Uint8ClampedArray, scale = 1, background?: string) {
  const canvas = document.createElement('canvas')
  const dimensions = exportDimensions(width, height, scale)
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  const source = document.createElement('canvas')
  source.width = width
  source.height = height
  source.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}
