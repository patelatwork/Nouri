"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Play, User, Tag, ChevronDown } from "lucide-react";
import { getWatchHistory } from "@/lib/api";

export default function WatchHistory() {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const { data: history = [], isLoading, isFetching } = useQuery({
    queryKey: ["watchHistory", page],
    queryFn: () => getWatchHistory(page),
    onSuccess: (data) => {
      setAllItems((prev) => (page === 1 ? data : [...prev, ...data]));
    },
    keepPreviousData: true,
  });

  // Merge pages — on first load allItems might be empty, use history directly
  const items = allItems.length > 0 ? allItems : history;
  const displayed = showAll ? items : items.slice(0, 9);

  // Calculate creator and category stats
  const creatorStats = {};
  const categoryStats = {};
  items.forEach((item) => {
    if (item.creator_name) {
      creatorStats[item.creator_name] = (creatorStats[item.creator_name] || 0) + 1;
    }
    if (item.category) {
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
    }
  });

  const totalViews = items.length;

  const sortedCreators = Object.entries(creatorStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const sortedCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (isLoading && page === 1) {
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
    <div className="space-y-4">
      {/* Recent Watch History */}
      <div className="glass p-4 rounded-2xl">
        <h3 className="text-sm font-semibold text-white mb-3">
          Recent Videos
          {totalViews > 0 && <span className="text-[10px] text-gray-500 ml-2 font-normal">{totalViews} watched</span>}
        </h3>

        {items.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">No watch history yet — start watching videos on the feed!</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {displayed.map((item) => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden bg-surface">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
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
                    <p className="text-[9px] text-white text-center px-1 line-clamp-2 mb-1">
                      {item.post_title || "Video"}
                    </p>
                    {item.creator_name && (
                      <p className="text-[8px] text-gray-300">{item.creator_name}</p>
                    )}
                  </div>

                  {/* Completion badge */}
                  {item.completion_rate > 0 && (
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/70 px-1 py-0.5 rounded text-[8px] text-gray-300">
                      <Clock className="h-2 w-2" />
                      {Math.round(item.completion_rate * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Show more / load more controls */}
            {items.length > 9 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 w-full text-xs text-accent hover:underline flex items-center justify-center gap-1"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Show all {items.length} videos
              </button>
            )}
            {showAll && history.length === 50 && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="mt-3 w-full text-xs text-accent hover:underline flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isFetching ? "Loading..." : (
                  <><ChevronDown className="h-3.5 w-3.5" /> Load more</>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Top Creators with Percentage */}
      {sortedCreators.length > 0 && (
        <div className="glass p-4 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-accent" /> Top Creators
          </h3>
          <div className="space-y-2.5">
            {sortedCreators.map(([creator, count]) => {
              const percentage = totalViews > 0 ? Math.round((count / totalViews) * 100) : 0;
              return (
                <div key={creator} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 truncate">{creator}</span>
                    <span className="text-[10px] text-accent font-medium">{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Categories with Percentage */}
      {sortedCategories.length > 0 && (
        <div className="glass p-4 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-secondary" /> Top Categories
          </h3>
          <div className="space-y-2.5">
            {sortedCategories.map(([category, count]) => {
              const percentage = totalViews > 0 ? Math.round((count / totalViews) * 100) : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 capitalize">{category}</span>
                    <span className="text-[10px] text-secondary font-medium">{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


