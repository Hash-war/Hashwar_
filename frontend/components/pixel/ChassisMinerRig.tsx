"use client";

interface ChassisMinerRigProps {
  level?: number;
  isMining?: boolean;
  isOverclocked?: boolean;
  isOverheated?: boolean;
  size?: number;
  compact?: boolean;
}

const LEVEL_COLORS = [
  { fan: "#7788aa", glow: "rgba(120,150,200,0.5)" },
  { fan: "#00ff88", glow: "rgba(0,255,136,0.5)" },
  { fan: "#ff8800", glow: "rgba(255,136,0,0.5)" },
  { fan: "#00d4ff", glow: "rgba(0,212,255,0.6)" },
  { fan: "#a855f7", glow: "rgba(168,85,247,0.6)" },
  { fan: "#ff00ff", glow: "rgba(255,0,255,0.6)" },
  { fan: "#ff0040", glow: "rgba(255,0,64,0.6)" },
];

function Fan({ color, spinning, speed = 1 }: { color: string; spinning: boolean; speed?: number }) {
  const duration = `${speed}s`;
  return (
    <g style={{ transformBox: "fill-box", transformOrigin: "50% 50%", animation: spinning ? `fan-spin ${duration} linear infinite` : "none" }}>
      {/* Fan shroud */}
      <circle cx="12" cy="12" r="10" fill="#1a1a24" stroke="#333" strokeWidth="1" />
      <circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth="0.6" opacity="0.6" />
      {/* Blades */}
      <line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <line x1="7" y1="7" x2="17" y2="17" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="17" y1="7" x2="7" y2="17" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* Hub */}
      <circle cx="12" cy="12" r="2.4" fill={color} opacity="0.9" />
      <circle cx="12" cy="12" r="1" fill="#fff" opacity="0.8" />
    </g>
  );
}

function LedStrip({ color, on }: { color: string; on: boolean }) {
  return (
    <>
      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect
          key={i}
          x={8 + i * 20}
          y={92}
          width="12"
          height="4"
          rx="1"
          fill={color}
          opacity={on ? 0.5 + (i % 2) * 0.5 : 0.15}
          className={on ? "animate-neon-pulse" : ""}
        />
      ))}
    </>
  );
}

