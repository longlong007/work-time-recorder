<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkStore } from '../stores'

const workStore = useWorkStore()
const workName = ref('')

const isDisabled = computed(() => workStore.currentRecord.isActive)

function handleTagClick(tagName: string) {
  if (!workName.value) {
    workName.value = tagName
  } else {
    workName.value = workName.value + ' - ' + tagName
  }
}

function handleEnter() {
  if (!workStore.currentRecord.isActive && workName.value) {
    workStore.startWork(workName.value)
  }
}

function appendText(text: string) {
  workName.value += text
}

defineExpose({ appendText })
</script>

<template>
  <div class="work-name-section">
    <div class="input-row">
      <span class="input-label">工作名称</span>
      <input
        v-model="workName"
        type="text"
        class="work-name-input"
        placeholder="请输入工作内容名称（可选）"
        maxlength="50"
        :disabled="isDisabled"
        @keypress.enter="handleEnter"
      />
      <button class="btn-voice" title="语音输入">🎤</button>
    </div>
  </div>
</template>
