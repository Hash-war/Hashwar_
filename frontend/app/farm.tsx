"use client";

import { useMiner, useSlots, useStartMining, useClaimMining, useUpgradeMiner, useEnergyBuy, useUnlockSlot } from "@/hooks/useMiner";
import { useBalance } from "@/hooks/useWallet";
import { useDemoMode } from "@/hooks/useDemoMode";
import { GameLayout } from "@/components/layout/GameLayout";
import { ChassisMinerRig } from "@/components/pixel/ChassisMinerRig";
import { PageTitle, HudCard, HudCardHeader, HudStat, HudBadge, HudButton } from "@/components/ui/Hud";
import { formatHash } from "@hashwar/shared";
import { useT } from "@/i18n";
import { useState } from "react";
import { Zap, Thermometer, Shield, Layers, Coins, Activity, Lock, Rocket, RefreshCcw } from "lucide-react";

export default function FarmPage() {
  const { data: miner, isLoading } = useMiner();
  const { data: balance } = useBalance();
  const { data: slots } = useSlots();
  const startMutation = useStartMining();
  const claimMutation = useClaimMining();
  const upgradeMutation = useUpgradeMiner();
  const energyMutation = useEnergyBuy();
  const unlockMutation = useUnlockSlot();
  const { isDemo } = useDemoMode();
  const t = useT();
  const [selectedSlot, setSelectedSlot] = useState(0);

  if (isLoading) {
    return (
      <GameLayout>
        <div className="flex items-center justify-center h-64">
          <span className="num text-sm text-[#00d4ff] animate-pulse">{t("farm.loading")}</span>
        </div>
      </GameLayout>
    );
  }

  if (!miner) {
    return (
      <GameLayout>
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <span className="num text-sm text-[#00d4ff] animate-pulse">{t("farm.loading")}</span>
          <span className="text-[11px] text-[#8b8b9a]">{t("toast.connectToUse", { action: t("farm.title") })}</span>
        </div>
      </GameLayout>
    );
  }

  const active = miner.energy > 0;

  const unlockedSlots = (slots?.slots ?? []).filter((s: any) => !s.locked);
  const resolvedSlot = unlockedSlots.find((s: any) => s.slot === selectedSlot) ? selectedSlot : (unlockedSlots[0]?.slot ?? 0);
  const mainSlot = slots?.slots?.find((s: any) => s.slot === resolvedSlot) ?? slots?.slots?.[0];
  const equippedRig = Number(mainSlot?.rigIndex ?? 0);
  const mainRigInfo = equippedRig > 0 ? slots?.shop?.rigs?.[equippedRig - 1] : undefined;
  const mainBoostActive = Boolean(mainSlot?.boostActive);

  return (
    <GameLayout>
      <div className="space-y-6">
        <PageTitle
          icon={<Layers size={20} />}
          title={t("farm.title")}
          sub={t("farm.sub")}
          accent="#00d4ff"
        />

        {/* Main rig card */}
        <HudCard accent="#00d4ff" className="p-6" style={{ borderColor: "rgba(0,212,255,0.25)" }}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ChassisMinerRig level={mainSlot?.level ?? miner.level} isMining={(mainSlot?.energy ?? miner.energy) > 0} isOverclocked={miner.isOverclocked} isOverheated={(mainSlot?.temperature ?? miner.temperature) >= 100} size={160} />
            <div className="flex-1 w-full">
              {unlockedSlots.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {unlockedSlots.map((s: any) => {
                    const activeCmd = s.slot === resolvedSlot;
                    return (
                      <button
                        key={s.slot}
                        onClick={() => setSelectedSlot(s.slot)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] transition-all"
                        style={
                          activeCmd
                            ? { borderColor: "#00d4ff", background: "rgba(0,212,255,0.12)", color: "#fff" }
                            : { borderColor: "rgba(139,139,154,0.3)", background: "rgba(11,11,18,0.6)", color: "#8b8b9a" }
                        }
                      >
                        <Layers size={12} />
                        <span className="font-semibold">{t("farm.slot", { slot: s.slot + 1 })}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between mb-5 w-full">
                <div>
                  <h3 className="font-display font-bold text-[18px] text-white">{t("farm.gpuMiner")} #{resolvedSlot + 1}</h3>
                  <p className="text-[12px] text-[#8b8b9a]">{t("farm.level", { level: mainSlot?.level ?? miner.level })}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {mainRigInfo && (
                      <span className="text-[9px] uppercase text-[#ffd700] border border-[#ffd700]/40 bg-[#ffd700]/10 rounded px-2 py-0.5">
                        {t("farm.rigEquipped", { rig: mainRigInfo.name, bonus: Number(mainRigInfo.bonusRaw / 1e6) })}
                      </span>
                    )}
                    {mainBoostActive && (
                      <span className="text-[9px] uppercase text-[#ff0040] border border-[#ff0040]/40 bg-[#ff0040]/10 rounded px-2 py-0.5 animate-pulse">
                        {t("farm.boost")}
                      </span>
                    )}
                  </div>
                </div>
                <HudBadge color={active ? "#39ff14" : "#ff0040"}>{active ? t("common.active") : t("common.noEnergy")}</HudBadge>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <HudStat label={t("farm.hashrate")} value={<><span className="text-[#a855f7]">{mainSlot?.hashrate ?? miner.hashrate}</span></>} icon={<Zap size={13} />} color="#a855f7" />
                <HudStat label={t("farm.energy")} value={<>{mainSlot?.energy ?? miner.energy}/{miner.energyCapacity}</>} icon={<Zap size={13} />} color="#ffd700" />
                <HudStat label={t("farm.temp")} value={<>{mainSlot?.temperature ?? miner.temperature}°C</>} icon={<Thermometer size={13} />} color="#ff6600" />
                <HudStat label={t("farm.durability")} value={<>{mainSlot?.durability ?? miner.durability}%</>} icon={<Shield size={13} />} color="#00d4ff" />
              </div>
            </div>
          </div>
        </HudCard>

        {/* Farm slots */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={15} className="text-[#00d4ff]" />
            <span className="text-[12px] font-semibold text-white">{t("farm.slots")}</span>
            <span className="ml-auto num text-[11px] text-[#8b8b9a]">{t("farm.totalHashrate")}: <span className="text-[#a855f7]">{slots?.totalHashrateFormatted ?? miner.hashrate}</span></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(slots?.slots ?? []).map((s: any) => (
              <HudCard
                key={s.slot}
                accent={s.locked ? "#8b8b9a" : "#a855f7"}
                className="p-4 text-center"
                style={{ borderColor: s.locked ? "rgba(139,139,154,0.3)" : "rgba(168,85,247,0.5)", borderStyle: s.locked ? "dashed" : "solid" }}
              >
                {s.locked ? (
                  <>
                    <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-lg border-2 border-dashed border-[#26263a]" style={{ background: "rgba(11,11,18,0.6)" }}>
                      <Lock size={20} className="text-[#5a5a6a]" />
                    </div>
                    <p className="text-[11px] font-semibold text-white mt-2">{t("farm.slot", { slot: s.slot + 1 })}</p>
                    <p className="text-[9px] text-[#5a5a6a] uppercase tracking-wide">{t("farm.locked")}</p>
                    <HudButton color="outline" size="sm" block className="mt-3" disabled={unlockMutation.isPending || isDemo} onClick={() => isDemo ? undefined : unlockMutation.mutate()}>
                      <Lock size={12} /> {t("farm.unlockCost", { cost: slots ? formatHash(BigInt(slots.slotUnlockCost)) : "0" })}
                    </HudButton>
                  </>
                ) : (
                  <>
                    <ChassisMinerRig level={s.level} isMining={s.energy > 0} size={60} compact />
                    <p className="text-[11px] font-semibold text-white mt-2">{t("farm.slot", { slot: s.slot + 1 })}</p>
                    <p className="num text-[12px] text-[#a855f7]">{s.hashrate}</p>
                    <div className="flex items-center justify-center gap-3 mt-1 text-[10px]">
                      <span className="num text-[#ffd700]">{s.energy}</span>
                      <span className="num text-[#ff6600]">{s.temperature}°C</span>
                      <span className="num text-[#00d4ff]">{s.durability}%</span>
                    </div>
                    {(() => {
                      const ri = Number(s.rigIndex ?? 0);
                      const rInfo = ri > 0 ? slots?.shop?.rigs?.[ri - 1] : undefined;
                      return (
                        <>
                          {rInfo && (
                            <span className="inline-block text-[9px] uppercase text-[#ffd700] border border-[#ffd700]/40 bg-[#ffd700]/10 rounded px-1.5 py-0.5 mt-1">
                              {t("farm.rig", { rig: rInfo.name, bonus: Number(rInfo.bonusRaw / 1e6) })}
                            </span>
                          )}
                          {s.boostActive && (
                            <p className="text-[9px] text-[#ff0040] mt-1 uppercase tracking-wide">{t("farm.boostActive")}</p>
                          )}
                        </>
                      );
                    })()}
                    <div className="flex flex-col gap-1.5 mt-3">
                      <HudButton color="green" size="sm" block disabled={startMutation.isPending || isDemo} onClick={() => isDemo ? undefined : startMutation.mutate(s.slot)}>
                        <Activity size={12} /> {t("farm.startMining")}
                      </HudButton>
                      <HudButton color="gold" size="sm" block disabled={claimMutation.isPending || isDemo} onClick={() => isDemo ? undefined : claimMutation.mutate(s.slot)}>
                        <Coins size={12} /> {t("farm.claim")}
                      </HudButton>
                      <HudButton color="purple" size="sm" block disabled={upgradeMutation.isPending || isDemo} onClick={() => isDemo ? undefined : upgradeMutation.mutate(s.slot)}>
                        <Rocket size={12} /> {t("farm.upgrade")}
                      </HudButton>
                      <HudButton color="blue" size="sm" block disabled={energyMutation.isPending || isDemo} onClick={() => isDemo ? undefined : energyMutation.mutate(s.slot)}>
                        <Zap size={12} /> {t("farm.buyEnergy")}
                      </HudButton>
                    </div>
                  </>
                )}
              </HudCard>
            ))}
          </div>
        </div>

        {/* Farm statistics */}
        <HudCard className="p-5 space-y-3">
          <HudCardHeader icon={<Activity size={14} />} label={t("farm.stats")} color="#00d4ff" />
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-[#8b8b9a]">{t("farm.totalBalance")}</span>
            <span className="num text-[13px] font-semibold text-[#ffd700]">
              {balance ? formatHash(BigInt(balance.balance)) : "0"} $HASH
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-[#8b8b9a]">{t("farm.miningStatus")}</span>
            <span className={`num text-[13px] font-semibold ${active ? "text-[#39ff14]" : "text-[#ff0040]"}`}>
              {active ? t("common.active") : t("common.noEnergy")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-[#8b8b9a]">{t("farm.overclock")}</span>
            <span className={`num text-[13px] font-semibold ${miner.isOverclocked ? "text-[#ff0040]" : "text-[#8b8b9a]"}`}>
              {miner.isOverclocked ? t("common.active") : t("common.inactive")}
            </span>
          </div>
        </HudCard>

        <div className="hud-card p-3 rounded-lg">
          <p className="text-[11px] text-[#5a5a6a] text-center">
            {t("farm.tip")}
          </p>
        </div>
      </div>
    </GameLayout>
  );
}
