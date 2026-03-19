import { Play } from 'lucide-react';

interface TimerCardProps {
  isRunning: boolean;
  elapsedTime: number;
  formatTime: (seconds: number) => string;
}

export function TimerCard({ isRunning, elapsedTime, formatTime }: TimerCardProps) {
  return (
    <div className="mb-3 sm:mb-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#80d4ff] to-[#66ccff] p-4 sm:p-6 text-center shadow-[0_8px_20px_rgb(102,204,255,0.25)]">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-white/80 text-xs">●</span>
        <span className="text-white text-sm sm:text-base">{isRunning ? '进行中' : '未开始'}</span>
      </div>
      <div className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wider drop-shadow-md">
        {formatTime(elapsedTime)}
      </div>
    </div>
  );
}