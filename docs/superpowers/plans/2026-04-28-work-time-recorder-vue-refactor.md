# 工作时间记录器 Vue 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将工作时间记录器从原生 JavaScript 单体架构重构为 Vue 3 + Composition API + TypeScript 模块化架构，提升代码可读性、可维护性和可扩展性。

**Architecture:** 采用 Vue 3 Composition API 构建单页应用，使用 Pinia 进行状态管理，组件化拆分 UI，TypeScript 提供类型安全。保留 localStorage 作为数据持久化方案。

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite

---

## 文件结构

```
work-time-recorder/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts                 # 应用入口
│   ├── App.vue                 # 根组件
│   ├── assets/
│   │   └── styles/
│   │       └── main.css        # 全局样式
│   ├── components/
│   │   ├── TimerCard.vue       # 计时器卡片
│   │   ├── WorkNameInput.vue   # 工作名称输入
│   │   ├── TagSection.vue      # 标签选择区
│   │   ├── ActionButtons.vue   # 操作按钮
│   │   ├── AlarmSection.vue    # 闹钟提醒
│   │   ├── VoiceSection.vue    # 语音输入
│   │   ├── HistorySection.vue  # 历史记录
│   │   ├── StatisticsPanel.vue # 统计面板
│   │   └── modals/
│   │       ├── TagModal.vue     # 标签管理弹窗
│   │       ├── EditModal.vue    # 编辑记录弹窗
│   │       └── AlarmModal.vue  # 闹钟提醒弹窗
│   ├── composables/
│   │   ├── useTimer.ts         # 计时逻辑
│   │   ├── useAlarm.ts         # 闹钟逻辑
│   │   ├── useVoiceInput.ts    # 语音输入
│   │   ├── useKeyboard.ts      # 快捷键
│   │   └── useNotification.ts # 通知
│   ├── stores/
│   │   ├── work.ts             # 工作记录状态
│   │   ├── tag.ts              # 标签状态
│   │   ├── alarm.ts            # 闹钟状态
│   │   └── settings.ts         # 设置状态
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   └── utils/
│       ├── storage.ts          # localStorage 封装
│       ├── date.ts             # 日期格式化
│       └── csv.ts              # CSV 导入导出
```

---

## 任务分解

### Task 1: 项目初始化与配置

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "work-time-recorder",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000
  }
})
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#5a9bc4">
    <title>工作时间记录器</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: 安装依赖**

Run: `npm install`

---

### Task 2: TypeScript 类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
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
```

---

### Task 3: 工具函数

**Files:**
- Create: `src/utils/storage.ts`
- Create: `src/utils/date.ts`
- Create: `src/utils/csv.ts`

- [ ] **Step 1: 创建 storage.ts**

```typescript
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
```

- [ ] **Step 2: 创建 date.ts**

```typescript
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '今天'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calculateDuration(startTime: string, endTime: string): number {
  return new Date(endTime).getTime() - new Date(startTime).getTime()
}

