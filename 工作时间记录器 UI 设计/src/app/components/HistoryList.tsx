import { Calendar, Download, Upload } from 'lucide-react';
import { WorkRecord } from '../App';
import { useState } from 'react';

interface HistoryListProps {
  records: WorkRecord[];
  formatTime: (seconds: number) => string;
  onClear: () => void;
  onExportCSV: () => void;
  onImportCSV: () => void;
}

export function HistoryList({ records, formatTime, onClear, onExportCSV, onImportCSV }: HistoryListProps) {
  const [filterType, setFilterType] = useState<'all' | 'date'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/'));

  const filteredRecords = filterType === 'date' 
    ? records.filter(r => r.date === selectedDate)
    : records;

  return (
    <div className="mb-3 sm:mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
          <span className="text-sm sm:text-base">📋</span>
          <h3 className="text-gray-700 font-medium text-xs sm:text-sm">历史记录</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={onExportCSV}
            className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white text-xs font-medium hover:shadow-[0_4px_10px_rgb(102,204,255,0.3)] transition-all flex-1 sm:flex-initial shadow-sm"
          >
            <Download className="w-3 h-3" />
            <span>导出</span>
          </button>
          <button
            onClick={onImportCSV}
            className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#66e6cc] to-[#33ccb3] text-white text-xs font-medium hover:shadow-[0_4px_10px_rgb(51,204,179,0.3)] transition-all flex-1 sm:flex-initial shadow-sm"
          >
            <Upload className="w-3 h-3" />
            <span>导入</span>
          </button>
          <button
            onClick={onClear}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#ffb3c6] to-[#ff99b3] text-white text-xs font-medium hover:shadow-[0_4px_10px_rgb(255,153,179,0.3)] transition-all flex-1 sm:flex-initial shadow-sm"
          >
            清空
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 mb-2">
        <input
          type="date"
          value={selectedDate.replace(/\//g, '-')}
          onChange={(e) => setSelectedDate(e.target.value.replace(/-/g, '/'))}
          className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-gray-50 border border-transparent focus:border-[#66ccff] focus:ring-2 focus:ring-[#66ccff]/20 outline-none text-gray-700 text-xs sm:text-sm flex-1 sm:flex-initial transition-all"
        />
        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={() => setFilterType('date')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-xl font-medium transition-all text-xs flex-1 ${
              filterType === 'date'
                ? 'bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white shadow-[0_4px_10px_rgb(102,204,255,0.3)]'
                : 'bg-gradient-to-r from-[#f0f9ff] to-[#e6f7ff] text-[#4db8ff] hover:shadow-sm'
            }`}
          >
            筛选
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-xl font-medium transition-all text-xs flex-1 ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white shadow-[0_4px_10px_rgb(102,204,255,0.3)]'
                : 'bg-gradient-to-r from-[#f0f9ff] to-[#e6f7ff] text-[#4db8ff] hover:shadow-sm'
            }`}
          >
            重置
          </button>
        </div>
      </div>

      <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2 border-l-2 sm:border-l-4 border-[#66ccff] pl-2 sm:pl-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-gray-400 text-xs sm:text-sm">暂无记录</div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-2 sm:p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">今天</span>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white text-xs shadow-sm">
                  {formatTime(record.duration)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">📝</span>
                <span className="text-gray-700 font-medium text-xs sm:text-sm">{record.task}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span>⏰</span>
                  <span>开始: {record.startTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰</span>
                  <span>结束: {record.endTime}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}