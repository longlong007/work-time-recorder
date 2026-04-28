# Vue 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将工作时间记录器从 Vanilla JS 迁移到 Vue 3 + TypeScript + Vite 技术栈

**Architecture:** 使用 Vue 3 组合式 API + Pinia 状态管理 + Vue Router 多页面 + Tailwind CSS + vite-plugin-pwa

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS, vite-plugin-pwa

---

## 文件结构

```
src/
├── assets/
│   └── main.css              # 全局样式 + Tailwind
├── components/
│   ├── TimerCard.vue         # 计时器卡片
│   ├── TagSelector.vue       # 标签选择
│   ├── HistoryList.vue       # 历史记录列表
│   ├── AlarmPanel.vue        # 闹钟设置面板
│   ├── VoiceInput.vue        # 语音输入组件
│   └── Modal.vue             # 通用弹窗
├── views/
│   ├── HomeView.vue          # 首页（计时器）
│   ├── HistoryView.vue       # 历史记录页
│   └── SettingsView.vue      # 设置页
├── stores/
│   ├── timer.ts              # 计时器状态
│   ├── records.ts            # 历史记录
│   ├── tags.ts               # 标签管理
│   └── settings.ts           # 设置（闹钟、主题、语音）
├── composables/
│   ├── useAlarm.ts           # 闹钟逻辑
│   ├── useVoiceInput.ts      # 语音输入
│   └── useExport.ts          # 导入导出
├── router/
│   └── index.ts
├── App.vue
└── main.ts
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/assets/main.css`

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
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vite-plugin-pwa": "^0.19.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: '工作时间记录器',
        short_name: '工时记录',
        description: '简洁美观的工作时间记录工具',
        theme_color: '#5a9bc4',
        background_color: '#d4dfe8',
        display: 'standalone',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="%235a9bc4" width="512" height="512" rx="96"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="280">⏰</text></svg>',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
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
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
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

- [ ] **Step 5: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5a9bc4',
          dark: '#4a7ea6',
          light: '#6a9ec0'
        }
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 6: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 7: 创建 index.html**

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

- [ ] **Step 8: 创建 src/assets/main.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-gradient-1: #d4dfe8;
  --bg-gradient-2: #b8cad8;
  --bg-gradient-3: #9ab5c4;
  --card-bg: rgba(255, 255, 255, 0.85);
}

[data-theme="dark"] {
  --bg-gradient-1: #1a1a2e;
  --bg-gradient-2: #16213e;
  --bg-gradient-3: #0f3460;
  --card-bg: rgba(30, 30, 50, 0.9);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 50%, var(--bg-gradient-3) 100%);
  min-height: 100vh;
  color: #333;
}

[data-theme="dark"] body {
  color: #e5e5e5;
}

.app-container {
  @apply w-full max-w-2xl mx-auto min-h-screen py-4 px-2;
}

.app-card {
  @apply w-full bg-white/85 backdrop-blur8 rounded-3xl p-4 shadow-lg;
}

[data-theme="dark"] .app-card {
  @apply bg-slate-900/90;
}
```

- [ ] **Step 9: 创建 src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
```

- [ ] **Step 10: 创建 src/App.vue**

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useSettingsStore } from './stores/settings'
import { onMounted } from 'vue'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.initTheme()
})
</script>

<template>
  <div class="app-container">
    <div class="app-card">
      <RouterView />
    </div>
  </div>
</template>
```

- [ ] **Step 11: 创建 src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

- [ ] **Step 12: 创建 src/router/index.ts**

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue')
    }
  ]
})

export default router
```

- [ ] **Step 13: 安装依赖并验证项目运行**

Run: `npm install`
Expected: 安装成功

Run: `npm run dev`
Expected: Vite 开发服务器启动成功

- [ ] **Step 14: 提交**

```bash
git add -A
git commit -m "feat: initialize Vue project with Vite + TypeScript + Tailwind"
```

---

## Task 2: Pinia Stores

**Files:**
- Create: `src/stores/timer.ts`
- Create: `src/stores/records.ts`
- Create: `src/stores/tags.ts`
- Create: `src/stores/settings.ts`

