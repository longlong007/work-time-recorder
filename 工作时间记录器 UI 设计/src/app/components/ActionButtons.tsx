import { Play, Pause } from 'lucide-react';

interface ActionButtonsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function ActionButtons({ isRunning, onStart, onStop, disabled }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
      <button
        onClick={onStart}
        disabled={isRunning || disabled}
        className="flex items-center justify-center gap-1 sm:gap-2 bg-gradient-to-r from-[#80d4ff] to-[#66ccff] text-white py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm lg:text-base shadow-[0_4px_10px_rgb(102,204,255,0.2)] hover:shadow-[0_4px_14px_rgb(102,204,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-3 h-3 sm:w-4 sm:h-4" fill="white" />
        开始工作
      </button>
      <button
        onClick={onStop}
        disabled={!isRunning}
        className="flex items-center justify-center gap-1 sm:gap-2 bg-gradient-to-r from-[#ffcc80] to-[#ffb366] text-white py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm lg:text-base shadow-[0_4px_10px_rgb(255,179,102,0.2)] hover:shadow-[0_4px_14px_rgb(255,179,102,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Pause className="w-3 h-3 sm:w-4 sm:h-4" fill="white" />
        结束工作
      </button>
    </div>
  );
}