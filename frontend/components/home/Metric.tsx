"use client";

import { ReactNode } from "react";

interface MetricProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  color?: string;
  divider?: boolean;
  className?: string;
}

export function Metric({ icon, label, value, sub, color = "#a855f7", divider = false, className = "" }: MetricProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${divider ? "px-4 border-l border-white/10" : ""} ${className}`}>
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] font-medium tracking-wide text-[#8b8b9a] uppercase">{label}</span>
      </div>
      <div className="num text-xl font-semibold text-white leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-[#5a5a6a]">{sub}</div>}
    </div>
  );
}
