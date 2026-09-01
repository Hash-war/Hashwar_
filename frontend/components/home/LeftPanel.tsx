"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/web3";
import { formatHash, formatGlobalHashrate } from "@hashwar/shared";
import { useT } from "@/i18n";
import { Globe, Coins, Users, Pickaxe } from "lucide-react";
import { useGlobalMeta } from "@/hooks/useGlobal";

export function LeftPanel() {
  const router = useRouter();
  const { isConnected } = useWallet();
  const t = useT();
  const { data: meta } = useGlobalMeta();

  const globalHashrate = meta ? formatGlobalHashrate(BigInt(meta.globalHashrate)) : "—";
  const globalPoolDisplay = meta ? `${formatHash(BigInt(meta.globalPool))} $HASH` : "—";
  const minersOnline = meta ? meta.minerCount.toLocaleString() : "—";

  const handleStart = () => {
    if (isConnected) {
      router.push("/mine");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Headline */}
      <div>
        <p className="text-[11px] tracking-[0.3em] text-[#a855f7] uppercase mb-3">
          {t("home.headlineKicker")}
        </p>
        <h1 className="font-display font-extrabold leading-[1.05] text-[34px] sm:text-[40px]">
          <span className="text-white">{t("home.headline1")}</span><br />
          <span className="text-white">{t("home.headline2")}</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#00d4ff]">{t("home.headline3")}</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#00d4ff]">{t("home.headline4")}</span>
        </h1>
        <p className="text-[13px] text-[#8b8b9a] mt-4 leading-relaxed max-w-md">
          {t("home.subHeadline")}
        </p>
      </div>

      {/* Start mining */}
      <button onClick={handleStart} className="hud-btn hud-btn-block text-[15px] py-4 max-w-[260px] justify-start">
        <Pickaxe size={18} />
        {t("home.startMining")}
      </button>

      {/* Global stats */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)" }}>
            <Globe size={16} className="text-[#a855f7]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase text-[#8b8b9a]">{t("home.globalHashrate")}</span>
            <span className="num text-[16px] font-semibold text-white">{globalHashrate}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)" }}>
            <Coins size={16} className="text-[#ffd700]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase text-[#8b8b9a]">{t("home.globalPool")}</span>
            <span className="num text-[16px] font-semibold text-white">{globalPoolDisplay}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}>
            <Users size={16} className="text-[#00d4ff]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase text-[#8b8b9a]">{t("home.minersOnline")}</span>
            <span className="num text-[16px] font-semibold text-white">{minersOnline}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
