"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search as SearchIcon, RefreshCw, Loader2, Compass,
  Home, PlusSquare, User, BarChart3,
} from "lucide-react";
import Link from "next/link";

import { getFeed } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import ReelCard from "@/components/feed/ReelCard";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All", "comedy", "education", "fitness", "cooking", "travel",
  "music", "art", "tech", "nature", "science", "mindfulness",
];

export default function ExplorePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["explore", activeCategory],
    queryFn: () => getFeed(1), // Uses explore_picks from the feed endpoint
    enabled: isAuthenticated,
  });

  const explorePosts = data?.explore_picks || data?.posts || [];

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-secondary" /> Explore
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Discover diverse perspectives outside your bubble</p>
        </div>
      </header>

      {/* Category filters */}
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                activeCategory === cat
                  ? "bg-secondary text-white"
                  : "bg-surface text-gray-400 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="max-w-md mx-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-secondary animate-spin" />
          </div>
        ) : explorePosts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Compass className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No content to explore yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {explorePosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-xl overflow-hidden bg-surface aspect-[9/16]"
              >
                {post.thumbnail_url ? (
                  <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-light">
                    <Compass className="h-8 w-8 text-gray-600" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                  <p className="text-xs text-white font-medium line-clamp-2">{post.title}</p>
                  {post.creator && (
                    <p className="text-[10px] text-gray-300 mt-0.5">@{post.creator.name}</p>
                  )}
                  {post.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] text-gray-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-gray-800 z-30">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-white">
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Feed</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-0.5 text-secondary">
            <SearchIcon className="h-5 w-5" />
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
