"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export default function ReelPlayer({ videoUrl, embedUrl, sourceApi, onWatchProgress }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef(null);

  // Track watch progress
  const trackProgress = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      const pct = current / total;
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

  // YouTube embed — no autoplay
  if (sourceApi === "youtube" && embedUrl) {
    return (
      <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
        <iframe
          src={`${embedUrl}?autoplay=0&controls=1&modestbranding=1&rel=0`}
          className="w-full h-full"
          allow="encrypted-media"
          allowFullScreen
          title="Video player"
        />
      </div>
    );
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
