"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

// ── YouTube IFrame API view tracker ──────────────────────────────────────
// The YT iframe is sandboxed so we can't read currentTime directly.
// We listen for postMessage events from the YT player (requires enablejsapi=1)
// to detect when playback starts and how long the user watched.
function YouTubePlayer({ embedUrl, onWatchProgress }) {
  const iframeRef = useRef(null);
  const startTimeRef = useRef(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        // YT sends {event: "infoDelivery", info: {playerState, currentTime, duration, ...}}
        if (data?.event === "infoDelivery" && data?.info) {
          const { playerState, currentTime, duration } = data.info;
          // playerState 1 = playing
          if (playerState === 1 && !startTimeRef.current) {
            startTimeRef.current = Date.now();
          }
          // Once user has watched > 2 seconds, log a view
          if (
            !reportedRef.current &&
            currentTime != null &&
            currentTime > 2 &&
            duration != null &&
            duration > 0
          ) {
            reportedRef.current = true;
            const completion = Math.min(currentTime / duration, 1);
            onWatchProgress?.(currentTime, completion);
          }
        }
        // Also handle the simpler onStateChange messages
        if (data?.event === "onStateChange" && data?.info === 1) {
          // State 1 = playing — start timer
          if (!startTimeRef.current) startTimeRef.current = Date.now();
        }
      } catch { /* ignore non-YT messages */ }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onWatchProgress]);

  // After 3s of the iframe being mounted, fire a fallback view log
  // (handles cases where the YT iframe API doesn't send postMessages)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!reportedRef.current) {
        reportedRef.current = true;
        // We can't know exact time for iframe, so estimate 3s watched at unknown completion
        onWatchProgress?.(3, 0.05);
      }
    }, 4000); // 4s: give the iframe enough time to actually start
    return () => clearTimeout(timer);
  }, [onWatchProgress]);

  // Build URL with JS API enabled so we can receive postMessages
  const src = embedUrl
    ? `${embedUrl}?autoplay=0&controls=1&modestbranding=1&rel=0&enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`
    : "";

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full"
        allow="encrypted-media"
        allowFullScreen
        title="Video player"
      />
    </div>
  );
}

// ── Direct video player (Pexels / uploads) ────────────────────────────────
export default function ReelPlayer({ videoUrl, embedUrl, sourceApi, onWatchProgress }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef(null);

  // Track watch progress on each tick
  const trackProgress = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      const pct = Math.min(current / total, 1);
      setProgress(pct * 100);
      setDuration(total);
      onWatchProgress?.(current, pct);
    }
  }, [onWatchProgress]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      videoRef.current.play();
      intervalRef.current = setInterval(trackProgress, 1000);
    }
    setPlaying(!playing);
  };

  // YouTube embed — delegate to YouTubePlayer which handles view tracking
  if (sourceApi === "youtube" && embedUrl) {
    return <YouTubePlayer embedUrl={embedUrl} onWatchProgress={onWatchProgress} />;
  }

  // Direct video (Pexels / uploads)
  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden group">
      <video
        ref={videoRef}
        src={videoUrl}
        muted={muted}
        playsInline
        loop
        className="w-full h-full object-cover"
        onClick={togglePlay}
      />

      {/* Play/Pause overlay — user must tap to play (NO autoplay) */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <div className="h-16 w-16 rounded-full bg-accent/80 flex items-center justify-center backdrop-blur-sm">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      {playing && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => setMuted(!muted)} className="text-white">
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Completion progress bar (always visible) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
