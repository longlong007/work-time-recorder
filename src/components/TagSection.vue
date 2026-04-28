<script setup lang="ts">
import { ref } from 'vue'
import { useTagStore, useWorkStore } from '../stores'

const emit = defineEmits<{
  (e: 'selectTag', tag: string): void
}>()

const tagStore = useTagStore()
const workStore = useWorkStore()

const showTagModal = ref(false)

function selectTag(tagName: string) {
  emit('selectTag', tagName)
}
</script>

<template>
  <div class="tag-section">
    <div class="tag-header">
      <span class="tag-label">标签分类</span>
      <button class="btn-manage-tags" @click="showTagModal = true">管理标签</button>
    </div>
    <div class="quick-tags">
      <button
        v-for="tag in tagStore.tags"
        :key="tag"
        class="quick-tag"
        :disabled="workStore.currentRecord.isActive"
        @click="selectTag(tag)"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>
