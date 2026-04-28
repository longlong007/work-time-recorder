<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useWorkStore } from '../stores'
import { formatDuration } from '../utils/date'

const workStore = useWorkStore()

const currentTimeDisplay = ref('')
let clockInterval: number | null = null

function updateClock() {
  const now = new Date()
  currentTimeDisplay.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const elapsedDisplay = computed(() => {
  if (!workStore.currentRecord.isActive || !workStore.currentRecord.startTime) {
    return '00:00:00'
  }
  const elapsed = Date.now() - new Date(workStore.currentRecord.startTime).getTime()
  return formatDuration(elapsed)
})

onMounted(() => {
  updateClock()
  clockInterval = window.setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
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
