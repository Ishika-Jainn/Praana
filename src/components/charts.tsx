"use client";

import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tipStyle = { background: "#14241e", border: "none", borderRadius: 12, color: "#f6f1e7" };

export function TrendArea({ data }: { data: { month: string; cases: number; deaths?: number }[] }) {
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="fillCases" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4622d" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#c4622d" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fill: "#5d6f67", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#5d6f67", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={tipStyle} />
          <Area type="monotone" dataKey="cases" stroke="#c4622d" fill="url(#fillCases)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: "#5d6f67", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#5d6f67", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey="value" fill="#1f6f5b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
