// 数据存储键
const STORAGE_KEY = 'workTimeRecords';
const TAGS_STORAGE_KEY = 'workTags';

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

// 当前正在编辑的记录
let currentEditingRecord = null;

let updateInterval = null;
let filterDateValue = null;

// 初始化
function init() {
    loadCurrentRecord();
    updateDisplay();
    renderHistory();
    updateStatistics();
    startClock();
    loadTags();
    renderQuickTags();
    
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
                    <div class="history-header-left">
                        <span class="history-date">${startDate}</span>
                        <span class="history-duration">${duration}</span>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn-edit-record" data-timestamp="${record.startTime}" title="编辑此记录">✏️</button>
                        <button class="btn-delete-record" data-timestamp="${record.startTime}" title="删除此记录">🗑️</button>
                    </div>
                </div>
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
            const timestamp = btn.dataset.timestamp;
            openEditModal(timestamp);
        });
    });
    
    // 为删除按钮添加事件监听
    document.querySelectorAll('.btn-delete-record').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const timestamp = btn.dataset.timestamp;
            deleteRecord(timestamp);
        });
    });
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

// 删除单条记录
function deleteRecord(timestamp) {
    if (!confirm('确定要删除这条记录吗？此操作不可恢复！')) {
        return;
    }
    
    const records = getHistoryRecords();
    const filteredRecords = records.filter(record => record.startTime !== timestamp);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords));
    renderHistory();
    updateStatistics();
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

// ==================== 标签管理功能 ====================

// 获取标签列表
function getTags() {
    const tags = localStorage.getItem(TAGS_STORAGE_KEY);
    return tags ? JSON.parse(tags) : ['开发', '会议', '学习', '调试', '文档'];
}

// 保存标签列表
function saveTags(tags) {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
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
        `<button class="quick-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
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
        });
    });
}

// 渲染标签管理列表
function renderTagList() {
    const tags = getTags();
    
    if (tags.length === 0) {
        tagList.innerHTML = '<div class="empty-tags">暂无标签，请添加一个</div>';
        return;
    }
    
    tagList.innerHTML = tags.map(tag => `
        <div class="tag-item">
            <span class="tag-item-name">${escapeHtml(tag)}</span>
            <button class="btn-delete-tag" data-tag="${escapeHtml(tag)}">🗑️ 删除</button>
        </div>
    `).join('');
    
    // 为删除按钮添加事件
    document.querySelectorAll('.btn-delete-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteTag(btn.dataset.tag);
        });
    });
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
function openEditModal(timestamp) {
    const records = getHistoryRecords();
    const record = records.find(r => r.startTime === timestamp);
    
    if (!record) {
        alert('找不到该记录');
        return;
    }
    
    // 保存当前编辑的记录
    currentEditingRecord = timestamp;
    
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
    
    // 获取所有记录
    const records = getHistoryRecords();
    const recordIndex = records.findIndex(r => r.startTime === currentEditingRecord);
    
    if (recordIndex === -1) {
        alert('找不到该记录');
        closeEditModal();
        return;
    }
    
    // 更新记录
    records[recordIndex] = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: calculateDuration(startTime.toISOString(), endTime.toISOString()),
        workName: workName || '未命名工作'
    };
    
    // 重新排序
    records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    // 保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    
    // 关闭弹窗
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

// 页面加载时初始化
init();

// 如果当前有活动记录，启动计时器
if (currentRecord.isActive && currentRecord.startTime) {
    startElapsedTimer();
}