export function toDatetimeLocal(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

- [ ] **Step 3: 创建 csv.ts**

```typescript
import type { WorkRecord } from '../types'

export function exportToCSV(records: WorkRecord[]): void {
  if (records.length === 0) {
    alert('没有可导出的记录')
    return
  }

  const toLocalISOString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }

  let csvContent = '日期,开始时间,结束时间,工作时长(小时),工作内容\n'

  records.forEach(record => {
    const startDate = new Date(record.startTime)
    const endDate = new Date(record.endTime)

    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    const date = `${year}-${month}-${day}`

    const startTime = toLocalISOString(startDate)
    const endTime = toLocalISOString(endDate)

    const durationHours = (record.duration / (1000 * 60 * 60)).toFixed(2)
    const workName = record.workName || ''
    const escapedWorkName = workName.includes(',') || workName.includes('"')
      ? `"${workName.replace(/"/g, '""')}"`
      : workName

    csvContent += `${date},${startTime},${endTime},${durationHours},${escapedWorkName}\n`
  })

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)

  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  link.setAttribute('download', `工作记录_${dateStr}.csv`)

  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function parseCSV(content: string): { records: WorkRecord[], errors: string[] } {
  const cleanContent = content.replace(/^\ufeff/, '')
  const lines = cleanContent.split(/\r?\n/)

  if (lines.length < 2) {
    return { records: [], errors: ['CSV文件为空或格式不正确'] }
  }

  const newRecords: WorkRecord[] = []
  const errors: string[] = []

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < text.length; j++) {
      const char = text[j]
      if (char === '"') {
        if (inQuotes && text[j + 1] === '"') {
          current += '"'
          j++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const columns = parseCSVLine(line)

    if (columns.length < 4) {
      errors.push(`第${i}行: 列数不足`)
      continue
    }

    const [dateStr, startTimeStr, endTimeStr, durationHoursStr, ...workNameParts] = columns
    const workName = workNameParts.join(',').trim()

    const startTime = new Date(startTimeStr)
    const endTime = new Date(endTimeStr)
    const durationHours = parseFloat(durationHoursStr)

    if (isNaN(startTime.getTime())) {
      errors.push(`第${i}行: 开始时间格式无效`)
      continue
    }

    if (isNaN(endTime.getTime())) {
      errors.push(`第${i}行: 结束时间格式无效`)
      continue
    }

    if (isNaN(durationHours) || durationHours <= 0) {
      errors.push(`第${i}行: 工作时长无效`)
      continue
    }

    if (endTime <= startTime) {
      errors.push(`第${i}行: 结束时间必须晚于开始时间`)
      continue
    }

    newRecords.push({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationHours * 60 * 60 * 1000,
      workName: workName || '未命名工作'
    })
  }

  return { records: newRecords, errors }
}
```

---

### Task 4: Pinia 状态管理

**Files:**
- Create: `src/stores/work.ts`
- Create: `src/stores/tag.ts`
- Create: `src/stores/settings.ts`
- Create: `src/stores/index.ts`

- [ ] **Step 1: 创建 stores/index.ts**

```typescript
export { useWorkStore } from './work'
export { useTagStore } from './tag'
export { useSettingsStore } from './settings'
```

- [ ] **Step 2: 创建 stores/work.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorkRecord, CurrentRecord } from '../types'
import { storage, STORAGE_KEY, CURRENT_RECORD_KEY } from '../utils/storage'
import { calculateDuration } from '../utils/date'

export const useWorkStore = defineStore('work', () => {
  const currentRecord = ref<CurrentRecord>({
    startTime: null,
    endTime: null,
    isActive: false,
    workName: ''
  })

  const filterDate = ref<string | null>(null)

  const records = computed(() => storage.get<WorkRecord[]>(STORAGE_KEY, []))

  const filteredRecords = computed(() => {
    if (!filterDate.value) return records.value
    return records.value.filter(record => {
      const recordDate = new Date(record.startTime).toISOString().split('T')[0]
      return recordDate === filterDate.value
    })
  })

  const todayTotal = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return records.value
      .filter(r => r.startTime.startsWith(today))
      .reduce((sum, r) => sum + r.duration, 0)
  })

  const weekTotal = computed(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    weekStart.setHours(0, 0, 0, 0)

    return records.value
      .filter(r => new Date(r.startTime) >= weekStart)
      .reduce((sum, r) => sum + r.duration, 0)
  })

  const monthTotal = computed(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return records.value
      .filter(r => new Date(r.startTime) >= monthStart)
      .reduce((sum, r) => sum + r.duration, 0)
  })

  function loadCurrentRecord() {
    const saved = storage.get<CurrentRecord | null>(CURRENT_RECORD_KEY, null)
    if (saved?.isActive && saved.startTime) {
      const start = new Date(saved.startTime)
      const now = new Date()
      if (start.toDateString() !== now.toDateString()) {
        endWork()
        return
      }
      currentRecord.value = saved
    }
  }

  function startWork(workName: string) {
    if (currentRecord.value.isActive) return

    currentRecord.value = {
      startTime: new Date().toISOString(),
      endTime: null,
      isActive: true,
      workName: workName || '未命名工作'
    }

    saveCurrentRecord()
  }

  function endWork() {
    if (!currentRecord.value.isActive || !currentRecord.value.startTime) return

    const endTime = new Date().toISOString()
    const record: WorkRecord = {
      startTime: currentRecord.value.startTime,
      endTime,
      duration: calculateDuration(currentRecord.value.startTime, endTime),
      workName: currentRecord.value.workName
    }

    const allRecords = [...records.value, record]
    allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    storage.set(STORAGE_KEY, allRecords)

    currentRecord.value = {
      startTime: null,
      endTime: null,
      isActive: false,
      workName: ''
    }

    storage.remove(CURRENT_RECORD_KEY)
  }

  function saveCurrentRecord() {
    storage.set(CURRENT_RECORD_KEY, currentRecord.value)
  }

  function deleteRecord(startTime: string) {
    const filtered = records.value.filter(r => r.startTime !== startTime)
    storage.set(STORAGE_KEY, filtered)
  }

  function updateRecord(startTime: string, updates: Partial<WorkRecord>) {
    const allRecords = records.value.map(r =>
      r.startTime === startTime ? { ...r, ...updates } : r
    )
    allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    storage.set(STORAGE_KEY, allRecords)
  }

  function clearHistory() {
    storage.remove(STORAGE_KEY)
  }

  function importRecords(newRecords: WorkRecord[]) {
    const allRecords = [...records.value, ...newRecords]
    allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    storage.set(STORAGE_KEY, allRecords)
  }

  function setFilterDate(date: string | null) {
    filterDate.value = date
  }

  return {
    currentRecord,
    records,
    filteredRecords,
    todayTotal,
    weekTotal,
    monthTotal,
    filterDate,
    loadCurrentRecord,
    startWork,
    endWork,
    deleteRecord,
    updateRecord,
    clearHistory,
    importRecords,
    setFilterDate
  }
})
```

- [ ] **Step 3: 创建 stores/tag.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage, TAGS_KEY } from '../utils/storage'

