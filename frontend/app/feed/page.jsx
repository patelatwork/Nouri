"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Home, Search, PlusSquare, User, BarChart3,
  RefreshCw, ListOrdered, Sparkles, Loader2, ChevronDown,
} from "lucide-react";
import Link from "next/link";

import { getFeed, getChronologicalFeed } from "@/lib/api";
import { useAuthStore, useScreenTimeStore, useFeedStore } from "@/lib/store";
import ReelCard from "@/components/feed/ReelCard";
import BreakPrompt from "@/components/feed/BreakPrompt";
import { cn } from "@/lib/utils";

export default function FeedPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { feedMode, setFeedMode } = useFeedStore();
  const { minutesToday, startSession, tick, breakPromptShown, hardBreakActive, showBreakPrompt, activateHardBreak, dismissBreak } = useScreenTimeStore();

  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  // Start screen time tracking — keyed to the logged-in user so accounts don't share data
  useEffect(() => {
    startSession(user?.id);
    const interval = setInterval(tick, 60000); // tick every minute
    return () => clearInterval(interval);
  }, [startSession, tick, user?.id]);

  // Screen time break prompts
  useEffect(() => {
    const dailyLimit = user?.daily_limit_minutes || 60;
    const isMinor = (user?.age || 18) < 18;

    if (minutesToday >= dailyLimit && !hardBreakActive) {
      if (isMinor || minutesToday >= dailyLimit * 1.5) {
        activateHardBreak();
      } else if (!breakPromptShown) {
        showBreakPrompt();
      }
    } else if (minutesToday >= dailyLimit * 0.5 && !breakPromptShown) {
      showBreakPrompt();
    }
  }, [minutesToday, user, breakPromptShown, hardBreakActive, showBreakPrompt, activateHardBreak]);

  const fetchFeed = feedMode === "recommended" ? getFeed : getChronologicalFeed;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["feed", feedMode, page],
    queryFn: () => fetchFeed(page),
    enabled: isAuthenticated,
  });

  // Append new page posts
  useEffect(() => {
    if (data?.posts) {
      setAllPosts((prev) => (page === 1 ? data.posts : [...prev, ...data.posts]));
    }
  }, [data, page]);

  const loadMore = () => {
    if (data?.has_more) setPage((p) => p + 1);
  };

  const refresh = () => {
    setPage(1);
    setAllPosts([]);
    refetch();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Nouri
          </h1>

          <div className="flex items-center gap-2">
            {/* Feed mode toggle */}
            <button
              onClick={() => {
                setFeedMode(feedMode === "recommended" ? "chronological" : "recommended");
                setPage(1);
                setAllPosts([]);
              }}
              className={cn("btn-ghost text-xs flex items-center gap-1")}
              title={feedMode === "recommended" ? "Switch to chronological" : "Switch to recommended"}
            >
              {feedMode === "recommended" ? (
                <><Sparkles className="h-3.5 w-3.5 text-accent" /> For You</>
              ) : (
                <><ListOrdered className="h-3.5 w-3.5 text-secondary" /> Latest</>
              )}
            </button>

            <button onClick={refresh} className="btn-ghost p-2">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Diversity score bar */}
        {data?.diversity_score !== undefined && (
          <div className="max-w-md mx-auto mt-1">
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>Feed diversity: {data.diversity_score}%</span>
              <div className="flex-1 h-1.5 bg-surface-light rounded-full">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${data.diversity_score}%`,
                    backgroundColor: data.diversity_score >= 70 ? "#10b981" : data.diversity_score >= 40 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Explore Different Perspectives */}
      {data?.explore_picks?.length > 0 && (
        <div className="max-w-md mx-auto px-4 py-3">
          <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <Search className="h-3 w-3" /> Explore Different Perspectives
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {data.explore_picks.map((post) => (
              <div
                key={post.id}
                className="flex-shrink-0 w-24 h-36 rounded-xl overflow-hidden bg-surface relative"
              >
                {post.thumbnail_url && (
                  <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-1.5">
                  <p className="text-[9px] text-white line-clamp-2">{post.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed — vertical snap scroll (NO infinite scroll) */}
      <div className="max-w-md mx-auto px-4 space-y-4">
        {isLoading && page === 1 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>No posts yet. Content is being loaded.</p>
          </div>
        ) : (
          allPosts.map((post, i) => <ReelCard key={post.id} post={post} index={i} />)
        )}

        {/* No infinite scroll — explicit Load More button */}
        {data?.has_more && (
          <button
            onClick={loadMore}
            disabled={isFetching}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><ChevronDown className="h-4 w-4" /> Load More</>
            )}
          </button>
        )}

        {!data?.has_more && allPosts.length > 0 && (
          <p className="text-center text-sm text-gray-600 py-4">
            You&apos;ve reached the end. Time for a break?
          </p>
        )}
      </div>

      {/* Break Prompts */}
      {breakPromptShown && !hardBreakActive && (
        <BreakPrompt type="soft" onDismiss={dismissBreak} />
      )}
      {hardBreakActive && <BreakPrompt type="hard" onDismiss={dismissBreak} />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-gray-800 z-30">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-accent">
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Feed</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-white">
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Explore</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-white">
            <PlusSquare className="h-5 w-5" />
            <span className="text-[10px]">Upload</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-white">
            <BarChart3 className="h-5 w-5" />
            <span className="text-[10px]">Dashboard</span>
          </Link>
          <Link href={`/profile/${user?.username || ""}`} className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-white">
            <User className="h-5 w-5" />
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
