<script setup lang="ts">
import { ref } from 'vue'
import { useTagStore } from '../../stores'

const tagStore = useTagStore()

const showModal = ref(false)
const newTagName = ref('')

function open() {
  showModal.value = true
}

function close() {
  showModal.value = false
  newTagName.value = ''
}

function addTag() {
  if (newTagName.value.trim()) {
    tagStore.addTag(newTagName.value.trim())
    newTagName.value = ''
  }
}

function deleteTag(name: string) {
  if (confirm(`确定要删除标签"${name}"吗？`)) {
    tagStore.deleteTag(name)
  }
}

defineExpose({ open })
</script>

<template>
  <div v-if="showModal" class="modal" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>🏷️ 标签管理</h3>
        <button class="btn-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="tag-add-section">
          <input
            v-model="newTagName"
            type="text"
            class="tag-input"
            placeholder="输入新标签名称"
            maxlength="20"
            @keypress.enter="addTag"
          />
          <button class="btn-add-tag" @click="addTag">➕ 添加</button>
        </div>
        <div class="tag-list">
          <div
            v-for="tag in tagStore.tags"
            :key="tag"
            class="tag-item"
          >
            <span class="tag-item-name">{{ tag }}</span>
            <button class="btn-delete-tag" @click="deleteTag(tag)">🗑️ 删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
