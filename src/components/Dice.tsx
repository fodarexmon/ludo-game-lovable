import { useEffect, useState, useRef } from "react";

const DOTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
};

export function Dice({ value, rolling, size = 80, color = "#fff" }: { value: number | null; rolling?: boolean; size?: number; color?: string }) {
  const [rotation, setRotation] = useState("rotateX(0deg) rotateY(0deg)");
  const spins = useRef(0);
  const lastProcessed = useRef({ value: -1, rolling: false });

  useEffect(() => {
    if (lastProcessed.current.value === (value ?? -1) && lastProcessed.current.rolling === !!rolling) return;
    lastProcessed.current = { value: value ?? -1, rolling: !!rolling };

    if (rolling) {
      const baseSpin = spins.current * 720 + 360;
      setRotation(`rotateX(${baseSpin + Math.random() * 180}deg) rotateY(${baseSpin + Math.random() * 180}deg)`);
    } else if (value) {
      spins.current += 1;
      const baseSpin = spins.current * 720;
      let rx = baseSpin;
      let ry = baseSpin;

      switch (value) {
        case 1: rx += 0; ry += 0; break;
        case 2: rx += -90; ry += 0; break;
        case 3: rx += 0; ry += -90; break;
        case 4: rx += 0; ry += 90; break;
        case 5: rx += 90; ry += 0; break;
        case 6: rx += 180; ry += 0; break;
      }
      setRotation(`rotateX(${rx}deg) rotateY(${ry}deg)`);
    }
  }, [value, rolling]);

  const tz = size / 2;
  const isLuckySix = !rolling && value === 6;

  const renderFace = (faceValue: number, transform: string) => (
    <div
      className="absolute inset-0 rounded-2xl"
      style={{
        background: color,
        transform,
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.2), inset 0 0 5px rgba(255,255,255,0.5)",
        border: "2px solid rgba(0,0,0,0.1)",
        backfaceVisibility: "hidden"
      }}
    >
      {DOTS[faceValue]?.map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-zinc-900 shadow-inner"
          style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: size * 0.18, height: size * 0.18, transform: "translate(-50%, -50%)" }}
        />
      ))}
    </div>
  );

  return (
    <div 
      className={`relative grid place-items-center transition-all duration-300 ${isLuckySix ? 'scale-110' : 'scale-100'}`}
      style={{ width: size, height: size, perspective: "1000px" }}
    >
      <div
        className={`w-full h-full relative transition-transform ${rolling ? "ease-in" : "ease-out"}`}
        style={{ 
          transform: rotation, 
          transformStyle: "preserve-3d",
          transitionDuration: rolling ? "600ms" : "800ms" 
        }}
      >
        {renderFace(1, `rotateY(0deg) translateZ(${tz}px)`)}
        {renderFace(6, `rotateX(180deg) translateZ(${tz}px)`)}
        {renderFace(3, `rotateY(90deg) translateZ(${tz}px)`)}
        {renderFace(4, `rotateY(-90deg) translateZ(${tz}px)`)}
        {renderFace(2, `rotateX(90deg) translateZ(${tz}px)`)}
        {renderFace(5, `rotateX(-90deg) translateZ(${tz}px)`)}
      </div>

      {isLuckySix && (
        <>
          <div className="absolute inset-0 rounded-2xl animate-ping bg-yellow-400 opacity-60 pointer-events-none" />
          <div className="absolute -inset-6 rounded-full bg-yellow-400 opacity-30 blur-2xl pointer-events-none animate-pulse" />
        </>
      )}
    </div>
  );
}
