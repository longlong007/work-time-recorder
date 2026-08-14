const DEFAULT_ALARM_PRESETS = [5, 10, 15, 30, 45];
const MORE_SETTINGS_OPEN_KEY = 'moreSettingsOpen';

// 状态管理
let currentRecord = {
    startTime: null,
    endTime: null,
    isActive: false,
    workName: ''
};

// DOM 元素
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const elapsedDisplay = document.getElementById('elapsedDisplay');
const wallClockTime = document.getElementById('wallClockTime');
const layoutLeft = document.getElementById('layoutLeft');
const currentWorkName = document.getElementById('currentWorkName');
const currentWorkNameValue = document.getElementById('currentWorkNameValue');
const workNameInput = document.getElementById('workNameInput');
const workNameSection = document.getElementById('workNameSection');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const historyList = document.getElementById('historyList');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const filterDate = document.getElementById('filterDate');
const filterBtn = document.getElementById('filterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const todayTotal = document.getElementById('todayTotal');
const weekTotal = document.getElementById('weekTotal');
const monthTotal = document.getElementById('monthTotal');

// 标签相关 DOM 元素
const quickTags = document.getElementById('quickTags');
const manageTagsBtn = document.getElementById('manageTagsBtn');
const tagModal = document.getElementById('tagModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const newTagInput = document.getElementById('newTagInput');
const addTagBtn = document.getElementById('addTagBtn');
const tagList = document.getElementById('tagList');

// 编辑记录相关 DOM 元素
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editWorkName = document.getElementById('editWorkName');
const editStartTime = document.getElementById('editStartTime');
const editEndTime = document.getElementById('editEndTime');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');

// 闹钟相关 DOM 元素
const alarmSection = document.getElementById('alarmSection');
const alarmToggle = document.getElementById('alarmToggle');

// 主题切换 DOM 元素
const themeToggle = document.getElementById('themeToggle');
const shortcutsBtn = document.getElementById('shortcutsBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn');

const alarmOptions = document.getElementById('alarmOptions');
const customAlarmMinutes = document.getElementById('customAlarmMinutes');
const setAlarmBtn = document.getElementById('setAlarmBtn');
const alarmStatus = document.getElementById('alarmStatus');
const alarmHeaderBadge = document.getElementById('alarmHeaderBadge');
const alarmModal = document.getElementById('alarmModal');
const continueAlarmBtn = document.getElementById('continueAlarmBtn');
const endAlarmBtn = document.getElementById('endAlarmBtn');
const notifyPermissionBtn = document.getElementById('notifyPermissionBtn');
const notifyStatus = document.getElementById('notifyStatus');

// 闹钟进度条 DOM 元素
const alarmProgress = document.getElementById('alarmProgress');
const alarmProgressBar = document.getElementById('alarmProgressBar');
const alarmRemainingValue = document.getElementById('alarmRemainingValue');

// 当前正在编辑的记录
let currentEditingRecord = null;

let clockInterval = null;
let filterDateValue = null;
let alarmTimer = null;
let alarmEnabled = false;
let alarmMinutes = 0;
// 当前闹钟周期的开始时间戳（毫秒），用于绘制进度条
let alarmStartedAt = 0;
let alarmAudioContext = null;
let alarmAudioUnlocked = false;
let alarmAudioUnlockPromise = null;

// 闹钟音效（使用Web Audio API生成简单的提示音）

// 初始化
function init() {
    loadCurrentRecord();
    updateDisplay();
    renderHistory();
    updateStatistics();
    startClock();
    loadTags();
    renderQuickTags();
    initNotificationUI();
    initMoreSettings();
    initTheme();
    registerServiceWorker();
    initRightPanelView();
    if (typeof StatsCharts !== 'undefined') StatsCharts.init();
    
    // 设置默认筛选日期为今天（使用本地时间）
    filterDate.value = getLocalDateString(new Date());

    workNameInput.addEventListener('input', syncQuickTagSelection);
}

// 更多设置折叠（闹钟 / 通知）
function initMoreSettings() {
    const moreSettings = document.getElementById('moreSettings');
    if (!moreSettings) {
        return;
    }

    if (localStorage.getItem(MORE_SETTINGS_OPEN_KEY) === '1') {
        moreSettings.open = true;
    } else if (alarmToggle?.checked) {
        moreSettings.open = true;
    }

    moreSettings.addEventListener('toggle', () => {
        localStorage.setItem(MORE_SETTINGS_OPEN_KEY, moreSettings.open ? '1' : '0');
    });
}

// ==================== PWA 注册 ====================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker 注册成功'))
            .catch((err) => console.log('Service Worker 注册失败:', err));
    }
}

// 加载当前记录
function loadCurrentRecord() {
    const record = DataStore.getCurrentRecord();
    if (record.isActive && record.startTime) {
        currentRecord = record;
        const start = new Date(record.startTime);
        const now = new Date();
        if (start.toDateString() !== now.toDateString()) {
            endWork();
            return;
        }
        workNameInput.value = record.workName || '';
        workNameInput.disabled = true;
    }
}

// 保存当前记录
function saveCurrentRecord() {
    DataStore.saveCurrentRecord(currentRecord);
}

// 应用远端设备进行中的计时
function applyRemoteActiveSession(session) {
    if (currentRecord.isActive) return;
    const start = new Date(session.startTime);
    const now = new Date();
    if (start.toDateString() !== now.toDateString()) return;

    const useRemote = confirm(
        `另一台设备正在计时：「${session.workName || '未命名工作'}」\n是否在本机显示该计时状态？`
    );
    if (!useRemote) return;

    currentRecord = {
        startTime: session.startTime,
        endTime: null,
        isActive: true,
        workName: session.workName || ''
    };
    workNameInput.value = currentRecord.workName;
    workNameInput.disabled = true;
    updateDisplay();
    startElapsedTimer();
    startAlarmTimer();
}

