import { AVATARS, getAvatar } from "@/data/avatars";

export function Avatar({ id, size = 40, ring }: { id: string; size?: number; ring?: string }) {
  if (id && id.startsWith("data:image/")) {
    return (
      <div
        style={{
          width: size, height: size,
          boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
        }}
        className="rounded-full overflow-hidden shrink-0"
      >
        <img src={id} alt="Avatar" className="w-full h-full object-cover" />
      </div>
    );
  }

  const a = getAvatar(id);
  return (
    <div
      style={{
        width: size, height: size, background: a.bg,
        boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
        fontSize: size * 0.6,
      }}
      className="grid place-items-center rounded-full select-none shrink-0"
    >
      <span>{a.emoji}</span>
    </div>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          className="rounded-xl p-1 transition-transform hover:scale-105"
          style={{ outline: value === a.id ? "3px solid var(--ring)" : "2px solid transparent" }}
        >
          <Avatar id={a.id} size={48} />
        </button>
      ))}
    </div>
  );
}
