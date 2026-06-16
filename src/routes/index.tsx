import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ludo Star — Classic Ludo, Online & Offline" },
      { name: "description", content: "Play classic Ludo against friends on the same device, vs. computer, or online with friends in private rooms." },
      { property: "og:title", content: "Ludo Star — Classic Ludo, Online & Offline" },
      { property: "og:description", content: "Classic Ludo with offline pass-and-play, AI opponents, and online private rooms." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 grid h-24 w-24 grid-cols-2 grid-rows-2 gap-1 rounded-2xl p-2 shadow-2xl" style={{ background: "var(--board-bg)" }}>
            <div className="rounded-md" style={{ background: "var(--ludo-red)" }} />
            <div className="rounded-md" style={{ background: "var(--ludo-green)" }} />
            <div className="rounded-md" style={{ background: "var(--ludo-blue)" }} />
            <div className="rounded-md" style={{ background: "var(--ludo-yellow)" }} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Ludo Star</h1>
          <p className="mt-2 text-muted-foreground">The classic board game — your way.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link to="/play/offline" className="btn-game text-lg">🎲 Play Offline</Link>
          <Link to="/play/online" className="btn-game text-lg">🌐 Play Online</Link>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Link to="/leaderboard" className="btn-ghost !py-4 text-sm whitespace-nowrap">🏆 لوحة الشرف</Link>
            <Link to="/settings" className="btn-ghost !py-4 text-sm whitespace-nowrap">⚙️ Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
