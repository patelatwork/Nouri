"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Upload as UploadIcon, FileVideo, X, Loader2, Check,
  Home, Search, PlusSquare, User, BarChart3,
} from "lucide-react";
import Link from "next/link";

import { uploadPost } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const TAG_OPTIONS = [
  "comedy", "education", "fitness", "cooking", "travel",
  "music", "art", "tech", "nature", "fashion",
  "sports", "science", "gaming", "books", "mindfulness",
];

const CATEGORY_OPTIONS = [
  "comedy", "education", "fitness", "cooking", "travel",
  "music", "art", "technology", "nature", "fashion",
  "sports", "science", "gaming", "books", "mindfulness",
  "motivation", "pets", "general",
];

export default function UploadPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadPost(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["myPosts"] });
      router.push(`/profile/${user?.username || ""}`);
    },
  });

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    const formData = new FormData();
    formData.append("video", file);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("tags", tags.join(","));
    formData.append("category", category);

    uploadMutation.mutate(formData);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadIcon className="h-5 w-5 text-accent" /> Upload
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* File picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="glass rounded-2xl border-2 border-dashed border-gray-700 hover:border-accent/50 transition-colors cursor-pointer overflow-hidden"
        >
          {preview ? (
            <div className="relative">
              <video src={preview} className="w-full max-h-64 object-contain bg-black" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full hover:bg-red-500/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileVideo className="h-10 w-10 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">Tap to select a video</p>
              <p className="text-[10px] text-gray-600 mt-1">MP4, WebM, MOV &middot; Max 100MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your video a title"
            maxLength={120}
            className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
            maxLength={500}
            className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat} className="bg-surface">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Tags</label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  tags.includes(tag)
                    ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                    : "bg-surface text-gray-400 hover:text-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Upload progress message */}
        {uploadMutation.isPending && (
          <div className="glass p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              <span>Uploading video... This may take a moment for larger files.</span>
            </div>
            <div className="mt-2 h-1.5 bg-surface-light rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: "5%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 30, ease: "linear" }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {uploadMutation.isError && (
          <p className="text-xs text-red-400">
            Upload failed: {uploadMutation.error?.response?.data?.detail || "Please try again"}
          </p>
        )}

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={!file || !title.trim() || uploadMutation.isPending}
          whileTap={{ scale: 0.97 }}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {uploadMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
          ) : uploadMutation.isSuccess ? (
            <><Check className="h-4 w-4" /> Uploaded!</>
          ) : (
            <><UploadIcon className="h-4 w-4" /> Upload Video</>
          )}
        </motion.button>
      </form>

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
          <Link href="/upload" className="flex flex-col items-center gap-0.5 text-accent">
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
