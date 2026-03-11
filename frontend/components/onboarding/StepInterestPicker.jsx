"use client";

import { cn } from "@/lib/utils";
import {
  Dumbbell, Plane, UtensilsCrossed, Laugh, Palette, GraduationCap,
  Music, TreePine, Cpu, Sparkles, FlaskConical, Shirt, PawPrint,
  Hammer, Gamepad2,
} from "lucide-react";

const CATEGORIES = [
  { id: "fitness", icon: Dumbbell, label: "Fitness" },
  { id: "travel", icon: Plane, label: "Travel" },
  { id: "food", icon: UtensilsCrossed, label: "Food" },
  { id: "comedy", icon: Laugh, label: "Comedy" },
  { id: "art", icon: Palette, label: "Art" },
  { id: "education", icon: GraduationCap, label: "Education" },
  { id: "music", icon: Music, label: "Music" },
  { id: "nature", icon: TreePine, label: "Nature" },
  { id: "technology", icon: Cpu, label: "Technology" },
  { id: "motivation", icon: Sparkles, label: "Motivation" },
  { id: "science", icon: FlaskConical, label: "Science" },
  { id: "fashion", icon: Shirt, label: "Fashion" },
  { id: "pets", icon: PawPrint, label: "Pets" },
  { id: "diy", icon: Hammer, label: "DIY" },
  { id: "gaming", icon: Gamepad2, label: "Gaming" },
];

export default function StepInterestPicker({ data, onChange }) {
  const selected = data.interests || [];

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((i) => i !== id)
      : [...selected, id];
    onChange({ interests: next });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">Pick Your Interests</h2>
      <p className="text-gray-400">
        Choose at least 3 categories. This shapes your initial feed — you can always change it later.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const isActive = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-200 border-2",
                isActive
                  ? "bg-accent/20 border-accent text-white"
                  : "glass border-transparent text-gray-400 hover:border-gray-600"
              )}
            >
              <cat.icon className={cn("h-7 w-7", isActive ? "text-accent" : "text-gray-500")} />
              <span className="text-xs font-medium">{cat.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-gray-500">
        {selected.length}/3 minimum selected
      </p>
    </div>
  );
}

export { CATEGORIES };
