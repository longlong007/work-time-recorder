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
