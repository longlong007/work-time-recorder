import { WorkRecord } from '../App';

interface StatisticsProps {
  records: WorkRecord[];
  formatTime: (seconds: number) => string;
}

export function Statistics({ records, formatTime }: StatisticsProps) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
  
  const todayRecords = records.filter(r => r.date === today);
  const todayTotal = todayRecords.reduce((sum, r) => sum + r.duration, 0);

  // 本周统计
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  
  const weekStart = getWeekStart(new Date());
  const weekRecords = records.filter(r => {
    const recordDate = new Date(r.date);
    return recordDate >= weekStart;
  });
  const weekTotal = weekRecords.reduce((sum, r) => sum + r.duration, 0);

  // 本月统计
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthRecords = records.filter(r => {
    const recordDate = new Date(r.date);
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
  });
  const monthTotal = monthRecords.reduce((sum, r) => sum + r.duration, 0);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-center bg-gray-50/80 rounded-xl py-3 hover:shadow-sm transition-shadow">
        <div className="text-xs text-gray-500 mb-1">今日总计</div>
        <div className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-[#4db8ff] to-[#0099ff] bg-clip-text text-transparent">
          {formatTime(todayTotal)}
        </div>
      </div>
      <div className="text-center bg-gray-50/80 rounded-xl py-3 hover:shadow-sm transition-shadow">
        <div className="text-xs text-gray-500 mb-1">本周总计</div>
        <div className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-[#4db8ff] to-[#0099ff] bg-clip-text text-transparent">
          {formatTime(weekTotal)}
        </div>
      </div>
      <div className="text-center bg-gray-50/80 rounded-xl py-3 hover:shadow-sm transition-shadow">
        <div className="text-xs text-gray-500 mb-1">本月总计</div>
        <div className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-[#4db8ff] to-[#0099ff] bg-clip-text text-transparent">
          {formatTime(monthTotal)}
        </div>
      </div>
    </div>
  );
}