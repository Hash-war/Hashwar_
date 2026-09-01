"use client";

import { useMiner, useClaimMining, useStartMining } from "@/hooks/useMiner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useWallet } from "@/lib/web3";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { ChassisMinerRig } from "@/components/pixel/ChassisMinerRig";
import { Zap, Thermometer, Shield, Gauge } from "lucide-react";
import { Metric } from "./Metric";

export function CenterMiner() {
  const { data: miner, isLoading } = useMiner();
  const { isDemo } = useDemoMode();
  const { isConnected } = useWallet();
  const { showToast } = useToast();
  const claimMutation = useClaimMining();
  const startMutation = useStartMining();
  const t = useT();

  if (isLoading || !miner) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <span className="num text-sm text-[#a855f7] animate-pulse">{t("common.loading")}</span>
      </div>
    );
  }

  const isMining = miner.energy > 0;
  const miningActive = isMining && miner.elapsedSeconds > 0;

  const handleMine = () => {
    if (!isConnected && !isDemo) {
      showToast(t("toast.connectToMine"), "warning");
      return;
    }
    if (miner.level === 0) {
      startMutation.mutate();
      return;
    }
    if (isMining) {
      claimMutation.mutate();
    } else {
      showToast(t("toast.noEnergyToMine"), "warning");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mining status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${miningActive ? "bg-[#39ff14] animate-pulse" : "bg-gray-600"}`} />
        <span className={`text-[11px] tracking-widest uppercase ${miningActive ? "text-[#39ff14]" : "text-[#8b8b9a]"}`}>
          {miningActive ? t("home.miningActive") : t("home.standby")}
        </span>
      </div>

      {/* The rig */}
      <ChassisMinerRig
        level={miner.level}
        isMining={miner.energy > 0}
        isOverclocked={miner.isOverclocked}
        isOverheated={miner.temperature >= 100}
        size={300}
      />

      {/* Stats strip */}
      <div className="w-full hud-glass rounded-xl py-3 px-1 flex items-center justify-center divide-x divide-white/10 mt-2">
        <Metric icon={<Zap size={13} />} label={t("home.myHashrate")} value={miner.hashrate} color="#a855f7" />
        <Metric icon={<Zap size={13} />} label={t("home.energy")} value={`${miner.energy}%`} color="#ffd700" divider />
        <Metric icon={<Thermometer size={13} />} label={t("home.temperature")} value={`${miner.temperature}°C`} color="#ff6600" divider />
        <Metric icon={<Shield size={13} />} label={t("home.durability")} value={`${miner.durability}%`} color="#00d4ff" divider />
      </div>

      {/* Mine button */}
      <div className="flex flex-col items-center gap-2 my-2">
        <div className="relative">
          <div className="hud-mine-ring" />
          <button
            onClick={handleMine}
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
            <Gauge size={28} className={miningActive ? "text-[#39ff14]" : "text-[#a855f7]"} />
            <span className="font-display font-extrabold tracking-widest text-[14px] text-white">
              {miningActive ? t("home.mining") : t("home.mine")}
            </span>
          </button>
        </div>
        <p className="text-[10px] text-[#5a5a6a]">{t("home.mineHint")}</p>
      </div>
    </div>
  );
}
