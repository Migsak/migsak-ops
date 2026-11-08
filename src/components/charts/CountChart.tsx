'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Accessible, colour-blind friendly series palette. */
export const SERIES_COLORS = ['#1A73E8', '#12B5CB', '#E8710A', '#9334E6', '#1E8E3E', '#D93025', '#F9AB00', '#5F6368'];

/**
 * Daily counts (for example commits). Pass one key for a single series, or
 * several keys to stack one series per person.
 */
export function CountChart({
  data,
  keys,
  height = 220,
  label
}: {
  data: Array<Record<string, string | number>>;
  keys: { key: string; name: string }[];
  height?: number;
  label: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#EEF0F2" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#59636E' }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#59636E' }} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(26,115,232,0.06)' }} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E1E4E8' }} />
          {keys.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} /> : null}
          {keys.map((k, i) => (
            <Bar
              key={k.key}
              dataKey={k.key}
              name={k.name}
              stackId="a"
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              maxBarSize={28}
              radius={i === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
