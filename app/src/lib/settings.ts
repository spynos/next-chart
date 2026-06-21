// 기관 설정 (의료기관명 등) — 평문 소량, meta 스토어 보관.
import { idbGet, idbPut, STORES } from './idb'

export interface Settings {
  id: 'settings'
  orgName: string
}

const DEFAULT: Settings = { id: 'settings', orgName: '' }

export async function getSettings(): Promise<Settings> {
  return (await idbGet<Settings>(STORES.meta, 'settings')) ?? DEFAULT
}

export async function saveSettings(s: Omit<Settings, 'id'>): Promise<void> {
  await idbPut<Settings>(STORES.meta, { id: 'settings', ...s })
}
