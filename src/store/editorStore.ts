import { create } from 'zustand'
import { floodFill, hexToRgba, paintLine, type Palette, type Point, type ProjectData, type Tool } from '../core/editor'

const HISTORY_LIMIT = 40
const defaultColors = ['#000000', '#FFFFFF', '#C00040', '#FF6B35', '#FFD23F', '#35C759', '#00A6FB', '#3A0CA3', '#B5179E', '#795548']

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface EditorState {
  name: string
  width: number
  height: number
  pixels: Uint8ClampedArray
  tool: Tool
  color: string
  recentColors: string[]
  palettes: Palette[]
  history: Uint8ClampedArray[]
  future: Uint8ClampedArray[]
  actionStart: Uint8ClampedArray | null
  revision: number
  savedRevision: number
  saveStatus: SaveStatus
  saveError: string
  grid: boolean
  zoom: number
  panX: number
  panY: number
  setTool: (tool: Tool) => void
  setColor: (color: string) => void
  setName: (name: string) => void
  beginAction: () => void
  paint: (from: Point, to: Point, erase?: boolean) => boolean
  fill: (point: Point, erase?: boolean) => boolean
  pick: (point: Point) => void
  finishAction: () => void
  cancelAction: () => void
  undo: () => void
  redo: () => void
  clear: () => void
  newProject: (width: number, height: number) => void
  loadProject: (project: ProjectData, saved?: boolean) => void
  addPalette: (name: string) => void
  setSaveStatus: (status: SaveStatus, error?: string) => void
  markSaved: () => void
  setGrid: (grid: boolean) => void
  setView: (zoom: number, panX: number, panY: number) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  name: 'Untitled Sprite', width: 32, height: 32, pixels: new Uint8ClampedArray(32 * 32 * 4),
  tool: 'pencil', color: '#000000', recentColors: defaultColors, palettes: [], history: [], future: [], actionStart: null,
  revision: 0, savedRevision: 0, saveStatus: 'idle', saveError: '', grid: true, zoom: 16, panX: 0, panY: 0,
  setTool: (tool) => set({ tool }),
  setColor: (color) => {
    const normalized = color.toUpperCase()
    if (!/^#[\dA-F]{6}$/.test(normalized)) return
    set((state) => ({ color: normalized, recentColors: [normalized, ...state.recentColors.filter((item) => item !== normalized)].slice(0, 12) }))
  },
  setName: (name) => set({ name, revision: get().revision + 1 }),
  beginAction: () => { if (!get().actionStart) set({ actionStart: get().pixels.slice() }) },
  paint: (from, to, erase = false) => paintLine(get().pixels, get().width, get().height, from, to, erase ? [0, 0, 0, 0] : hexToRgba(get().color)),
  fill: (point, erase = false) => floodFill(get().pixels, get().width, get().height, point, erase ? [0, 0, 0, 0] : hexToRgba(get().color)),
  pick: (point) => {
    const state = get()
    if (point.x < 0 || point.y < 0 || point.x >= state.width || point.y >= state.height) return
    const offset = (point.y * state.width + point.x) * 4
    if (!state.pixels[offset + 3]) return
    state.setColor(`#${[state.pixels[offset], state.pixels[offset + 1], state.pixels[offset + 2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`)
  },
  finishAction: () => {
    const state = get()
    if (!state.actionStart) return
    const changed = state.actionStart.some((value, index) => value !== state.pixels[index])
    if (changed) set({ history: [...state.history, state.actionStart].slice(-HISTORY_LIMIT), future: [], actionStart: null, revision: state.revision + 1 })
    else set({ actionStart: null })
  },
  cancelAction: () => {
    const snapshot = get().actionStart
    if (snapshot) set({ pixels: snapshot, actionStart: null })
  },
  undo: () => {
    const state = get()
    const previous = state.history.at(-1)
    if (!previous) return
    set({ pixels: previous.slice(), history: state.history.slice(0, -1), future: [state.pixels.slice(), ...state.future].slice(0, HISTORY_LIMIT), revision: state.revision + 1 })
  },
  redo: () => {
    const state = get()
    const next = state.future[0]
    if (!next) return
    set({ pixels: next.slice(), history: [...state.history, state.pixels.slice()].slice(-HISTORY_LIMIT), future: state.future.slice(1), revision: state.revision + 1 })
  },
  clear: () => {
    const state = get()
    if (!state.pixels.some(Boolean)) return
    set({ pixels: new Uint8ClampedArray(state.pixels.length), history: [...state.history, state.pixels.slice()].slice(-HISTORY_LIMIT), future: [], revision: state.revision + 1 })
  },
  newProject: (width, height) => set((state) => ({ name: 'Untitled Sprite', width, height, pixels: new Uint8ClampedArray(width * height * 4), history: [], future: [], revision: state.revision + 1, savedRevision: state.revision + 1, zoom: 16, panX: 0, panY: 0 })),
  loadProject: (project, saved = false) => set((state) => ({ name: project.name, width: project.width, height: project.height, pixels: new Uint8ClampedArray(project.pixels), palettes: project.palettes, history: [], future: [], revision: state.revision + 1, savedRevision: saved ? state.revision + 1 : state.savedRevision, zoom: 16, panX: 0, panY: 0 })),
  addPalette: (name) => set((state) => ({ palettes: [...state.palettes, { name: name.trim() || `Palette ${state.palettes.length + 1}`, colors: state.recentColors.slice(0, 8) }].slice(-20), revision: state.revision + 1 })),
  setSaveStatus: (saveStatus, saveError = '') => set({ saveStatus, saveError }),
  markSaved: () => set((state) => ({ savedRevision: state.revision, saveStatus: 'saved', saveError: '' })),
  setGrid: (grid) => set({ grid }),
  setView: (zoom, panX, panY) => set({ zoom: Math.min(64, Math.max(1, zoom)), panX, panY }),
}))

export function currentProject(): ProjectData {
  const state = useEditorStore.getState()
  return { version: 1, name: state.name, width: state.width, height: state.height, pixels: Array.from(state.pixels), palettes: state.palettes, updatedAt: new Date().toISOString() }
}
