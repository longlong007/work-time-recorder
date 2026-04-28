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
}

function endWork() {
  close()
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
