<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '../stores'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.loadSettings()
})
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <span class="settings-icon">⚙️</span>
      <h1 class="settings-title">设置</h1>
    </header>

    <div class="settings-section">
      <h2 class="section-title">外观</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span class="setting-icon">🌙</span>
          <span>深色模式</span>
        </div>
        <button
          class="theme-toggle-btn"
          @click="settingsStore.toggleTheme"
          :title="settingsStore.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        >
          {{ settingsStore.theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title">语音</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span class="setting-icon">🎤</span>
          <span>快捷键语音输入</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            v-model="settingsStore.voiceShortcutEnabled"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <p class="setting-hint">启用后，可按 Ctrl+V 开始/停止语音输入</p>
    </div>

    <div class="settings-section">
      <h2 class="section-title">闹钟</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span class="setting-icon">⏰</span>
          <span>闹钟提醒</span>
        </div>
        <p class="setting-description">在计时页面设置闹钟提醒</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  padding: 16px;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  margin-bottom: 16px;
}

.settings-icon {
  font-size: 24px;
}

.settings-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.settings-section {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

[data-theme="dark"] .settings-section {
  background: var(--card-bg-dark, #2d2d2d);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary, #666);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  font-size: 20px;
}

.setting-hint {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin: 8px 0 0 32px;
}

.setting-description {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin: 0;
}

.theme-toggle-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.theme-toggle-btn:hover {
  background: var(--hover-bg, #f0f0f0);
}

[data-theme="dark"] .theme-toggle-btn:hover {
  background: var(--hover-bg-dark, #3d3d3d);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: #4CAF50;
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}
</style>