// 开始工作
function startWork() {
    if (currentRecord.isActive) {
        return;
    }
    
    // 获取工作内容名称
    const workName = workNameInput.value.trim() || '未命名工作';
    
    currentRecord = {
        startTime: new Date().toISOString(),
        endTime: null,
        isActive: true,
        workName: workName
    };
    
    saveCurrentRecord();
    updateDisplay();
    startElapsedTimer();
    startAlarmTimer(); // 启动闹钟计时
    
    // 禁用输入框
    workNameInput.disabled = true;
}

// 结束工作
function endWork() {
    if (!currentRecord.isActive || !currentRecord.startTime) {
        return;
    }
    
    currentRecord.endTime = new Date().toISOString();
    currentRecord.isActive = false;
    
    // 保存到历史记录
    saveHistoryRecord({
        startTime: currentRecord.startTime,
        endTime: currentRecord.endTime,
        duration: calculateDuration(currentRecord.startTime, currentRecord.endTime),
        workName: currentRecord.workName
    });
    
    // 清空当前记录
    currentRecord = {
        startTime: null,
        endTime: null,
        isActive: false,
        workName: ''
    };
    
    DataStore.clearCurrentRecord();
    updateDisplay();
    renderHistory();
    updateStatistics();
    stopElapsedTimer();
    clearAlarmTimer(); // 清除闹钟计时
    releaseAlarmAudio();
    
    // 清空并启用输入框
    workNameInput.value = '';
    workNameInput.disabled = false;
    workNameInput.focus();
}

// 保存历史记录
function saveHistoryRecord(record) {
    DataStore.saveRecord(record);
}

// 获取历史记录
function getHistoryRecords() {
    return DataStore.getRecords();
}

// 计算时长（毫秒）
function calculateDuration(startTime, endTime) {
    return new Date(endTime) - new Date(startTime);
}

// 格式化时长
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 格式化时间
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
    } else {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// 从工作名称中解析已使用的标签
function getTagsInWorkName(workName) {
    if (!workName) {
        return [];
    }
    const knownTags = getTags();
    const parts = workName.split(' - ').map((p) => p.trim()).filter(Boolean);
    return knownTags.filter((tag) => parts.includes(tag));
}

// 同步快速标签选中态
function syncQuickTagSelection() {
    const activeTags = new Set(getTagsInWorkName(workNameInput.value.trim()));
    document.querySelectorAll('.quick-tag').forEach((tagBtn) => {
        tagBtn.classList.toggle('selected', activeTags.has(tagBtn.dataset.tag));
    });
}

// 更新显示
function updateDisplay() {
    if (currentRecord.isActive && currentRecord.startTime) {
        statusDot.className = 'status-dot active';
        statusText.textContent = '已开始';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        currentWorkName.style.display = 'flex';
        currentWorkNameValue.textContent = currentRecord.workName;
        layoutLeft?.classList.add('is-recording');
    } else {
        statusDot.className = 'status-dot stopped';
        statusText.textContent = '未开始';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        currentWorkName.style.display = 'none';
        layoutLeft?.classList.remove('is-recording');
    }
    syncQuickTagSelection();
    updateClock();
}

// 开始时钟（已工作时长 + 当前时间 + 闹钟进度）
function startClock() {
    updateClock();
    if (clockInterval) {
        return;
    }
    clockInterval = setInterval(() => {
        updateClock();
        if (currentRecord.isActive && currentRecord.startTime) {
            updateAlarmProgress();
        }
    }, 1000);
}

// 更新计时区
function updateClock() {
    const now = new Date();
    if (wallClockTime) {
        wallClockTime.textContent = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
    if (!elapsedDisplay) {
        return;
    }
    if (currentRecord.isActive && currentRecord.startTime) {
        const elapsed = calculateDuration(currentRecord.startTime, now.toISOString());
        elapsedDisplay.textContent = formatDuration(elapsed);
    } else {
        elapsedDisplay.textContent = '00:00:00';
    }
}

// 开始计时器
function startElapsedTimer() {
    updateClock();
}

// 停止计时器
function stopElapsedTimer() {
    updateClock();
}

// 格式化剩余时间（mm:ss，≥1小时显示 hh:mm:ss）
function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 显示闹钟进度条
function showAlarmProgress() {
    if (!alarmProgress) return;
    alarmProgress.style.display = 'block';
    updateAlarmProgress();
}

// 隐藏闹钟进度条
function hideAlarmProgress() {
    if (!alarmProgress) return;
    alarmProgress.style.display = 'none';
    alarmProgress.classList.remove('warning', 'danger');
    if (alarmProgressBar) alarmProgressBar.style.width = '0%';
    if (alarmRemainingValue) alarmRemainingValue.textContent = '00:00';
}

// 更新进度条宽度与剩余时间文字
function updateAlarmProgress() {
    if (!alarmProgress || !alarmProgressBar || !alarmRemainingValue) return;
    if (!currentRecord.isActive || !alarmEnabled || alarmMinutes <= 0 || !alarmStartedAt) {
        if (alarmProgress.style.display !== 'none') hideAlarmProgress();
        return;
    }
    if (alarmProgress.style.display === 'none') alarmProgress.style.display = 'block';

    const totalMs = alarmMinutes * 60 * 1000;
    const elapsed = Date.now() - alarmStartedAt;
    const remaining = Math.max(0, totalMs - elapsed);
    const ratio = Math.min(1, Math.max(0, elapsed / totalMs));

    alarmProgressBar.style.width = `${(ratio * 100).toFixed(2)}%`;
    alarmRemainingValue.textContent = formatRemaining(remaining);

    alarmProgress.classList.remove('warning', 'danger');
    if (ratio >= 0.9) {
        alarmProgress.classList.add('danger');
    } else if (ratio >= 0.75) {
        alarmProgress.classList.add('warning');
    }
}

// 渲染历史记录
function renderHistory() {
    const records = getHistoryRecords();
    let filteredRecords = records;
    
    // 应用日期筛选（使用本地时间，避免 UTC 偏差导致早晨记录归入前一天）
    if (filterDateValue) {
        filteredRecords = records.filter(record => {
            const recordDate = getLocalDateString(new Date(record.startTime));
            return recordDate === filterDateValue;
        });
    }
    
    if (filteredRecords.length === 0) {
        historyList.innerHTML = '<div class="empty-state">暂无记录</div>';
        return;
    }
    
    historyList.innerHTML = filteredRecords.map(record => {
        const startDate = formatDate(record.startTime);
        const startTime = formatTime(record.startTime);
        const endTime = formatTime(record.endTime);
        const duration = formatDuration(record.duration);
        const workName = record.workName || '';
        const recordTags = getTagsInWorkName(workName);
        const tagChipsHtml = recordTags.length
            ? `<div class="history-tags">${recordTags.map((tag) => `<span class="history-tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';
        
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <div class="history-header-left">
                        <span class="history-date">${startDate}</span>
                        <span class="history-duration">${duration}</span>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn-edit-record" data-id="${record.id}" data-timestamp="${record.startTime}" title="编辑此记录">✏️</button>
                        <button class="btn-delete-record" data-id="${record.id}" data-timestamp="${record.startTime}" title="删除此记录">🗑️</button>
                    </div>
                </div>
                ${tagChipsHtml}
                ${workName ? `<div class="history-work-name">📝 ${escapeHtml(workName)}</div>` : ''}
                <div class="history-time">
                    <span>🕐 开始: ${startTime}</span>
                    <span>🕐 结束: ${endTime}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 为编辑按钮添加事件监听
    document.querySelectorAll('.btn-edit-record').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(btn.dataset.id || btn.dataset.timestamp);
        });
    });
    
    // 为删除按钮添加事件监听
    document.querySelectorAll('.btn-delete-record').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRecord(btn.dataset.id || btn.dataset.timestamp);
        });
    });
}

