"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Play } from "lucide-react";
import { getWatchHistory } from "@/lib/api";

export default function WatchHistory() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["watchHistory"],
    queryFn: getWatchHistory,
  });

  if (isLoading) {
    return (
      <div className="glass p-4 rounded-2xl animate-pulse">
        <h3 className="text-sm font-semibold text-white mb-3">Watch History</h3>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-4 rounded-2xl">
      <h3 className="text-sm font-semibold text-white mb-3">Watch History</h3>

      {history.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-6">No watch history yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
          {history.map((item) => (
            <div key={item.id} className="relative group rounded-lg overflow-hidden bg-surface">
              {item.post?.thumbnail_url ? (
                <img
                  src={item.post.thumbnail_url}
                  alt=""
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-surface-light">
                  <Play className="h-5 w-5 text-gray-600" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                <p className="text-[9px] text-white text-center px-1 line-clamp-2">
                  {item.post?.title || "Video"}
                </p>
              </div>

              {/* Watch duration */}
              {item.watch_duration_seconds > 0 && (
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/70 px-1 py-0.5 rounded text-[8px] text-gray-300">
                  <Clock className="h-2 w-2" />
                  {Math.floor(item.watch_duration_seconds / 60)}:{String(item.watch_duration_seconds % 60).padStart(2, "0")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
