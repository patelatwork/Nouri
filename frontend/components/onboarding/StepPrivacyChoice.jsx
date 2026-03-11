"use client";

import { Shield, Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    id: "standard",
    icon: Eye,
    name: "Standard",
    desc: "Personalised recommendations using your interests and watch history. Data used to improve your experience.",
    color: "border-accent",
  },
  {
    id: "privacy_plus",
    icon: Shield,
    name: "Privacy Plus",
    desc: "Reduced data collection. Recommendations based only on selected interests, not watch behaviour. No cross-session tracking.",
    color: "border-secondary",
  },
  {
    id: "full",
    icon: Lock,
    name: "Full Privacy",
    desc: "Minimal data stored. Chronological feed only — no algorithmic recommendations. Your data is never used for any model.",
    color: "border-warning",
  },
];

export default function StepPrivacyChoice({ data, onChange }) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">Choose Your Privacy Level</h2>
      <p className="text-gray-400">
        Unlike other platforms, you decide how much data we use. You can change this anytime.
      </p>

      <div className="space-y-3">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => onChange({ privacy_tier: tier.id })}
            className={cn(
              "w-full glass rounded-2xl p-5 text-left transition-all duration-200 border-2",
              data.privacy_tier === tier.id ? tier.color : "border-transparent"
            )}
          >
            <div className="flex items-start gap-3">
              <tier.icon
                className={cn(
                  "h-6 w-6 mt-0.5",
                  data.privacy_tier === tier.id ? "text-accent" : "text-gray-500"
                )}
              />
              <div>
                <h3 className="font-semibold text-white">{tier.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{tier.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
