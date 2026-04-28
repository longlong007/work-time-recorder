import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorkRecord, CurrentRecord } from '../types'
import { storage, STORAGE_KEY, CURRENT_RECORD_KEY } from '../utils/storage'
import { calculateDuration } from '../utils/date'

export const useWorkStore = defineStore('work', () => {
  const currentRecord = ref<CurrentRecord>({
    startTime: null,
    endTime: null,
    isActive: false,
    workName: ''
  })

  const filterDate = ref<string | null>(null)

  const records = computed(() => storage.get<WorkRecord[]>(STORAGE_KEY, []))

  const filteredRecords = computed(() => {
    if (!filterDate.value) return records.value
    return records.value.filter(record => {
      const recordDate = new Date(record.startTime).toISOString().split('T')[0]
      return recordDate === filterDate.value
    })
  })

  const todayTotal = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return records.value
      .filter(r => r.startTime.startsWith(today))
      .reduce((sum, r) => sum + r.duration, 0)
  })

  const weekTotal = computed(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    weekStart.setHours(0, 0, 0, 0)

    return records.value
      .filter(r => new Date(r.startTime) >= weekStart)
      .reduce((sum, r) => sum + r.duration, 0)
  })

  const monthTotal = computed(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return records.value
      .filter(r => new Date(r.startTime) >= monthStart)
      .reduce((sum, r) => sum + r.duration, 0)
  })

  function loadCurrentRecord() {
    const saved = storage.get<CurrentRecord | null>(CURRENT_RECORD_KEY, null)
    if (saved?.isActive && saved.startTime) {
      const start = new Date(saved.startTime)
      const now = new Date()
      if (start.toDateString() !== now.toDateString()) {
        endWork()
        return
      }
      currentRecord.value = saved
    }
  }

  function startWork(workName: string) {
    if (currentRecord.value.isActive) return

    currentRecord.value = {
      startTime: new Date().toISOString(),
      endTime: null,
      isActive: true,
      workName: workName || '未命名工作'
    }

    saveCurrentRecord()
  }

  function endWork() {
    if (!currentRecord.value.isActive || !currentRecord.value.startTime) return

    const endTime = new Date().toISOString()
    const record: WorkRecord = {
      startTime: currentRecord.value.startTime,
      endTime,
      duration: calculateDuration(currentRecord.value.startTime, endTime),
      workName: currentRecord.value.workName
    }

    const allRecords = [...records.value, record]
    allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    storage.set(STORAGE_KEY, allRecords)

    currentRecord.value = {
      startTime: null,
      endTime: null,
      isActive: false,
      workName: ''
    }

    storage.remove(CURRENT_RECORD_KEY)
  }

  function saveCurrentRecord() {
    storage.set(CURRENT_RECORD_KEY, currentRecord.value)
  }

  function deleteRecord(startTime: string) {
    const filtered = records.value.filter(r => r.startTime !== startTime)
    storage.set(STORAGE_KEY, filtered)
  }

  function updateRecord(startTime: string, updates: Partial<WorkRecord>) {
    const allRecords = records.value.map(r =>
      r.startTime === startTime ? { ...r, ...updates } : r
    )
    allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    storage.set(STORAGE_KEY, allRecords)
  }

  function clearHistory() {
    storage.remove(STORAGE_KEY)
  }

  function importRecords(newRecords: WorkRecord[]) {
    const allRecords = [...records.value, ...newRecords]
    allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    storage.set(STORAGE_KEY, allRecords)
  }

  function setFilterDate(date: string | null) {
    filterDate.value = date
  }

  return {
    currentRecord,
    records,
    filteredRecords,
    todayTotal,
    weekTotal,
    monthTotal,
    filterDate,
    loadCurrentRecord,
    startWork,
    endWork,
    deleteRecord,
    updateRecord,
    clearHistory,
    importRecords,
    setFilterDate
  }
})
