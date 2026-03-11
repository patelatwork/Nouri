"use client";

import { cn } from "@/lib/utils";

const LABELS = {
  beneficial: {
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
    text: "Beneficial",
  },
  neutral: {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    dot: "bg-gray-400",
    text: "Neutral",
  },
  harmful: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    dot: "bg-red-400",
    text: "Caution",
  },
};

export default function WellbeingBadge({ label = "neutral", size = "sm" }) {
  const config = LABELS[label] || LABELS.neutral;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.text}
    </span>
  );
}

export function wellbeingGlowClass(label) {
  switch (label) {
    case "beneficial":
      return "wellbeing-beneficial";
    case "harmful":
      return "wellbeing-harmful";
    default:
      return "wellbeing-neutral";
  }
}
