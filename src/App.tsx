import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import CanvasStage from './components/CanvasStage'
import { ToolIcon } from './components/Icon'
import { MAX_IMPORT_BYTES, MAX_SIZE, projectToBlob, renderExportCanvas, validateProject, type Tool } from './core/editor'
import { restoreProject, saveProject } from './core/storage'
import { currentProject, useEditorStore } from './store/editorStore'
import styles from './App.module.css'

const tools: { id: Tool; label: string; key: string }[] = [
  { id: 'pencil', label: 'Pencil', key: 'B' }, { id: 'eraser', label: 'Eraser', key: 'E' },
  { id: 'fill', label: 'Fill', key: 'F' }, { id: 'eyedropper', label: 'Pick color', key: 'I' },
  { id: 'pan', label: 'Pan', key: 'Space' },
]

export default function App() {
  const state = useEditorStore()
  const [newOpen, setNewOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [message, setMessage] = useState('Ready.')
  const [restored, setRestored] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    restoreProject().then((project) => {
      if (!alive) return
      if (project) { useEditorStore.getState().loadProject(project, true); setMessage('Last project restored.') }
    }).catch(() => useEditorStore.getState().setSaveStatus('error', 'Autosave storage is unavailable. Downloads still work.')).finally(() => alive && setRestored(true))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!restored) return
    const currentRevision = state.revision
    state.setSaveStatus('saving')
    const timer = window.setTimeout(async () => {
      try { await saveProject(currentProject()); if (useEditorStore.getState().revision === currentRevision) useEditorStore.getState().markSaved() }
      catch { useEditorStore.getState().setSaveStatus('error', 'Autosave failed. Download your project to keep a copy.') }
    }, 650)
    return () => clearTimeout(timer)
  }, [state.revision, restored])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const store = useEditorStore.getState()
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); event.shiftKey ? store.redo() : store.undo(); return }
      if (key === 'b') store.setTool('pencil')
      else if (key === 'e') store.setTool('eraser')
      else if (key === 'f') store.setTool('fill')
      else if (key === 'i') store.setTool('eyedropper')
      else if (key === '+' || key === '=') { event.preventDefault(); store.setView(store.zoom * 1.25, store.panX, store.panY) }
      else if (key === '-' || key === '_') { event.preventDefault(); store.setView(store.zoom / 1.25, store.panX, store.panY) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const openNew = () => {
    if (state.revision !== state.savedRevision && !window.confirm('Replace your unsaved artwork? Your last autosave may not include recent changes.')) return
    setNewOpen(true)
  }

  const importProject = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('That file is too large. PixelDesk projects must be under 5 MB.')
      const project = validateProject(JSON.parse(await file.text()))
      if (state.revision !== state.savedRevision && !window.confirm('Replace your unsaved artwork with this project?')) return
      state.loadProject(project)
      setMessage(`Opened ${file.name}.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open that project.') }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  const downloadProject = () => downloadBlob(projectToBlob(currentProject()), `${safeName(state.name)}.pixeldesk.json`)

  return (
    <main className={styles.desktop}>
      <header className={styles.titlebar}>
        <div className={styles.brandMark} aria-hidden="true"><span/><span/><span/></div>
        <div><strong>PixelDesk</strong><small> / {state.name}</small></div>
        <div className={styles.windowBtns} aria-hidden="true"><span>_</span><span>□</span><span>×</span></div>
      </header>
      <nav className={styles.menu} aria-label="Project actions">
        <button onClick={openNew}><ToolIcon name="new"/>New</button>
        <button onClick={() => fileRef.current?.click()}><ToolIcon name="folder"/>Open</button>
        <button onClick={downloadProject}><ToolIcon name="save"/>Save project</button>
        <span className={styles.divider}/>
        <button onClick={state.undo} disabled={!state.history.length} title="Undo (Ctrl/Cmd+Z)"><ToolIcon name="undo"/>Undo</button>
        <button onClick={state.redo} disabled={!state.future.length} title="Redo (Ctrl/Cmd+Shift+Z)"><ToolIcon name="redo"/>Redo</button>
        <span className={styles.spacer}/>
        <button className={styles.exportBtn} onClick={() => setExportOpen(true)}><ToolIcon name="download"/>Export PNG</button>
        <input ref={fileRef} type="file" accept=".json,.pixeldesk.json,application/json" hidden onChange={(e) => importProject(e.target.files?.[0])}/>
      </nav>

      <div className={styles.workspace}>
        <aside className={`${styles.panel} ${styles.toolsPanel}`} aria-label="Tools">
          <div className={styles.panelTitle}>TOOLS</div>
          <div className={styles.toolGrid}>
            {tools.map(({ id, label, key }) => <button key={id} className={state.tool === id ? styles.selected : ''} onClick={() => state.setTool(id)} aria-pressed={state.tool === id} title={`${label} (${key})`}><ToolIcon name={id}/><span>{label}</span><kbd>{key === 'Space' ? 'SPC' : key}</kbd></button>)}
          </div>
          <div className={styles.viewTools}>
            <div className={styles.labelRow}><span>ZOOM</span><output>{Math.round(state.zoom * 100)}%</output></div>
            <input aria-label="Zoom" type="range" min="1" max="64" step="1" value={state.zoom} onChange={(e) => state.setView(Number(e.target.value), state.panX, state.panY)}/>
            <div className={styles.buttonRow}>
              <button onClick={() => state.setView(state.zoom / 1.25, state.panX, state.panY)} aria-label="Zoom out">−</button>
              <button onClick={() => state.setView(state.zoom * 1.25, state.panX, state.panY)} aria-label="Zoom in">+</button>
              <button onClick={() => state.setView(1, 20, 20)} aria-label="Reset view to 100 percent" title="Reset to 100%">1:1</button>
              <button className={state.grid ? styles.selected : ''} onClick={() => state.setGrid(!state.grid)} aria-pressed={state.grid} title="Toggle grid"><ToolIcon name="grid"/></button>
            </div>
          </div>
          <button className={styles.mobileColorButton} onClick={() => setColorOpen(true)} aria-label="Open color controls"><span style={{ backgroundColor: state.color }}/><b>COLOR</b></button>
          <button className={styles.danger} onClick={() => { if (window.confirm('Clear every pixel? You can undo this action.')) state.clear() }}><ToolIcon name="trash"/> Clear canvas</button>
        </aside>

        <CanvasStage />

        <aside className={`${styles.panel} ${styles.colorPanel} ${colorOpen ? styles.colorPanelOpen : ''}`} aria-label="Colors">
          <div className={styles.panelTitle}>COLOR LAB <button className={styles.mobileClose} onClick={() => setColorOpen(false)} aria-label="Close color controls">×</button></div>
          <div className={styles.activeColor}><span style={{ backgroundColor: state.color }}/><div><small>ACTIVE INK</small><strong>{state.color}</strong></div></div>
          <HexColorPicker color={state.color} onChange={state.setColor}/>
          <HexInput color={state.color} onCommit={state.setColor}/>
          <div className={styles.subhead}>RECENT</div>
          <div className={styles.swatches}>{state.recentColors.map((color) => <button key={color} style={{ backgroundColor: color }} onClick={() => state.setColor(color)} className={state.color === color ? styles.activeSwatch : ''} aria-label={`Use ${color}`} title={color}/>)}</div>
          <PalettePanel />
        </aside>
      </div>

      <footer className={styles.statusbar}>
        <span className={styles.statusText}>{message}</span>
        <span>{state.width} × {state.height} PX</span>
        <span>{Math.round(state.zoom * 100)}%</span>
        <span className={`${styles.saveState} ${styles[state.saveStatus]}`} data-testid="save-status">{state.saveStatus === 'saving' ? '● SAVING…' : state.saveStatus === 'saved' ? '✓ SAVED' : state.saveStatus === 'error' ? `! ${state.saveError}` : '○ LOCAL'}</span>
      </footer>

      {newOpen && <NewDialog onClose={() => setNewOpen(false)} />}
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </main>
  )
}

function PalettePanel() {
  const recent = useEditorStore((s) => s.recentColors)
  const palettes = useEditorStore((s) => s.palettes)
  const addPalette = useEditorStore((s) => s.addPalette)
  const setColor = useEditorStore((s) => s.setColor)
  const [name, setName] = useState('')
  return <div className={styles.palettes}>
    <div className={styles.subhead}>SAVED PALETTES</div>
    {palettes.length === 0 && <p>No saved palettes yet.</p>}
    {palettes.map((palette) => <div className={styles.palette} key={`${palette.name}-${palette.colors.join()}`}><span>{palette.name}</span><div>{palette.colors.map((color) => <button key={color} style={{ background: color }} aria-label={`Use ${color}`} onClick={() => setColor(color)}/>)}</div></div>)}
    <div className={styles.paletteSave}><input aria-label="Palette name" placeholder="Palette name" value={name} onChange={(e) => setName(e.target.value)}/><button onClick={() => { addPalette(name); setName('') }} disabled={!recent.length}>Save</button></div>
  </div>
}

function HexInput({ color, onCommit }: { color: string; onCommit: (color: string) => void }) {
  const [draft, setDraft] = useState(color)
  useEffect(() => setDraft(color), [color])
  const commit = () => {
    const normalized = draft.startsWith('#') ? draft : `#${draft}`
    if (/^#[\da-f]{6}$/i.test(normalized)) onCommit(normalized)
    else setDraft(color)
  }
  return <label className={styles.hexField}>HEX <input aria-label="Hex color" value={draft} maxLength={7} onChange={(e) => { setDraft(e.target.value); const value = e.target.value; if (/^#[\da-f]{6}$/i.test(value)) onCommit(value) }} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { commit(); e.currentTarget.blur() } }}/></label>
}

function NewDialog({ onClose }: { onClose: () => void }) {
  const [width, setWidth] = useState(32)
  const [height, setHeight] = useState(32)
  const create = () => { useEditorStore.getState().newProject(width, height); onClose() }
  return <Modal title="NEW ARTWORK" onClose={onClose}>
    <p className={styles.dialogIntro}>Choose a crisp pixel grid. You can export it at a larger scale later.</p>
    <div className={styles.presets}>{[16, 32, 64].map((size) => <button key={size} className={width === size && height === size ? styles.selected : ''} onClick={() => { setWidth(size); setHeight(size) }}>{size} × {size}</button>)}</div>
    <div className={styles.sizeFields}><label>Width<input type="number" min="1" max={MAX_SIZE} value={width} onChange={(e) => setWidth(clampSize(e.target.value))}/></label><span>×</span><label>Height<input type="number" min="1" max={MAX_SIZE} value={height} onChange={(e) => setHeight(clampSize(e.target.value))}/></label></div>
    <div className={styles.dialogActions}><button onClick={onClose}>Cancel</button><button className={styles.primary} onClick={create}>Create artwork</button></div>
  </Modal>
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const state = useEditorStore()
  const [scale, setScale] = useState(4)
  const [transparent, setTransparent] = useState(true)
  const [background, setBackground] = useState('#FFFFFF')
  const download = () => {
    const canvas = renderExportCanvas(state.width, state.height, state.pixels, scale, transparent ? undefined : background)
    canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `${safeName(state.name)}-${scale}x.png`); onClose() }, 'image/png')
  }
  return <Modal title="EXPORT PNG" onClose={onClose}>
    <div className={styles.exportPreview}><div className={styles.miniArt} style={{ backgroundColor: transparent ? undefined : background }}><canvas ref={(node) => {
      if (!node) return
      node.width = state.width; node.height = state.height
      node.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(state.pixels), state.width, state.height), 0, 0)
    }}/></div><div><strong>{state.width * scale} × {state.height * scale} px</strong><span>PNG · nearest-neighbor</span></div></div>
    <fieldset><legend>Scale</legend><div className={styles.segmented}>{[1, 2, 4, 8].map((value) => <button key={value} className={scale === value ? styles.selected : ''} onClick={() => setScale(value)}>{value}×</button>)}</div></fieldset>
    <fieldset><legend>Background</legend><label className={styles.check}><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)}/> Transparent</label>{!transparent && <input aria-label="Export background color" type="color" value={background} onChange={(e) => setBackground(e.target.value)}/>}</fieldset>
    <div className={styles.dialogActions}><button onClick={onClose}>Cancel</button><button className={styles.primary} onClick={download}>Download PNG</button></div>
  </Modal>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className={styles.backdrop} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}><header><strong>{title}</strong><button onClick={onClose} aria-label="Close dialog">×</button></header><div className={styles.dialogBody}>{children}</div></section></div>
}

function clampSize(value: string) { return Math.min(MAX_SIZE, Math.max(1, Number.parseInt(value) || 1)) }
function safeName(name: string) { return name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'pixeldesk-art' }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 500) }
function isTyping(target: EventTarget | null) { const el = target as HTMLElement | null; return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable }
