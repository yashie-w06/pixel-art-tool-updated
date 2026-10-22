import { get, set } from 'idb-keyval'
import { validateProject, type ProjectData } from './editor'

const KEY = 'pixeldesk:last-project:v1'

export async function saveProject(project: ProjectData) {
  await set(KEY, project)
}

export async function restoreProject() {
  const value = await get(KEY)
  return value ? validateProject(value) : null
}
