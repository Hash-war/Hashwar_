"use client";

import Link from "next/link";
import { useT } from "@/i18n";
import { ChassisMinerRig } from "@/components/pixel/ChassisMinerRig";
import { ArrowUp, Layers, Target, Store, ArrowRight } from "lucide-react";

const cards = [
  {
    href: "/upgrade", labelKey: "home.card.upgrade.label", descKey: "home.card.upgrade.desc", btnKey: "home.card.upgrade.btn",
    icon: ArrowUp, color: "#a855f7", visual: <ChassisMinerRig level={5} isMining size={60} compact />,
  },
  {
    href: "/farm", labelKey: "home.card.farm.label", descKey: "home.card.farm.desc", btnKey: "home.card.farm.btn",
    icon: Layers, color: "#00d4ff", visual: <ChassisMinerRig level={3} isMining size={60} compact />,
  },
  {
    href: "/shop", labelKey: "home.card.shop.label", descKey: "home.card.shop.desc", btnKey: "home.card.shop.btn",
    icon: Store, color: "#ffd700", visual: <ChassisMinerRig level={7} isMining size={60} compact />,
  },
] as const;

export function FeatureCards() {
  const t = useT();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.href} className="hud-card p-4 flex flex-col">
            <div className="flex flex-col items-center mb-3">
              <div className="mb-2">
                {c.visual}
              </div>
              <div className="flex items-center gap-1.5">
                <Icon size={14} style={{ color: c.color }} />
                <span className="text-[12px] font-semibold text-white tracking-wide">{t(c.labelKey)}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#8b8b9a] text-center flex-1 leading-relaxed">{t(c.descKey)}</p>
            <Link href={c.href} className="hud-btn justify-center w-full mt-3 text-[10px]" style={{ borderColor: c.color, color: "#fff", background: `linear-gradient(180deg, ${c.color}33, transparent)` }}>
              {t(c.btnKey)} <ArrowRight size={12} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
