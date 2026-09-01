"use client";

import { GameLayout } from "@/components/layout/GameLayout";
import { PageTitle } from "@/components/ui/Hud";
import { Warfield } from "@/components/war/Warfield";
import { useWar } from "@/hooks/useWar";
import { useT } from "@/i18n";
import { Trophy } from "lucide-react";

export default function WarPage() {
  const { data: warData } = useWar();
  const t = useT();
  const war = warData?.current;

  return (
    <GameLayout>
      <div className="space-y-6">
        <PageTitle icon={<Trophy size={20} />} title={t("war.title")} sub={t("war.sub")} accent="#ff0040" />

        {/* Multiplayer competition visualization */}
        <Warfield isLive={war?.status === "ACTIVE"} />
      </div>
    </GameLayout>
  );
}