const DEFAULT_TAGS = ['开发', '会议', '学习', '调试', '文档']

export const useTagStore = defineStore('tag', () => {
  const tags = ref<string[]>([])

  function loadTags() {
    const saved = storage.get<string[]>(TAGS_KEY, [])
    tags.value = saved.length > 0 ? saved : [...DEFAULT_TAGS]
    if (saved.length === 0) {
      saveTags()
    }
  }

  function saveTags() {
    storage.set(TAGS_KEY, tags.value)
  }

  function addTag(name: string) {
    if (!tags.value.includes(name)) {
      tags.value.push(name)
      saveTags()
    }
  }

  function deleteTag(name: string) {
    tags.value = tags.value.filter(t => t !== name)
    saveTags()
  }

  function reorderTags(newOrder: string[]) {
    tags.value = newOrder
    saveTags()
  }

  return {
    tags,
    loadTags,
    addTag,
    deleteTag,
    reorderTags
  }
})
```

- [ ] **Step 4: 创建 stores/settings.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { storage, SETTINGS_KEY } from '../utils/storage'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark' | 'auto'>('auto')
  const voiceShortcutEnabled = ref(false)

  function loadSettings() {
    const saved = storage.get<{ theme: 'light' | 'dark' | 'auto', voiceShortcutEnabled: boolean }>(SETTINGS_KEY, {
      theme: 'auto',
      voiceShortcutEnabled: false
    })
    theme.value = saved.theme
    voiceShortcutEnabled.value = saved.voiceShortcutEnabled
    applyTheme()
  }

  function saveSettings() {
    storage.set(SETTINGS_KEY, {
      theme: theme.value,
      voiceShortcutEnabled: voiceShortcutEnabled.value
    })
  }

  function applyTheme() {
    const isDark = theme.value === 'dark' ||
      (theme.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.hasAttribute('data-theme')
    if (isDark) {
      theme.value = 'light'
    } else {
      theme.value = 'dark'
    }
    applyTheme()
    saveSettings()
  }

  function setVoiceShortcut(enabled: boolean) {
    voiceShortcutEnabled.value = enabled
    saveSettings()
  }

  watch(theme, applyTheme)

  return {
    theme,
    voiceShortcutEnabled,
    loadSettings,
    toggleTheme,
    setVoiceShortcut
  }
})
```

---

### Task 5: Composables

**Files:**
- Create: `src/composables/useTimer.ts`
- Create: `src/composables/useAlarm.ts`
- Create: `src/composables/useVoiceInput.ts`
- Create: `src/composables/useKeyboard.ts`
- Create: `src/composables/useNotification.ts`

- [ ] **Step 1: 创建 useTimer.ts**

```typescript
import { ref, computed, onUnmounted } from 'vue'
import { useWorkStore } from '../stores'
import { calculateDuration, formatDuration } from '../utils/date'

export function useTimer() {
  const workStore = useWorkStore()
  const elapsedMs = ref(0)
  let intervalId: number | null = null

  const elapsedDisplay = computed(() => formatDuration(elapsedMs.value))

  const isRunning = computed(() => workStore.currentRecord.isActive)

  function startTimer() {
    if (intervalId) clearInterval(intervalId)

    intervalId = window.setInterval(() => {
      if (workStore.currentRecord.startTime) {
        elapsedMs.value = calculateDuration(
          workStore.currentRecord.startTime,
          new Date().toISOString()
        )
      }
    }, 1000)
  }

  function stopTimer() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    elapsedMs.value = 0
  }

  function resumeTimer() {
    if (workStore.currentRecord.isActive && workStore.currentRecord.startTime) {
      startTimer()
    }
  }

  onUnmounted(() => {
    stopTimer()
  })

  return {
    elapsedMs,
    elapsedDisplay,
    isRunning,
    startTimer,
    stopTimer,
    resumeTimer
  }
}
```

- [ ] **Step 2: 创建 useAlarm.ts**

