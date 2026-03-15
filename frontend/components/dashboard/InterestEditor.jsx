"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Download, Plus } from "lucide-react";
import { updateInterests, resetAlgorithm } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ALL_CATEGORIES = [
  "comedy", "education", "fitness", "cooking", "travel",
  "music", "art", "tech", "nature", "fashion",
  "sports", "science", "gaming", "books", "mindfulness",
];

export default function InterestEditor({ interests = [] }) {
  const [selected, setSelected] = useState(interests.map((i) => i.category || i));
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (categories) => updateInterests(categories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interests"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["wellbeingStats"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetAlgorithm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interests"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["watchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["wellbeingStats"] });
    },
  });

  const removeInterest = (cat) => {
    const next = selected.filter((c) => c !== cat);
    if (next.length < 3) return; // must keep at least 3
    setSelected(next);
    updateMutation.mutate(next);
  };

  const addInterest = (cat) => {
    const next = [...selected, cat];
    setSelected(next);
    setShowAdd(false);
    updateMutation.mutate(next);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ interests: selected }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nouri-interests.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const available = ALL_CATEGORIES.filter((c) => !selected.includes(c));

  return (
    <div className="glass p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Your Interests</h3>
        <div className="flex gap-1">
          <button onClick={exportData} className="btn-ghost p-1.5" title="Export data">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm("Reset your algorithm profile? Feed will re-learn your preferences.")) {
                resetMutation.mutate();
              }
            }}
            className="btn-ghost p-1.5 text-red-400"
            title="Reset algorithm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interest chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <AnimatePresence>
          {selected.map((cat) => (
            <motion.div
              key={cat}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-1 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs"
            >
              {cat}
              {selected.length > 3 && (
                <button onClick={() => removeInterest(cat)} className="hover:text-red-400 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {available.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 bg-surface-light px-3 py-1 rounded-full text-xs text-gray-400 hover:text-white"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {/* Add interest popover */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {available.map((cat) => (
              <button
                key={cat}
                onClick={() => addInterest(cat)}
                className="bg-surface px-3 py-1 rounded-full text-xs text-gray-400 hover:bg-accent/20 hover:text-accent transition-colors"
              >
                {cat}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-gray-500 mt-2">Minimum 3 interests required. These shape your feed recommendations.</p>
    </div>
  );
}
