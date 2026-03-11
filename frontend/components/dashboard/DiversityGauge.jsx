"use client";

export default function DiversityGauge({ score = 0 }) {
  const radius = 60;
  const circumference = Math.PI * radius; // half-circle
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return "#10b981"; // green
    if (score >= 40) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const getLabel = () => {
    if (score >= 70) return "Diverse";
    if (score >= 40) return "Moderate";
    return "Narrow";
  };

  return (
    <div className="glass p-4 rounded-2xl flex flex-col items-center">
      <h3 className="text-sm font-semibold text-white mb-3">Feed Diversity</h3>

      <svg width="160" height="90" viewBox="0 0 160 90">
        {/* Background arc */}
        <path
          d="M 10 80 A 60 60 0 0 1 150 80"
          fill="none"
          stroke="#1f2937"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 80 A 60 60 0 0 1 150 80"
          fill="none"
          stroke={getColor()}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s" }}
        />
        {/* Score text */}
        <text x="80" y="72" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
          {score}%
        </text>
      </svg>

      <span
        className="text-xs font-medium mt-1"
        style={{ color: getColor() }}
      >
        {getLabel()}
      </span>

      <p className="text-[10px] text-gray-500 mt-2 text-center max-w-[180px]">
        Measures how varied your content categories and creators are
      </p>
    </div>
  );
}