// 更新统计信息
function updateStatistics() {
    const records = getHistoryRecords();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 计算本周的开始时间(周一)
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay(); // 0(周日)到 6(周六)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    
    let todayTotalMs = 0;
    let weekTotalMs = 0;
    let monthTotalMs = 0;
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    records.forEach(record => {
        const recordDate = new Date(record.startTime);
        const duration = record.duration;
        
        if (recordDate >= todayStart && recordDate < new Date(todayStart.getTime() + 86400000)) {
            todayTotalMs += duration;
        }
        
        if (recordDate >= weekStart && recordDate < weekEnd) {
            weekTotalMs += duration;
        }

        if (recordDate >= monthStart && recordDate < monthEnd) {
            monthTotalMs += duration;
        }
    });
    
    todayTotal.textContent = formatDuration(todayTotalMs);
    weekTotal.textContent = formatDuration(weekTotalMs);
    monthTotal.textContent = formatDuration(monthTotalMs);

    if (typeof StatsCharts !== 'undefined') StatsCharts.refresh();
}

// 删除单条记录（支持 id 或 startTime）
function deleteRecord(idOrTimestamp) {
    if (!confirm('确定要删除这条记录吗？此操作不可恢复！')) {
        return;
    }
    
    DataStore.deleteRecord(idOrTimestamp);
    renderHistory();
    updateStatistics();
}

