"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBalance } from "@/hooks/useWallet";
import { useHashPriceUsd } from "@/hooks/useGlobal";
import { useWar, useLeaderboard } from "@/hooks/useWar";
import { useWallet } from "@/lib/web3";
import { useT } from "@/i18n";
import { formatHash, formatHashrate } from "@hashwar/shared";
import { Crown, ArrowDownUp, Radio, Timer, Trophy } from "lucide-react";

function formatCountdown(deadlineSec: number): string {
  const diff = Math.max(0, deadlineSec - Math.floor(Date.now() / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function RightPanel() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: balance } = useBalance();
  const hashUsd = useHashPriceUsd();
  const { data: warData } = useWar();
  const { data: leaderboard } = useLeaderboard();
  const { address } = useWallet();
  const t = useT();

  const gameBalance = balance ? BigInt(balance.balance) : BigInt(0);
  const balanceStr = formatHash(gameBalance);
  const usdValue = (Number(gameBalance) / 1e18 * hashUsd).toFixed(2);

  const warActive = warData?.current?.active === true;
  const warPool = warData?.current ? (Number(warData.current.warPool) / 1e18).toLocaleString() : "—";
  const round = warData?.current?.round ? `#${warData.current.round}` : "—";
  const endsIn = warData?.current?.deadline
    ? formatCountdown(Number(warData.current.deadline))
    : "—";

  const topMiners = (leaderboard?.miners ?? []).slice(0, 5);
  const myAddr = address?.toLowerCase();
  const myRank = myAddr
    ? (leaderboard?.miners ?? []).findIndex((m: any) => m.walletAddress.toLowerCase() === myAddr) + 1
    : 0;
  const myEntry = myRank > 0 ? (leaderboard?.miners ?? [])[myRank - 1] : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* MY BALANCE */}
      <div className="hud-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-[#ffd700] flex items-center justify-center text-[11px] font-bold text-[#000]">H</span>
          <span className="text-[12px] font-semibold text-white">{t("home.myBalance")}</span>
        </div>
        <div className="num text-[28px] font-semibold text-white leading-none">
          {balanceStr}
          <span className="text-[14px] text-[#ffd700] ml-1">HASH</span>
        </div>
        <div className="num text-[12px] text-[#8b8b9a] mt-1">≈ ${usdValue} USD</div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link href="/wallet" className="hud-btn hud-btn-blue justify-center text-[11px]">
            <ArrowDownUp size={14} /> {t("home.deposit")}
          </Link>
          <Link href="/wallet" className="hud-btn hud-btn-outline justify-center text-[11px]">
            <ArrowDownUp size={14} /> {t("home.withdraw")}
          </Link>
        </div>
      </div>

      {/* MINING WAR */}
      <div className="hud-card hud-card-red p-4 relative overflow-hidden"
        style={{ borderColor: "rgba(255,0,64,0.3)" }}>
        <div className="absolute -right-6 -bottom-6 opacity-10">
          <svg width="140" height="140" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="28" fill="none" stroke="#ff0040" strokeWidth="2" />
            <circle cx="50" cy="50" r="18" fill="none" stroke="#ff0040" strokeWidth="1" />
            <circle cx="50" cy="50" r="8" fill="#ff0040" />
          </svg>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Radio size={15} className="text-[#ff0040]" />
          <span className="text-[12px] font-semibold text-[#ff0040]">{t("nav.miningWar")}</span>
          <span className="ml-auto text-[9px] text-[#ff0040] bg-[#ff0040]/10 border border-[#ff0040]/30 rounded px-1.5 py-0.5">
            {round}
          </span>
        </div>

        <div className="flex items-end gap-2 mb-1">
          <Timer size={14} className="text-[#ff6600]" />
          <span className="num text-[24px] font-bold text-white leading-none">{endsIn}</span>
          <span className="text-[9px] text-[#8b8b9a] mb-1">{t("home.endsIn")}</span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] uppercase tracking-wide text-[#8b8b9a]">{t("home.warPool")}</span>
          <span className="num text-[14px] font-semibold text-[#ffd700] ml-auto">{warPool} $HASH</span>
        </div>

        <Link
          href="/war"
          className="hud-btn hud-btn-red justify-center w-full mt-4 text-[12px]"
        >
          <Radio size={14} /> {t("home.joinWar")}
        </Link>
      </div>

      {/* TOP MINERS */}
      <div className="hud-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-[#ffd700]" />
            <span className="text-[12px] font-semibold text-white">{t("home.topMiners")}</span>
          </div>
          <Link href="/rank" className="text-[10px] text-[#a855f7] hover:underline">{t("home.viewAll")}</Link>
        </div>

        <div className="flex flex-col gap-1.5">
          {topMiners.map((m: any) => (
            <div key={m.walletAddress} className="flex items-center gap-2 py-1.5 rounded-md px-1.5"
              style={{ background: m.rank <= 3 ? "rgba(255,215,0,0.05)" : "transparent" }}>
              {m.rank === 1 ? (
                <Crown size={14} className="text-[#ffd700]" />
              ) : (
                <span className="num w-4 text-[11px] font-semibold text-[#8b8b9a] text-center">{m.rank}</span>
              )}
              <span className="num text-[11px] text-white flex-1 truncate">{m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}</span>
              <span className="num text-[11px] font-medium text-[#a855f7]">{formatHashrate(BigInt(m.hashrate))}</span>
            </div>
          ))}
          {topMiners.length === 0 && (
            <p className="num text-[11px] text-[#5a5a6a] text-center py-2">{t("rank.noData")}</p>
          )}

          {myEntry && (
            <div className="flex items-center gap-2 py-2 px-1.5 rounded-md mt-1"
              style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.4)" }}>
              <span className="num w-4 text-[11px] font-bold text-[#a855f7] text-center">{myRank}</span>
              <span className="text-[11px] font-semibold text-[#a855f7] flex-1">{t("home.you")}</span>
              <span className="num text-[11px] font-semibold text-[#a855f7]">{formatHashrate(BigInt(myEntry.hashrate))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
