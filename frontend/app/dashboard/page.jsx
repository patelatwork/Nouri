"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, PieChart as PieIcon, Sliders, History,
  Home, Search, PlusSquare, User, BarChart3,
} from "lucide-react";
import Link from "next/link";

import { getWellbeingStats, getInterests } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import ScreenTimeChart from "@/components/dashboard/ScreenTimeChart";
import WellbeingPieChart from "@/components/dashboard/WellbeingPieChart";
import InterestEditor from "@/components/dashboard/InterestEditor";
import WatchHistoryComponent from "@/components/dashboard/WatchHistory";
import DiversityGauge from "@/components/dashboard/DiversityGauge";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "wellbeing", label: "Wellbeing", icon: Activity },
  { key: "interests", label: "Interests", icon: Sliders },
  { key: "history", label: "History", icon: History },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTab, setActiveTab] = useState("wellbeing");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["wellbeingStats"],
    queryFn: getWellbeingStats,
    enabled: isAuthenticated,
  });

  const { data: interests, isLoading: interestsLoading } = useQuery({
    queryKey: ["interests"],
    queryFn: getInterests,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" /> Your Dashboard
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4 pt-3">
        <div className="flex bg-surface rounded-xl p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-accent/20 text-accent"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-md mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "wellbeing" && (
            <motion.div
              key="wellbeing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <ScreenTimeChart
                screenTimeData={stats?.screen_time_weekly || []}
                dailyLimit={user?.daily_limit_minutes || 60}
              />
              <div className="grid grid-cols-2 gap-4">
                <WellbeingPieChart breakdown={stats?.content_breakdown || {}} />
                <DiversityGauge score={stats?.diversity_score || 0} />
              </div>

              {/* Mood Trend */}
              {stats?.mood_trend?.length > 0 && (
                <div className="glass p-4 rounded-2xl">
                  <h3 className="text-sm font-semibold text-white mb-3">Mood Trend</h3>
                  <div className="flex items-end gap-1 h-16">
                    {stats.mood_trend.map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all"
                        style={{
                          height: `${(val / 5) * 100}%`,
                          backgroundColor: val >= 4 ? "#10b981" : val >= 3 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                    <span>7 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              )}

              {statsLoading && (
                <div className="text-center text-sm text-gray-500 py-8">Loading stats...</div>
              )}
            </motion.div>
          )}

          {activeTab === "interests" && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {interestsLoading ? (
                <div className="text-center text-sm text-gray-500 py-8">Loading interests...</div>
              ) : (
                <InterestEditor interests={interests || []} />
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WatchHistoryComponent />
            </motion.div>
          )}
        </AnimatePresence>
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
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-accent">
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