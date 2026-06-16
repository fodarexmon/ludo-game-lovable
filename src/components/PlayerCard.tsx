import { Avatar } from "./Avatar";
import { getCountry } from "@/data/countries";
import type { Player } from "@/game/types";

export function PlayerCard({ player, active, finishedCount, ping, isStale }: { player: Player; active: boolean; finishedCount: number; ping?: number; isStale?: boolean }) {
  const country = getCountry(player.country || "US");
  const colorHex: Record<string, string> = { red: "#ef4444", green: "#22c55e", yellow: "#eab308", blue: "#3b82f6" };
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-2.5 transition-all"
      style={{
        background: active ? "linear-gradient(180deg, oklch(0.32 0.06 260), oklch(0.26 0.05 260))" : "oklch(0.25 0.04 260)",
        border: `2px solid ${active ? colorHex[player.color] : "transparent"}`,
        boxShadow: active ? `0 0 24px ${colorHex[player.color]}55` : undefined,
      }}
    >
      <Avatar id={player.avatarId} size={42} ring={colorHex[player.color]} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{player.name}</span>
          <span title={country.name}>{country.flag}</span>
          {ping !== undefined && player.kind === "remote" && (
             <span title={isStale ? "متصل بضعف / مفصول" : `${ping}ms`} className={`text-[10px] ml-1 opacity-80 ${isStale || ping >= 300 ? "text-destructive" : ping >= 150 ? "text-yellow-400" : "text-green-500"}`}>
                {isStale ? "🔴" : (ping >= 150 ? "🟡" : "🟢")}
             </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {player.kind === "ai" ? "Computer" : player.kind === "remote" ? "Online" : "You"} · {finishedCount}/4 home
        </div>
      </div>
    </div>
  );
}