// 导出记录为CSV
function exportToCSV() {
    const records = getHistoryRecords();
    if (records.length === 0) {
        alert('没有可导出的记录');
        return;
    }

    // 辅助函数：将Date对象转换为本地时间的ISO格式字符串 YYYY-MM-DDTHH:MM:SS
    const toLocalISOString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    // CSV表头
    let csvContent = '日期,开始时间,结束时间,工作时长(小时),工作内容\n';

    // 添加记录数据
    records.forEach(record => {
        const startDate = new Date(record.startTime);
        const endDate = new Date(record.endTime);
        
        // 日期格式 YYYY-MM-DD（使用本地时间）
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        
        // 完整的日期时间格式 YYYY-MM-DDTHH:MM:SS（使用本地时间）
        const startTime = toLocalISOString(startDate);
        const endTime = toLocalISOString(endDate);
        
        const durationHours = (record.duration / (1000 * 60 * 60)).toFixed(2);
        const workName = record.workName || '';
        
        // 处理工作内容中的逗号和引号
        const escapedWorkName = workName.includes(',') || workName.includes('"') 
            ? `"${workName.replace(/"/g, '""')}"` 
            : workName;
        
        csvContent += `${date},${startTime},${endTime},${durationHours},${escapedWorkName}\n`;
    });

    // 创建Blob对象
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // 生成文件名（包含当前日期）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    link.setAttribute('download', `工作记录_${dateStr}.csv`);
    
    // 触发下载
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 导入CSV文件
function importFromCSV(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // 文件大小限制 2MB
    const FILE_MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > FILE_MAX_SIZE) {
        alert('CSV 文件过大，请控制在 2MB 以内');
        return;
    }

    const MAX_IMPORT_RECS = 5000;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;

            // 移除BOM标记（如果存在）
            const cleanContent = content.replace(/^\ufeff/, '');
            const lines = cleanContent.split(/\r?\n/); // 支持不同的换行符
            
            // 跳过表头
            if (lines.length < 2) {
                alert('CSV文件为空或格式不正确');
                return;
            }

            const newRecords = [];
            let errorCount = 0;
            const errorDetails = [];

            // 解析CSV行（处理引号包裹的字段）
            const parseCSVLine = (text) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                
                for (let j = 0; j < text.length; j++) {
                    const char = text[j];
                    if (char === '"') {
                        if (inQuotes && text[j + 1] === '"') {
                            current += '"';
                            j++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            // 从第二行开始解析数据
            for (let i = 1; i < lines.length; i++) {
                if (newRecords.length >= MAX_IMPORT_RECS) {
                    errorDetails.push(`已达到最大导入条数 ${MAX_IMPORT_RECS}，后续记录被跳过`);
                    break;
                }
                const line = lines[i].trim();
                if (!line) continue;
                const columns = parseCSVLine(line);
                if (columns.length < 4) {
                    errorCount++;
                    errorDetails.push(`第${i}行: 列数不足`);
                    continue;
                }

                const [dateStr, startTimeStr, endTimeStr, durationHoursStr, ...workNameParts] = columns;
                const workName = workNameParts.join(',').trim();
                const startTime = new Date(startTimeStr);
                const endTime = new Date(endTimeStr);
                const durationHours = parseFloat(durationHoursStr);

                if (isNaN(startTime.getTime())) {
                    errorCount++;
                    errorDetails.push(`第${i}行: 开始时间格式无效`);
                    continue;
                }

                if (isNaN(endTime.getTime())) {
                    errorCount++;
                    errorDetails.push(`第${i}行: 结束时间格式无效`);
                    continue;
                }

                if (isNaN(durationHours) || durationHours <= 0) {
                    errorCount++;
                    errorDetails.push(`第${i}行: 工作时长无效`);
                    continue;
                }

                if (endTime <= startTime) {
                    errorCount++;
                    errorDetails.push(`第${i}行: 结束时间必须晚于开始时间`);
                    continue;
                }

                newRecords.push({
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    duration: durationHours * 60 * 60 * 1000,
                    workName: workName || '未命名工作'
                });
            }

            console.log('成功解析的记录数:', newRecords.length);
            
            if (newRecords.length === 0) {
                let errorMsg = '未能导入任何有效记录，请检查CSV文件格式\n\n';
                if (errorDetails.length > 0) {
                    errorMsg += '错误详情:\n' + errorDetails.slice(0, 5).join('\n');
                    if (errorDetails.length > 5) {
                        errorMsg += `\n... 还有 ${errorDetails.length - 5} 个错误`;
                    }
                }
                errorMsg += '\n\n期望的CSV格式:\n日期,开始时间,结束时间,工作时长(小时),工作内容\n2024-01-12,2024-01-12T09:00:00,2024-01-12T17:00:00,8.00,开发工作';
                alert(errorMsg);
                return;
            }

            // 合并到现有记录
            let confirmMsg = `将导入 ${newRecords.length} 条记录`;
            if (errorCount > 0) {
                confirmMsg += `\n（${errorCount} 条记录因格式错误被跳过）`;
            }
            confirmMsg += '\n\n是否继续？';
            
            if (!confirm(confirmMsg)) {
                return;
            }

            DataStore.importRecords(newRecords);

            renderHistory();
            updateStatistics();
            alert(`成功导入 ${newRecords.length} 条记录！`);
        } catch (error) {
            console.error('导入CSV失败:', error);
            alert('导入CSV文件失败: ' + error.message + '\n\n请检查文件格式是否正确');
        }
    };

    reader.readAsText(file, 'UTF-8');
    
    // 清空文件输入，允许重复导入同一文件
    event.target.value = '';
}

// 清空记录
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
        DataStore.clearAllRecords();
        renderHistory();
        updateStatistics();
    }
}

// 应用筛选
function applyFilter() {
    filterDateValue = filterDate.value || null;
    renderHistory();
}

// 重置筛选
function resetFilter() {
    filterDate.value = getLocalDateString(new Date());
    filterDateValue = null;
    renderHistory();
}

// 获取本地日期字符串 YYYY-MM-DD（避免 UTC 偏差导致早晨记录归入前一天）
// ==================== 主题切换功能 ====================

function initTheme() {
    const savedTheme = DataStore.getTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!DataStore.getTheme()) {
            if (e.matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.textContent = '☀️';
            } else {
                document.documentElement.removeAttribute('data-theme');
                themeToggle.textContent = '🌙';
            }
        }
    });
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        DataStore.saveTheme('light');
        themeToggle.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        DataStore.saveTheme('dark');
        themeToggle.textContent = '☀️';
    }

    if (typeof StatsCharts !== 'undefined') StatsCharts.refresh();
}

// 绑定主题切换按钮事件
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// ==================== 右栏页面切换 ====================

const RIGHT_PANEL_VIEW_KEY = 'rightPanelView';

function initRightPanelView() {
    const tabs = document.querySelectorAll('.right-panel-tab');
    const panels = {
        history: document.getElementById('rightPanelHistory'),
        stats: document.getElementById('rightPanelStats'),
    };
    if (!tabs.length || !panels.history || !panels.stats) return;

    const savedView = localStorage.getItem(RIGHT_PANEL_VIEW_KEY);
    if (savedView === 'stats') {
        switchRightPanelView('stats', tabs, panels);
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            if (!view || tab.classList.contains('active')) return;
            switchRightPanelView(view, tabs, panels);
            localStorage.setItem(RIGHT_PANEL_VIEW_KEY, view);
        });
    });
}

