import { describe, expect, it } from 'vitest'
import { exportDimensions, floodFill, linePoints, paintLine, validateProject } from './editor'

describe('drawing logic', () => {
  it('interpolates every cell in a fast stroke', () => {
    expect(linePoints({ x: 0, y: 0 }, { x: 5, y: 2 })).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 2 },
    ])
    const pixels = new Uint8ClampedArray(6 * 3 * 4)
    paintLine(pixels, 6, 3, { x: 0, y: 0 }, { x: 5, y: 2 }, [1, 2, 3, 255])
    expect(Array.from(pixels).filter((_, index) => index % 4 === 3 && pixels[index] === 255)).toHaveLength(6)
  })

  it('fills only a connected area', () => {
    const pixels = new Uint8ClampedArray(3 * 3 * 4)
    for (let y = 0; y < 3; y++) pixels.set([0, 0, 0, 255], (y * 3 + 1) * 4)
    floodFill(pixels, 3, 3, { x: 0, y: 0 }, [255, 0, 0, 255])
    expect(pixels[(0 * 3 + 0) * 4]).toBe(255)
    expect(pixels[(0 * 3 + 2) * 4]).toBe(0)
    expect(pixels[(0 * 3 + 2) * 4 + 3]).toBe(0)
  })
})

describe('project boundaries', () => {
  it('rejects malformed and oversized projects', () => {
    expect(() => validateProject({ version: 1, width: 257, height: 1, pixels: [] })).toThrow(/dimensions/)
    expect(() => validateProject({ version: 1, width: 1, height: 1, pixels: [0] })).toThrow(/Pixel data/)
  })

  it('renders exact scaled export dimensions', () => {
    expect(exportDimensions(16, 9, 8)).toEqual({ width: 128, height: 72 })
  })
})
