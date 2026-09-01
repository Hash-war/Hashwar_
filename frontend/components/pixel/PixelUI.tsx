"use client";

import { ReactNode } from "react";

/* ========== PIXEL ENERGY BAR ========== */
interface PixelBarProps {
  value: number;
  max: number;
  color?: "purple" | "blue" | "orange" | "red" | "green" | "yellow";
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const BAR_COLORS = {
  purple: { fill: "#a855f7", bg: "#7c3aed" },
  blue: { fill: "#00d4ff", bg: "#0891b2" },
  orange: { fill: "#ff6600", bg: "#cc5200" },
  red: { fill: "#ff0040", bg: "#cc0033" },
  green: { fill: "#39ff14", bg: "#2bcc10" },
  yellow: { fill: "#ffd700", bg: "#ccac00" },
};

export function PixelBar({ value, max, color = "purple", showLabel = true, label, size = "md" }: PixelBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const blockCount = size === "sm" ? 10 : size === "md" ? 15 : 20;
  const filledBlocks = Math.round((percentage / 100) * blockCount);
  const colors = BAR_COLORS[color];

  const heightClass = size === "sm" ? "h-2" : size === "md" ? "h-3" : "h-4";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="pixel-text-xs text-gray-400">{label || ""}</span>
          <span className="pixel-text-xs" style={{ color: colors.fill }}>{value}/{max}</span>
        </div>
      )}
      <div className={`pixel-progress ${heightClass}`}>
        <div className="pixel-progress-fill" style={{ width: `${percentage}%` }}>
          {Array.from({ length: filledBlocks }).map((_, i) => (
            <div
              key={i}
              className="block"
              style={{ backgroundColor: i === filledBlocks - 1 ? colors.fill : colors.bg }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== PIXEL COIN ========== */
interface PixelCoinProps {
  size?: number;
  spinning?: boolean;
}

export function PixelCoin({ size = 32, spinning = true }: PixelCoinProps) {
  return (
    <div
      className={`inline-block ${spinning ? "animate-coin-spin" : ""}`}
      style={{ width: size, height: size, perspective: "200px" }}
    >
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <circle cx="16" cy="16" r="14" fill="#ffd700" stroke="#ccac00" strokeWidth="2" />
        <circle cx="16" cy="16" r="10" fill="none" stroke="#ccac00" strokeWidth="1" />
        <text x="16" y="20" textAnchor="middle" fill="#8B6914" fontSize="10" fontWeight="bold" fontFamily="monospace">
          H
        </text>
      </svg>
    </div>
  );
}

/* ========== PIXEL GLITCH TEXT ========== */
interface PixelGlitchTextProps {
  children: ReactNode;
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "div";
  color?: "purple" | "blue" | "green" | "red" | "yellow" | "white";
}

const TEXT_COLORS = {
  purple: "text-neon-purple neon-text",
  blue: "text-neon-blue neon-text-blue",
  green: "text-neon-green neon-text-green",
  red: "text-neon-red neon-text-red",
  yellow: "text-neon-yellow neon-text-yellow",
  white: "text-white",
};

export function PixelGlitchText({ children, className = "", as: Tag = "h2", color = "purple" }: PixelGlitchTextProps) {
  return (
    <Tag
      className={`pixel-font glitch-text ${TEXT_COLORS[color]} ${className}`}
      data-text={typeof children === "string" ? children : ""}
    >
      {children}
    </Tag>
  );
}

/* ========== HUD PANEL ========== */
interface HUDPanelProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  className?: string;
}

export function HUDPanel({ children, title, icon, className = "" }: HUDPanelProps) {
  return (
    <div className={`hud-panel p-4 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyber-border">
          {icon && <span className="text-neon-purple">{icon}</span>}
          {title && <span className="pixel-text-xs text-gray-400 uppercase">{title}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ========== MINE BUTTON ========== */
interface MineButtonProps {
  isMining: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MineButton({ isMining, onClick, disabled = false }: MineButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mine-button ${isMining ? "active" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <div className="mine-button-ring" />
      <div className="flex flex-col items-center gap-2 relative z-10">
        <svg viewBox="0 0 24 24" width="40" height="40" className={isMining ? "text-neon-green" : "text-neon-purple"}>
          <path
            d="M14.5 2L6 10.5L11 15.5L19.5 7L14.5 2ZM3 20V22H21V20H3Z"
            fill="currentColor"
          />
        </svg>
        <span className="pixel-text-sm text-white">
          {isMining ? "MINING" : "MINE"}
        </span>
      </div>
    </button>
  );
}

/* ========== STAT DISPLAY ========== */
interface StatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  small?: boolean;
}

export function Stat({ label, value, icon, color = "text-neon-purple", small = false }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon && <span className={color}>{icon}</span>}
        <span className={`pixel-text-xs text-gray-500 ${small ? "text-[7px]" : ""}`}>{label}</span>
      </div>
      <span className={`${small ? "pixel-text-sm" : "pixel-text-md"} ${color} font-bold`}>{value}</span>
    </div>
  );
}

/* ========== ADDRESS DISPLAY ========== */
export function ShortAddress({ address, chars = 4 }: { address: string; chars?: number }) {
  if (!address) return <span className="text-gray-500">---</span>;
  return (
    <span className="font-mono text-gray-400">
      {address.slice(0, chars + 2)}...{address.slice(-chars)}
    </span>
  );
}
