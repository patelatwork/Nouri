"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart, Bookmark, Share2, Info, MessageCircle } from "lucide-react";

import ReelPlayer from "./ReelPlayer";
import WellbeingBadge, { wellbeingGlowClass } from "./WellbeingBadge";
import WhyThisPost from "./WhyThisPost";
import ContentWarning from "./ContentWarning";
import { logInteraction } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ReelCard({ post, index }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [viewLogged, setViewLogged] = useState(false);

  const handleLike = async () => {
    setLiked(!liked);
    await logInteraction(post.id, { action: liked ? "dislike" : "like" });
  };

  const handleSave = async () => {
    setSaved(!saved);
    await logInteraction(post.id, { action: "save" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: post.title, url: post.video_url });
    }
    await logInteraction(post.id, { action: "share" });
  };

  const handleWatchProgress = useCallback(
    async (seconds, completion) => {
      if (!viewLogged && seconds > 2) {
        setViewLogged(true);
        await logInteraction(post.id, {
          action: "view",
          watch_duration_seconds: Math.round(seconds),
          completion_rate: parseFloat(completion.toFixed(2)),
        });
      }
    },
    [post.id, viewLogged]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl overflow-hidden",
        wellbeingGlowClass(post.wellbeing_label)
      )}
    >
      <ContentWarning post={post}>
        {/* Video Player */}
        <ReelPlayer
          videoUrl={post.video_url}
          embedUrl={post.embed_url}
          sourceApi={post.source_api}
          onWatchProgress={handleWatchProgress}
        />

        {/* Wellbeing badge — top right */}
        <div className="absolute top-3 right-3 z-10">
          <WellbeingBadge label={post.wellbeing_label} />
        </div>

        {/* Creator info — bottom left */}
        <div className="absolute bottom-16 left-3 z-10 max-w-[60%]">
          <div className="flex items-center gap-2 mb-1">
            {post.creator?.profile_picture_url && (
              <img
                src={post.creator.profile_picture_url}
                alt=""
                className="h-8 w-8 rounded-full border border-white/20 object-cover"
              />
            )}
            <span className="text-sm font-semibold text-white drop-shadow">
              {post.creator?.name || "Creator"}
            </span>
          </div>
          <p className="text-xs text-white/80 drop-shadow line-clamp-2">{post.title}</p>
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons — right side */}
        <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-5">
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", liked ? "bg-red-500" : "bg-white/10 backdrop-blur-sm")}>
              <Heart className={cn("h-5 w-5", liked ? "text-white fill-white" : "text-white")} />
            </div>
            <span className="text-[10px] text-white">{(post.likes_count || 0) + (liked ? 1 : 0)}</span>
          </button>

          <button onClick={handleSave} className="flex flex-col items-center gap-1">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", saved ? "bg-accent" : "bg-white/10 backdrop-blur-sm")}>
              <Bookmark className={cn("h-5 w-5", saved ? "text-white fill-white" : "text-white")} />
            </div>
            <span className="text-[10px] text-white">Save</span>
          </button>

          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-white">Share</span>
          </button>

          <button onClick={() => setShowWhy(!showWhy)} className="flex flex-col items-center gap-1">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", showWhy ? "bg-accent" : "bg-white/10 backdrop-blur-sm")}>
              <Info className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-white">Why?</span>
          </button>
        </div>

        {/* WhyThisPost overlay */}
        {showWhy && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
            <WhyThisPost postId={post.id} onClose={() => setShowWhy(false)} />
          </div>
        )}
      </ContentWarning>
    </motion.div>
  );
}