function switchRightPanelView(view, tabs, panels) {
    tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.view === view);
    });
    Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle('active', key === view);
    });
    if (view === 'stats' && typeof StatsCharts !== 'undefined') {
        requestAnimationFrame(() => StatsCharts.refresh());
    }
}

// ==================== 日期工具函数 ====================

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// HTML转义函数（防止XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(text).replace('"', '&quot;');
}

// ==================== 标签管理功能 ====================

// 获取标签列表
function getTags() {
    return DataStore.getTags();
}

// 保存标签列表
function saveTags(tags) {
    DataStore.saveTags(tags);
}

// 加载标签
function loadTags() {
    // 确保有默认标签
    const tags = getTags();
    if (tags.length === 0) {
        saveTags(['开发', '会议', '学习', '调试', '文档']);
    }
}

// 渲染快速标签
function renderQuickTags() {
    const tags = getTags();
    
    if (tags.length === 0) {
        quickTags.innerHTML = '';
        return;
    }
    
    quickTags.innerHTML = tags.map(tag => 
        `<button class="quick-tag" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`
    ).join('');
    
    // 为每个标签添加点击事件
    document.querySelectorAll('.quick-tag').forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
            const tagName = tagBtn.dataset.tag;
            const currentValue = workNameInput.value.trim();
            
            // 如果输入框为空，直接设置标签
            if (!currentValue) {
                workNameInput.value = tagName;
            } else {
                // 如果输入框有内容，在后面添加标签
                workNameInput.value = currentValue + ' - ' + tagName;
            }
            
            workNameInput.focus();
            syncQuickTagSelection();
        });
    });
    syncQuickTagSelection();
}

// 渲染标签管理列表
function renderTagList() {
    const tags = getTags();
    
    if (tags.length === 0) {
        tagList.innerHTML = '<div class="empty-tags">暂无标签，请添加一个</div>';
        return;
    }
    
    tagList.innerHTML = tags.map((tag, index) => `
        <div class="tag-item" draggable="true" data-index="${index}" data-tag="${escapeAttr(tag)}">
            <span class="tag-drag-handle">☰</span>
            <span class="tag-item-name">${escapeHtml(tag)}</span>
            <button class="btn-delete-tag" data-tag="${escapeAttr(tag)}">🗑️ 删除</button>
        </div>
    `).join('');
    
    // 为删除按钮添加事件
    document.querySelectorAll('.btn-delete-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTag(btn.dataset.tag);
        });
    });
    
    // 初始化拖拽功能
    initTagDragAndDrop();
}

// 初始化标签拖拽排序功能
function initTagDragAndDrop() {
    const tagItems = tagList.querySelectorAll('.tag-item');
    let draggedElement = null;
    
    tagItems.forEach((item) => {
        // 拖拽开始
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.innerHTML);
        });
        
        // 拖拽结束
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            tagItems.forEach(tag => tag.classList.remove('drag-over'));
            
            // 根据当前DOM顺序更新标签数组
            updateTagOrder();
        });
        
        // 拖拽经过
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = getDragAfterElement(tagList, e.clientY);
            const dragging = tagList.querySelector('.dragging');
            
            if (afterElement == null) {
                tagList.appendChild(dragging);
            } else {
                tagList.insertBefore(dragging, afterElement);
            }
        });
        
        // 拖拽进入
        item.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (item !== draggedElement) {
                item.classList.add('drag-over');
            }
        });
        
        // 拖拽离开
        item.addEventListener('dragleave', (e) => {
            item.classList.remove('drag-over');
        });
        
        // 放置
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
        });
    });
}

// 根据当前DOM顺序更新标签数组
function updateTagOrder() {
    const tagItems = tagList.querySelectorAll('.tag-item');
    const newOrder = Array.from(tagItems).map(item => item.dataset.tag);
    
    // 验证新顺序是否与当前顺序不同
    const currentTags = getTags();
    const hasChanged = newOrder.length === currentTags.length && 
        newOrder.some((tag, index) => tag !== currentTags[index]);
    
    if (hasChanged) {
        // 保存新的顺序
        saveTags(newOrder);
        
        // 更新快速标签显示
        renderQuickTags();
    }
}

// 获取拖拽后应该插入的位置
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.tag-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 添加标签
function addTag() {
    const tagName = newTagInput.value.trim();
    
    if (!tagName) {
        alert('请输入标签名称');
        return;
    }
    
    if (tagName.length > 20) {
        alert('标签名称不能超过20个字符');
        return;
    }
    
    const tags = getTags();
    
    // 检查是否已存在
    if (tags.includes(tagName)) {
        alert('该标签已存在');
        return;
    }
    
    tags.push(tagName);
    saveTags(tags);
    
    // 清空输入框
    newTagInput.value = '';
    
    // 重新渲染
    renderQuickTags();
    renderTagList();
}

// 删除标签
function deleteTag(tagName) {
    if (!confirm(`确定要删除标签"${tagName}"吗？`)) {
        return;
    }
    
    const tags = getTags();
    const index = tags.indexOf(tagName);
    
    if (index > -1) {
        tags.splice(index, 1);
        saveTags(tags);
        
        // 重新渲染
        renderQuickTags();
        renderTagList();
    }
}

// 打开标签管理弹窗
function openTagModal() {
    tagModal.style.display = 'flex';
    renderTagList();
    newTagInput.focus();
}

