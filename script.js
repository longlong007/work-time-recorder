// 数据存储键
const STORAGE_KEY = 'workTimeRecords';

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
const currentTime = document.getElementById('currentTime');
const elapsedTime = document.getElementById('elapsedTime');
const elapsedTimeValue = document.getElementById('elapsedTimeValue');
const currentWorkName = document.getElementById('currentWorkName');
const currentWorkNameValue = document.getElementById('currentWorkNameValue');
const workNameInput = document.getElementById('workNameInput');
const workNameSection = document.getElementById('workNameSection');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const historyList = document.getElementById('historyList');
const clearBtn = document.getElementById('clearBtn');
const filterDate = document.getElementById('filterDate');
const filterBtn = document.getElementById('filterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const todayTotal = document.getElementById('todayTotal');
const weekTotal = document.getElementById('weekTotal');

let updateInterval = null;
let filterDateValue = null;

// 初始化
function init() {
    loadCurrentRecord();
    updateDisplay();
    renderHistory();
    updateStatistics();
    startClock();
    
    // 设置默认筛选日期为今天
    const today = new Date().toISOString().split('T')[0];
    filterDate.value = today;
}

// 加载当前记录
function loadCurrentRecord() {
    const saved = localStorage.getItem('currentRecord');
    if (saved) {
        const record = JSON.parse(saved);
        if (record.isActive && record.startTime) {
            currentRecord = record;
            // 检查是否跨天，如果跨天则自动结束
            const start = new Date(record.startTime);
            const now = new Date();
            if (start.toDateString() !== now.toDateString()) {
                endWork();
                return;
            }
            // 如果正在工作中，禁用输入框
            workNameInput.disabled = true;
        }
    }
}

// 保存当前记录
function saveCurrentRecord() {
    localStorage.setItem('currentRecord', JSON.stringify(currentRecord));
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
    
    localStorage.removeItem('currentRecord');
    updateDisplay();
    renderHistory();
    updateStatistics();
    stopElapsedTimer();
    
    // 清空并启用输入框
    workNameInput.value = '';
    workNameInput.disabled = false;
    workNameInput.focus();
}

// 保存历史记录
function saveHistoryRecord(record) {
    const records = getHistoryRecords();
    records.push(record);
    // 按开始时间倒序排列
    records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 获取历史记录
function getHistoryRecords() {
    const records = localStorage.getItem(STORAGE_KEY);
    return records ? JSON.parse(records) : [];
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

// 更新显示
function updateDisplay() {
    if (currentRecord.isActive && currentRecord.startTime) {
        statusDot.className = 'status-dot active';
        statusText.textContent = '工作中';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        elapsedTime.style.display = 'block';
        currentWorkName.style.display = 'block';
        currentWorkNameValue.textContent = currentRecord.workName;
    } else {
        statusDot.className = 'status-dot stopped';
        statusText.textContent = '未开始';
        startBtn.disabled = false;
        stopBtn.disabled = false;
        elapsedTime.style.display = 'none';
        currentWorkName.style.display = 'none';
    }
}

// 开始时钟
function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

// 更新时钟
function updateClock() {
    const now = new Date();
    currentTime.textContent = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// 开始计时器
function startElapsedTimer() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(() => {
        if (currentRecord.isActive && currentRecord.startTime) {
            const elapsed = calculateDuration(currentRecord.startTime, new Date().toISOString());
            elapsedTimeValue.textContent = formatDuration(elapsed);
        }
    }, 1000);
}

// 停止计时器
function stopElapsedTimer() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    elapsedTimeValue.textContent = '00:00:00';
}

// 渲染历史记录
function renderHistory() {
    const records = getHistoryRecords();
    let filteredRecords = records;
    
    // 应用日期筛选
    if (filterDateValue) {
        filteredRecords = records.filter(record => {
            const recordDate = new Date(record.startTime).toISOString().split('T')[0];
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
        
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-date">${startDate}</span>
                    <span class="history-duration">${duration}</span>
                </div>
                ${workName ? `<div class="history-work-name">📝 ${escapeHtml(workName)}</div>` : ''}
                <div class="history-time">
                    <span>🕐 开始: ${startTime}</span>
                    <span>🕐 结束: ${endTime}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 更新统计信息
function updateStatistics() {
    const records = getHistoryRecords();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    let todayTotalMs = 0;
    let weekTotalMs = 0;
    
    records.forEach(record => {
        const recordDate = new Date(record.startTime);
        const duration = record.duration;
        
        if (recordDate >= todayStart) {
            todayTotalMs += duration;
        }
        
        if (recordDate >= weekStart) {
            weekTotalMs += duration;
        }
    });
    
    todayTotal.textContent = formatDuration(todayTotalMs);
    weekTotal.textContent = formatDuration(weekTotalMs);
}

// 清空记录
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
        localStorage.removeItem(STORAGE_KEY);
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
    filterDate.value = new Date().toISOString().split('T')[0];
    filterDateValue = null;
    renderHistory();
}

// HTML转义函数（防止XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 事件监听
startBtn.addEventListener('click', startWork);
stopBtn.addEventListener('click', endWork);
clearBtn.addEventListener('click', clearHistory);
filterBtn.addEventListener('click', applyFilter);
resetFilterBtn.addEventListener('click', resetFilter);

// 工作内容输入框回车键支持
workNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !currentRecord.isActive) {
        startWork();
    }
});

// 页面加载时初始化
init();

// 如果当前有活动记录，启动计时器
if (currentRecord.isActive && currentRecord.startTime) {
    startElapsedTimer();
}

