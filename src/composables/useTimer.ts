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