// 关闭标签管理弹窗
function closeTagModal() {
    tagModal.style.display = 'none';
    newTagInput.value = '';
}

// 事件监听
startBtn.addEventListener('click', startWork);
stopBtn.addEventListener('click', endWork);
clearBtn.addEventListener('click', clearHistory);
filterBtn.addEventListener('click', applyFilter);
resetFilterBtn.addEventListener('click', resetFilter);
exportBtn.addEventListener('click', exportToCSV);
importBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importFromCSV);

// 工作内容输入框回车键支持
workNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !currentRecord.isActive) {
        startWork();
    }
});

// 标签相关事件监听
manageTagsBtn.addEventListener('click', openTagModal);
closeModalBtn.addEventListener('click', closeTagModal);
addTagBtn.addEventListener('click', addTag);

// 新标签输入框回车键支持
newTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTag();
    }
});

// 点击弹窗外部关闭
tagModal.addEventListener('click', (e) => {
    if (e.target === tagModal) {
        closeTagModal();
    }
});

// ==================== 编辑记录功能 ====================

// 转换日期时间为 datetime-local 格式
function toDatetimeLocal(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 打开编辑弹窗
function openEditModal(idOrTimestamp) {
    const record = DataStore.findRecord(idOrTimestamp);
    
    if (!record) {
        alert('找不到该记录');
        return;
    }
    
    currentEditingRecord = record.id;
    
    // 填充表单
    editWorkName.value = record.workName || '';
    editStartTime.value = toDatetimeLocal(record.startTime);
    editEndTime.value = toDatetimeLocal(record.endTime);
    
    // 显示弹窗
    editModal.style.display = 'flex';
    editWorkName.focus();
}

// 关闭编辑弹窗
function closeEditModal() {
    editModal.style.display = 'none';
    currentEditingRecord = null;
    editWorkName.value = '';
    editStartTime.value = '';
    editEndTime.value = '';
}

// 保存编辑
function saveEdit() {
    if (!currentEditingRecord) {
        return;
    }
    
    const workName = editWorkName.value.trim();
    const startTimeStr = editStartTime.value;
    const endTimeStr = editEndTime.value;
    
    // 验证输入
    if (!startTimeStr || !endTimeStr) {
        alert('请选择开始和结束时间');
        return;
    }
    
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
    
    // 验证时间逻辑
    if (endTime <= startTime) {
        alert('结束时间必须晚于开始时间');
        return;
    }
    
    // 验证时间不能是未来
    const now = new Date();
    if (startTime > now || endTime > now) {
        alert('不能设置未来的时间');
        return;
    }
    
    const updated = DataStore.updateRecord(currentEditingRecord, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: calculateDuration(startTime.toISOString(), endTime.toISOString()),
        workName: workName || '未命名工作'
    });
    
    if (!updated) {
        alert('找不到该记录');
        closeEditModal();
        return;
    }
    
    closeEditModal();
    
    // 刷新显示
    renderHistory();
    updateStatistics();
}

// 编辑记录事件监听
closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
saveEditBtn.addEventListener('click', saveEdit);

// 点击弹窗外部关闭
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// 云端模块初始化后启动应用
async function bootstrap() {
    await Auth.init();
    DataStore.init();
    SyncEngine.init();
    CloudUI.init();

    DataStore.onDataChanged(() => {
        renderHistory();
        updateStatistics();
        renderQuickTags();
        renderAlarmPresets();
        initAlarmPresetButtons();
    });

    init();

    if (currentRecord.isActive && currentRecord.startTime) {
        startElapsedTimer();
    }
}

bootstrap();

// ==================== 闹钟功能 ====================

function initNotificationUI() {
    if (!notifyPermissionBtn || !notifyStatus) {
        return;
    }
    updateNotificationStatus();
    notifyPermissionBtn.addEventListener('click', requestNotificationPermission);
}

function updateNotificationStatus() {
    if (!notifyStatus) {
        return;
    }

    if (!('Notification' in window)) {
        notifyStatus.textContent = '当前浏览器不支持桌面通知';
        if (notifyPermissionBtn) {
            notifyPermissionBtn.disabled = true;
        }
        return;
    }

    if (notifyPermissionBtn) {
        notifyPermissionBtn.disabled = false;
    }

    if (Notification.permission === 'granted') {
        notifyStatus.textContent = '已开启，到点将弹出系统通知';
    } else if (Notification.permission === 'denied') {
        notifyStatus.textContent = '已拒绝。请在浏览器设置中允许本站通知。';
    } else {
        notifyStatus.textContent = '未开启，需点击「开启系统通知」授权。';
    }
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return;
    }

    const request = () => {
        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            updateNotificationStatus();
            return;
        }
        const result = Notification.requestPermission();
        if (result && typeof result.then === 'function') {
            result.then(() => {
                updateNotificationStatus();
            }).catch((e) => {
                console.log('请求通知权限失败:', e);
                if (notifyStatus) {
                    notifyStatus.textContent = '无法请求权限，请重试。';
                }
            });
        } else {
            updateNotificationStatus();
        }
    };

    try {
        request();
    } catch (e) {
        console.log('请求通知权限失败:', e);
        if (notifyStatus) {
            notifyStatus.textContent = '无法请求权限，请重试。';
        }
    }
}

function showAlarmNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    const body = alarmMinutes > 0
        ? `闹钟时间到（已设 ${alarmMinutes} 分钟）`
        : '闹钟时间到';

    try {
        const n = new Notification('工作时间记录器', {
            body,
            tag: 'work-time-alarm'
        });
        n.onclick = () => {
            window.focus();
            n.close();
        };
    } catch (e) {
        console.log('无法显示系统通知:', e);
    }
}

