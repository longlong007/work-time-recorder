# 工作时间记录器 - Vue 重构设计文档

**日期**: 2026-04-28
**状态**: 已批准

## 1. 概述

将现有的 Vanilla JS 时间记录器迁移到 Vue 3 + TypeScript + Vite 技术栈，保持现有功能（计时器、闹钟、语音输入、历史记录、PWA）并提升代码可维护性和可扩展性。

## 2. 技术栈

| 技术 | 选择 | 说明 |
|------|------|------|
| 构建工具 | Vite | 现代快速 |
| 语言 | TypeScript | 类型安全 |
| 框架 | Vue 3 | 组合式 API |
| 状态管理 | Pinia | 官方推荐 |
| 路由 | Vue Router | 支持多页面 |
| 样式 | Tailwind CSS | 高效开发 |
| PWA | vite-plugin-pwa | 复用现有 sw.js |

## 3. 项目结构

```
src/
├── assets/              # 静态资源
├── components/          # 公共组件
│   ├── TimerCard.vue    # 计时器卡片
│   ├── TagSelector.vue  # 标签选择器
│   ├── HistoryList.vue  # 历史记录列表
│   ├── AlarmPanel.vue   # 闹钟设置面板
│   ├── Modal.vue        # 通用弹窗组件
│   └── VoiceInput.vue   # 语音输入组件
├── views/               # 页面（路由视图）
│   ├── HomeView.vue     # 首页（计时器主界面）
│   ├── HistoryView.vue  # 历史记录页面
│   └── SettingsView.vue # 设置页面
├── stores/              # Pinia 状态管理
│   ├── timer.ts         # 计时器状态
│   ├── records.ts       # 历史记录 CRUD
│   ├── tags.ts          # 标签管理
│   └── settings.ts      # 闹钟、主题、语音设置
├── composables/         # 组合式函数
│   ├── useAlarm.ts      # 闹钟逻辑
│   ├── useVoiceInput.ts # 语音输入
│   └── useExport.ts     # 导入导出
├── router/
│   └── index.ts
├── App.vue
└── main.ts
```

## 4. 路由设计

| 路径 | 视图 | 说明 |
|------|------|------|
| `/` | HomeView | 计时器主界面 |
| `/history` | HistoryView | 历史记录管理 |
| `/settings` | SettingsView | 闹钟、语音、主题设置 |

## 5. Pinia Store 设计

### timerStore
```typescript
interface TimerState {
  currentRecord: {
    startTime: string | null
    endTime: string | null
    isActive: boolean
    workName: string
  }
  elapsedMs: number
}
```

### recordsStore
```typescript
interface RecordsState {
  records: WorkRecord[]
  filterDate: string | null
}
interface WorkRecord {
  startTime: string
  endTime: string
  duration: number
  workName: string
}
```

### tagsStore
```typescript
interface TagsState {
  tags: string[]
}
```

### settingsStore
```typescript
interface SettingsState {
  alarmEnabled: boolean
  alarmMinutes: number
  theme: 'light' | 'dark' | 'system'
  voiceEnabled: boolean
}
```

## 6. 组件设计

### HomeView
- 包含 TimerCard、TagSelector、ActionButtons、AlarmPanel
- 协调各组件间的状态

### HistoryView
- 包含 HistoryList（支持筛选、导出、导入）
- 复用现有 CSV 导入/导出逻辑

### SettingsView
- 闹钟预设、语音开关、主题切换
- 对应现有 alarmSection 和 voiceSection

### 公共组件
- `Modal.vue`: 通用弹窗，标签管理、编辑记录复用
- `VoiceInput.vue`: 封装 Web Speech API

## 7. PWA 集成

- 使用 `vite-plugin-pwa`
- 复用现有 `sw.js` 的 Service Worker 策略
- 更新 `manifest.json` 配置

## 8. 数据迁移

- 继续使用 localStorage
- 保持现有的 STORAGE_KEY 一致性
- 新数据结构与旧数据兼容

## 9. 实现顺序

1. 项目初始化（Vite + Vue + Tailwind）
2. 路由和 Pinia Store 搭建
3. HomeView 主页面组件
4. HistoryView 历史记录页面
5. SettingsView 设置页面
6. PWA 配置
7. 测试和优化