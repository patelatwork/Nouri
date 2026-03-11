"use client";

import { motion } from "framer-motion";
import { Clock, Coffee, Moon } from "lucide-react";
import { useScreenTimeStore } from "@/lib/store";

export default function BreakPrompt({ type = "soft", onDismiss }) {
  const endHardBreak = useScreenTimeStore((s) => s.endHardBreak);
  const minutesToday = useScreenTimeStore((s) => s.minutesToday);

  const isSoft = type === "soft";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center space-y-5">
        <div className="mx-auto h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
          {isSoft ? (
            <Coffee className="h-8 w-8 text-accent" />
          ) : (
            <Moon className="h-8 w-8 text-warning" />
          )}
        </div>

        <h2 className="text-xl font-bold text-white">
          {isSoft ? "Time for a break?" : "Break time"}
        </h2>

        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            You&apos;ve been scrolling for {Math.round(minutesToday)} minutes today
          </span>
        </div>

        <p className="text-sm text-gray-400">
          {isSoft
            ? "You've reached your soft limit. Taking breaks helps your wellbeing — consider stepping away for a few minutes."
            : "You've reached your daily limit. A 10-minute cooldown is in effect to support your wellbeing."}
        </p>

        {isSoft ? (
          <div className="flex flex-col gap-2">
            <button onClick={onDismiss} className="btn-secondary text-sm">
              Continue watching
            </button>
            <button
              onClick={() => {
                onDismiss?.();
                window.close();
              }}
              className="btn-primary text-sm"
            >
              Take a break
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full bg-surface-light rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 600, ease: "linear" }}
                onAnimationComplete={() => {
                  endHardBreak();
                  onDismiss?.();
                }}
                className="h-full bg-accent rounded-full"
              />
            </div>
            <p className="text-xs text-gray-600">Cooldown in progress…</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
