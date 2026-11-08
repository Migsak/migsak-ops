'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface HoursPoint {
  label: string;
  hours: number;
  target: number;
}

const BLUE = '#1A73E8';
const TARGET = '#9AA0A6';

function formatHours(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Hours worked per day as bars, with the day's target as a dashed line. */
export function HoursChart({ data, height = 240 }: { data: HoursPoint[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Hours worked per day compared with target">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#EEF0F2" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#59636E' }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#59636E' }} allowDecimals={false} unit="h" />
          <Tooltip
            cursor={{ fill: 'rgba(26,115,232,0.06)' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E1E4E8' }}
            formatter={(value, name) => [formatHours(Number(value)), name === 'hours' ? 'Worked' : 'Target']}
          />
          <Bar dataKey="hours" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line dataKey="target" stroke={TARGET} strokeDasharray="4 4" dot={false} strokeWidth={1.5} type="stepAfter" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
