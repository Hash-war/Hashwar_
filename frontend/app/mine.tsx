"use client";

import { useMiner, useSlots, useStartMining, useClaimMining, useOverclock, useRepair, useEnergyClaim } from "@/hooks/useMiner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useToast } from "@/components/ui/Toast";
import { GameLayout } from "@/components/layout/GameLayout";
import { ChassisMinerRig } from "@/components/pixel/ChassisMinerRig";
import { HudCard, HudBar, HudButton } from "@/components/ui/Hud";
import { useT } from "@/i18n";
import { Zap, Thermometer, Shield, Clock, Flame, Settings, Gauge, Activity } from "lucide-react";

export default function MinePage() {
  const { data: miner, isLoading } = useMiner();
  const { data: slots } = useSlots();
  const { isDemo } = useDemoMode();
  const { showToast } = useToast();
  const claimMutation = useClaimMining();
  const startMutation = useStartMining();
  const overclockMutation = useOverclock();
  const repairMutation = useRepair();
  const energyClaim = useEnergyClaim();
  const t = useT();

  const demoAction = (action: string) => {
    showToast(t("toast.connectToUse", { action }), "warning");
  };

  if (isLoading) {
    return (
      <GameLayout>
        <div className="flex items-center justify-center h-64">
          <span className="num text-sm text-[#a855f7] animate-pulse">{t("mine.loading")}</span>
        </div>
      </GameLayout>
    );
  }

  if (!miner) {
    return (
      <GameLayout>
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <span className="num text-sm text-[#a855f7] animate-pulse">{t("mine.loading")}</span>
          <span className="text-[11px] text-[#8b8b9a]">{t("toast.connectToUse", { action: t("nav.mine") })}</span>
        </div>
      </GameLayout>
    );
  }

  const pendingReward = BigInt(miner.pendingReward || "0");
  const canClaim = pendingReward > BigInt(0);
  const miningActive = miner.energy > 0 && miner.elapsedSeconds > 0;
  const isOverheated = miner.temperature >= 100;

  // Rig/boost info comes from slots[0] (the main miner slot).
  const slot0 = slots?.slots?.[0];
  const equippedRig = Number(slot0?.rigIndex ?? 0);
  const rigInfo = equippedRig > 0 ? slots?.shop?.rigs?.[equippedRig - 1] : undefined;
  const boostActive = Boolean(slot0?.boostActive);

  return (
    <GameLayout>
      <div className="space-y-6">
        {/* Hero: status + rig */}
        <div className="hud-card p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2 h-2 rounded-full ${miningActive ? "bg-[#39ff14] animate-pulse" : "bg-gray-600"}`} />
            <span className={`text-[11px] tracking-widest uppercase ${miningActive ? "text-[#39ff14]" : "text-[#8b8b9a]"}`}>
              {miningActive ? t("mine.statusMining") : t("mine.statusStandby")}
            </span>
            {miner.isOverclocked && (
              <span className="text-[10px] uppercase text-[#ff0040] border border-[#ff0040]/40 bg-[#ff0040]/10 rounded px-2 py-0.5 animate-pulse ml-2">
                {t("mine.overclocked")}
              </span>
            )}
            {isOverheated && (
              <span className="text-[10px] uppercase text-[#ff6600] border border-[#ff6600]/40 bg-[#ff6600]/10 rounded px-2 py-0.5 animate-pulse ml-2">
                {t("mine.overheated")}
              </span>
            )}
            {rigInfo && (
              <span className="text-[10px] uppercase text-[#ffd700] border border-[#ffd700]/40 bg-[#ffd700]/10 rounded px-2 py-0.5 ml-2">
                {t("mine.rigEquipped", { rig: rigInfo.name, bonus: Number(rigInfo.bonusRaw / 1e6) })}
              </span>
            )}
            {boostActive && (
              <span className="text-[10px] uppercase text-[#ff0040] border border-[#ff0040]/40 bg-[#ff0040]/10 rounded px-2 py-0.5 animate-pulse ml-2">
                {t("mine.boost")}
              </span>
            )}
          </div>

          <ChassisMinerRig
            level={miner.level}
            isMining={miner.energy > 0}
            isOverclocked={miner.isOverclocked}
            isOverheated={isOverheated}
            size={280}
          />

          <div className="text-center mt-5">
            <h2 className="font-display font-bold text-[22px] text-white">{t("mine.gpuMiner", { level: miner.level })}</h2>
            <p className="num text-[26px] font-semibold text-[#a855f7] mt-1" style={{ textShadow: "0 0 20px rgba(168,85,247,0.5)" }}>
              {miner.hashrate}
            </p>
          </div>

          {/* Circular mine button */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <div className="relative">
              <div className="hud-mine-ring" />
              <button
                onClick={() => isDemo ? demoAction(t("mine.mine")) : (miner.level === 0 ? startMutation.mutate() : claimMutation.mutate())}
                disabled={claimMutation.isPending || startMutation.isPending}
                className="w-[130px] h-[130px] rounded-full flex flex-col items-center justify-center gap-1 transition-all relative"
                style={{
                  background: "radial-gradient(circle at 50% 30%, rgba(168,85,247,0.3), rgba(11,11,18,0.9) 70%)",
                  border: `3px solid ${miningActive ? "#39ff14" : "#a855f7"}`,
                  boxShadow: miningActive
                    ? "0 0 30px rgba(57,255,20,0.4), 0 0 60px rgba(57,255,20,0.1)"
                    : "0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.1)",
                  animation: miningActive ? "hud-pulse-glow 2s ease-in-out infinite" : "none",
                }}
              >
                <Gauge size={26} className={miningActive ? "text-[#39ff14]" : "text-[#a855f7]"} />
                <span className="font-display font-extrabold tracking-widest text-[13px] text-white">
                  {claimMutation.isPending || startMutation.isPending ? "..." : (miner.level === 0 ? t("mine.start") : t("mine.mine"))}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-[#5a5a6a]">{miningActive ? t("mine.tapClaim") : t("mine.tapMine")}</p>
          </div>
        </div>

        {/* Pending reward */}
        {canClaim && (
          <HudCard accent="#ffd700" className="p-5 text-center" style={{ borderColor: "rgba(255,215,0,0.4)" }}>
            <p className="text-[11px] uppercase tracking-widest text-[#8b8b9a] mb-1">{t("mine.pendingReward")}</p>
            <p className="num text-[24px] font-semibold text-[#ffd700] mb-3">{(Number(pendingReward) / 1e18).toLocaleString()} $HASH</p>
            <HudButton color="gold" block onClick={() => isDemo ? demoAction(t("mine.claimReward")) : claimMutation.mutate()}>
              <Zap size={15} /> {t("mine.claimReward")}
            </HudButton>
          </HudCard>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HudCard className="p-4">
            <div className="flex items-center gap-2 mb-3"><Zap size={14} className="text-[#ffd700]" /><span className="text-[11px] font-semibold text-white">{t("mine.energy")}</span></div>
            <HudBar value={miner.energy} max={miner.energyCapacity} color="#ffd700" label={t("mine.capacity")} display={`${miner.energy}%`} />
            <p className="text-[10px] text-[#5a5a6a] mt-2">{t("mine.efficiency", { value: miner.energyEfficiency })}</p>
          </HudCard>

          <HudCard className="p-4">
            <div className="flex items-center gap-2 mb-3"><Thermometer size={14} className="text-[#ff6600]" /><span className="text-[11px] font-semibold text-white">{t("mine.temperature")}</span></div>
            <HudBar value={miner.temperature} max={100} color={miner.temperature > 80 ? "#ff0040" : miner.temperature > 60 ? "#ff6600" : "#00d4ff"} label={t("mine.temp")} display={`${miner.temperature}°C`} />
            <p className="text-[10px] text-[#5a5a6a] mt-2">{t("mine.efficiency", { value: miner.temperatureEfficiency })}</p>
          </HudCard>

          <HudCard className="p-4">
            <div className="flex items-center gap-2 mb-3"><Shield size={14} className="text-[#00d4ff]" /><span className="text-[11px] font-semibold text-white">{t("mine.durability")}</span></div>
            <HudBar value={miner.durability} max={100} color={miner.durability < 30 ? "#ff0040" : miner.durability < 60 ? "#ff6600" : "#00d4ff"} label={t("mine.durability")} display={`${miner.durability}%`} />
          </HudCard>

          <HudCard className="p-4">
            <div className="flex items-center gap-2 mb-3"><Clock size={14} className="text-[#a855f7]" /><span className="text-[11px] font-semibold text-white">{t("mine.miningTime")}</span></div>
            <div className="flex flex-col gap-1">
              <span className="num text-[20px] font-semibold text-white">
                {miner.elapsedSeconds > 0
                  ? `${Math.floor(miner.elapsedSeconds / 3600)}h ${Math.floor((miner.elapsedSeconds % 3600) / 60)}m`
                  : t("mine.ready")}
              </span>
              <span className="text-[10px] text-[#5a5a6a]">
                {t("mine.last", { value: miner.lastMiningAt ? new Date(miner.lastMiningAt).toLocaleTimeString() : t("mine.never") })}
              </span>
            </div>
          </HudCard>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => isDemo ? demoAction(t("mine.freeEnergy")) : energyClaim.mutate()}
            disabled={energyClaim.isPending}
            className="hud-card p-4 flex flex-col items-center gap-2 text-center hover:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all"
            style={{ borderColor: "rgba(255,215,0,0.35)" }}
          >
            <Zap size={22} className="text-[#ffd700]" />
            <span className="text-[11px] font-semibold text-white">{t("mine.freeEnergy")}</span>
            <span className="text-[9px] text-[#8b8b9a]">{t("mine.freeEnergySub")}</span>
          </button>

          <button
            onClick={() => isDemo ? demoAction(t("mine.overclock")) : overclockMutation.mutate()}
            disabled={overclockMutation.isPending || miner.isOverclocked}
            className="hud-card p-4 flex flex-col items-center gap-2 text-center hover:shadow-[0_0_20px_rgba(255,0,64,0.2)] transition-all disabled:opacity-40"
            style={{ borderColor: "rgba(255,0,64,0.35)" }}
          >
            <Flame size={22} className="text-[#ff0040]" />
            <span className="text-[11px] font-semibold text-white">{t("mine.overclock")}</span>
            <span className="text-[9px] text-[#8b8b9a]">{miner.isOverclocked ? t("mine.overclockActive") : t("mine.overclockSub")}</span>
          </button>

          <button
            onClick={() => isDemo ? demoAction(t("mine.repair")) : repairMutation.mutate()}
            disabled={repairMutation.isPending || (miner.durability >= 100 && miner.temperature <= 40)}
            className="hud-card p-4 flex flex-col items-center gap-2 text-center hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-all disabled:opacity-40"
            style={{ borderColor: "rgba(0,212,255,0.35)" }}
          >
            <Settings size={22} className="text-[#00d4ff]" />
            <span className="text-[11px] font-semibold text-white">{t("mine.repair")}</span>
            <span className="text-[9px] text-[#8b8b9a]">{t("mine.repairSub")}</span>
          </button>
        </div>
      </div>
    </GameLayout>
  );
}
