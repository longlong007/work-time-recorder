<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkStore, useSettingsStore } from '../stores'
import { exportToCSV } from '../utils/csv'
import { formatDate, formatTime, formatDuration, escapeHtml } from '../utils/date'
import type { WorkRecord } from '../types'

const workStore = useWorkStore()
const settingsStore = useSettingsStore()

const filterDate = ref('')
const showEditModal = ref(false)
const editingRecord = ref<WorkRecord | null>(null)

function handleFilter() {
  workStore.setFilterDate(filterDate.value || null)
}

function handleReset() {
  filterDate.value = ''
  workStore.setFilterDate(null)
}

function handleExport() {
  exportToCSV(workStore.records)
}

function handleDelete(startTime: string) {
  if (confirm('确定要删除这条记录吗？此操作不可恢复！')) {
    workStore.deleteRecord(startTime)
  }
}

function handleEdit(record: WorkRecord) {
  editingRecord.value = record
  showEditModal.value = true
}

onMounted(() => {
  workStore.loadCurrentRecord()
  settingsStore.loadSettings()
})
</script>

<template>
  <div class="history-view">
    <header class="history-header">
      <div class="history-title">
        <span>📋</span>
        <span>历史记录</span>
      </div>
      <div class="history-actions">
        <button class="btn-action btn-export" @click="handleExport">📤 导出</button>
        <button class="btn-action btn-clear" @click="workStore.clearHistory">清空</button>
      </div>
    </header>

    <div class="filter-bar">
      <input v-model="filterDate" type="date" class="date-filter" />
      <button class="btn-filter" @click="handleFilter">筛选</button>
      <button class="btn-reset" @click="handleReset">重置</button>
    </div>

    <div class="history-list">
      <div v-if="workStore.filteredRecords.length === 0" class="empty-state">
        暂无记录
      </div>
      <div
        v-for="record in workStore.filteredRecords"
        :key="record.startTime"
        class="history-item"
      >
        <div class="history-item-header">
          <div class="history-header-left">
            <span class="history-date">{{ formatDate(record.startTime) }}</span>
            <span class="history-duration">{{ formatDuration(record.duration) }}</span>
          </div>
          <div class="history-item-actions">
            <button
              class="btn-edit-record"
              @click="handleEdit(record)"
              title="编辑此记录"
            >
              ✏️
            </button>
            <button
              class="btn-delete-record"
              @click="handleDelete(record.startTime)"
              title="删除此记录"
            >
              🗑️
            </button>
          </div>
        </div>
        <div v-if="record.workName" class="history-work-name">
          📝 {{ escapeHtml(record.workName) }}
        </div>
        <div class="history-time">
          <span>🕐 开始: {{ formatTime(record.startTime) }}</span>
          <span>🕐 结束: {{ formatTime(record.endTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
