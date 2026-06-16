const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  // Create context only on first user interaction to comply with browser autoplay policies
  if (!(window as any)._ludoAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      (window as any)._ludoAudioCtx = new AudioContextClass();
    }
  }
  return (window as any)._ludoAudioCtx as AudioContext;
};

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playRollSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      // Increased volume from 0.02 to 0.2 and made it sound more like a clatter
      playTone(300 + Math.random() * 400, 'triangle', 0.06, 0.2);
    }, i * 35);
  }
}

export function playMoveSound() {
  // Increased volume, shorter duration, and sharper wave for a clear "tap" sound
  playTone(600, 'triangle', 0.08, 0.3);
}

export function playCaptureSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playFinishSound() {
  playTone(523.25, 'sine', 0.3, 0.05); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.3, 0.05), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.4, 0.05), 200); // G5
}

export function playWinSound() {
  playFinishSound();
  setTimeout(playFinishSound, 400);
}

export function playSafeSound() {
  // A pleasant "ding" sound for reaching a safe star
  playTone(880, 'sine', 0.1, 0.1); // A5
  setTimeout(() => playTone(1108.73, 'sine', 0.2, 0.1), 100); // C#6
}