// 更新标题行闹钟状态徽章
function updateAlarmHeaderBadge() {
    if (!alarmHeaderBadge) return;
    if (alarmEnabled && alarmMinutes > 0) {
        alarmHeaderBadge.textContent = `${alarmMinutes}分钟 ✓`;
        alarmHeaderBadge.hidden = false;
        alarmHeaderBadge.classList.remove('updated');
        void alarmHeaderBadge.offsetWidth;
        alarmHeaderBadge.classList.add('updated');
    } else {
        alarmHeaderBadge.hidden = true;
        alarmHeaderBadge.textContent = '';
        alarmHeaderBadge.classList.remove('updated');
    }
}

// 切换闹钟开关
function toggleAlarm() {
    alarmEnabled = alarmToggle.checked;
    if (alarmEnabled) {
        alarmOptions.classList.add('active');
        unlockAlarmAudio();
    } else {
        alarmOptions.classList.remove('active');
        clearAlarmTimer();
        releaseAlarmAudio();
        alarmMinutes = 0;
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    }
    updateAlarmHeaderBadge();
}

// 设置闹钟时长
function setAlarmMinutes(minutes) {
    alarmMinutes = minutes;
    updateAlarmHeaderBadge();
    unlockAlarmAudio();
    if (currentRecord.isActive) {
        startAlarmTimer();
    }
}

// 设置自定义时长
function setCustomAlarm() {
    const minutes = parseInt(customAlarmMinutes.value);
    if (isNaN(minutes) || minutes < 1) {
        alert('请输入有效的分钟数');
        return;
    }
    if (minutes > 480) {
        alert('最多只能设置480分钟（8小时）');
        return;
    }
    setAlarmMinutes(minutes);
}

// 启动闹钟计时器
function startAlarmTimer() {
    if (!alarmEnabled || alarmMinutes <= 0) {
        return;
    }

    clearAlarmTimer({ keepProgress: true });

    const alarmTimeMs = alarmMinutes * 60 * 1000;
    alarmStartedAt = Date.now();
    alarmTimer = setTimeout(() => {
        triggerAlarm();
    }, alarmTimeMs);

    showAlarmProgress();
}

// 清除闹钟计时器
function clearAlarmTimer(options = {}) {
    if (alarmTimer) {
        clearTimeout(alarmTimer);
        alarmTimer = null;
    }
    if (!options.keepProgress) {
        alarmStartedAt = 0;
        hideAlarmProgress();
    }
}

function getAlarmAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    if (!alarmAudioContext || alarmAudioContext.state === 'closed') {
        alarmAudioContext = new AudioContextClass();
        alarmAudioUnlocked = false;
    }

    return alarmAudioContext;
}

function playSilentUnlockTone(audioContext) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.01);
}

function unlockAlarmAudio() {
    const audioContext = getAlarmAudioContext();
    if (!audioContext) {
        return Promise.resolve(false);
    }

    try {
        // Safari 需要在用户手势中解锁 Web Audio，后续定时器触发时才能稳定发声。
        playSilentUnlockTone(audioContext);
    } catch (e) {
        console.log('无法预解锁提示音:', e);
    }

    if (alarmAudioUnlockPromise) {
        return alarmAudioUnlockPromise;
    }

    const resumePromise = audioContext.state === 'suspended'
        ? audioContext.resume()
        : Promise.resolve();

    alarmAudioUnlockPromise = resumePromise
        .then(() => {
            alarmAudioUnlocked = audioContext.state === 'running';
            return alarmAudioUnlocked;
        })
        .catch((e) => {
            console.log('无法启用提示音:', e);
            return false;
        })
        .finally(() => {
            alarmAudioUnlockPromise = null;
        });

    return alarmAudioUnlockPromise;
}

function releaseAlarmAudio() {
    if (!alarmAudioContext) {
        return;
    }

    const audioContext = alarmAudioContext;
    alarmAudioContext = null;
    alarmAudioUnlocked = false;
    alarmAudioUnlockPromise = null;

    if (audioContext.state !== 'closed') {
        audioContext.close().catch((e) => {
            console.log('无法关闭提示音:', e);
        });
    }
}

// 触发闹钟
function triggerAlarm() {
    // 播放提示音
    playAlarmSound();

    // 系统桌面通知（需用户事先授权，浏览器保持打开且标签页/定时器可运行；最小化通常仍可显示）
    showAlarmNotification();

    // 进度条置满，显示危险状态
    if (alarmProgress && alarmProgressBar && alarmRemainingValue) {
        alarmProgress.classList.remove('warning');
        alarmProgress.classList.add('danger');
        alarmProgressBar.style.width = '100%';
        alarmRemainingValue.textContent = '时间到';
    }

    // 显示弹窗
    alarmModal.style.display = 'flex';
}

// 播放闹钟提示音
async function playAlarmSound() {
    try {
        const audioContext = getAlarmAudioContext();
        if (!audioContext) {
            console.log('当前浏览器不支持提示音');
            return;
        }

        if (alarmAudioUnlockPromise) {
            await alarmAudioUnlockPromise;
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (audioContext.state !== 'running') {
            console.log('提示音尚未启用，请先点击页面上的闹钟开关或设置按钮');
            return;
        }

        alarmAudioUnlocked = true;
        
        // 创建提示音 - 三声短促的提示音
        const playBeep = (time, duration, frequency) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            oscillator.start(time);
            oscillator.stop(time + duration);
        };
        
        const now = audioContext.currentTime + 0.05;
        playBeep(now, 0.3, 880);
        playBeep(now + 0.35, 0.3, 880);
        playBeep(now + 0.7, 0.3, 880);
        
    } catch (e) {
        console.log('无法播放提示音:', e);
    }
}

