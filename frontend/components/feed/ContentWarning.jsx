"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function ContentWarning({ post, children }) {
  const [dismissed, setDismissed] = useState(false);

  if (post.wellbeing_label !== "harmful" || dismissed) {
    return children;
  }

  return (
    <div className="relative w-full h-full">
      {/* Blurred background */}
      <div className="absolute inset-0 bg-surface rounded-2xl overflow-hidden filter blur-xl opacity-30">
        {post.thumbnail_url && (
          <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Warning overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10"
      >
        <div className="glass-strong rounded-2xl p-6 max-w-sm space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>

          <h3 className="text-lg font-semibold text-white">Content Notice</h3>
          <p className="text-sm text-gray-400">
            This content has been flagged as potentially harmful to wellbeing.
            It may contain themes related to body image, comparison, or other sensitive topics.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setDismissed(true)}
              className="btn-secondary text-sm"
            >
              I understand, show content
            </button>
            <button
              onClick={() => window.history.back()}
              className="btn-ghost text-sm text-gray-500"
            >
              Skip this content
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