```typescript
import { ref } from 'vue'

export function useAlarm() {
  const alarmMinutes = ref(0)
  const alarmEnabled = ref(false)
  let alarmTimeoutId: number | null = null
  let audioContext: AudioContext | null = null

  function setAlarm(minutes: number, onTrigger: () => void) {
    clearAlarm()
    alarmMinutes.value = minutes
    alarmEnabled.value = true

    unlockAudio()

    alarmTimeoutId = window.setTimeout(() => {
      triggerAlarm()
      onTrigger()
    }, minutes * 60 * 1000)
  }

  function clearAlarm() {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId)
      alarmTimeoutId = null
    }
    alarmMinutes.value = 0
    alarmEnabled.value = false
  }

  function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContextClass()
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
  }

  function playAlarmSound() {
    if (!audioContext) return

    const playBeep = (time: number, duration: number, frequency: number) => {
      const oscillator = audioContext!.createOscillator()
      const gainNode = audioContext!.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext!.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, time)
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration)

      oscillator.start(time)
      oscillator.stop(time + duration)
    }

    const now = audioContext.currentTime + 0.05
    playBeep(now, 0.3, 880)
    playBeep(now + 0.35, 0.3, 880)
    playBeep(now + 0.7, 0.3, 880)
  }

  function triggerAlarm() {
    playAlarmSound()
  }

  function releaseAudio() {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
      audioContext = null
    }
  }

  return {
    alarmMinutes,
    alarmEnabled,
    setAlarm,
    clearAlarm,
    triggerAlarm,
    releaseAudio
  }
}
```

- [ ] **Step 3: 创建 useVoiceInput.ts**

```typescript
import { ref } from 'vue'

export function useVoiceInput() {
  const isListening = ref(false)
  const transcript = ref('')
  let recognition: SpeechRecognition | null = null

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return false
    }
    return true
  }

  function start(onResult: (text: string) => void) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    try {
      recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'zh-CN'

      recognition.onstart = () => {
        isListening.value = true
      }

      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += t
          } else {
            interimTranscript += t
          }
        }

        const text = finalTranscript || interimTranscript
        transcript.value = text
        onResult(text)
      }

      recognition.onerror = (event) => {
        if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
          stop()
        }
      }

      recognition.onend = () => {
        isListening.value = false
        recognition = null
      }

      recognition.start()
    } catch (e) {
      isListening.value = false
      recognition = null
    }
  }

  function stop() {
    if (recognition) {
      recognition.stop()
      recognition = null
    }
    isListening.value = false
  }

  function toggle(onResult: (text: string) => void) {
    if (isListening.value) {
      stop()
    } else {
      start(onResult)
    }
  }

  return {
    isListening,
    transcript,
    init,
    start,
    stop,
    toggle
  }
}
```

- [ ] **Step 4: 创建 useKeyboard.ts**

```typescript
import { onMounted, onUnmounted } from 'vue'

interface KeyboardHandlers {
  onSpace?: () => void
  onCtrlE?: () => void
  onCtrlV?: () => void
}

export function useKeyboard(handlers: KeyboardHandlers) {
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    if (e.code === 'Space' && handlers.onSpace) {
      e.preventDefault()
      handlers.onSpace()
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e' && handlers.onCtrlE) {
      e.preventDefault()
      handlers.onCtrlE()
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && handlers.onCtrlV) {
      e.preventDefault()
      handlers.onCtrlV()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
```

- [ ] **Step 5: 创建 useNotification.ts**

```typescript
import { ref } from 'vue'

export function useNotification() {
  const permission = ref<NotificationPermission>('default')

  function checkPermission() {
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
    return permission.value
  }

  async function requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result === 'granted'
    } catch {
      return false
    }
  }

  function show(title: string, options?: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const notification = new Notification(title, {
      tag: 'work-time-alarm',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }

  return {
    permission,
    checkPermission,
    requestPermission,
    show
  }
}
```

---

### Task 6: Vue 组件 - 基础组件

**Files:**
- Create: `src/App.vue`
- Create: `src/main.ts`
- Create: `src/components/TimerCard.vue`
- Create: `src/components/WorkNameInput.vue`
- Create: `src/components/TagSection.vue`
- Create: `src/components/ActionButtons.vue`

- [ ] **Step 1: 创建 src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
```

- [ ] **Step 2: 创建 src/App.vue**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkStore, useTagStore, useSettingsStore } from './stores'
import { useKeyboard } from './composables/useKeyboard'
import TimerCard from './components/TimerCard.vue'
import WorkNameInput from './components/WorkNameInput.vue'
import TagSection from './components/TagSection.vue'
import ActionButtons from './components/ActionButtons.vue'
import AlarmSection from './components/AlarmSection.vue'
import VoiceSection from './components/VoiceSection.vue'
import HistorySection from './components/HistorySection.vue'
import StatisticsPanel from './components/StatisticsPanel.vue'
import TagModal from './components/modals/TagModal.vue'
import EditModal from './components/modals/EditModal.vue'
import AlarmModal from './components/modals/AlarmModal.vue'

const workStore = useWorkStore()
const tagStore = useTagStore()
const settingsStore = useSettingsStore()

useKeyboard({
  onSpace: () => {
    if (workStore.currentRecord.isActive) {
      workStore.endWork()
    } else {
      workStore.startWork('')
    }
  },
  onCtrlE: () => {
    // handled by HistorySection
  },
  onCtrlV: () => {
    // handled by VoiceSection
  }
})

onMounted(() => {
  workStore.loadCurrentRecord()
  tagStore.loadTags()
  settingsStore.loadSettings()
})
</script>

<template>
  <div class="app-container">
    <div class="app-card">
      <header class="header-section">
        <span class="header-icon">⏰</span>
        <h1 class="header-title">工作时间记录器</h1>
        <button class="theme-toggle" @click="settingsStore.toggleTheme" title="切换深色模式">
          {{ settingsStore.theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </header>

      <TimerCard />
      <WorkNameInput />
      <TagSection />
      <ActionButtons />
      <AlarmSection />
      <VoiceSection />
      <HistorySection />
      <StatisticsPanel />

      <TagModal />
      <EditModal />
      <AlarmModal />
    </div>
  </div>
</template>
```