- [ ] **Step 1: 创建 src/stores/timer.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface TimerRecord {
  startTime: string | null
  endTime: string | null
  isActive: boolean
  workName: string
}

const STORAGE_KEY = 'currentRecord'

export const useTimerStore = defineStore('timer', () => {
  const currentRecord = ref<TimerRecord>({
    startTime: null,
    endTime: null,
    isActive: false,
    workName: ''
  })

  const elapsedMs = ref(0)
  let elapsedInterval: ReturnType<typeof setInterval> | null = null

  const formattedElapsed = computed(() => {
    const totalSeconds = Math.floor(elapsedMs.value / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  function loadCurrentRecord() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const record = JSON.parse(saved)
      if (record.isActive && record.startTime) {
        currentRecord.value = record
        const start = new Date(record.startTime)
        const now = new Date()
        if (start.toDateString() === now.toDateString()) {
          startElapsedTimer()
        } else {
          endWork()
        }
      }
    }
  }

  function saveCurrentRecord() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRecord.value))
  }

  function startWork(workName: string) {
    currentRecord.value = {
      startTime: new Date().toISOString(),
      endTime: null,
      isActive: true,
      workName: workName || '未命名工作'
    }
    saveCurrentRecord()
    startElapsedTimer()
  }

  function endWork() {
    if (!currentRecord.value.isActive || !currentRecord.value.startTime) return

    const endTime = new Date().toISOString()
    const duration = new Date(endTime).getTime() - new Date(currentRecord.value.startTime).getTime()

    return {
      startTime: currentRecord.value.startTime,
      endTime,
      duration,
      workName: currentRecord.value.workName
    }
  }

  function clearCurrentRecord() {
    currentRecord.value = {
      startTime: null,
      endTime: null,
      isActive: false,
      workName: ''
    }
    localStorage.removeItem(STORAGE_KEY)
    stopElapsedTimer()
  }

  function startElapsedTimer() {
    if (elapsedInterval) clearInterval(elapsedInterval)
    elapsedInterval = setInterval(() => {
      if (currentRecord.value.startTime) {
        elapsedMs.value = Date.now() - new Date(currentRecord.value.startTime).getTime()
      }
    }, 1000)
  }

  function stopElapsedTimer() {
    if (elapsedInterval) {
      clearInterval(elapsedInterval)
      elapsedInterval = null
    }
    elapsedMs.value = 0
  }

  return {
    currentRecord,
    elapsedMs,
    formattedElapsed,
    loadCurrentRecord,
    startWork,
    endWork,
    clearCurrentRecord
  }
})
```

- [ ] **Step 2: 创建 src/stores/records.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface WorkRecord {
  startTime: string
  endTime: string
  duration: number
  workName: string
}

const STORAGE_KEY = 'workTimeRecords'

export const useRecordsStore = defineStore('records', () => {
  const records = ref<WorkRecord[]>([])
  const filterDate = ref<string | null>(null)

  const filteredRecords = computed(() => {
    if (!filterDate.value) return records.value
    return records.value.filter(record => {
      const recordDate = new Date(record.startTime).toISOString().split('T')[0]
      return recordDate === filterDate.value
    })
  })

  function loadRecords() {
    const saved = localStorage.getItem(STORAGE_KEY)
    records.value = saved ? JSON.parse(saved) : []
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  }

  function addRecord(record: WorkRecord) {
    records.value.unshift(record)
    records.value.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    saveRecords()
  }

  function updateRecord(startTime: string, updates: Partial<WorkRecord>) {
    const index = records.value.findIndex(r => r.startTime === startTime)
    if (index !== -1) {
      records.value[index] = { ...records.value[index], ...updates }
      records.value.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      saveRecords()
    }
  }

  function deleteRecord(startTime: string) {
    records.value = records.value.filter(r => r.startTime !== startTime)
    saveRecords()
  }

  function clearRecords() {
    records.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  function setFilter(date: string | null) {
    filterDate.value = date
  }

  function getTodayTotal(): number {
    const today = new Date().toISOString().split('T')[0]
    return records.value
      .filter(r => r.startTime.startsWith(today))
      .reduce((sum, r) => sum + r.duration, 0)
  }

  function getWeekTotal(): number {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    weekStart.setHours(0, 0, 0, 0)

    return records.value
      .filter(r => new Date(r.startTime) >= weekStart)
      .reduce((sum, r) => sum + r.duration, 0)
  }

  function getMonthTotal(): number {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return records.value
      .filter(r => new Date(r.startTime) >= monthStart)
      .reduce((sum, r) => sum + r.duration, 0)
  }

  return {
    records,
    filterDate,
    filteredRecords,
    loadRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    clearRecords,
    setFilter,
    getTodayTotal,
    getWeekTotal,
    getMonthTotal
  }
})
```

