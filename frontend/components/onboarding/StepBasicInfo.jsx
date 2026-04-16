"use client";

import { useState } from "react";
import { User, Mail, Lock, Calendar } from "lucide-react";

export default function StepBasicInfo({ data, onChange }) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
      <p className="text-gray-400">Join a platform that respects you.</p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-gray-300 flex items-center gap-2 mb-1">
            <User className="h-4 w-4" /> Username
          </span>
          <input
            type="text"
            value={data.username}
            onChange={(e) => onChange({ username: e.target.value.trim() })}
            placeholder="your_username"
            className="w-full rounded-xl bg-surface-light border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-300 flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4" /> Email
          </span>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value.trim() })}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-surface-light border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-300 flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4" /> Password
          </span>
          <input
            type="password"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Min 8 characters"
            className="w-full rounded-xl bg-surface-light border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-300 flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4" /> Age
          </span>
          <input
            type="number"
            min={13}
            max={120}
            value={data.age}
            onChange={(e) => onChange({ age: parseInt(e.target.value) || 13 })}
            className="w-full rounded-xl bg-surface-light border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>
    </div>
  );
}
