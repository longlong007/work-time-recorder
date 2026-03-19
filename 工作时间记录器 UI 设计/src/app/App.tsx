import { useState, useEffect, useRef } from 'react';
import { AlarmClock, Clock, Edit, Calendar, Play, Pause } from 'lucide-react';
import exampleImage from 'figma:asset/a091d72d43ca85712c4ce386c8704e2829121fba.png';
import { TimerCard } from './components/TimerCard';
import { ActionButtons } from './components/ActionButtons';
import { ReminderSettings } from './components/ReminderSettings';
import { HistoryList } from './components/HistoryList';
import { Statistics } from './components/Statistics';

export interface WorkRecord {
  id: string;
  task: string;
  tag: string;
  startTime: string;
  endTime: string;
  duration: number;
  date: string;
}

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(0);
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [tags, setTags] = useState(['开发', '会议', '学习', '调试', '文档', '定计划']);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (reminderEnabled && isRunning && elapsedTime > 0 && elapsedTime % (reminderTime * 60) === 0) {
      // 播放提醒音或显示通知
      console.log('提醒：已工作 ' + reminderTime + ' 分钟');
    }
  }, [elapsedTime, reminderEnabled, reminderTime, isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const handleStop = () => {
    if (isRunning && startTime && currentTask) {
      const endTime = new Date();
      const record: WorkRecord = {
        id: Date.now().toString(),
        task: currentTask,
        tag: selectedTag,
        startTime: startTime.toLocaleTimeString('zh-CN', { hour12: false }),
        endTime: endTime.toLocaleTimeString('zh-CN', { hour12: false }),
        duration: elapsedTime,
        date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
      };
      setRecords(prev => [record, ...prev]);
    }
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setCurrentTask('');
    setSelectedTag('');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClearHistory = () => {
    setRecords([]);
  };

  const handleExportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,日期,任务,标签,开始时间,结束时间,时长\n' +
      records.map(r => `${r.date},${r.task},${r.tag},${r.startTime},${r.endTime},${formatTime(r.duration)}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'work_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = () => {
    console.log('导入CSV');
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
    if (selectedTag === tagToDelete) {
      setSelectedTag('');
    }
  };

  const handleAddTag = (newTag: string) => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f7ff] via-[#bae7ff] to-[#66ccff] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3 sm:p-6 lg:p-8">
        {/* 顶部标题区 */}
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
          <span className="text-2xl sm:text-3xl">⏰</span>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">工作时间记录器</h1>
        </div>

        {/* 核心计时卡片 */}
        <TimerCard 
          isRunning={isRunning}
          elapsedTime={elapsedTime}
          formatTime={formatTime}
        />

        {/* 工作内容输入框 */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 whitespace-nowrap">工作名称</span>
            <input
              type="text"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              placeholder="请输入工作内容名称（可选）"
              disabled={isRunning}
              className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-transparent focus:border-[#66ccff] focus:ring-2 focus:ring-[#66ccff]/20 outline-none text-sm text-gray-700 placeholder:text-gray-400 disabled:opacity-50 transition-all"
            />
          </div>
        </div>

        {/* 标签选择区 */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">标签分类</span>
            <button
              onClick={() => setIsManagingTags(!isManagingTags)}
              disabled={isRunning}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white text-xs font-medium shadow-[0_4px_10px_rgb(102,204,255,0.2)] hover:shadow-[0_4px_14px_rgb(102,204,255,0.4)] transition-all disabled:opacity-50"
            >
              {isManagingTags ? '完成' : '管理标签'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {tags.map(tag => (
              <div key={tag} className="relative">
                <button
                  onClick={() => !isRunning && !isManagingTags && setSelectedTag(tag)}
                  disabled={isRunning}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${
                    selectedTag === tag
                      ? 'bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white shadow-[0_4px_10px_rgb(102,204,255,0.3)]'
                      : 'bg-gradient-to-r from-[#f0f9ff] to-[#e6f7ff] text-[#4db8ff] hover:shadow-sm'
                  }`}
                >
                  {tag}
                </button>
                {isManagingTags && (
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#ffb3c6] to-[#ff99b3] text-white rounded-full text-xs flex items-center justify-center hover:shadow-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 开始/结束按钮 */}
        <ActionButtons
          isRunning={isRunning}
          onStart={handleStart}
          onStop={handleStop}
          disabled={!currentTask && !isRunning}
        />

        {/* 提醒设置区 */}
        <ReminderSettings
          enabled={reminderEnabled}
          onToggle={setReminderEnabled}
          selectedTime={reminderTime}
          onSelectTime={setReminderTime}
        />

        {/* 历史记录列表 */}
        <HistoryList
          records={records}
          formatTime={formatTime}
          onClear={handleClearHistory}
          onExportCSV={handleExportCSV}
          onImportCSV={handleImportCSV}
        />

        {/* 今日/本周/本月统计区 */}
        <Statistics
          records={records}
          formatTime={formatTime}
        />
      </div>
    </div>
  );
}