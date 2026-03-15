"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from "recharts";

export default function ScreenTimeChart({ screenTimeData = [], dailyLimit = 60 }) {
  // screenTimeData comes as [{date: "2026-03-15", minutes: 45}, ...] from the API
  // Build a full 7-day view with actual data mapped to correct days
  const today = new Date();
  const chartData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const found = screenTimeData.find((entry) => entry.date === dateStr);
    const minutes = found ? Math.round(found.minutes) : 0;
    chartData.push({
      day: dayName,
      minutes,
      overLimit: minutes > dailyLimit,
    });
  }

  const totalMinutes = chartData.reduce((a, b) => a + b.minutes, 0);
  const avgMinutes = chartData.length ? Math.round(totalMinutes / chartData.length) : 0;

  return (
    <div className="glass p-4 rounded-2xl">
      <h3 className="text-sm font-semibold text-white mb-3">Weekly Screen Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}m`}
          />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #374151", borderRadius: 10, fontSize: 12 }}
            formatter={(v) => [`${v} min`, "Time"]}
          />
          <ReferenceLine y={dailyLimit} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Limit", fill: "#ef4444", fontSize: 10 }} />
          <Bar dataKey="minutes" radius={[6, 6, 0, 0]} activeBar={{ fill: "#a78bfa" }}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.overLimit ? "#ef4444" : "#7C3AED"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-500 mt-2 text-center">
        Daily limit: {dailyLimit} min &middot; Average: {avgMinutes} min/day
      </p>
    </div>
  );
}
