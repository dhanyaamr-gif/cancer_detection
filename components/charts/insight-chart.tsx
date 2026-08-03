'use client';

import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { name: 'Mon', confidence: 78 },
  { name: 'Tue', confidence: 84 },
  { name: 'Wed', confidence: 90 },
  { name: 'Thu', confidence: 93 },
  { name: 'Fri', confidence: 95 },
  { name: 'Sat', confidence: 94 },
];

export function InsightChart() {
  return (
    <div className="h-56 w-full rounded-[20px] border border-white/10 bg-[#0A1020] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="confidence" stroke="#7C5CFF" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
