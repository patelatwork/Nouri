"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { signup } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import StepBasicInfo from "@/components/onboarding/StepBasicInfo";
import StepPrivacyChoice from "@/components/onboarding/StepPrivacyChoice";
import StepInterestPicker from "@/components/onboarding/StepInterestPicker";
import StepTimeLimitSetup from "@/components/onboarding/StepTimeLimitSetup";

const STEPS = ["Account", "Privacy", "Interests", "Limits"];

export default function OnboardingPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    username: "",
    email: "",
    password: "",
    age: 18,
    privacy_tier: "standard",
    interests: [],
    daily_limit_minutes: 60,
  });

  const update = (partial) => setData((prev) => ({ ...prev, ...partial }));

  const canProceed = () => {
    if (step === 0) return data.username && data.email && data.password.length >= 8 && data.age >= 13;
    if (step === 1) return !!data.privacy_tier;
    if (step === 2) return data.interests.length >= 3;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await signup({
        ...data,
        username: data.username.trim(),
        email: data.email.trim(),
      });
      setAuth(res.user, res.access_token);
      router.push("/feed");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step === STEPS.length - 1) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-all ${
                  i <= step ? "bg-accent" : "bg-surface-light"
                }`}
              />
              <span className={`text-[10px] ${i <= step ? "text-accent" : "text-gray-600"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <StepBasicInfo data={data} onChange={update} />}
            {step === 1 && <StepPrivacyChoice data={data} onChange={update} />}
            {step === 2 && <StepInterestPicker data={data} onChange={update} />}
            {step === 3 && <StepTimeLimitSetup data={data} onChange={update} />}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-4 text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => step === 0 ? router.push("/") : setStep((s) => s - 1)}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={next}
            disabled={!canProceed() || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === STEPS.length - 1 ? (
              "Create Account"
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
