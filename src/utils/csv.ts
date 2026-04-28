import type { WorkRecord } from '../types'

export function exportToCSV(records: WorkRecord[]): void {
  if (records.length === 0) {
    alert('没有可导出的记录')
    return
  }

  const toLocalISOString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }

  let csvContent = '日期,开始时间,结束时间,工作时长(小时),工作内容\n'

  records.forEach(record => {
    const startDate = new Date(record.startTime)
    const endDate = new Date(record.endTime)

    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    const date = `${year}-${month}-${day}`

    const startTime = toLocalISOString(startDate)
    const endTime = toLocalISOString(endDate)

    const durationHours = (record.duration / (1000 * 60 * 60)).toFixed(2)
    const workName = record.workName || ''
    const escapedWorkName = workName.includes(',') || workName.includes('"')
      ? `"${workName.replace(/"/g, '""')}"`
      : workName

    csvContent += `${date},${startTime},${endTime},${durationHours},${escapedWorkName}\n`
  })

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)

  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  link.setAttribute('download', `工作记录_${dateStr}.csv`)

  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function parseCSV(content: string): { records: WorkRecord[], errors: string[] } {
  const cleanContent = content.replace(/^\ufeff/, '')
  const lines = cleanContent.split(/\r?\n/)

  if (lines.length < 2) {
    return { records: [], errors: ['CSV文件为空或格式不正确'] }
  }

  const newRecords: WorkRecord[] = []
  const errors: string[] = []

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < text.length; j++) {
      const char = text[j]
      if (char === '"') {
        if (inQuotes && text[j + 1] === '"') {
          current += '"'
          j++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const columns = parseCSVLine(line)

    if (columns.length < 4) {
      errors.push(`第${i}行: 列数不足`)
      continue
    }

    const [dateStr, startTimeStr, endTimeStr, durationHoursStr, ...workNameParts] = columns
    const workName = workNameParts.join(',').trim()

    const startTime = new Date(startTimeStr)
    const endTime = new Date(endTimeStr)
    const durationHours = parseFloat(durationHoursStr)

    if (isNaN(startTime.getTime())) {
      errors.push(`第${i}行: 开始时间格式无效`)
      continue
    }

    if (isNaN(endTime.getTime())) {
      errors.push(`第${i}行: 结束时间格式无效`)
      continue
    }

    if (isNaN(durationHours) || durationHours <= 0) {
      errors.push(`第${i}行: 工作时长无效`)
      continue
    }

    if (endTime <= startTime) {
      errors.push(`第${i}行: 结束时间必须晚于开始时间`)
      continue
    }

    newRecords.push({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationHours * 60 * 60 * 1000,
      workName: workName || '未命名工作'
    })
  }

  return { records: newRecords, errors }
}
