/**
 * 工作时长柱状图统计（周 / 月 / 年）
 */
const StatsCharts = (function () {
    const PERIODS = ['week', 'month', 'year'];
    const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    let period = 'week';
    let anchorDate = new Date();
    let canvas = null;
    let ctx = null;
    let tooltipEl = null;
    let chartData = null;
    let hoveredIndex = -1;
    let resizeObserver = null;

    function init() {
        canvas = document.getElementById('workTimeChart');
        tooltipEl = document.getElementById('statsChartTooltip');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        document.querySelectorAll('.stats-period-tab').forEach((btn) => {
            btn.addEventListener('click', () => {
                const next = btn.dataset.period;
                if (!PERIODS.includes(next) || next === period) return;
                period = next;
                anchorDate = new Date();
                updateTabState();
                refresh();
            });
        });

        const prevBtn = document.getElementById('statsChartPrev');
        const nextBtn = document.getElementById('statsChartNext');
        if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);

        resizeObserver = new ResizeObserver(() => render());
        resizeObserver.observe(canvas.parentElement);

        updateTabState();
        refresh();
    }

    function refresh() {
        updatePeriodLabel();
        updateTotal();
        render();
    }

    function getRecordDuration(record) {
        if (typeof record.duration === 'number' && record.duration > 0) {
            return record.duration;
        }
        if (record.startTime && record.endTime) {
            const ms = new Date(record.endTime) - new Date(record.startTime);
            return ms > 0 ? ms : 0;
        }
        return 0;
    }

    function getPeriodBounds(periodType, anchor) {
        if (periodType === 'week') {
            const start = startOfDay(getWeekStart(anchor));
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return { start, end };
        }
        if (periodType === 'month') {
            const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
            const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
            return { start, end };
        }
        const start = new Date(anchor.getFullYear(), 0, 1);
        const end = new Date(anchor.getFullYear() + 1, 0, 1);
        return { start, end };
    }

    function isInPeriod(recordDate, bounds) {
        const t = recordDate.getTime();
        return t >= bounds.start.getTime() && t < bounds.end.getTime();
    }

    function shiftAnchorDate(direction) {
        if (period === 'week') {
            const d = new Date(anchorDate);
            d.setDate(d.getDate() + direction * 7);
            return d;
        }
        if (period === 'month') {
            return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1);
        }
        return new Date(anchorDate.getFullYear() + direction, 0, 1);
    }

    function navigate(direction) {
        anchorDate = shiftAnchorDate(direction);
        updatePeriodLabel();
        updateTotal();
        render();
    }

    function updateTabState() {
        document.querySelectorAll('.stats-period-tab').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });
    }

    function getWeekStart(date) {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayOfWeek = start.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start.setDate(start.getDate() - daysToMonday);
        return start;
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function isSameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function formatShortDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    function formatPeriodLabel() {
        if (period === 'week') {
            const weekStart = getWeekStart(anchorDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getDate()}日`;
            }
            return `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
        }
        if (period === 'month') {
            return `${anchorDate.getFullYear()}年${anchorDate.getMonth() + 1}月`;
        }
        return `${anchorDate.getFullYear()}年`;
    }

    function updatePeriodLabel() {
        const el = document.getElementById('statsChartPeriodLabel');
        if (el) el.textContent = formatPeriodLabel();
    }

    function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function formatHours(ms) {
        const hours = ms / 3600000;
        if (hours === 0) return '0h';
        if (hours < 10) return `${hours.toFixed(1)}h`;
        return `${Math.round(hours)}h`;
    }

    function shouldIncludeRecord(record) {
        if (typeof matchesStatsFilter === 'function') {
            return matchesStatsFilter(record);
        }
        return true;
    }

    function aggregate(records) {
        const buckets = [];
        const now = new Date();
        const today = startOfDay(now);
        const bounds = getPeriodBounds(period, anchorDate);

        if (period === 'week') {
            const weekStart = bounds.start;
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(day.getDate() + i);
                buckets.push({
                    date: day,
                    label: WEEKDAY_LABELS[i],
                    subLabel: formatShortDate(day),
                    ms: 0,
                    highlight: isSameDay(day, today),
                });
            }
        } else if (period === 'month') {
            const year = anchorDate.getFullYear();
            const month = anchorDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const day = new Date(year, month, d);
                buckets.push({
                    date: day,
                    label: String(d),
                    subLabel: '',
                    ms: 0,
                    highlight: isSameDay(day, today),
                });
            }
        } else {
            const year = anchorDate.getFullYear();
            for (let m = 0; m < 12; m++) {
                buckets.push({
                    date: new Date(year, m, 1),
                    label: `${m + 1}月`,
                    subLabel: '',
                    ms: 0,
                    highlight: now.getFullYear() === year && now.getMonth() === m,
                });
            }
        }

        records.forEach((record) => {
            if (!shouldIncludeRecord(record)) return;

            const recordDate = new Date(record.startTime);
            if (Number.isNaN(recordDate.getTime())) return;

            const duration = getRecordDuration(record);
            if (duration <= 0) return;
            if (!isInPeriod(recordDate, bounds)) return;

            if (period === 'week') {
                buckets.forEach((bucket) => {
                    if (isSameDay(recordDate, bucket.date)) bucket.ms += duration;
                });
            } else if (period === 'month') {
                const dayIndex = recordDate.getDate() - 1;
                if (buckets[dayIndex]) buckets[dayIndex].ms += duration;
            } else {
                buckets[recordDate.getMonth()].ms += duration;
            }
        });

        const total = buckets.reduce((sum, b) => sum + b.ms, 0);
        return { buckets, total };
    }

    function getRecords() {
        if (typeof getHistoryRecords === 'function') {
            return getHistoryRecords();
        }
        return DataStore.getRecords();
    }

    function updateTotal() {
        const el = document.getElementById('statsChartTotal');
        if (!el) return;
        const { total } = aggregate(getRecords());
        el.textContent = formatDuration(total);
    }

    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            bar: isDark ? '#5a9bc4' : '#5a9bc4',
            barHighlight: isDark ? '#7eb8dc' : '#3d8ab8',
            barHover: isDark ? '#8ec4e8' : '#4a7ea6',
            grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(90,155,196,0.15)',
            text: isDark ? '#b0b0b0' : '#666',
            textMuted: isDark ? '#808080' : '#999',
            bg: 'transparent',
        };
    }

    function render() {
        if (!canvas || !ctx) return;

        const records = getRecords();
        chartData = aggregate(records);
        const { buckets } = chartData;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const colors = getThemeColors();
        ctx.clearRect(0, 0, width, height);

        if (buckets.length === 0) return;

        const padding = { top: 8, right: 8, bottom: 28, left: 36 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const maxMs = Math.max(...buckets.map((b) => b.ms), 1);
        const barGap = period === 'month' ? 2 : 6;
        const barCount = buckets.length;
        const barWidth = Math.max(2, (chartW - barGap * (barCount - 1)) / barCount);

        // Y 轴刻度
        const yTicks = 4;
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.fillStyle = colors.textMuted;
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= yTicks; i++) {
            const y = padding.top + chartH - (chartH * i) / yTicks;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            const tickMs = (maxMs * i) / yTicks;
            ctx.fillText(formatHours(tickMs), padding.left - 4, y);
        }

        // 柱状图
        buckets.forEach((bucket, i) => {
            const barH = (bucket.ms / maxMs) * chartH;
            const x = padding.left + i * (barWidth + barGap);
            const y = padding.top + chartH - barH;

            const isHovered = i === hoveredIndex;
            ctx.fillStyle = isHovered
                ? colors.barHover
                : bucket.highlight
                  ? colors.barHighlight
                  : colors.bar;

            if (barH > 0) {
                const radius = Math.min(3, barWidth / 2);
                roundRect(ctx, x, y, barWidth, barH, radius);
                ctx.fill();
            }

            // X 轴标签
            const showLabel =
                period !== 'month' ||
                barCount <= 15 ||
                i === 0 ||
                i === barCount - 1 ||
                (i + 1) % 5 === 0;

            if (showLabel) {
                ctx.fillStyle = bucket.highlight ? colors.barHighlight : colors.text;
                ctx.font = period === 'month' ? '9px system-ui, sans-serif' : '10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(bucket.label, x + barWidth / 2, padding.top + chartH + 4);
            }
        });

        // 存储柱位置供 hover 检测
        chartData.barLayout = { padding, barWidth, barGap, chartH, buckets };
    }

    function roundRect(context, x, y, w, h, r) {
        if (h < r * 2) r = h / 2;
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h);
        context.lineTo(x, y + h);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
    }

    function onMouseMove(e) {
        if (!chartData || !chartData.barLayout) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { padding, barWidth, barGap, chartH, buckets } = chartData.barLayout;

        let found = -1;
        buckets.forEach((bucket, i) => {
            const bx = padding.left + i * (barWidth + barGap);
            const barH = (bucket.ms / Math.max(...buckets.map((b) => b.ms), 1)) * chartH;
            const by = padding.top + chartH - barH;
            if (x >= bx && x <= bx + barWidth && y >= by && y <= padding.top + chartH) {
                found = i;
            }
        });

        if (found !== hoveredIndex) {
            hoveredIndex = found;
            render();
        }

        if (found >= 0 && tooltipEl) {
            const bucket = buckets[found];
            let title = bucket.subLabel ? `${bucket.label} (${bucket.subLabel})` : bucket.label;
            if (period === 'month') {
                title = `${bucket.date.getMonth() + 1}月${bucket.date.getDate()}日`;
            } else if (period === 'year') {
                title = `${anchorDate.getFullYear()}年${bucket.label}`;
            }
            tooltipEl.textContent = `${title}: ${formatDuration(bucket.ms)}`;
            tooltipEl.style.display = 'block';
            tooltipEl.style.left = `${e.clientX - rect.left}px`;
            tooltipEl.style.top = `${e.clientY - rect.top - 32}px`;
        } else if (tooltipEl) {
            tooltipEl.style.display = 'none';
        }
    }

    function onMouseLeave() {
        hoveredIndex = -1;
        if (tooltipEl) tooltipEl.style.display = 'none';
        render();
    }

    return { init, refresh };
})();