- [ ] **Step 3: 创建 src/stores/tags.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'workTags'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<string[]>(['开发', '会议', '学习', '调试', '文档'])

  function loadTags() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      tags.value = JSON.parse(saved)
    }
  }

  function saveTags() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags.value))
  }

  function addTag(tagName: string) {
    if (!tags.value.includes(tagName)) {
      tags.value.push(tagName)
      saveTags()
    }
  }

  function deleteTag(tagName: string) {
    tags.value = tags.value.filter(t => t !== tagName)
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

- [ ] **Step 4: 创建 src/stores/settings.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const alarmEnabled = ref(false)
  const alarmMinutes = ref(0)
  const theme = ref<'light' | 'dark' | 'system'>('system')
  const voiceEnabled = ref(false)

  function initTheme() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      theme.value = savedTheme
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme.value === 'dark' || (theme.value === 'system' && prefersDark)

    document.documentElement.classList.toggle('dark', isDark)

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (theme.value === 'system') {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    })
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      document.documentElement.classList.remove('dark')
      theme.value = 'light'
    } else {
      document.documentElement.classList.add('dark')
      theme.value = 'dark'
    }
    localStorage.setItem('theme', theme.value)
  }

  function setAlarmEnabled(enabled: boolean) {
    alarmEnabled.value = enabled
  }

  function setAlarmMinutes(minutes: number) {
    alarmMinutes.value = minutes
  }

  function setVoiceEnabled(enabled: boolean) {
    voiceEnabled.value = enabled
    localStorage.setItem('voiceShortcutEnabled', String(enabled))
  }

  function loadSettings() {
    const voice = localStorage.getItem('voiceShortcutEnabled')
    if (voice !== null) {
      voiceEnabled.value = voice === 'true'
    }
  }

  return {
    alarmEnabled,
    alarmMinutes,
    theme,
    voiceEnabled,
    initTheme,
    toggleTheme,
    setAlarmEnabled,
    setAlarmMinutes,
    setVoiceEnabled,
    loadSettings
  }
})
```

- [ ] **Step 5: 提交**

```bash
git add src/stores/*.ts
git commit -m "feat: add Pinia stores (timer, records, tags, settings)"
```

---

## Task 3: 基础组件

**Files:**
- Create: `src/components/Modal.vue`
- Create: `src/components/TimerCard.vue`

- [ ] **Step 1: 创建 src/components/Modal.vue**

```vue
<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in"
      @click="handleBackdropClick"
    >
      <div class="bg-white dark:bg-slate-800 rounded-2xl w-11/12 max-w-md shadow-2xl animate-slide-up">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: 创建 src/components/TimerCard.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer'

const timerStore = useTimerStore()

const statusClass = computed(() => {
  return timerStore.currentRecord.isActive ? 'bg-green-500' : 'bg-red-500'
})

const statusText = computed(() => {
  return timerStore.currentRecord.isActive ? '进行中' : '未开始'
})

const currentTime = computed(() => {
  return new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
})
</script>

<template>
  <div class="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white text-center shadow-lg mb-4">
    <div class="flex items-center justify-center gap-2 mb-2">
      <span :class="['w-3 h-3 rounded-full', statusClass, timerStore.currentRecord.isActive ? 'animate-pulse' : '']"></span>
      <span class="text-sm opacity-90">{{ statusText }}</span>
    </div>

    <div class="text-5xl font-bold tabular-nums mb-2">{{ currentTime }}</div>

    <div v-if="timerStore.currentRecord.isActive" class="inline-block px-4 py-2 bg-white/20 rounded-lg mb-2">
      <span>📝</span>
      <span>{{ timerStore.currentRecord.workName }}</span>
    </div>

    <div v-if="timerStore.currentRecord.isActive" class="text-lg opacity-90">
      已工作: <span class="font-bold tabular-nums">{{ timerStore.formattedElapsed }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 创建 src/components/TagSelector.vue**

```vue
<script setup lang="ts">
import { useTagsStore } from '@/stores/tags'

const tagsStore = useTagsStore()
const emit = defineEmits<{
  select: [tag: string]
}>()

function handleSelect(tag: string) {
  emit('select', tag)
}
</script>

<template>
  <div class="mb-4">
    <div class="flex justify-between items-center mb-2">
      <span class="text-xs text-gray-500">标签分类</span>
      <button class="text-xs bg-gradient-to-r from-primary to-primary-dark text-white px-3 py-1 rounded-lg">
        管理标签
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="tag in tagsStore.tags"
        :key="tag"
        class="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-primary hover:bg-blue-100 transition-colors"
        @click="handleSelect(tag)"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 创建 src/components/VoiceInput.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  result: [text: string]
}>()

const isListening = ref(false)
let recognition: SpeechRecognition | null = null

function toggle() {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return

  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'zh-CN'

  recognition.onresult = (event) => {
    let transcript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript
    }
    emit('result', transcript)
  }

  recognition.onend = () => {
    isListening.value = false
  }

  recognition.start()
  isListening.value = true
}

function stopListening() {
  recognition?.stop()
  recognition = null
  isListening.value = false
}
</script>

<template>
  <button
    :class="[
      'px-4 py-2 rounded-lg transition-all',
      isListening
        ? 'bg-red-500 animate-pulse'
        : 'bg-gradient-to-r from-primary to-primary-dark text-white'
    ]"
    @click="toggle"
  >
    {{ isListening ? '🔴' : '🎤' }}
  </button>
</template>
```

- [ ] **Step 5: 提交**

```bash
git add src/components/*.vue
git commit -m "feat: add base components (Modal, TimerCard, TagSelector, VoiceInput)"
```

---

## Task 4: HomeView 首页

**Files:**
- Create: `src/views/HomeView.vue`

- [ ] **Step 1: 创建 src/views/HomeView.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTimerStore } from '@/stores/timer'
import { useRecordsStore } from '@/stores/records'
import { useSettingsStore } from '@/stores/settings'
import TimerCard from '@/components/TimerCard.vue'
import TagSelector from '@/components/TagSelector.vue'
import VoiceInput from '@/components/VoiceInput.vue'
import AlarmPanel from '@/components/AlarmPanel.vue'

const timerStore = useTimerStore()
const recordsStore = useRecordsStore()
const settingsStore = useSettingsStore()

const workName = ref('')

onMounted(() => {
  timerStore.loadCurrentRecord()
  recordsStore.loadRecords()
  settingsStore.loadSettings()
})

function handleStart() {
  timerStore.startWork(workName.value)
  workName.value = ''
}

function handleStop() {
  const record = timerStore.endWork()
  if (record) {
    recordsStore.addRecord(record)
  }
  timerStore.clearCurrentRecord()
}

function handleTagSelect(tag: string) {
  workName.value = workName.value ? `${workName.value} - ${tag}` : tag
}

function handleVoiceResult(text: string) {
  workName.value += text
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-center gap-2 mb-4">
      <span class="text-2xl">⏰</span>
      <h1 class="text-xl font-bold">工作时间记录器</h1>
      <button
        class="ml-auto bg-white/20 px-3 py-1 rounded-lg text-lg"
        @click="settingsStore.toggleTheme()"
      >
        🌙
      </button>
    </div>

    <!-- Timer Card -->
    <TimerCard />

    <!-- Work Name Input -->
    <div class="flex items-center gap-3 mb-4">
      <span class="text-sm text-gray-600 whitespace-nowrap">工作名称</span>
      <input
        v-model="workName"
        type="text"
        placeholder="请输入工作内容名称（可选）"
        maxlength="50"
        :disabled="timerStore.currentRecord.isActive"
        class="flex-1 px-4 py-2.5 border-2 border-transparent rounded-xl bg-gray-50 focus:bg-white focus:border-primary transition-colors text-sm"
      />
      <VoiceInput @result="handleVoiceResult" />
    </div>

    <!-- Tag Selector -->
    <TagSelector @select="handleTagSelect" />

    <!-- Action Buttons -->
    <div class="grid grid-cols-2 gap-2 mb-4">
      <button
        class="py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white shadow-md disabled:opacity-50"
        :disabled="timerStore.currentRecord.isActive"
        @click="handleStart"
      >
        <span>▶</span> 开始工作
      </button>
      <button
        class="py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md disabled:opacity-50"
        :disabled="!timerStore.currentRecord.isActive"
        @click="handleStop"
      >
        <span>⏸</span> 结束工作
      </button>
    </div>

    <!-- Keyboard Hint -->
    <div class="text-center text-xs text-gray-400 mb-4">
      按 <kbd class="bg-gray-100 px-1 rounded">空格</kbd> 开始/结束
    </div>

    <!-- Alarm Panel -->
    <AlarmPanel />

    <!-- Statistics -->
    <div class="grid grid-cols-3 gap-2 p-3 bg-blue-50 rounded-xl">
      <div class="text-center p-2 bg-white/50 rounded-lg">
        <span class="block text-xs text-gray-500 mb-1">今日总计</span>
        <span class="text-sm font-bold text-primary">{{ formatDuration(recordsStore.getTodayTotal()) }}</span>
      </div>
      <div class="text-center p-2 bg-white/50 rounded-lg">
        <span class="block text-xs text-gray-500 mb-1">本周总计</span>
        <span class="text-sm font-bold text-primary">{{ formatDuration(recordsStore.getWeekTotal()) }}</span>
      </div>
      <div class="text-center p-2 bg-white/50 rounded-lg">
        <span class="block text-xs text-gray-500 mb-1">本月总计</span>
        <span class="text-sm font-bold text-primary">{{ formatDuration(recordsStore.getMonthTotal()) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
</script>
```

- [ ] **Step 2: 提交**

```bash
git add src/views/HomeView.vue
git commit -m "feat: add HomeView with timer controls"
```

---

## Task 5: HistoryView 历史记录页

**Files:**
- Create: `src/views/HistoryView.vue`
- Create: `src/components/HistoryList.vue`

- [ ] **Step 1: 创建 src/components/HistoryList.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { WorkRecord } from '@/stores/records'

const props = defineProps<{
  records: WorkRecord[]
}>()

const emit = defineEmits<{
  edit: [startTime: string]
  delete: [startTime: string]
}>()

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="record in records"
      :key="record.startTime"
      class="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
    >
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-3">
          <span class="font-semibold">{{ formatDate(record.startTime) }}</span>
          <span class="px-3 py-1 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-medium">
            {{ formatDuration(record.duration) }}
          </span>
        </div>
        <div class="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <button
            class="p-1.5 rounded hover:bg-blue-100"
            @click="emit('edit', record.startTime)"
          >
            ✏️
          </button>
          <button
            class="p-1.5 rounded hover:bg-red-100"
            @click="emit('delete', record.startTime)"
          >
            🗑️
          </button>
        </div>
      </div>

      <div v-if="record.workName" class="text-sm text-blue-600 mb-1 font-medium">
        📝 {{ record.workName }}
      </div>

      <div class="flex gap-5 text-sm text-gray-500">
        <span>🕐 开始: {{ formatTime(record.startTime) }}</span>
        <span>🕐 结束: {{ formatTime(record.endTime) }}</span>
      </div>
    </div>

    <div v-if="records.length === 0" class="text-center py-10 text-gray-400">
      暂无记录
    </div>
  </div>
</template>
```

- [ ] **Step 2: 创建 src/views/HistoryView.vue**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecordsStore } from '@/stores/records'
import HistoryList from '@/components/HistoryList.vue'
import Modal from '@/components/Modal.vue'

const recordsStore = useRecordsStore()

const filterDate = ref('')
const showEditModal = ref(false)
const editingRecord = ref<{ startTime: string; workName: string; start: string; end: string } | null>(null)

onMounted(() => {
  recordsStore.loadRecords()
  filterDate.value = new Date().toISOString().split('T')[0]
  recordsStore.setFilter(filterDate.value)
})

const displayedRecords = computed(() => recordsStore.filteredRecords)

function applyFilter() {
  recordsStore.setFilter(filterDate.value || null)
}

function resetFilter() {
  filterDate.value = new Date().toISOString().split('T')[0]
  recordsStore.setFilter(filterDate.value)
}

function handleEdit(startTime: string) {
  const record = recordsStore.records.find(r => r.startTime === startTime)
  if (record) {
    editingRecord.value = {
      startTime,
      workName: record.workName,
      start: toDatetimeLocal(record.startTime),
      end: toDatetimeLocal(record.endTime)
    }
    showEditModal.value = true
  }
}

function handleDelete(startTime: string) {
  if (confirm('确定要删除这条记录吗？')) {
    recordsStore.deleteRecord(startTime)
  }
}

function saveEdit() {
  if (!editingRecord.value) return
  const start = new Date(editingRecord.value.start)
  const end = new Date(editingRecord.value.end)
  if (end <= start) {
    alert('结束时间必须晚于开始时间')
    return
  }
  recordsStore.updateRecord(editingRecord.value.startTime, {
    workName: editingRecord.value.workName,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    duration: end.getTime() - start.getTime()
  })
  showEditModal.value = false
  editingRecord.value = null
}

function toDatetimeLocal(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function exportCSV() {
  const records = recordsStore.records
  let csv = '日期,开始时间,结束时间,工作时长(小时),工作内容\n'
  records.forEach(r => {
    const start = new Date(r.startTime)
    const end = new Date(r.endTime)
    const date = start.toISOString().split('T')[0]
    const startTime = toDatetimeLocal(r.startTime)
    const endTime = toDatetimeLocal(r.endTime)
    const hours = (r.duration / 3600000).toFixed(2)
    csv += `${date},${startTime},${endTime},${hours},${r.workName}\n`
  })
  const blob = new Blob(['﻿' + csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `工作记录_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

function clearAll() {
  if (confirm('确定要清空所有历史记录吗？')) {
    recordsStore.clearRecords()
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-center gap-2 mb-4">
      <span class="text-xl">📋</span>
      <h1 class="text-xl font-bold">历史记录</h1>
    </div>

    <!-- Filter Bar -->
    <div class="flex gap-2 mb-4">
      <input
        v-model="filterDate"
        type="date"
        class="flex-1 px-3 py-2 border-2 rounded-xl bg-gray-50 focus:bg-white focus:border-primary text-sm"
      />
      <button
        class="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl text-sm"
        @click="applyFilter"
      >
        筛选
      </button>
      <button
        class="px-4 py-2 bg-gray-100 text-primary rounded-xl text-sm"
        @click="resetFilter"
      >
        重置
      </button>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mb-4">
      <button
        class="flex-1 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl text-sm"
        @click="exportCSV"
      >
        📤 导出
      </button>
      <button
        class="flex-1 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-xl text-sm"
        @click="clearAll"
      >
        清空
      </button>
    </div>

    <!-- History List -->
    <div class="max-h-96 overflow-y-auto border-l-2 border-primary pl-3 mb-4">
      <HistoryList
        :records="displayedRecords"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- Edit Modal -->
    <Modal :show="showEditModal" @close="showEditModal = false">
      <div class="p-5">
        <h3 class="text-lg font-bold mb-4">✏️ 编辑记录</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">工作内容</label>
            <input
              v-model="editingRecord!.workName"
              type="text"
              class="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">开始时间</label>
            <input
              v-model="editingRecord!.start"
              type="datetime-local"
              class="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">结束时间</label>
            <input
              v-model="editingRecord!.end"
              type="datetime-local"
              class="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button
            class="flex-1 py-2 bg-gray-100 rounded-lg"
            @click="showEditModal = false"
          >
            取消
          </button>
          <button
            class="flex-1 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg"
            @click="saveEdit"
          >
            💾 保存
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
```

- [ ] **Step 3: 提交**

```bash
git add src/views/HistoryView.vue src/components/HistoryList.vue
git commit -m "feat: add HistoryView with filter and edit functionality"
```

---

## Task 6: SettingsView 设置页

**Files:**
- Create: `src/views/SettingsView.vue`
- Create: `src/components/AlarmPanel.vue`

- [ ] **Step 1: 创建 src/components/AlarmPanel.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useTimerStore } from '@/stores/timer'

const settingsStore = useSettingsStore()
const timerStore = useTimerStore()
const customMinutes = ref(0)
const alarmTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const presets = [5, 10, 15, 30, 45]

function toggleAlarm(enabled: boolean) {
  settingsStore.setAlarmEnabled(enabled)
}

function setAlarm(minutes: number) {
  settingsStore.setAlarmMinutes(minutes)
  if (timerStore.currentRecord.isActive) {
    startAlarmTimer(minutes)
  }
}

function startAlarmTimer(minutes: number) {
  if (alarmTimeout.value) clearTimeout(alarmTimeout.value)
  alarmTimeout.value = setTimeout(() => {
    alert('时间到！')
  }, minutes * 60 * 1000)
}

function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission()
  }
}

const notificationStatus = ref('')
function checkNotificationStatus() {
  if (!('Notification' in window)) {
    notificationStatus.value = '当前浏览器不支持桌面通知'
  } else if (Notification.permission === 'granted') {
    notificationStatus.value = '已开启，到点将弹出系统通知'
  } else if (Notification.permission === 'denied') {
    notificationStatus.value = '已拒绝，请在浏览器设置中允许'
  } else {
    notificationStatus.value = '未开启'
  }
}
</script>

<template>
  <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
    <div class="flex items-center gap-2 mb-3">
      <span>⏰</span>
      <span class="font-semibold text-primary-dark">闹钟提醒</span>
      <label class="ml-auto relative inline-block w-10 h-5 cursor-pointer">
        <input
          type="checkbox"
          :checked="settingsStore.alarmEnabled"
          class="sr-only peer"
          @change="toggleAlarm(($event.target as HTMLInputElement).checked)"
        />
        <span class="absolute inset-0 bg-gray-300 peer-checked:bg-primary rounded-full transition-colors"></span>
        <span class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></span>
      </label>
    </div>

    <div v-if="settingsStore.alarmEnabled" class="space-y-3">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="p in presets"
          :key="p"
          :class="[
            'px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
            settingsStore.alarmMinutes === p
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white'
              : 'bg-white text-primary border border-blue-200 hover:bg-blue-50'
          ]"
          @click="setAlarm(p)"
        >
          {{ p }}分钟
        </button>
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model.number="customMinutes"
          type="number"
          min="1"
          max="480"
          placeholder="自定义"
          class="w-20 px-3 py-1.5 border rounded-full text-sm"
        />
        <span class="text-xs text-primary">分钟</span>
        <button
          class="px-4 py-1.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs"
          @click="setAlarm(customMinutes)"
        >
          设置
        </button>
      </div>

      <div v-if="settingsStore.alarmMinutes > 0" class="text-xs text-blue-600 font-medium">
        已设置 {{ settingsStore.alarmMinutes }} 分钟闹钟
      </div>

      <div class="text-xs text-gray-500 p-2 bg-white/50 rounded-lg">
        在浏览器允许通知后，窗口最小化时也可收到桌面提醒
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-4 py-1.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs"
          @click="requestNotificationPermission"
        >
          开启系统通知
        </button>
        <span class="text-xs text-gray-500">{{ notificationStatus }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 创建 src/views/SettingsView.vue**

```vue
<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import AlarmPanel from '@/components/AlarmPanel.vue'

const settingsStore = useSettingsStore()
</script>

<template>
  <div>
    <div class="flex items-center justify-center gap-2 mb-4">
      <span class="text-xl">⚙️</span>
      <h1 class="text-xl font-bold">设置</h1>
    </div>

    <!-- Theme Section -->
    <div class="bg-gray-50 rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between">
        <span class="font-medium">🌙 深色模式</span>
        <button
          :class="[
            'relative w-12 h-6 rounded-full transition-colors',
            settingsStore.theme === 'dark' ? 'bg-primary' : 'bg-gray-300'
          ]"
          @click="settingsStore.toggleTheme()"
        >
          <span
            :class="[
              'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
              settingsStore.theme === 'dark' ? 'left-6' : 'left-0.5'
            ]"
          ></span>
        </button>
      </div>
    </div>

    <!-- Voice Section -->
    <div class="bg-gray-50 rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <span class="font-medium">🎤 语音输入</span>
          <p class="text-xs text-gray-500 mt-1">按 Ctrl+V 开始/停止语音输入</p>
        </div>
        <label class="relative inline-block w-10 h-5 cursor-pointer">
          <input
            type="checkbox"
            :checked="settingsStore.voiceEnabled"
            class="sr-only peer"
            @change="settingsStore.setVoiceEnabled(($event.target as HTMLInputElement).checked)"
          />
          <span class="absolute inset-0 bg-gray-300 peer-checked:bg-primary rounded-full transition-colors"></span>
          <span class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></span>
        </label>
      </div>
    </div>

    <!-- Alarm Section -->
    <AlarmPanel />
  </div>
</template>
```

- [ ] **Step 3: 提交**

```bash
git add src/views/SettingsView.vue src/components/AlarmPanel.vue
git commit -m "feat: add SettingsView and AlarmPanel component"
```

---

## Task 7: 导航和整合

**Files:**
- Modify: `src/App.vue`
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/HistoryView.vue`
- Modify: `src/views/SettingsView.vue`

- [ ] **Step 1: 更新 App.vue 添加底部导航**

```vue
<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useSettingsStore } from './stores/settings'
import { onMounted, computed } from 'vue'

const settingsStore = useSettingsStore()
const router = useRouter()

const routeName = computed(() => router.currentRoute.value.name)

onMounted(() => {
  settingsStore.initTheme()
  settingsStore.loadSettings()
})
</script>

<template>
  <div class="app-container">
    <div class="app-card">
      <RouterView />
    </div>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-lg">
      <button
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          routeName === 'home' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
        ]"
        @click="router.push('/')"
      >
        ⏱️ 计时
      </button>
      <button
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          routeName === 'history' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
        ]"
        @click="router.push('/history')"
      >
        📋 记录
      </button>
      <button
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          routeName === 'settings' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
        ]"
        @click="router.push('/settings')"
      >
        ⚙️ 设置
      </button>
    </nav>
  </div>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add src/App.vue
git commit -m "feat: add bottom navigation bar"
```

---

## Task 8: 快捷键和语音功能

**Files:**
- Create: `src/composables/useKeyboard.ts`
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 创建 src/composables/useKeyboard.ts**

```typescript
import { onMounted, onUnmounted } from 'vue'

export function useKeyboard(
  onStart: () => void,
  onStop: () => void,
  onExport: () => void
) {
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    if (e.code === 'Space') {
      e.preventDefault()
      // Toggle handled by parent
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      onExport()
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

- [ ] **Step 2: 更新 HomeView.vue 添加快捷键支持**

在 HomeView.vue 中添加快捷键逻辑

- [ ] **Step 3: 提交**

```bash
git add src/composables/useKeyboard.ts
git commit -m "feat: add keyboard shortcuts composable"
```

---

## Task 9: 验证和测试

- [ ] **Step 1: 运行开发服务器**

Run: `npm run dev`
Expected: Vite 开发服务器在 http://localhost:5173 启动

- [ ] **Step 2: 验证各页面功能**

- 首页：计时器开始/停止正常
- 历史：筛选、编辑、删除、导出正常
- 设置：主题切换、语音开关、闹钟设置正常

- [ ] **Step 3: 验证 PWA**

- 检查 manifest.json 生成
- 检查 Service Worker 注册

- [ ] **Step 4: 提交最终版本**

```bash
git add -A
git commit -m "feat: complete Vue migration with PWA support"
```

---

## 实施顺序

1. **Task 1**: 项目初始化 - 创建基础配置
2. **Task 2**: Pinia Stores - 状态管理
3. **Task 3**: 基础组件 - Modal、TimerCard 等
4. **Task 4**: HomeView - 首页
5. **Task 5**: HistoryView - 历史记录页
6. **Task 6**: SettingsView - 设置页
7. **Task 7**: 导航和整合 - 底部导航栏
8. **Task 8**: 快捷键和语音功能
9. **Task 9**: 验证和测试

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-vue-refactor-plan.md`**

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**