// 点击继续按钮 - 继续计时
function continueAlarm() {
    alarmModal.style.display = 'none';
    unlockAlarmAudio();
    // 继续计时，重新启动闹钟计时器
    startAlarmTimer();
}

// 点击结束按钮 - 结束工作
function endFromAlarm() {
    alarmModal.style.display = 'none';
    // 执行结束工作
    endWork();
}

// ==================== 闹钟预设时长管理 ====================
// 读取已保存的预设时长（无效或为空时回退到默认值）
function getAlarmPresets() {
    return DataStore.getAlarmPresets();
}

// 保存预设时长
function saveAlarmPresets(presets) {
    DataStore.saveAlarmPresets(presets);
}

// 新增一个预设时长
function addAlarmPreset(minutes) {
    const presets = getAlarmPresets();
    if (presets.includes(minutes)) {
        return;
    }
    presets.push(minutes);
    presets.sort((a, b) => a - b);
    saveAlarmPresets(presets);
    renderAlarmPresets();
}

// 删除一个预设时长
function removeAlarmPreset(minutes) {
    const presets = getAlarmPresets().filter(p => p !== minutes);
    saveAlarmPresets(presets);
    renderAlarmPresets();
    initAlarmPresetButtons();
}

// 渲染自定义预设时长列表（带删除按钮）
function renderAlarmPresets() {
    const list = document.getElementById('customAlarmPresets');
    if (!list) return;
    const presets = getAlarmPresets();
    list.innerHTML = presets.map(p =>
        `<span class="alarm-preset-chip" data-minutes="${p}">${p}分钟<span class="alarm-preset-remove" data-minutes="${p}" role="button" aria-label="删除${p}分钟预设">×</span></span>`
    ).join('');
    list.querySelectorAll('.alarm-preset-remove').forEach(el => {
        el.addEventListener('click', () => {
            const minutes = parseInt(el.dataset.minutes, 10);
            removeAlarmPreset(minutes);
        });
    });
}

// 初始化预设按钮事件
function initAlarmPresetButtons() {
    // 动态渲染预设按钮（基于本地存储的自定义列表）
    const presetRow = document.querySelector('.preset-buttons');
    if (!presetRow) return;
    const presets = getAlarmPresets();
    presetRow.innerHTML = presets.map(p =>
        `<button class="preset-btn" data-minutes="${p}">${p}分钟</button>`
    ).join('');
    presetRow.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            setAlarmMinutes(minutes);
        });
    });
}

function initCustomAlarmPresets() {
    renderAlarmPresets();
    const addBtn = document.getElementById('addAlarmPresetBtn');
    const input = document.getElementById('newAlarmPresetInput');
    if (addBtn && input) {
        addBtn.addEventListener('click', () => {
            const val = parseInt(input.value);
            if (isNaN(val) || val < 1) {
                alert('请输入有效的分钟数（≥1）');
                return;
            }
            if (val > 480) {
                alert('最多只能设置480分钟（8小时）');
                return;
            }
            addAlarmPreset(val);
            input.value = '';
            initAlarmPresetButtons(); // 同步更新预设按钮
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addBtn.click();
            }
        });
    }

    // 管理区默认隐藏，通过按钮开关显示/收起，保持界面整洁
    const toggleBtn = document.getElementById('toggleAlarmPresetsBtn');
    const panel = document.getElementById('customAlarmPresetsPanel');
    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            const willShow = panel.hidden;
            panel.hidden = !willShow;
            toggleBtn.classList.toggle('active', willShow);
            toggleBtn.setAttribute('aria-expanded', String(willShow));
        });
    }
}

initAlarmPresetButtons();
initCustomAlarmPresets();

// 闹钟事件监听
alarmToggle.addEventListener('change', toggleAlarm);
setAlarmBtn.addEventListener('click', setCustomAlarm);
continueAlarmBtn.addEventListener('click', continueAlarm);
endAlarmBtn.addEventListener('click', endFromAlarm);


// ==================== 快捷键支持 ====================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 忽略在输入框中的按键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // 空格键：开始/结束工作
        if (e.code === 'Space') {
            e.preventDefault();
            if (startBtn.disabled) {
                endWork();
            } else {
                startWork();
            }
        }
        
        // Ctrl+E / Cmd+E：导出数据
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportToCSV();
        }
        
        // Ctrl+/：显示快捷键提示
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showKeyboardShortcuts();
        }
    });
}

function openShortcutsModal() {
    if (shortcutsModal) {
        shortcutsModal.style.display = 'flex';
    }
}

function closeShortcutsModal() {
    if (shortcutsModal) {
        shortcutsModal.style.display = 'none';
    }
}

function showKeyboardShortcuts() {
    openShortcutsModal();
}

function initShortcutsUI() {
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', openShortcutsModal);
    }
    if (closeShortcutsModalBtn) {
        closeShortcutsModalBtn.addEventListener('click', closeShortcutsModal);
    }
    if (shortcutsModal) {
        shortcutsModal.addEventListener('click', (e) => {
            if (e.target === shortcutsModal) {
                closeShortcutsModal();
            }
        });
    }
}

initShortcutsUI();

// 页面加载时初始化
initKeyboardShortcuts();

// 预设按钮回车支持
customAlarmMinutes.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setCustomAlarm();
    }
});

