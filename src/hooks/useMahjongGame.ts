import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MahjongGameEngine,
  sortTiles,
  toStandardTile,
  toMajiangTile,
} from '../lib/mahjong/gameEngine';
import type {
  AvailableActions,
  DiscardTile,
  GameStatus,
  HandInfo,
  MahjongGameOptions,
  MahjongGameState,
  Meld,
  PlayerInfo,
  RoundInfo,
  RoundResult,
  FinalGameResult,
} from '../lib/mahjong/types';

export interface UseMahjongGameReturn {
  // Core required reactive state
  round: RoundInfo;
  scores: number[]; // Points for seats [東, 南, 西, 北]
  myHand: HandInfo; // Current 13-14 tiles, sorted, tsumoTile, shanten, waits
  doraIndicators: string[]; // Revealed Dora indicators (e.g. ['1m', '5p'])
  discards: DiscardTile[][]; // Discard ponds for seats [東, 南, 西, 北]
  melds: Meld[][]; // Open calls for seats [東, 南, 西, 北]
  remainingTiles: number; // Tiles remaining in wall
  activeTurn: number; // Current turn player index (0..3)
  availableActions: AvailableActions; // Available actions for human player

  // Extended game state
  players: PlayerInfo[];
  gameStatus: GameStatus; // 'idle' | 'playing' | 'round_end' | 'game_over'
  isPaused: boolean;
  speedMode: 'normal' | 'fast';
  roundResult: RoundResult | null;
  finalResult: FinalGameResult | null;
  lastDiscard: { seat: number; tile: string; isRiichi: boolean } | null;

  // Actions
  discard: (tile: string) => void;
  declareRiichi: (tile: string) => void;
  declareTsumo: () => void;
  declareRon: () => void;
  callChi: (meld: string) => void;
  callPeng: (meld: string) => void;
  callGang: (meld: string) => void;
  passAction: () => void;
  declareKyuushuu: () => void;
  startNewGame: (options?: MahjongGameOptions) => void;
  nextRound: () => void;
  stopGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  togglePause: () => void;
  setSpeedMode: (mode: 'normal' | 'fast') => void;
  setSpeed: (delayMs: number) => void;
  triggerGameOver: () => void;

  // Helpers
  sortTiles: (tiles: string[]) => string[];
  toStandardTile: (tile: string) => string;
  toMajiangTile: (tile: string) => string;
  engine: MahjongGameEngine | null;
}

export function useMahjongGame(initialOptions: MahjongGameOptions = {}): UseMahjongGameReturn {
  const engineRef = useRef<MahjongGameEngine | null>(null);

  // Lazy initialize engine instance
  if (!engineRef.current) {
    engineRef.current = new MahjongGameEngine(initialOptions);
  }

  const [gameState, setGameState] = useState<MahjongGameState>(() =>
    engineRef.current!.getState()
  );

  // Subscribe to engine state updates
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const unsubscribe = engine.onStateChange((state) => {
      setGameState({ ...state });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Action wrappers with stable callbacks
  const discard = useCallback((tile: string) => {
    engineRef.current?.discard(tile);
  }, []);

  const declareRiichi = useCallback((tile: string) => {
    engineRef.current?.declareRiichi(tile);
  }, []);

  const declareTsumo = useCallback(() => {
    engineRef.current?.declareTsumo();
  }, []);

  const declareRon = useCallback(() => {
    engineRef.current?.declareRon();
  }, []);

  const callChi = useCallback((meld: string) => {
    engineRef.current?.callChi(meld);
  }, []);

  const callPeng = useCallback((meld: string) => {
    engineRef.current?.callPeng(meld);
  }, []);

  const callGang = useCallback((meld: string) => {
    engineRef.current?.callGang(meld);
  }, []);

  const passAction = useCallback(() => {
    engineRef.current?.passAction();
  }, []);

  const declareKyuushuu = useCallback(() => {
    engineRef.current?.declareKyuushuu();
  }, []);

  const startNewGame = useCallback((options?: MahjongGameOptions) => {
    if (options) {
      engineRef.current?.stop();
      engineRef.current = new MahjongGameEngine(options);
      engineRef.current.onStateChange((state) => {
        setGameState({ ...state });
      });
    }
    engineRef.current?.start();
  }, []);

  const nextRound = useCallback(() => {
    engineRef.current?.nextRound();
  }, []);

  const stopGame = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const pauseGame = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resumeGame = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const togglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const setSpeedMode = useCallback((mode: 'normal' | 'fast') => {
    engineRef.current?.setSpeedMode(mode);
  }, []);

  const setSpeed = useCallback((delayMs: number) => {
    engineRef.current?.setSpeed(delayMs);
  }, []);

  const triggerGameOver = useCallback(() => {
    engineRef.current?.triggerGameOver();
  }, []);

  return {
    round: gameState.round,
    scores: gameState.scores,
    myHand: gameState.myHand,
    doraIndicators: gameState.doraIndicators,
    discards: gameState.discards,
    melds: gameState.melds,
    remainingTiles: gameState.remainingTiles,
    activeTurn: gameState.activeTurn,
    availableActions: gameState.availableActions,

    players: gameState.players,
    gameStatus: gameState.gameStatus,
    isPaused: gameState.isPaused,
    speedMode: gameState.speedMode,
    roundResult: gameState.roundResult,
    finalResult: gameState.finalResult,
    lastDiscard: gameState.lastDiscard,

    discard,
    declareRiichi,
    declareTsumo,
    declareRon,
    callChi,
    callPeng,
    callGang,
    passAction,
    declareKyuushuu,
    startNewGame,
    nextRound,
    stopGame,
    pauseGame,
    resumeGame,
    togglePause,
    setSpeedMode,
    setSpeed,
    triggerGameOver,

    sortTiles,
    toStandardTile,
    toMajiangTile,
    engine: engineRef.current,
  };
}

export default useMahjongGame;
