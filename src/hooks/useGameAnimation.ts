import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/game/types";
import { playMoveSound, playCaptureSound, playFinishSound, playWinSound, playSafeSound } from "@/lib/audio";
import { FINISHED, SAFE_SQUARES } from "@/game/constants";
import { trackIndexFor } from "@/game/engine";

export function useGameAnimation(game: GameState | null, onAnimationComplete?: () => void) {
  const [animatedGame, setAnimatedGame] = useState<GameState | null>(game);
  const animatingRef = useRef(false);
  const prevGameRef = useRef<GameState | null>(null);
  const timerRef = useRef<number | null>(null);
  const [killVfx, setKillVfx] = useState<{ active: boolean, position: number | null, color: string | null }>({ active: false, position: null, color: null });

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!game) {
      setAnimatedGame(null);
      prevGameRef.current = null;
      return;
    }

    if (!prevGameRef.current) {
      setAnimatedGame(game);
      prevGameRef.current = game;
      return;
    }

    const prevGame = prevGameRef.current;
    
    // Check if there's a new move to animate by comparing the unique timestamp.
    const isNewMove = !!game.lastMove && (!prevGame.lastMove || game.lastMove.timestamp !== prevGame.lastMove.timestamp);
    
    if (isNewMove) {
      if (timerRef.current) window.clearTimeout(timerRef.current);

      const { seat, token, from, to, capture } = game.lastMove!;
      
      let steps: number[] = [];
      if (from === 0 && to === 1) {
        steps = [1];
      } else {
        for (let step = from + 1; step <= to; step++) {
          steps.push(step);
        }
      }

      let maxRetreatSteps = 0;
      if (capture && capture.length > 0) {
        for (const cap of capture) {
          const prevPos = prevGame.tokens[cap.seat][cap.token];
          if (prevPos > maxRetreatSteps) maxRetreatSteps = prevPos;
        }
      }

      animatingRef.current = true;
      let stepIdx = 0;
      let retreatDistance = 0;

      const runStep = () => {
        if (stepIdx < steps.length) {
          const currentStepPos = steps[stepIdx];
          
          if (stepIdx < steps.length - 1) {
            playMoveSound();
          } else {
            if (capture && capture.length > 0) {
              playCaptureSound();
              setKillVfx({ active: true, position: currentStepPos, color: game.players[seat].color });
              setTimeout(() => setKillVfx({ active: false, position: null, color: null }), 600);
            } else if (currentStepPos === FINISHED) {
              playFinishSound();
            } else {
              const absIdx = trackIndexFor(game.players[seat].color, currentStepPos);
              if (absIdx !== null && SAFE_SQUARES.has(absIdx)) {
                playSafeSound();
              } else {
                playMoveSound();
              }
            }
          }

          const intermediateState: GameState = JSON.parse(JSON.stringify(game));
          intermediateState.tokens[seat][token] = currentStepPos;
          
          if (capture && capture.length > 0) {
             for (const cap of capture) {
                const prevPos = prevGame.tokens[cap.seat][cap.token];
                intermediateState.tokens[cap.seat][cap.token] = prevPos;
             }
          }

          setAnimatedGame(intermediateState);
          stepIdx++;
          timerRef.current = window.setTimeout(runStep, 250);
        } else if (capture && capture.length > 0 && retreatDistance <= maxRetreatSteps) {
          if (retreatDistance === 0) {
            // First time in retreat phase, wait for explosion VFX to show before flying back
            retreatDistance = 1;
            timerRef.current = window.setTimeout(runStep, 350);
            return;
          }

          const intermediateState: GameState = JSON.parse(JSON.stringify(game));
          for (const cap of capture) {
            const prevPos = prevGame.tokens[cap.seat][cap.token];
            const currentRetreatPos = Math.max(0, prevPos - retreatDistance);
            intermediateState.tokens[cap.seat][cap.token] = currentRetreatPos;
          }
          
          setAnimatedGame(intermediateState);
          retreatDistance += 3; // move 3 cells back per frame for a very fast return
          timerRef.current = window.setTimeout(runStep, 30); // 30ms per frame
        } else {
          animatingRef.current = false;
          
          if (game.winners.length > 0 && prevGame.winners.length === 0) {
            playWinSound();
          }

          setAnimatedGame(game);
          if (onAnimationComplete) onAnimationComplete();
        }
      };

      runStep();
      prevGameRef.current = game;
    } else {
      if (!animatingRef.current) {
        setAnimatedGame(game);
        prevGameRef.current = game;
      }
    }
  }, [game, onAnimationComplete]);

  return { animatedGame: animatingRef.current ? animatedGame : game, isAnimating: animatingRef.current, killVfx };
}
