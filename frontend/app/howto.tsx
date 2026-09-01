"use client";

import { GameLayout } from "@/components/layout/GameLayout";
import { PageTitle } from "@/components/ui/Hud";
import { useT } from "@/i18n";
import { BookOpen } from "lucide-react";

const HOWTO_STEPS = [
  { icon: "💰", title: "home.howto.step1.title", desc: "home.howto.step1.desc" },
  { icon: "⛏", title: "home.howto.step2.title", desc: "home.howto.step2.desc" },
  { icon: "🚀", title: "home.howto.step3.title", desc: "home.howto.step3.desc" },
  { icon: "🛒", title: "home.howto.step4.title", desc: "home.howto.step4.desc" },
  { icon: "⚔️", title: "home.howto.step5.title", desc: "home.howto.step5.desc" },
  { icon: "🏆", title: "home.howto.step6.title", desc: "home.howto.step6.desc" },
  { icon: "🏦", title: "home.howto.step7.title", desc: "home.howto.step7.desc" },
] as const;

export default function HowToPage() {
  const t = useT();

  return (
    <GameLayout>
      <div className="space-y-8">
        <PageTitle icon={<BookOpen size={20} />} title={t("home.howto.title")} sub={t("home.howto.sub")} accent="#00d4ff" />

        <div className="flex flex-col gap-0 items-stretch max-w-2xl mx-auto w-full">
          {HOWTO_STEPS.map((s, i) => {
            const isLast = i === HOWTO_STEPS.length - 1;
            return (
              <div key={s.icon} className="relative">
                <div className="hud-card p-4 rounded-lg flex items-center gap-4 relative z-10"
                  style={{ borderColor: "rgba(0,212,255,0.2)" }}>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center text-[20px] num text-[#00d4ff]"
                      style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}>
                      {i + 1}
                    </span>
                    <span className="text-[20px]">{s.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[13px] text-white">{t(s.title)}</p>
                    <p className="text-[11px] text-[#8b8b9a] mt-0.5 leading-relaxed">{t(s.desc)}</p>
                  </div>
                </div>
                {!isLast && (
                  <div className="mx-auto w-[2px] h-5"
                    style={{ background: "linear-gradient(180deg, rgba(0,212,255,0.5), rgba(0,212,255,0.1))" }} />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-[#5a5a6a] text-center max-w-xl mx-auto leading-relaxed">
          {t("home.howto.sub")}
        </p>
      </div>
    </GameLayout>
  );
}
