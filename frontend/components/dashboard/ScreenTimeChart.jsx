"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

export default function ScreenTimeChart({ screenTimeData = [], dailyLimit = 60 }) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const chartData = screenTimeData.map((minutes, i) => ({
    day: dayNames[i] || `D${i + 1}`,
    minutes,
    overLimit: minutes > dailyLimit,
  }));

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
          <Bar
            dataKey="minutes"
            radius={[6, 6, 0, 0]}
            fill="#7C3AED"
            activeBar={{ fill: "#a78bfa" }}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-500 mt-2 text-center">
        Daily limit: {dailyLimit} min &middot; Average: {chartData.length ? Math.round(chartData.reduce((a, b) => a + b.minutes, 0) / chartData.length) : 0} min/day
      </p>
    </div>
  );
}
