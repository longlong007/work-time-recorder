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