"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = {
  beneficial: "#10b981",
  neutral: "#6b7280",
  harmful: "#ef4444",
};

const LABELS = {
  beneficial: "Beneficial",
  neutral: "Neutral",
  harmful: "Harmful",
};

export default function WellbeingPieChart({ breakdown = {} }) {
  const data = Object.entries(breakdown)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key] || key,
      value,
      color: COLORS[key] || "#6b7280",
    }));

  if (data.length === 0) {
    return (
      <div className="glass p-4 rounded-2xl text-center text-sm text-gray-500">
        <h3 className="text-sm font-semibold text-white mb-3">Content Wellbeing</h3>
        <p>No data yet</p>
      </div>
    );
  }

  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="glass p-4 rounded-2xl">
      <h3 className="text-sm font-semibold text-white mb-3">Content Wellbeing</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #374151", borderRadius: 10, fontSize: 12 }}
            formatter={(v) => [`${v} (${Math.round((v / total) * 100)}%)`, ""]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
