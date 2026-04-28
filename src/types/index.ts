export interface WorkRecord {
  startTime: string
  endTime: string
  duration: number
  workName: string
}

export interface CurrentRecord {
  startTime: string | null
  endTime: string | null
  isActive: boolean
  workName: string
}

export interface Tag {
  name: string
}

export interface AlarmState {
  enabled: boolean
  minutes: number
  triggered: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto'
  voiceShortcutEnabled: boolean
}

export type TimerStatus = 'idle' | 'running'
