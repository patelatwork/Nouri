"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  User as UserIcon, Shield, Clock, Eye, LogOut, Play, Film,
  Home, Search, PlusSquare, BarChart3,
} from "lucide-react";
import Link from "next/link";

import { getMe, getWellbeingStats, getUserPosts } from "@/lib/api";
import { useAuthStore, useScreenTimeStore } from "@/lib/store";
import DiversityGauge from "@/components/dashboard/DiversityGauge";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const minutesToday = useScreenTimeStore((s) => s.minutesToday);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery({
    queryKey: ["wellbeingStats"],
    queryFn: getWellbeingStats,
    enabled: isAuthenticated,
  });

  const user = me || currentUser;

  const { data: myPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["myPosts", user?.id],
    queryFn: () => getUserPosts(user.id),
    enabled: isAuthenticated && !!user?.id,
  });

  if (!isAuthenticated || !user) return null;

  const privacyTier = user.privacy_level || user.privacy_tier || "standard";
  const privacyLabel = {
    standard: "Standard",
    privacy_plus: "Privacy Plus",
    full_privacy: "Full Privacy",
  }[privacyTier];

  return (
    <div className="min-h-screen pb-20">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-accent/30 to-secondary/20" />
        <div className="max-w-md mx-auto px-4 -mt-12">
          {/* Logout button — top right */}
          <div className="absolute top-4 right-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors bg-surface-light/80 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-background flex items-center justify-center">
            <UserIcon className="h-10 w-10 text-gray-500" />
          </div>

          <div className="mt-3">
            <h1 className="text-xl font-bold text-white">@{user.username}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>

            {/* Privacy badge */}
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full",
                privacyTier === "full_privacy" ? "bg-green-500/20 text-green-400" :
                privacyTier === "privacy_plus" ? "bg-blue-500/20 text-blue-400" :
                "bg-gray-500/20 text-gray-400"
              )}>
                <Shield className="h-2.5 w-2.5" />
                {privacyLabel}
              </span>

              {user.age && (
                <span className="text-[10px] text-gray-500">Age {user.age}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {/* Today's screen time */}
        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm text-white">Today&apos;s Screen Time</span>
            </div>
            <span className={cn(
              "text-lg font-bold",
              minutesToday > (user.daily_limit_minutes || 60)
                ? "text-red-400"
                : "text-accent"
            )}>
              {Math.round(minutesToday)}m
            </span>
          </div>
          <div className="mt-2 h-2 bg-surface-light rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                minutesToday > (user.daily_limit_minutes || 60) ? "bg-red-500" : "bg-accent"
              )}
              style={{
                width: `${Math.min(100, (minutesToday / (user.daily_limit_minutes || 60)) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Limit: {user.daily_limit_minutes || 60} min/day
          </p>
        </div>

        {/* My Reels */}
        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-accent" /> My Reels
            </h3>
            <Link href="/upload" className="text-[10px] text-accent hover:underline">
              + Upload
            </Link>
          </div>

          {postsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : myPosts.length === 0 ? (
            <div className="text-center py-6">
              <Film className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No uploads yet</p>
              <Link href="/upload" className="text-xs text-accent hover:underline mt-1 inline-block">
                Upload your first video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {myPosts.map((post) => (
                <div key={post.id} className="relative group rounded-lg overflow-hidden bg-surface">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center bg-surface-light">
                      <Play className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-[9px] text-white text-center px-1 line-clamp-2">{post.title}</p>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] text-gray-300">
                    {post.views_count || 0} views
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content visibility */}
        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-secondary" />
            <span className="text-sm text-white">Your Wellbeing Edition</span>
          </div>
          <p className="text-xs text-gray-400">
            Nouri protects your wellbeing by filtering and labeling content.
            Harmful content is gated behind warnings, and you are always shown
            <em> why</em> a post appears in your feed.
          </p>
        </div>

        {/* Diversity gauge */}
        {stats?.diversity_score !== undefined && (
          <DiversityGauge score={stats.diversity_score} />
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/dashboard"
            className="glass p-3 rounded-xl text-center hover:ring-1 hover:ring-accent/30 transition-all"
          >
            <BarChart3 className="h-5 w-5 text-accent mx-auto mb-1" />
            <span className="text-xs text-gray-300">Dashboard</span>
          </Link>
          <Link
            href="/explore"
            className="glass p-3 rounded-xl text-center hover:ring-1 hover:ring-secondary/30 transition-all"
          >
            <Search className="h-5 w-5 text-secondary mx-auto mb-1" />
            <span className="text-xs text-gray-300">Explore</span>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-gray-800 z-30">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-white">
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
          <Link href={`/profile/${user?.username || ""}`} className="flex flex-col items-center gap-0.5 text-accent">
            <UserIcon className="h-5 w-5" />
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
