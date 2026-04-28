import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage, TAGS_KEY } from '../utils/storage'

const DEFAULT_TAGS = ['开发', '会议', '学习', '调试', '文档']

export const useTagStore = defineStore('tag', () => {
  const tags = ref<string[]>([])

  function loadTags() {
    const saved = storage.get<string[]>(TAGS_KEY, [])
    tags.value = saved.length > 0 ? saved : [...DEFAULT_TAGS]
    if (saved.length === 0) {
      saveTags()
    }
  }

  function saveTags() {
    storage.set(TAGS_KEY, tags.value)
  }

  function addTag(name: string) {
    if (!tags.value.includes(name)) {
      tags.value.push(name)
      saveTags()
    }
  }

  function deleteTag(name: string) {
    tags.value = tags.value.filter(t => t !== name)
    saveTags()
  }

  function reorderTags(newOrder: string[]) {
    tags.value = newOrder
    saveTags()
  }

  return {
    tags,
    loadTags,
    addTag,
    deleteTag,
    reorderTags
  }
})
