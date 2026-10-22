import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import type { Point } from '../core/editor'
import styles from '../App.module.css'

export default function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<{ id: number; last: Point; panX: number; panY: number; clientX: number; clientY: number; mode: 'paint' | 'pan'; changed: boolean } | null>(null)
  const frameRef = useRef(0)
  const spaceRef = useRef(false)
  const width = useEditorStore((s) => s.width)
  const height = useEditorStore((s) => s.height)
  const tool = useEditorStore((s) => s.tool)
  const zoom = useEditorStore((s) => s.zoom)
  const panX = useEditorStore((s) => s.panX)
  const panY = useEditorStore((s) => s.panY)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return
    const state = useEditorStore.getState()
    const rect = host.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
    }
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, rect.width, rect.height)
    const z = state.zoom
    const ox = state.panX
    const oy = state.panY
    const snap = (value: number) => Math.round(value * dpr) / dpr
    const xAt = (x: number) => snap(ox + x * z)
    const yAt = (y: number) => snap(oy + y * z)
    ctx.fillStyle = '#737373'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.save()
    ctx.beginPath()
    ctx.rect(xAt(0), yAt(0), xAt(state.width) - xAt(0), yAt(state.height) - yAt(0))
    ctx.clip()
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const left = xAt(x)
        const top = yAt(y)
        ctx.fillStyle = ((x + y) % 2 === 0) ? '#ffffff' : '#d8d8d8'
        ctx.fillRect(left, top, xAt(x + 1) - left, yAt(y + 1) - top)
      }
    }
    if (state.grid && z >= 6) {
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(30, 45, 60, .22)'
      ctx.lineWidth = 1 / dpr
      for (let x = 0; x <= state.width; x++) { const px = xAt(x) + .5 / dpr; ctx.moveTo(px, yAt(0)); ctx.lineTo(px, yAt(state.height)) }
      for (let y = 0; y <= state.height; y++) { const py = yAt(y) + .5 / dpr; ctx.moveTo(xAt(0), py); ctx.lineTo(xAt(state.width), py) }
      ctx.stroke()
    }
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const offset = (y * state.width + x) * 4
        if (!state.pixels[offset + 3]) continue
        const left = xAt(x)
        const top = yAt(y)
        ctx.fillStyle = `rgba(${state.pixels[offset]},${state.pixels[offset + 1]},${state.pixels[offset + 2]},${state.pixels[offset + 3] / 255})`
        ctx.fillRect(left, top, xAt(x + 1) - left, yAt(y + 1) - top)
      }
    }
    ctx.restore()
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 1 / dpr
    ctx.strokeRect(xAt(0) - .5 / dpr, yAt(0) - .5 / dpr, xAt(state.width) - xAt(0) + 1 / dpr, yAt(state.height) - yAt(0) + 1 / dpr)
  }, [])

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(draw)
  }, [draw])

  const fit = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    const state = useEditorStore.getState()
    const rect = host.getBoundingClientRect()
    const nextZoom = Math.max(1, Math.min(32, Math.floor(Math.min((rect.width - 40) / state.width, (rect.height - 40) / state.height))))
    useEditorStore.getState().setView(nextZoom, Math.round((rect.width - state.width * nextZoom) / 2), Math.round((rect.height - state.height * nextZoom) / 2))
  }, [])

  useEffect(() => {
    fit()
    const observer = new ResizeObserver(() => { scheduleDraw() })
    if (hostRef.current) observer.observe(hostRef.current)
    const unsubscribe = useEditorStore.subscribe(scheduleDraw)
    const down = (event: KeyboardEvent) => { if (event.code === 'Space' && !isTyping(event.target)) spaceRef.current = true }
    const up = (event: KeyboardEvent) => { if (event.code === 'Space') spaceRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    scheduleDraw()
    return () => { observer.disconnect(); unsubscribe(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); cancelAnimationFrame(frameRef.current) }
  }, [fit, scheduleDraw])

  useEffect(() => { fit() }, [width, height, fit])

  const pointFromEvent = (event: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const state = useEditorStore.getState()
    return { x: Math.floor((event.clientX - rect.left - state.panX) / state.zoom), y: Math.floor((event.clientY - rect.top - state.panY) / state.zoom) }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const state = useEditorStore.getState()
    const point = pointFromEvent(event)
    const panMode = state.tool === 'pan' || spaceRef.current
    canvasRef.current!.setPointerCapture(event.pointerId)
    pointerRef.current = { id: event.pointerId, last: point, panX: state.panX, panY: state.panY, clientX: event.clientX, clientY: event.clientY, mode: panMode ? 'pan' : 'paint', changed: false }
    if (panMode) return
    if (state.tool === 'eyedropper') { state.pick(point); return }
    state.beginAction()
    if (state.tool === 'fill') pointerRef.current.changed = state.fill(point)
    else pointerRef.current.changed = state.paint(point, point, state.tool === 'eraser')
    scheduleDraw()
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = pointerRef.current
    if (!active || active.id !== event.pointerId) return
    const state = useEditorStore.getState()
    if (active.mode === 'pan') {
      state.setView(state.zoom, active.panX + event.clientX - active.clientX, active.panY + event.clientY - active.clientY)
      return
    }
    if (state.tool !== 'pencil' && state.tool !== 'eraser') return
    const next = pointFromEvent(event)
    active.changed = state.paint(active.last, next, state.tool === 'eraser') || active.changed
    active.last = next
    scheduleDraw()
  }

  const finish = (event: React.PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const active = pointerRef.current
    if (!active || active.id !== event.pointerId) return
    if (active.mode === 'paint') cancelled ? useEditorStore.getState().cancelAction() : useEditorStore.getState().finishAction()
    pointerRef.current = null
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) canvasRef.current.releasePointerCapture(event.pointerId)
    scheduleDraw()
  }

  return (
    <section className={styles.stageWrap} aria-label="Artwork canvas">
      <div className={styles.stageHeader}>
        <span><i className={styles.statusDot} /> CANVAS</span>
        <span>{width} × {height} PX</span>
      </div>
      <div className={styles.stage} ref={hostRef}>
        <canvas
          ref={canvasRef}
          data-testid="pixel-canvas"
          className={`${styles.canvas} ${tool === 'pan' ? styles.grab : ''}`}
          aria-label={`Pixel canvas, ${width} by ${height}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => finish(event)}
          onPointerCancel={(event) => finish(event, true)}
          onLostPointerCapture={(event) => { if (pointerRef.current) finish(event) }}
          onWheel={(event) => {
            event.preventDefault()
            const state = useEditorStore.getState()
            const rect = canvasRef.current!.getBoundingClientRect()
            const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2
            const next = Math.min(64, Math.max(1, state.zoom * factor))
            const mx = event.clientX - rect.left
            const my = event.clientY - rect.top
            const worldX = (mx - state.panX) / state.zoom
            const worldY = (my - state.panY) / state.zoom
            state.setView(next, mx - worldX * next, my - worldY * next)
          }}
        />
        <button className={styles.fitFloat} onClick={fit} title="Fit artwork to view"><span aria-hidden="true">⌗</span> Fit</button>
      </div>
    </section>
  )
}

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.isContentEditable
}