export function ChassisMinerRig({
  level = 1,
  isMining = true,
  isOverclocked = false,
  isOverheated = false,
  size = 340,
  compact = false,
}: ChassisMinerRigProps) {
  const clampedMin = Math.max(0, Math.min(6, Math.floor((level - 1) / 1.5)));
  const colors = LEVEL_COLORS[clampedMin];
  const fanSpeed = isOverclocked ? 0.3 : Math.max(0.4, 2.2 - level * 0.18);
  const spinning = isMining && !isOverheated;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: colors.glow,
          filter: "blur(40px)",
          opacity: 0.35,
          animation: isMining ? `hud-pulse-glow ${2.5 - level * 0.15}s ease-in-out infinite` : "none",
        }}
      />

      {/* Rig */}
      <div className={`relative z-10 ${isOverheated ? "overheat-flash" : ""}`}>
        <svg viewBox={compact ? "0 0 120 96" : "0 0 120 120"} className="w-full h-full">
          {/* Back frame */}
          <rect x="4" y="6" width="112" height="88" rx="6" fill="#0d0d16" stroke="#333" strokeWidth="2" />

          {/* Top handle/rack */}
          <rect x="30" y="2" width="60" height="5" rx="2" fill="#2a2a3a" />

          {/* Left chamber - 4 GPUs */}
          <g>
            {/* GPU 1 */}
            <rect x="10" y="14" width="30" height="34" rx="3" fill="#15151f" stroke="#333" strokeWidth="1.5" />
            <g transform="translate(13, 19)"><Fan color={colors.fan} spinning={spinning} speed={fanSpeed} /></g>
            <rect x="12" y="40" width="26" height="3" fill={colors.fan} opacity="0.4" />
            {/* GPU 2 */}
            <rect x="44" y="14" width="30" height="34" rx="3" fill="#15151f" stroke="#333" strokeWidth="1.5" />
            <g transform="translate(47, 19)"><Fan color={colors.fan} spinning={spinning} speed={fanSpeed} /></g>
            <rect x="46" y="40" width="26" height="3" fill={colors.fan} opacity="0.4" />
            {/* GPU 3 */}
            <rect x="78" y="14" width="30" height="34" rx="3" fill="#15151f" stroke="#333" strokeWidth="1.5" />
            <g transform="translate(81, 19)"><Fan color={colors.fan} spinning={spinning} speed={fanSpeed} /></g>
            <rect x="80" y="40" width="26" height="3" fill={colors.fan} opacity="0.4" />
          </g>

          {/* Water cooling pipes */}
          <path d="M8 56 Q60 20 112 56" fill="none" stroke={colors.fan} strokeWidth="2.5" opacity="0.5" />
          <path d="M8 60 Q60 90 112 60" fill="none" stroke={colors.fan} strokeWidth="2.5" opacity="0.5" />

          {/* Bottom chamber - PSU + control */}
          <rect x="10" y="62" width="44" height="26" rx="3" fill="#181822" stroke="#333" strokeWidth="1.5" />
          {/* PSU fans/vents */}
          {[0,1,2,3].map((i) => (
            <rect key={i} x="14" y={66 + i * 5} width="36" height="3" rx="1" fill="#25252f" />
          ))}
          {/* PSU label */}
          <rect x="14" y="82" width="20" height="4" rx="1" fill="#a855f7" opacity="0.5" />

          {/* Control panel right */}
          <rect x="58" y="62" width="50" height="26" rx="3" fill="#0d0d16" stroke="#333" strokeWidth="1.5" />
          {/* Digital readout */}
          <rect x="62" y="66" width="34" height="12" rx="1" fill="#050509" stroke={colors.fan} strokeWidth="1" />
          <text x="79" y="75" textAnchor="middle" fill={colors.fan} fontSize="7" fontFamily="monospace" fontWeight="bold">
            {isMining ? "HASH" : "STBY"}
          </text>
          {/* Status LEDs */}
          {[0,1,2].map((i) => (
            <circle key={i} cx={62 + i * 14} cy="82" r="2" fill={colors.fan} opacity={isMining ? 0.8 : 0.2}
              className={isMining ? "animate-neon-pulse" : ""} />
          ))}

          {/* LED strip */}
          {!compact && <LedStrip color={colors.fan} on={isMining} />}

          {/* HASHWAR branding */}
          {!compact && (
            <text x="60" y="108" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="sans-serif" fontWeight="700" opacity="0.8" letterSpacing="2">
              HASHWAR
            </text>
          )}

          {/* Overclock flash */}
          {isOverclocked && !isOverheated && (
            <rect x="4" y="6" width="112" height="88" rx="6" fill="none" stroke="#ff0040" strokeWidth="2" className="overclock-glow" />
          )}
        </svg>
      </div>

      {/* Level badge */}
      <div className="absolute -top-1 -right-1 z-20">
        <span className="num text-[10px] px-2 py-0.5 rounded bg-[#11111a] border"
          style={{ borderColor: colors.fan, color: colors.fan }}>
          Lv.{level}
        </span>
      </div>

      {/* Mining status chip */}
      {isMining && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
          <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
            style={{ background: `rgba(${isOverclocked ? "255,0,64" : "57,255,20"},0.12)`, border: `1px solid rgba(${isOverclocked ? "255,0,64" : "57,255,20"},0.4)`, color: isOverclocked ? "#ff0040" : "#39ff14" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {isOverclocked ? "OVERCLOCKED" : "MINING ACTIVE"}
          </span>
        </div>
      )}
    </div>
  );
}
