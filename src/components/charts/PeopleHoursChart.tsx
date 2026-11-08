'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface PersonHours {
  name: string;
  hours: number;
  target: number;
}

/** Horizontal bars: hours worked against target per person for a period. */
export function PeopleHoursChart({ data }: { data: PersonHours[] }) {
  const height = Math.max(160, data.length * 44 + 40);
  return (
    <div style={{ height }} role="img" aria-label="Hours worked per person compared with target">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barGap={2}>
          <CartesianGrid stroke="#EEF0F2" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#59636E' }} unit="h" allowDecimals={false} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 12, fill: '#1F2328' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E1E4E8' }} formatter={(v, n) => [`${Number(v).toFixed(1)}h`, n === 'hours' ? 'Worked' : 'Target']} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: '#5F6368' }}>{v === 'hours' ? 'Worked' : 'Target'}</span>} />
          <Bar dataKey="target" fill="#DADCE0" radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="hours" fill="#1A73E8" radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
