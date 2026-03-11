"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { Leaf, Shield, Eye, Heart } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace("/feed");
  }, [isAuthenticated, router]);

  const features = [
    { icon: Heart, title: "Wellbeing First", desc: "Every post scored for your mental health" },
    { icon: Eye, title: "Full Transparency", desc: "See exactly why each video is recommended" },
    { icon: Shield, title: "Privacy by Design", desc: "You control your data and algorithm" },
    { icon: Leaf, title: "No Addiction Loops", desc: "No autoplay, no infinite scroll, real limits" },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-accent via-accent-light to-secondary bg-clip-text text-transparent">
            Nouri
          </span>
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-lg mx-auto">
          Social media that nourishes — not drains. Powered by Responsible AI.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 max-w-md mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass rounded-2xl p-4 text-left"
            >
              <f.icon className="h-5 w-5 text-accent mb-2" />
              <h3 className="text-sm font-semibold text-white">{f.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex gap-4 justify-center">
          <button onClick={() => router.push("/signup")} className="btn-primary text-lg px-8 py-3">
            Get Started
          </button>
          <button onClick={() => router.push("/login")} className="btn-secondary text-lg px-8 py-3">
            Log In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
