import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/game/types";
import { playMoveSound, playCaptureSound, playFinishSound, playWinSound, playSafeSound } from "@/lib/audio";
import { FINISHED, SAFE_SQUARES } from "@/game/constants";
import { trackIndexFor } from "@/game/engine";

export function useGameAnimation(game: GameState | null, onAnimationComplete?: () => void) {
  const [animatedGame, setAnimatedGame] = useState<GameState | null>(game);
  const animatingRef = useRef(false);
  const prevGameRef = useRef<GameState | null>(null);

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
    
    // Check if there's a new move to animate.
    // Use JSON.stringify to prevent false positives when engine deep-clones state.
    const isNewMove = game.lastMove && JSON.stringify(game.lastMove) !== JSON.stringify(prevGame.lastMove);
    
    let timer: number;

    if (isNewMove) {
      const { seat, token, from, to, capture } = game.lastMove!;
      
      let steps: number[] = [];
      if (from === 0 && to === 1) {
        steps = [1];
      } else {
        for (let step = from + 1; step <= to; step++) {
          steps.push(step);
        }
      }

      animatingRef.current = true;
      let stepIdx = 0;

      const runStep = () => {
        if (stepIdx < steps.length) {
          const currentStepPos = steps[stepIdx];
          
          if (stepIdx < steps.length - 1) {
            playMoveSound();
          } else {
            if (capture && capture.length > 0) {
              playCaptureSound();
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
          
          if (stepIdx < steps.length - 1 && capture && capture.length > 0) {
             for (const cap of capture) {
                const prevPos = prevGame.tokens[cap.seat][cap.token];
                intermediateState.tokens[cap.seat][cap.token] = prevPos;
             }
          }

          setAnimatedGame(intermediateState);
          stepIdx++;
          timer = window.setTimeout(runStep, 250); // 250ms per square for slightly smoother pace
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
    } else {
      if (!animatingRef.current) {
        setAnimatedGame(game);
      }
    }

    prevGameRef.current = game;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [game, onAnimationComplete]);

  return { animatedGame: animatingRef.current ? animatedGame : game, isAnimating: animatingRef.current };
}
