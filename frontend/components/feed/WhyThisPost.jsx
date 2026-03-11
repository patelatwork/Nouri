"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X, ThumbsDown, EyeOff, Ban } from "lucide-react";

import { explainPost, logInteraction } from "@/lib/api";
import WellbeingBadge from "./WellbeingBadge";

export default function WhyThisPost({ postId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["explain", postId],
    queryFn: () => explainPost(postId),
    enabled: !!postId,
  });

  const handleFeedback = async (action) => {
    await logInteraction(postId, { action });
    onClose?.();
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-5 space-y-3"
      >
        <div className="h-4 w-48 bg-surface-light rounded animate-pulse" />
        <div className="h-3 w-full bg-surface-light rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-surface-light rounded animate-pulse" />
      </motion.div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass-strong rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-white text-sm">Why you&apos;re seeing this</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Reasons */}
      <ul className="space-y-2">
        {data.reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <span className="text-accent mt-0.5">•</span>
            {reason}
          </li>
        ))}
      </ul>

      {/* Wellbeing status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Wellbeing:</span>
        <WellbeingBadge label={data.wellbeing_label} />
      </div>
      <p className="text-xs text-gray-500">{data.wellbeing_detail}</p>

      {/* Beauty disclaimer */}
      <p className="text-[11px] text-gray-600 italic border-t border-gray-800 pt-3">
        {data.beauty_disclaimer}
      </p>

      {/* Feedback controls */}
      <div className="flex gap-2 border-t border-gray-800 pt-3">
        <button
          onClick={() => handleFeedback("dislike")}
          className="btn-ghost text-xs flex items-center gap-1"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          See Less Like This
        </button>
        <button
          onClick={() => handleFeedback("skip")}
          className="btn-ghost text-xs flex items-center gap-1"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Not Interested
        </button>
        <button
          onClick={() => handleFeedback("skip")}
          className="btn-ghost text-xs flex items-center gap-1"
        >
          <Ban className="h-3.5 w-3.5" />
          Hide Creator
        </button>
      </div>
    </motion.div>
  );
}
