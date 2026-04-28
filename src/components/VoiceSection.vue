<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores'

const settingsStore = useSettingsStore()

const isAvailable = ref(false)

onMounted(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  isAvailable.value = !!SpeechRecognition
})
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
