<script setup lang="ts">
import { ref } from 'vue'
import { useWorkStore } from '../../stores'
import { toDatetimeLocal } from '../../utils/date'
import type { WorkRecord } from '../../types'

const workStore = useWorkStore()

const showModal = ref(false)
const editingRecord = ref<WorkRecord | null>(null)
const editWorkName = ref('')
const editStartTime = ref('')
const editEndTime = ref('')

function open(record: WorkRecord) {
  editingRecord.value = record
  editWorkName.value = record.workName
  editStartTime.value = toDatetimeLocal(record.startTime)
  editEndTime.value = toDatetimeLocal(record.endTime)
  showModal.value = true
}

function close() {
  showModal.value = false
  editingRecord.value = null
}

function save() {
  if (!editingRecord.value) return

  const startTime = new Date(editStartTime.value)
  const endTime = new Date(editEndTime.value)

  if (endTime <= startTime) {
    alert('结束时间必须晚于开始时间')
    return
  }

  workStore.updateRecord(editingRecord.value.startTime, {
    workName: editWorkName.value.trim() || '未命名工作',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  })

  close()
}

defineExpose({ open })
</script>

<template>
  <div v-if="showModal" class="modal" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>✏️ 编辑记录</h3>
        <button class="btn-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="edit-form">
          <div class="form-group">
            <label class="form-label">📝 工作内容</label>
            <input
              v-model="editWorkName"
              type="text"
              class="form-input"
              placeholder="工作内容名称"
              maxlength="50"
            />
          </div>
          <div class="form-group">
            <label class="form-label">⏰ 开始时间</label>
            <input v-model="editStartTime" type="datetime-local" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">⏰ 结束时间</label>
            <input v-model="editEndTime" type="datetime-local" class="form-input" />
          </div>
          <div class="form-actions">
            <button class="btn btn-cancel" @click="close">取消</button>
            <button class="btn btn-save" @click="save">💾 保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