- [ ] **Step 3: 创建 src/components/TimerCard.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useWorkStore } from '../stores'
import { formatDuration } from '../utils/date'

const workStore = useWorkStore()

const currentTimeDisplay = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
})

const elapsedDisplay = computed(() => {
  if (!workStore.currentRecord.isActive || !workStore.currentRecord.startTime) {
    return '00:00:00'
  }
  const elapsed = Date.now() - new Date(workStore.currentRecord.startTime).getTime()
  return formatDuration(elapsed)
})
</script>

<template>
  <div class="timer-card">
    <div class="timer-status">
      <span
        class="status-dot"
        :class="{ active: workStore.currentRecord.isActive, stopped: !workStore.currentRecord.isActive }"
      ></span>
      <span class="status-text">
        {{ workStore.currentRecord.isActive ? '进行中' : '未开始' }}
      </span>
    </div>
    <div class="timer-display">{{ currentTimeDisplay }}</div>

    <div v-if="workStore.currentRecord.isActive" class="current-work-name">
      <span>📝</span>
      <span>{{ workStore.currentRecord.workName }}</span>
    </div>

    <div v-if="workStore.currentRecord.isActive" class="elapsed-time">
      已工作: <span>{{ elapsedDisplay }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 创建 src/components/WorkNameInput.vue**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorkStore } from '../stores'

const workStore = useWorkStore()
const workName = ref('')

const isDisabled = computed(() => workStore.currentRecord.isActive)

import { computed } from 'vue'

function handleTagClick(tagName: string) {
  if (!workName.value) {
    workName.value = tagName
  } else {
    workName.value = workName.value + ' - ' + tagName
  }
}

function handleEnter() {
  if (!workStore.currentRecord.isActive && workName.value) {
    workStore.startWork(workName.value)
  }
}

function appendText(text: string) {
  workName.value += text
}

defineExpose({ appendText })
</script>

<template>
  <div class="work-name-section">
    <div class="input-row">
      <span class="input-label">工作名称</span>
      <input
        v-model="workName"
        type="text"
        class="work-name-input"
        placeholder="请输入工作内容名称（可选）"
        maxlength="50"
        :disabled="isDisabled"
        @keypress.enter="handleEnter"
      />
      <button class="btn-voice" title="语音输入">🎤</button>
    </div>
  </div>
</template>
```

- [ ] **Step 5: 创建 src/components/TagSection.vue**

```vue
<script setup lang="ts">
import { useTagStore, useWorkStore } from '../stores'

const tagStore = useTagStore()
const workStore = useWorkStore()

const showTagModal = ref(false)

import { ref } from 'vue'

function selectTag(tagName: string) {
  // handled by WorkNameInput
}
</script>

<template>
  <div class="tag-section">
    <div class="tag-header">
      <span class="tag-label">标签分类</span>
      <button class="btn-manage-tags" @click="showTagModal = true">管理标签</button>
    </div>
    <div class="quick-tags">
      <button
        v-for="tag in tagStore.tags"
        :key="tag"
        class="quick-tag"
        :disabled="workStore.currentRecord.isActive"
        @click="$emit('selectTag', tag)"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 6: 创建 src/components/ActionButtons.vue**

```vue
<script setup lang="ts">
import { useWorkStore } from '../stores'

const workStore = useWorkStore()

function handleStart() {
  workStore.startWork('')
}

function handleStop() {
  workStore.endWork()
}
</script>

<template>
  <div class="action-buttons">
    <button
      class="btn btn-start"
      :disabled="workStore.currentRecord.isActive"
      @click="handleStart"
    >
      <span>▶</span>
      开始工作
    </button>
    <button
      class="btn btn-stop"
      :disabled="!workStore.currentRecord.isActive"
      @click="handleStop"
    >
      <span>⏸</span>
      结束工作
    </button>
  </div>
  <div class="keyboard-hint">
    按 <kbd>空格</kbd> 开始/结束 · <kbd>Ctrl+E</kbd> 导出
  </div>
</template>
```

