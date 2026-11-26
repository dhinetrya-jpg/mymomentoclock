import {useEffect, useRef, useState} from 'react';

type Period = 'Week' | 'Month' | 'Year';
const periods: Period[] = ['Week', 'Month', 'Year'];
const monthName = new Intl.DateTimeFormat('en', {month: 'long', timeZone: 'UTC'});

export function locationCalendarDays(date: string, period: 'Week' | 'Month', month: number): string[] {
  const selected = new Date(date + 'T00:00:00Z');
  const year = selected.getUTCFullYear();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  if (period === 'Week') {
    start.setTime(selected.getTime());
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
  }

  const days: string[] = [];
  for (const day = start; day < end; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCFullYear() === year) days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export function LocationCalendar({date, chooseDate, busy}: {date: string; chooseDate: (day: string) => void; busy: boolean}) {
  const [period, setPeriod] = useState<Period>('Week');
  const [browse, setBrowse] = useState<{selected: string; anchor: string; focusDay?: boolean} | null>(null);
  const firstDay = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (browse?.focusDay) firstDay.current?.focus();
  }, [browse]);
  const anchor = browse?.selected === date ? browse.anchor : date;
  const month = Number(anchor.slice(5, 7)) - 1;
  const year = Number(date.slice(0, 4));
  const label = (index: number) => monthName.format(Date.UTC(year, index, 1));
  const days = period === 'Year' ? [] : locationCalendarDays(anchor, period, month);
  const first = days[0];
  const last = days[days.length - 1];
  const hasPrevious = first !== `${year}-01-01`;
  const hasNext = last !== `${year}-12-31`;

  function move(edge: string, offset: number) {
    const target = new Date(edge + 'T00:00:00Z');
    target.setUTCDate(target.getUTCDate() + offset);
    setBrowse({selected: date, anchor: target.toISOString().slice(0, 10)});
  }

  return <details className="rounded-lg border border-rose-800 p-4">
    <summary className="cursor-pointer">Browse dates in {year}</summary>
    <div role="group" aria-label="Calendar period" className="my-3 flex flex-wrap gap-2">
      {periods.map(value => <button key={value} type="button" aria-pressed={value === period}
        className="rounded border border-rose-700 px-3 py-2 aria-pressed:border-amber-300"
        onClick={() => {setPeriod(value); setBrowse(null);}}>{value}</button>)}
    </div>
    {period !== 'Year' && <div className="mb-2 flex flex-wrap items-center gap-2">
      <button type="button" aria-disabled={!hasPrevious} onClick={() => {if (hasPrevious) move(first, -1);}}
        className="rounded border border-rose-700 px-3 py-2 aria-disabled:opacity-50">Previous {period.toLowerCase()}</button>
      <p aria-live="polite">{period === 'Month' ? `${label(month)} ${year}` : `${first} to ${last}`}</p>
      <button type="button" aria-disabled={!hasNext} onClick={() => {if (hasNext) move(last, 1);}}
        className="rounded border border-rose-700 px-3 py-2 aria-disabled:opacity-50">Next {period.toLowerCase()}</button>
    </div>}
    <ul className="flex flex-wrap gap-2" aria-label={period === 'Year' ? 'Months' : 'Dates'}>
      {period === 'Year'
        ? Array.from({length: 12}, (_, index) => <li key={index}>
            <button type="button" className="rounded border border-rose-700 px-3 py-2"
              onClick={() => {setBrowse({selected: date, anchor: new Date(Date.UTC(year, index, 1)).toISOString().slice(0, 10), focusDay: true}); setPeriod('Month');}}>{label(index)}</button>
          </li>)
        : days.map((day, index) => <li key={day}>
            <button ref={index === 0 ? firstDay : undefined} type="button" disabled={busy} aria-pressed={day === date} className="rounded border border-rose-700 px-3 py-2 aria-pressed:border-amber-300"
              onClick={() => chooseDate(day)}>{day}</button>
          </li>)}
    </ul>
  </details>;
}
