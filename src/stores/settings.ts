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