---

### Task 7: Vue 组件 - 功能组件

**Files:**
- Create: `src/components/AlarmSection.vue`
- Create: `src/components/VoiceSection.vue`
- Create: `src/components/HistorySection.vue`
- Create: `src/components/StatisticsPanel.vue`

- [ ] **Step 1: 创建 src/components/AlarmSection.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAlarm } from '../composables/useAlarm'
import { useWorkStore } from '../stores'

const workStore = useWorkStore()
const { alarmMinutes, alarmEnabled, setAlarm, clearAlarm } = useAlarm()

const showOptions = ref(false)
const customMinutes = ref(0)
const showAlarmModal = ref(false)

function toggleOptions() {
  showOptions.value = !showOptions.value
}

function selectPreset(minutes: number) {
  setAlarm(minutes, () => {
    showAlarmModal.value = true
  })
}

function setCustom() {
  if (customMinutes.value > 0 && customMinutes.value <= 480) {
    setAlarm(customMinutes.value, () => {
      showAlarmModal.value = true
    })
  }
}
</script>

<template>
  <div class="reminder-section">
    <div class="reminder-header">
      <span class="reminder-icon">⏰</span>
      <span class="reminder-label">闹钟提醒</span>
      <label class="alarm-toggle">
        <input type="checkbox" v-model="showOptions" />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div v-show="showOptions" class="reminder-options">
      <div class="preset-buttons">
        <button class="preset-btn" @click="selectPreset(5)">5分钟</button>
        <button class="preset-btn" @click="selectPreset(10)">10分钟</button>
        <button class="preset-btn" @click="selectPreset(15)">15分钟</button>
        <button class="preset-btn" @click="selectPreset(30)">30分钟</button>
        <button class="preset-btn" @click="selectPreset(45)">45分钟</button>
      </div>

      <div class="custom-alarm">
        <input
          v-model.number="customMinutes"
          type="number"
          class="custom-alarm-input"
          placeholder="自定义"
          min="1"
          max="480"
        />
        <span class="custom-alarm-unit">分钟</span>
        <button class="btn-set-alarm" @click="setCustom">设置</button>
      </div>

      <div v-if="alarmEnabled" class="alarm-status set">
        已设置 {{ alarmMinutes }} 分钟闹钟
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 创建 src/components/VoiceSection.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVoiceInput } from '../composables/useVoiceInput'
import { useSettingsStore } from '../stores'

const settingsStore = useSettingsStore()
const { isListening, init, toggle } = useVoiceInput()

const isAvailable = ref(false)

onMounted(() => {
  isAvailable.value = init()
})

function handleToggle() {
  toggle((text) => {
    // emit text to parent
  })
}

function handleVoiceShortcut() {
  if (settingsStore.voiceShortcutEnabled) {
    handleToggle()
  }
}
</script>

<template>
  <div class="voice-section">
    <div class="voice-row">
      <label class="voice-toggle">
        <input
          type="checkbox"
          v-model="settingsStore.voiceShortcutEnabled"
        />
        <span class="toggle-slider"></span>
        <span class="voice-label">🎤 快捷键语音</span>
      </label>
      <span class="voice-hint">按 <kbd>Ctrl+V</kbd> 开始/停止语音输入</span>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 创建 src/components/HistorySection.vue**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkStore } from '../stores'
import { exportToCSV } from '../utils/csv'
import { formatDate, formatTime, formatDuration, escapeHtml } from '../utils/date'

const workStore = useWorkStore()

const filterDate = ref('')
const showEditModal = ref(false)
const editingRecord = ref<WorkRecord | null>(null)

function handleFilter() {
  workStore.setFilterDate(filterDate.value || null)
}

function handleReset() {
  filterDate.value = ''
  workStore.setFilterDate(null)
}

function handleExport() {
  exportToCSV(workStore.records)
}

function handleDelete(startTime: string) {
  if (confirm('确定要删除这条记录吗？此操作不可恢复！')) {
    workStore.deleteRecord(startTime)
  }
}

function handleEdit(record: WorkRecord) {
  editingRecord.value = record
  showEditModal.value = true
}
</script>

