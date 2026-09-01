"use client";

import { useEffect, useMemo, useState } from "react";
import { useWar, useJoinWar, useWarRanking, useWarRewards, useSettleWar, useClaimWarReward } from "@/hooks/useWar";
import { useSlots } from "@/hooks/useMiner";
import { useWallet } from "@/lib/web3";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useToast } from "@/components/ui/Toast";
import { HudCard, HudCardHeader, HudButton, HudBadge } from "@/components/ui/Hud";
import { useT } from "@/i18n";
import { formatHashrate as formatHashrateMhs } from "@hashwar/shared";
import { Radio, Timer, Trophy, Users, Gauge, Crown, Swords, Zap, Lock } from "lucide-react";

function formatHashrate(num: number): string {
  if (num >= 1e15) return `${(num / 1e15).toFixed(2)} PH/s`;
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)} TH/s`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)} GH/s`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)} MH/s`;
  return `${(num / 1e3).toFixed(2)} KH/s`;
}

/**
 * Warfield — multiplayer hashrate competition visualization.
 * Replaces the misleading 1v1 PK animation. Ranks all war participants
 * by effective hashrate with comparison bars (HUD style).
 */
export function Warfield({ isLive = false }: { isLive?: boolean }) {
  const { data: war } = useWar();
  const { data: ranking } = useWarRanking();
  const { data: rewards } = useWarRewards();
  const joinMutation = useJoinWar();
  const settleMutation = useSettleWar();
  const claimMutation = useClaimWarReward();
  const { data: slots } = useSlots();
  const { address } = useWallet();
  const { isDemo } = useDemoMode();
  const { showToast } = useToast();
  const t = useT();
  const [countdown, setCountdown] = useState("");
  const [deadlineCountdown, setDeadlineCountdown] = useState("--:--:--");

  const warData = war?.current;
  const upcoming = war?.upcoming;

  useEffect(() => {
    if (!upcoming) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const start = new Date(upcoming.startTime).getTime();
      const diff = start - now;
      if (diff <= 0) { setCountdown(t("war.liveNow")); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [upcoming, t]);

  // Live countdown to the active war's real on-chain deadline.
  useEffect(() => {
    if (!warData?.deadline) return;
    const deadlineSec = Number(warData.deadline);
    const timer = setInterval(() => {
      const diff = Math.max(0, deadlineSec - Math.floor(Date.now() / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setDeadlineCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [warData?.deadline]);

  const participants = ranking?.participants || warData?.participants || [];

  const sorted = useMemo(() => {
    return [...participants]
      .map((p: any) => ({ ...p, hr: Number(p.hashrate) || 0 }))
      .sort((a, b) => b.hr - a.hr);
  }, [participants]);

  const maxHr = sorted.length ? sorted[0].hr : 1;
  const top = sorted.slice(0, 10);

  const status = warData?.status;
  const active = isLive || status === "ACTIVE" || warData?.active === true || isDemo;
  const settled = status === "COMPLETED" || warData?.settled === true;
  const deadline = warData ? Number(warData.deadline || 0) : 0;
  const deadlinePassed = deadline > 0 && Math.floor(Date.now() / 1000) > deadline;
  const warPool = warData ? (Number(warData.warPool) / 1e18).toLocaleString() : "—";
  const myRank = useMemo(() => {
    const idx = sorted.findIndex((p: any) => p.address?.toLowerCase() === (address ?? "").toLowerCase());
    return idx >= 0 ? idx + 1 : null;
  }, [sorted, address]);
  const myReward = rewards?.rewardAmount
    ? `~${(Number(rewards.rewardAmount) / 1e18).toLocaleString()} $HASH`
    : null;

  const medalColors = ["#ffd700", "#c0c0c0", "#cd7f32"];

  return (
    <HudCard className="p-5" style={{ borderColor: "rgba(255,0,64,0.3)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Radio size={16} className="text-[#ff0040]" />
        <span className="text-[13px] font-bold text-[#ff0040]">{t("war.warfield")}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${active ? "bg-[#ff0040] animate-pulse" : "bg-gray-600"}`} />
          <span className={`text-[10px] uppercase tracking-wide ${active ? "text-[#ff0040]" : "text-[#8b8b9a]"}`}>
            {active ? t("war.live") : t("war.scheduled")}
          </span>
        </span>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.25)" }}>
          <div className="flex items-center justify-center gap-1 mb-1"><Gauge size={12} className="text-[#ffd700]" /><span className="text-[9px] uppercase text-[#8b8b9a]">{t("war.pool")}</span></div>
          <span className="num text-[15px] font-semibold text-[#ffd700]">{warPool} $HASH</span>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <div className="flex items-center justify-center gap-1 mb-1"><Timer size={12} className="text-[#a855f7]" /><span className="text-[9px] uppercase text-[#8b8b9a]">{t("war.endsIn")}</span></div>
          <span className="num text-[15px] font-semibold text-white">{active ? deadlineCountdown : countdown || "--:--:--"}</span>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.25)" }}>
          <div className="flex items-center justify-center gap-1 mb-1"><Users size={12} className="text-[#00d4ff]" /><span className="text-[9px] uppercase text-[#8b8b9a]">{t("war.miners")}</span></div>
          <span className="num text-[15px] font-semibold text-white">{participants.length || 0}</span>
        </div>
      </div>

      {/* Next war countdown when no war is running */}
      {!active && !settled && (
        <div className="mb-5">
          <p className="num text-[22px] font-bold text-center text-[#ffd700] mb-2" style={{ textShadow: "0 0 18px rgba(255,215,0,0.4)" }}>
            {countdown || t("war.nextSoon")}
          </p>
        </div>
      )}

      {/* Join / Settle / Claim actions */}
      <div className="flex flex-col gap-2 mb-5">
        {active && !settled && (
          <button
            onClick={() => isDemo ? showToast(t("toast.connectToUse", { action: t("war.join") }), "warning") : joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="hud-btn hud-btn-red justify-center w-full py-3 text-[12px]"
          >
            <Swords size={14} /> {joinMutation.isPending ? t("war.joining") : t("war.join")}
          </button>
        )}
        {active && deadlinePassed && !settled && (
          <button
            onClick={() => isDemo ? showToast(t("toast.connectToUse", { action: t("war.settle") }), "warning") : settleMutation.mutate()}
            disabled={settleMutation.isPending}
            className="hud-btn justify-center w-full py-2.5 text-[12px]"
          >
            {settleMutation.isPending ? t("war.settling") : t("war.settle")}
          </button>
        )}
        {settled && (
          <button
            onClick={() => isDemo ? showToast(t("toast.connectToUse", { action: t("war.claim") }), "warning") : claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="hud-btn hud-btn-red justify-center w-full py-3 text-[12px]"
          >
            <Trophy size={14} /> {claimMutation.isPending ? t("war.claiming") : t("war.claimReward")}
          </button>
        )}
      </div>

      {/* Visual ranking */}
      {top.length > 0 ? (
        <div className="space-y-1.5">
          {top.map((p: any, i: number) => {
            const pct = Math.max(2, (p.hr / maxHr) * 100);
            return (
              <div key={p.address || i} className="flex items-center gap-2">
                <span className="w-5 text-center num text-[11px] font-bold" style={{ color: i < 3 ? medalColors[i] : "#8b8b9a" }}>
                  {i === 0 ? <Crown size={14} className="inline text-[#ffd700]" /> : i + 1}
                </span>
                <span className="num text-[11px] text-white w-24 truncate shrink-0">{p.address?.slice(0, 6)}...{p.address?.slice(-4)}</span>
                <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "rgba(11,11,18,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${i === 0 ? "#ff0040" : "#a855f7"}55, ${i === 0 ? "#ff0040" : "#a855f7"})`,
                      boxShadow: i === 0 ? "0 0 12px rgba(255,0,64,0.5)" : "0 0 10px rgba(168,85,247,0.4)",
                    }}
                  />
                </div>
                <span className="num text-[11px] font-medium text-[#a855f7] w-20 text-right shrink-0">{formatHashrate(p.hr)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="num text-[12px] text-[#5a5a6a] text-center py-8">{t("war.noParticipants")}</p>
      )}

      {/* My war power (sum of all unlocked miners) */}
      <div className="rounded-lg p-3 mt-4" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.35)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-[#00d4ff]" />
          <span className="text-[12px] font-bold text-[#00d4ff]">{t("war.myPower")}</span>
          <span className="ml-auto num text-[14px] font-bold text-[#00d4ff]">{slots?.totalHashrateFormatted ?? formatHashrateMhs(10000000n)}</span>
        </div>
        <p className="text-[10px] text-[#8b8b9a] mb-2">{t("war.allMinersFight")}</p>
        <div className="space-y-1">
          {(slots?.slots ?? []).map((s: any) => {
            if (s.locked) {
              return (
                <div key={s.slot} className="flex items-center gap-2 text-[#5a5a6a]">
                  <span className="num text-[11px] w-16">{t("farm.slot", { slot: s.slot + 1 })}</span>
                  <Lock size={11} />
                  <span className="text-[9px] uppercase tracking-wide text-[#5a5a6a]">{t("war.lockedSlot")}</span>
                </div>
              );
            }
            const raw = BigInt(s.hashrateRaw || 0);
            const effective = s.boostActive ? (raw * 150n) / 100n : raw;
            return (
              <div key={s.slot} className="flex items-center gap-2">
                <span className="num text-[11px] text-white w-16">{t("farm.slot", { slot: s.slot + 1 })}</span>
                {s.rigIndex > 0 && <span className="text-[10px] text-[#ffd700]">RIG</span>}
                <span className="ml-auto flex items-center gap-1">
                  {s.boostActive && <span className="text-[8px] uppercase tracking-wide text-[#ff0040]">{t("war.boost")}</span>}
                  <span className="num text-[11px] font-medium text-[#00d4ff]">{formatHashrateMhs(effective)}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-[#5a5a6a] mt-2">{t("war.footnote")}</p>
      </div>

      {/* Your position */}
      <div className="flex items-center justify-between rounded-lg p-3 mt-4" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.4)" }}>
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-[#a855f7]" />
          <span className="text-[12px] font-bold text-[#a855f7]">{t("war.youRank", { rank: myRank ?? "—" })}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="num text-[12px] text-[#a855f7]">{slots?.totalHashrateFormatted ?? "—"}</span>
          <span className="num text-[12px] text-[#ffd700]">{myReward ?? "—"}</span>
        </div>
      </div>
    </HudCard>
  );
}
