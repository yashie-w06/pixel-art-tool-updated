import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'

describe('undo and redo', () => {
  beforeEach(() => useEditorStore.getState().newProject(4, 4))

  it('treats a completed drag as one action and respects boundaries', () => {
    const store = useEditorStore.getState()
    store.undo()
    expect(useEditorStore.getState().pixels.some(Boolean)).toBe(false)
    store.beginAction()
    store.paint({ x: 0, y: 0 }, { x: 3, y: 3 })
    store.finishAction()
    expect(useEditorStore.getState().history).toHaveLength(1)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().pixels.some(Boolean)).toBe(false)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().history).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().pixels.some(Boolean)).toBe(true)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().future).toHaveLength(0)
  })
})
