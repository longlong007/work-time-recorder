const STORAGE_KEY = 'workTimeRecords'
const TAGS_KEY = 'workTags'
const CURRENT_RECORD_KEY = 'currentRecord'
const SETTINGS_KEY = 'settings'

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  }
}

export { STORAGE_KEY, TAGS_KEY, CURRENT_RECORD_KEY, SETTINGS_KEY }
