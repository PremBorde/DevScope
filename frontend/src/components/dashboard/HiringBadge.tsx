import React from "react";

interface HiringBadgeProps {
  rec: string;
}

export function HiringBadge({ rec }: HiringBadgeProps) {
  const map: Record<string, { label: string; bg: string }> = {
    strong_hire: { label: "Strong Hire", bg: "bg-green-400" },
    hire: { label: "Hire", bg: "bg-blue-400" },
    consider: { label: "Consider", bg: "bg-yellow-300" },
    pass: { label: "Pass", bg: "bg-red-400" },
  };
  const style = map[rec] ?? map["consider"];
  
  return (
    <span className={`inline-block px-2 py-0.5 border border-black font-bold uppercase text-black text-xs ${style.bg}`}>
      {style.label}
    </span>
  );
}
