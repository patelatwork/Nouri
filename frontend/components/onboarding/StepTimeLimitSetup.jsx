"use client";

import { Clock, AlertTriangle, Moon } from "lucide-react";

export default function StepTimeLimitSetup({ data, onChange }) {
  const age = data.age || 18;
  const defaultLimit = age < 18 ? 30 : 60;
  const limit = data.daily_limit_minutes || defaultLimit;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Set Your Daily Limit</h2>
      <p className="text-gray-400">
        We believe social media should fit your life, not consume it. Choose how long you want to spend here each day.
      </p>

      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold text-white">{limit} minutes</span>
          </div>
          <span className="text-sm text-gray-400">per day</span>
        </div>

        <input
          type="range"
          min={10}
          max={480}
          step={5}
          value={limit}
          onChange={(e) => onChange({ daily_limit_minutes: parseInt(e.target.value) })}
          className="w-full accent-accent"
        />

        <div className="flex justify-between text-xs text-gray-500">
          <span>10 min</span>
          <span>8 hours</span>
        </div>
      </div>

      {age < 18 && (
        <div className="glass rounded-2xl p-4 border border-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Teen Safety Mode</p>
              <p className="text-xs text-gray-400 mt-1">
                Since you're under 18, we'll enforce a hard break at 60 minutes with a 10-minute
                cooldown. Harmful content filters are stricter for your safety.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Moon className="h-5 w-5 text-secondary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">What happens at your limit?</p>
            <ul className="text-xs text-gray-400 mt-1 space-y-1 list-disc list-inside">
              <li>Soft reminder at 50% of your daily limit</li>
              <li>Gentle break prompt at 100%</li>
              <li>No forced lockout for adults — just honest nudges</li>
              <li>You can always switch to chronological feed (no algorithm)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