<template>
  <div class="history-section">
    <div class="history-header">
      <div class="history-title">
        <span>📋</span>
        <span>历史记录</span>
      </div>
      <div class="history-actions">
        <button class="btn-action btn-export" @click="handleExport">📤 导出</button>
        <button class="btn-action btn-import">📥 导入</button>
        <button class="btn-action btn-clear" @click="workStore.clearHistory">清空</button>
      </div>
    </div>

    <div class="filter-bar">
      <input v-model="filterDate" type="date" class="date-filter" />
      <button class="btn-filter" @click="handleFilter">筛选</button>
      <button class="btn-reset" @click="handleReset">重置</button>
    </div>

    <div class="history-list">
      <div v-if="workStore.filteredRecords.length === 0" class="empty-state">
        暂无记录
      </div>
      <div
        v-for="record in workStore.filteredRecords"
        :key="record.startTime"
        class="history-item"
      >
        <div class="history-item-header">
          <div class="history-header-left">
            <span class="history-date">{{ formatDate(record.startTime) }}</span>
            <span class="history-duration">{{ formatDuration(record.duration) }}</span>
          </div>
          <div class="history-item-actions">
            <button
              class="btn-edit-record"
              @click="handleEdit(record)"
              title="编辑此记录"
            >
              ✏️
            </button>
            <button
              class="btn-delete-record"
              @click="handleDelete(record.startTime)"
              title="删除此记录"
            >
              🗑️
            </button>
          </div>
        </div>
        <div v-if="record.workName" class="history-work-name">
          📝 {{ escapeHtml(record.workName) }}
        </div>
        <div class="history-time">
          <span>🕐 开始: {{ formatTime(record.startTime) }}</span>
          <span>🕐 结束: {{ formatTime(record.endTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 创建 src/components/StatisticsPanel.vue**

```vue
<script setup lang="ts">
import { useWorkStore } from '../stores'
import { formatDuration } from '../utils/date'

const workStore = useWorkStore()
</script>

<template>
  <div class="statistics-section">
    <div class="stat-item">
      <span class="stat-label">今日总计</span>
      <span class="stat-value">{{ formatDuration(workStore.todayTotal) }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">本周总计</span>
      <span class="stat-value">{{ formatDuration(workStore.weekTotal) }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">本月总计</span>
      <span class="stat-value">{{ formatDuration(workStore.monthTotal) }}</span>
    </div>
  </div>
</template>
```

---

### Task 8: Modal 组件

**Files:**
- Create: `src/components/modals/TagModal.vue`
- Create: `src/components/modals/EditModal.vue`
- Create: `src/components/modals/AlarmModal.vue`

- [ ] **Step 1: 创建 src/components/modals/TagModal.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useTagStore } from '../../stores'

const tagStore = useTagStore()

const newTagName = ref('')
const showModal = ref(false)

function open() {
  showModal.value = true
}

function close() {
  showModal.value = false
  newTagName.value = ''
}

function addTag() {
  if (newTagName.value.trim()) {
    tagStore.addTag(newTagName.value.trim())
    newTagName.value = ''
  }
}

function deleteTag(name: string) {
  if (confirm(`确定要删除标签"${name}"吗？`)) {
    tagStore.deleteTag(name)
  }
}

defineExpose({ open })
</script>

<template>
  <div v-if="showModal" class="modal" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>🏷️ 标签管理</h3>
        <button class="btn-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="tag-add-section">
          <input
            v-model="newTagName"
            type="text"
            class="tag-input"
            placeholder="输入新标签名称"
            maxlength="20"
            @keypress.enter="addTag"
          />
          <button class="btn-add-tag" @click="addTag">➕ 添加</button>
        </div>
        <div class="tag-list">
          <div
            v-for="tag in tagStore.tags"
            :key="tag"
            class="tag-item"
          >
            <span class="tag-item-name">{{ tag }}</span>
            <button class="btn-delete-tag" @click="deleteTag(tag)">🗑️ 删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 创建 src/components/modals/EditModal.vue**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorkStore } from '../../stores'
import { toDatetimeLocal } from '../../utils/date'
import type { WorkRecord } from '../../types'

const workStore = useWorkStore()

const showModal = ref(false)
const editingRecord = ref<WorkRecord | null>(null)
const editWorkName = ref('')
const editStartTime = ref('')
const editEndTime = ref('')

function open(record: WorkRecord) {
  editingRecord.value = record
  editWorkName.value = record.workName
  editStartTime.value = toDatetimeLocal(record.startTime)
  editEndTime.value = toDatetimeLocal(record.endTime)
  showModal.value = true
}

function close() {
  showModal.value = false
  editingRecord.value = null
}

function save() {
  if (!editingRecord.value) return

  const startTime = new Date(editStartTime.value)
  const endTime = new Date(editEndTime.value)

  if (endTime <= startTime) {
    alert('结束时间必须晚于开始时间')
    return
  }

  workStore.updateRecord(editingRecord.value.startTime, {
    workName: editWorkName.value.trim() || '未命名工作',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  })

  close()
}

defineExpose({ open })
</script>

<template>
  <div v-if="showModal" class="modal" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>✏️ 编辑记录</h3>
        <button class="btn-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="edit-form">
          <div class="form-group">
            <label class="form-label">📝 工作内容</label>
            <input
              v-model="editWorkName"
              type="text"
              class="form-input"
              placeholder="工作内容名称"
              maxlength="50"
            />
          </div>
          <div class="form-group">
            <label class="form-label">⏰ 开始时间</label>
            <input v-model="editStartTime" type="datetime-local" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">⏰ 结束时间</label>
            <input v-model="editEndTime" type="datetime-local" class="form-input" />
          </div>
          <div class="form-actions">
            <button class="btn btn-cancel" @click="close">取消</button>
            <button class="btn btn-save" @click="save">💾 保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 创建 src/components/modals/AlarmModal.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'

const showModal = ref(false)

function open() {
  showModal.value = true
}

function close() {
  showModal.value = false
}

function continueTimer() {
  close()
  // resume alarm
}

function endWork() {
  close()
  // emit end work
}

defineExpose({ open })
</script>

<template>
  <div v-if="showModal" class="modal alarm-modal">
    <div class="modal-content alarm-modal-content">
      <div class="alarm-modal-icon">🔔</div>
      <h3 class="alarm-modal-title">时间到！</h3>
      <p class="alarm-modal-message">您设置的闹钟时间已经到了</p>
      <div class="alarm-modal-actions">
        <button class="btn btn-continue" @click="continueTimer">继续计时</button>
        <button class="btn btn-end" @click="endWork">结束工作</button>
      </div>
    </div>
  </div>
</template>
```

---

### Task 9: 样式迁移

**Files:**
- Create: `src/assets/styles/main.css`

- [ ] **Step 1: 创建 src/assets/styles/main.css**

将原 `style.css` 中的 CSS 变量和基础样式迁移到新的 Vue 项目中。保留所有现有样式，确保组件样式与原版一致。

```css
/* CSS 变量定义 - 从原 style.css 迁移 */
:root {
  --bg-gradient-1: #d4dfe8;
  --bg-gradient-2: #b8cad8;
  --bg-gradient-3: #9ab5c4;
  --card-bg: rgba(255, 255, 255, 0.85);
  --card-shadow: rgba(0, 0, 0, 0.06);
  --primary-gradient: linear-gradient(135deg, #6a9ec0 0%, #4a7ea6 100%);
  --primary-solid: #5a9bc4;
  --primary-dark: #4a7ea6;
  --text-primary: #333;
  --text-secondary: #666;
  --text-muted: #9ca3af;
  --text-on-primary: white;
  --border-color: #e5e7eb;
  --border-focus: #5a9bc4;
  --bg-light: #f9fafb;
  --bg-lighter: #f3f4f6;
  --bg-input: #f9fafb;
  --success-bg: #dbeafe;
  --success-text: #3b82f6;
  --danger-bg: #fee2e2;
  --danger-text: #ef4444;
  --history-border: #f3f4f6;
  --history-bg: #f9fafb;
  --history-hover: #f3f4f6;
  --tag-bg: #f3f4f6;
}

[data-theme="dark"] {
  --bg-gradient-1: #1a1a2e;
  --bg-gradient-2: #16213e;
  --bg-gradient-3: #0f3460;
  --card-bg: rgba(30, 30, 50, 0.9);
  --card-shadow: rgba(0, 0, 0, 0.3);
  --text-primary: #e5e5e5;
  --text-secondary: #b0b0b0;
  --text-muted: #808080;
  --border-color: #3a3a4a;
  --bg-light: #2a2a3a;
  --bg-lighter: #252535;
  --bg-input: #2a2a3a;
  --success-bg: #1a3a5c;
  --success-text: #6ba3d6;
  --danger-bg: #4a2020;
  --danger-text: #e07070;
  --history-border: #3a3a4a;
  --history-bg: #2a2a3a;
  --history-hover: #3a3a4a;
  --tag-bg: #3a3a4a;
}

/* 基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 50%, var(--bg-gradient-3) 100%);
  min-height: 100vh;
  padding: 8px;
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

/* 组件样式 - 与原 style.css 保持一致 */
/* App Container */
.app-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 8px 0;
}

.app-card {
  width: 100%;
  max-width: 672px;
  background: var(--card-bg);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  padding: 16px 20px;
  box-shadow: 0 8px 30px var(--card-shadow);
  transition: background 0.3s;
}

/* 其他所有样式从原 style.css 迁移... */
/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
}

/* ... 更多样式 */
```

---

## 自审检查清单

- [ ] 所有 TypeScript 类型已定义
- [ ] Pinia stores 正确管理状态
- [ ] Composables 封装了可复用逻辑
- [ ] Vue 组件正确使用了 Composition API
- [ ] 样式已迁移并保持一致
- [ ] PWA 功能（Service Worker）需要重新实现
- [ ] 所有功能（计时、闹钟、语音、导入导出）已实现

---

## 实施选项

**计划已保存到 `docs/superpowers/plans/2026-04-28-work-time-recorder-vue-refactor.md`**

**1. Subagent-Driven（推荐）** - 我调度子代理逐任务执行，任务间进行审核，快速迭代

**2. Inline Execution** - 在当前会话中使用 executing-plans 执行，批量执行带检查点

**您希望采用哪种方式？**
