import { AlarmClock } from 'lucide-react';
import { useState } from 'react';

interface ReminderSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedTime: number;
  onSelectTime: (time: number) => void;
}

export function ReminderSettings({ enabled, onToggle, selectedTime, onSelectTime }: ReminderSettingsProps) {
  const [customTime, setCustomTime] = useState('');

  const timeOptions = [5, 15, 30, 45];

  const handleSetCustom = () => {
    const time = parseInt(customTime);
    if (time > 0) {
      onSelectTime(time);
      setCustomTime('');
    }
  };

  return (
    <div className="mb-3 sm:mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base">⏰</span>
          <h3 className="text-gray-700 font-medium text-xs sm:text-sm">闹钟提醒</h3>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors ${
            enabled ? 'bg-gradient-to-r from-[#80d4ff] to-[#66ccff]' : 'bg-gray-200'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-md transition-transform ${
              enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
        {timeOptions.map(time => (
          <button
            key={time}
            onClick={() => onSelectTime(time)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all ${
              selectedTime === time
                ? 'bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white shadow-[0_4px_10px_rgb(102,204,255,0.3)]'
                : 'bg-gradient-to-r from-[#f0f9ff] to-[#e6f7ff] text-[#4db8ff] hover:shadow-sm'
            }`}
          >
            {time}分钟
          </button>
        ))}
        <input
          type="number"
          value={customTime}
          onChange={(e) => setCustomTime(e.target.value)}
          placeholder="自定义"
          className="w-16 sm:w-20 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gray-50 border border-transparent focus:border-[#66ccff] focus:ring-2 focus:ring-[#66ccff]/20 outline-none text-gray-700 placeholder:text-gray-400 text-xs font-medium transition-all"
          min="1"
        />
        <button
          onClick={handleSetCustom}
          className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white font-medium hover:shadow-[0_4px_10px_rgb(102,204,255,0.3)] transition-all text-xs shadow-sm"
        >
          设置
        </button>
      </div>

      {selectedTime > 0 && (
        <div className="mt-2 px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#e6f7ff] to-[#ccebff] text-[#0099ff] text-xs">
          已设置 {selectedTime} 分钟闹钟
        </div>
      )}
    </div>
  );
}