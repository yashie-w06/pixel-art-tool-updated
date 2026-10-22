import type { Tool } from '../core/editor'

export function ToolIcon({ name }: { name: Tool | 'undo' | 'redo' | 'grid' | 'fit' | 'new' | 'save' | 'folder' | 'download' | 'trash' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const }
  const paths: Record<string, React.ReactNode> = {
    pencil: <><path {...common} d="M4 20l4.2-1 10.7-10.7-3.2-3.2L5 15.8 4 20z"/><path {...common} d="M13.8 7l3.2 3.2M5 15.8l3.2 3.2"/></>,
    eraser: <><path {...common} d="M5 15l8.8-10 5.2 4.6-8.3 9.4H6.4L5 17.8z"/><path {...common} d="M11 19h9"/></>,
    fill: <><path {...common} d="M5 12l7-7 7 7-7 7-7-7zM9 8l7 7"/><path {...common} d="M19 16s-2 2.1-2 3.2a2 2 0 004 0c0-1.1-2-3.2-2-3.2z"/></>,
    eyedropper: <><path {...common} d="M14 5l5 5-8.7 8.7-4.5.8 1-4.5L15.5 6.3"/><path {...common} d="M12 8l4 4"/></>,
    pan: <><path {...common} d="M9 11V6a1.5 1.5 0 013 0v4-6a1.5 1.5 0 013 0v6-4a1.5 1.5 0 013 0v5-2a1.5 1.5 0 013 0v5c0 4-2.5 6-6.5 6H11c-2 0-3.2-.8-4.3-2.4L4 13.5A1.5 1.5 0 016.5 12L9 15"/></>,
    undo: <path {...common} d="M9 7l-5 5 5 5M5 12h8a6 6 0 016 6"/>,
    redo: <path {...common} d="M15 7l5 5-5 5m4-5h-8a6 6 0 00-6 6"/>,
    grid: <><path {...common} d="M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/></>,
    fit: <><path {...common} d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/><path {...common} d="M8 8h8v8H8z"/></>,
    new: <><path {...common} d="M6 3h9l4 4v14H6zM15 3v5h4M9 13h7M12.5 9.5v7"/></>,
    save: <><path {...common} d="M4 4h14l2 2v14H4zM8 4v6h8V4M8 20v-6h8v6"/></>,
    folder: <path {...common} d="M3 7h7l2-3h9v15H3zM3 9h18"/>,
    download: <><path {...common} d="M12 3v12M7 11l5 5 5-5M4 20h16"/></>,
    trash: <><path {...common} d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
