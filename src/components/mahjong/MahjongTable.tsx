import React, { useState, useEffect, useRef } from 'react';
import { useMahjongGame } from '../../hooks/useMahjongGame';
import { MahjongTile } from './MahjongTile';
import { MahjongActionBar } from './MahjongActionBar';
import { AgariModal } from './AgariModal';
import { OnlineLobbyModal } from './OnlineLobbyModal';
import { soundManager } from '../../lib/mahjong/sound';
import { CPU_PROFILES } from '../../lib/mahjong/cpuPlayer';
import type { DiscardTile, Meld, RoundResult, SeatName, MahjongGameState } from '../../lib/mahjong/types';
import type { PeerMultiplayerSession } from '../../lib/mahjong/peerMultiplayer';
import {
  MahjongLanguageContext,
  formatSeatName,
  formatRoundDisplayName,
  formatPlayerDisplayName,
  formatCpuLevel,
  formatCpuTitle,
  type MahjongLang,
} from '../../lib/mahjong/i18n';
import {
  Trophy,
  Play,
  Pause,
  RotateCw,
  Flame,
  ChevronRight,
  Zap,
  Volume2,
  VolumeX,
  Bot,
  User,
  Shield,
  Clock,
  Swords,
  Sparkles,
  Info,
  Layers,
  Users,
  Globe,
  LogOut,
  Hash,
} from 'lucide-react';

const SEAT_NAMES: SeatName[] = ['東', '南', '西', '北'];

interface MahjongTableProps {
  lang?: MahjongLang;
}

/**
 * 6 tiles per row for Japanese Mahjong discard pond (河 - Kawa)
 */
function chunkDiscards(discards: DiscardTile[], size = 6): DiscardTile[][] {
  const chunks: DiscardTile[][] = [];
  if (!discards || discards.length === 0) return [[]];
  for (let i = 0; i < discards.length; i += size) {
    chunks.push(discards.slice(i, i + size));
  }
  return chunks;
}

export const MahjongTable: React.FC<MahjongTableProps> = ({ lang: propLang = 'ja' }) => {
  const isEn = propLang === 'en';
  const [showIndices, setShowIndices] = useState<boolean>(isEn);

  const {
    round: localRound,
    scores: localScores,
    myHand: localMyHand,
    doraIndicators: localDora,
    discards: localDiscards,
    melds: localMelds,
    remainingTiles: localRemainingTiles,
    activeTurn: localActiveTurn,
    availableActions: localAvailableActions,
    players: localPlayers,
    gameStatus: localGameStatus,
    isPaused,
    speedMode,
    roundResult: localRoundResult,
    finalResult: localFinalResult,
    lastDiscard: localLastDiscard,
    discard: localDiscard,
    declareRiichi: localDeclareRiichi,
    declareTsumo: localDeclareTsumo,
    declareRon: localDeclareRon,
    callChi: localCallChi,
    callPeng: localCallPeng,
    callGang: localCallGang,
    passAction: localPassAction,
    declareKyuushuu: localDeclareKyuushuu,
    startNewGame,
    nextRound: localNextRound,
    togglePause,
    setSpeedMode,
    setSpeed,
    triggerGameOver,
  } = useMahjongGame();

  // Online Multiplayer State
  const [onlineSession, setOnlineSession] = useState<PeerMultiplayerSession | null>(null);
  const [isOnlineLobbyOpen, setIsOnlineLobbyOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!new URLSearchParams(window.location.search).get('room');
    }
    return false;
  });
  const [multiplayerState, setMultiplayerState] = useState<MahjongGameState | null>(null);

  useEffect(() => {
    if (!onlineSession) {
      setMultiplayerState(null);
      return;
    }
    const unsub = onlineSession.onStateChange((st) => {
      setMultiplayerState({ ...st });
    });
    return () => unsub();
  }, [onlineSession]);

  // Seamlessly delegate state to online session when in multiplayer
  const isMultiplayer = !!onlineSession;
  const round = isMultiplayer && multiplayerState ? multiplayerState.round : localRound;
  const scores = isMultiplayer && multiplayerState ? multiplayerState.scores : localScores;
  const myHand = isMultiplayer && multiplayerState ? multiplayerState.myHand : localMyHand;
  const doraIndicators = isMultiplayer && multiplayerState ? multiplayerState.doraIndicators : localDora;
  const discards = isMultiplayer && multiplayerState ? multiplayerState.discards : localDiscards;
  const melds = isMultiplayer && multiplayerState ? multiplayerState.melds : localMelds;
  const remainingTiles = isMultiplayer && multiplayerState ? multiplayerState.remainingTiles : localRemainingTiles;
  const activeTurn = isMultiplayer && multiplayerState ? multiplayerState.activeTurn : localActiveTurn;
  const availableActions = isMultiplayer && multiplayerState ? multiplayerState.availableActions : localAvailableActions;
  const players = isMultiplayer && multiplayerState ? multiplayerState.players : localPlayers;
  const gameStatus = isMultiplayer && multiplayerState ? multiplayerState.gameStatus : localGameStatus;
  const roundResult = isMultiplayer && multiplayerState ? multiplayerState.roundResult : localRoundResult;
  const finalResult = isMultiplayer && multiplayerState ? multiplayerState.finalResult : localFinalResult;
  const lastDiscard = isMultiplayer && multiplayerState ? multiplayerState.lastDiscard : localLastDiscard;

  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [isRiichiMode, setIsRiichiMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.isMuted());
  const [riichiBanner, setRiichiBanner] = useState<string | null>(null);

  // Preview / Inspection states for evaluation modal
  const [previewResult, setPreviewResult] = useState<RoundResult | null>(null);
  const [isPreviewGameOver, setIsPreviewGameOver] = useState<boolean>(false);
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);

  const showDemoRon = () => {
    setPreviewResult({
      type: 'hule',
      name: isEn ? 'Ron Win (Haneman)' : 'ロン和了',
      winnerSeat: 0,
      winnerName: isEn ? 'You' : 'あなた',
      loserSeat: 1,
      loserName: isEn ? 'Takeshi (Novice)' : '初級ボット: たけし',
      han: 7,
      fu: 40,
      points: 18000,
      initialScores: [25000, 25000, 25000, 25000],
      deltaScores: [18000, -18000, 0, 0],
      doraIndicators: ['1s', '4p'],
      uraDoraIndicators: ['6s'],
      winTile: '9s',
      winType: 'ron',
      yaku: [
        { name: '立直', han: 1 },
        { name: '断幺九', han: 1 },
        { name: '平和', han: 1 },
        { name: 'ドラ', han: 2 },
        { name: '赤ドラ', han: 1 },
        { name: '裏ドラ', han: 1 },
      ],
      winningHand: {
        seat: 0,
        playerName: isEn ? 'You' : 'あなた',
        isDealer: true,
        isRiichi: true,
        concealedTiles: ['2m', '3m', '4m', '5p', '0p', '6p', '7p', '2s', '3s', '4s', '7s', '8s'],
        winTile: '9s',
        winType: 'ron',
        melds: [],
        doraIndicators: ['1s', '4p'],
        uraDoraIndicators: ['6s'],
      },
    });
    setIsPreviewGameOver(false);
    setShowDemoMenu(false);
  };

  const showDemoTsumo = () => {
    setPreviewResult({
      type: 'hule',
      name: isEn ? 'Tsumo Win (Mangan)' : 'ツモ和了',
      winnerSeat: 0,
      winnerName: isEn ? 'You' : 'あなた',
      han: 5,
      fu: 40,
      points: 8000,
      initialScores: [25000, 25000, 25000, 25000],
      deltaScores: [8000, -2000, -4000, -2000],
      doraIndicators: ['5m'],
      uraDoraIndicators: ['3p'],
      winTile: '0s',
      winType: 'tsumo',
      yaku: [
        { name: '門前清自摸和', han: 1 },
        { name: '断幺九', han: 1 },
        { name: '一盃口', han: 1 },
        { name: 'ドラ', han: 1 },
        { name: '赤ドラ', han: 1 },
      ],
      winningHand: {
        seat: 0,
        playerName: isEn ? 'You' : 'あなた',
        isDealer: false,
        isRiichi: false,
        concealedTiles: ['2m', '2m', '3m', '3m', '4m', '4m', '6p', '7p', '8p', '2s', '3s', '4s'],
        winTile: '0s',
        winType: 'tsumo',
        melds: [],
        doraIndicators: ['5m'],
      },
    });
    setIsPreviewGameOver(false);
    setShowDemoMenu(false);
  };

  const showDemoRyukyoku = () => {
    setPreviewResult({
      type: 'pingju',
      name: isEn ? 'Exhaustive Draw (Ryukyoku)' : '荒牌平局 (流局)',
      initialScores: [25000, 25000, 25000, 25000],
      deltaScores: [3000, -1000, -1000, -1000],
      doraIndicators: ['1m'],
      revealedHands: [
        {
          seat: 0,
          playerName: isEn ? 'You' : 'あなた',
          tiles: ['1m', '2m', '3m', '4p', '5p', '6p', '7s', '8s', '9s', '1z', '1z', '1z', '2z'],
          melds: [],
          isTenpai: true,
          waits: ['2z'],
        },
        {
          seat: 1,
          playerName: isEn ? 'Takeshi' : 'たけし',
          tiles: ['1m', '4m', '7m', '2p', '5p', '8p', '3s', '6s', '9s', '1z', '3z', '5z', '7z'],
          melds: [],
          isTenpai: false,
        },
        {
          seat: 2,
          playerName: isEn ? 'Aoi' : 'あおい',
          tiles: ['2m', '5m', '8m', '3p', '6p', '9p', '1s', '4s', '7s', '2z', '4z', '6z', '7z'],
          melds: [],
          isTenpai: false,
        },
        {
          seat: 3,
          playerName: isEn ? 'Kenji' : 'けんじ',
          tiles: ['3m', '6m', '9m', '1p', '4p', '7p', '2s', '5s', '8s', '1z', '2z', '3z', '4z'],
          melds: [],
          isTenpai: false,
        },
      ],
    });
    setIsPreviewGameOver(false);
    setShowDemoMenu(false);
  };

  const showDemoGameOver = () => {
    setIsPreviewGameOver(true);
    setPreviewResult(null);
    setShowDemoMenu(false);
  };

  // Track previous Riichi state to trigger dramatic banner & sound
  const prevRiichiState = useRef<boolean[]>([false, false, false, false]);

  useEffect(() => {
    players.forEach((p, idx) => {
      if (p.isRiichi && !prevRiichiState.current[idx]) {
        soundManager.playRiichi();
        const announcerName = idx === 0 ? (isEn ? 'You' : 'あなた') : (isEn ? formatPlayerDisplayName(p.name, 'en') : p.name);
        setRiichiBanner(isEn ? `${announcerName} declared Riichi!` : `${announcerName} が立直（リーチ）を宣言！`);
        const timer = setTimeout(() => setRiichiBanner(null), 3000);
        return () => clearTimeout(timer);
      }
    });
    prevRiichiState.current = players.map((p) => p.isRiichi);
  }, [players, isEn]);

  // Seat 0: Human (Bottom), 1: Shimocha (Right), 2: Toimen (Top), 3: Kamicha (Left)
  const humanPlayer = players[0] || {
    name: isEn ? 'You' : 'あなた',
    shortName: isEn ? 'You' : 'あなた',
    score: 25000,
    isDealer: false,
    isRiichi: false,
    seat: '東',
    avatar: {
      emoji: '👤',
      bgGradient: 'from-emerald-600 via-teal-700 to-slate-900',
      ringColor: 'ring-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300',
      textColor: 'text-emerald-300',
    },
  };
  const shimocha = players[1] || {
    name: CPU_PROFILES[1].name,
    shortName: CPU_PROFILES[1].shortName,
    score: 25000,
    isDealer: false,
    isRiichi: false,
    seat: '南',
    difficulty: CPU_PROFILES[1].difficulty,
    levelLabel: CPU_PROFILES[1].levelLabel,
    title: CPU_PROFILES[1].title,
    description: CPU_PROFILES[1].description,
    avatar: CPU_PROFILES[1].avatar,
  };
  const toimen = players[2] || {
    name: CPU_PROFILES[2].name,
    shortName: CPU_PROFILES[2].shortName,
    score: 25000,
    isDealer: false,
    isRiichi: false,
    seat: '西',
    difficulty: CPU_PROFILES[2].difficulty,
    levelLabel: CPU_PROFILES[2].levelLabel,
    title: CPU_PROFILES[2].title,
    description: CPU_PROFILES[2].description,
    avatar: CPU_PROFILES[2].avatar,
  };
  const kamicha = players[3] || {
    name: CPU_PROFILES[3].name,
    shortName: CPU_PROFILES[3].shortName,
    score: 25000,
    isDealer: false,
    isRiichi: false,
    seat: '北',
    difficulty: CPU_PROFILES[3].difficulty,
    levelLabel: CPU_PROFILES[3].levelLabel,
    title: CPU_PROFILES[3].title,
    description: CPU_PROFILES[3].description,
    avatar: CPU_PROFILES[3].avatar,
  };

  // Toggle audio
  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  // Discard action handler (click or drag)
  const handleExecuteDiscard = (tile: string) => {
    if (gameStatus !== 'playing') return;
    if (activeTurn !== 0) return;
    if (!availableActions.canDiscard) return;

    if (isRiichiMode) {
      if (availableActions.riichi.discardTiles.includes(tile)) {
        soundManager.playRiichi();
        if (onlineSession) {
          onlineSession.declareRiichi(tile);
        } else {
          localDeclareRiichi(tile);
        }
        setIsRiichiMode(false);
        setSelectedTile(null);
      }
      return;
    }

    soundManager.playTileDiscard();
    if (onlineSession) {
      onlineSession.discard(tile);
    } else {
      localDiscard(tile);
    }
    setSelectedTile(null);
  };

  // Tile click handler
  const handleTileClick = (tile: string) => {
    if (gameStatus !== 'playing') return;
    if (activeTurn !== 0) return;
    if (!availableActions.canDiscard) return;

    if (isRiichiMode) {
      handleExecuteDiscard(tile);
      return;
    }

    if (selectedTile === tile) {
      // Second click executes discard
      handleExecuteDiscard(tile);
    } else {
      soundManager.playTileClick();
      setSelectedTile(tile);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, tile: string) => {
    if (gameStatus !== 'playing' || activeTurn !== 0 || !availableActions.canDiscard) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', tile);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedTile = e.dataTransfer.getData('text/plain');
    if (droppedTile) {
      handleExecuteDiscard(droppedTile);
    }
  };

  // Render a player's Discard Pond (河 - Kawa) in 6 tiles per row
  const renderDiscardPond = (seatIndex: number) => {
    const pondTiles = discards[seatIndex] || [];
    const rows = chunkDiscards(pondTiles, 6);

    return (
      <div
        className="flex flex-col items-center gap-0.5 min-h-[82px] min-w-[175px] max-w-[200px]"
        data-seat={seatIndex}
      >
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center justify-center gap-0.5">
            {row.map((d, cIdx) => {
              const globalIdx = rIdx * 6 + cIdx;
              const isLatest =
                lastDiscard?.seat === seatIndex && globalIdx === pondTiles.length - 1;

              return (
                <div key={globalIdx} className="relative">
                  <MahjongTile
                    tile={d.tile}
                    size="sm"
                    isSideways={d.isRiichi}
                    className={`
                      ${d.isCalled ? 'opacity-30 grayscale filter' : ''}
                      ${
                        d.isRiichi
                          ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.9)] rounded-[3px] z-10'
                          : ''
                      }
                      ${isLatest ? 'ring-1.5 ring-emerald-400 brightness-110 z-10' : ''}
                    `}
                  />
                  {isLatest && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping pointer-events-none" />
                  )}
                </div>
              );
            })}
            {/* Pad row to keep grid alignment visually balanced */}
            {row.length < 6 && (
              <div
                style={{ width: `${(6 - row.length) * 29}px` }}
                className="hidden sm:block pointer-events-none"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render open melds neatly grouped
  const renderOpenMelds = (meldList: Meld[], size: 'sm' | 'md' = 'sm') => {
    if (!meldList || meldList.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {meldList.map((m, mIdx) => (
          <div
            key={mIdx}
            className="flex items-center gap-0.5 bg-black/50 border border-white/15 px-1 py-0.5 rounded-lg shadow-inner"
          >
            {m.tiles.map((t, tIdx) => {
              // Rotate called tile sideways based on direction
              const isCalledTile =
                t === m.calledTile &&
                ((m.direction === 'kamicha' && tIdx === 0) ||
                  (m.direction === 'toimen' && tIdx === 1) ||
                  (m.direction === 'shimocha' && tIdx === m.tiles.length - 1));

              return (
                <MahjongTile
                  key={tIdx}
                  tile={t}
                  size={size}
                  isSideways={isCalledTile}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <MahjongLanguageContext.Provider value={{ lang: propLang, showIndices, setShowIndices }}>
      <div className="w-full max-w-6xl mx-auto rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden font-sans select-none flex flex-col">
        {/* =========================================================================
            MULTIPLAYER STATUS OR CPU BATTLE OPPONENTS PROFILE BAR
            ========================================================================= */}
        {isMultiplayer ? (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 border-b border-emerald-500/40 px-3.5 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
                <Globe className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white tracking-wide">
                    {isEn ? 'Online Match (P2P WebRTC)' : 'オンライン対戦中 (P2P WebRTC)'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                    {isEn ? 'Room: ' : '部屋コード: '}{onlineSession.roomCode}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                    {isEn ? 'Role: ' : '卓権限: '}{onlineSession.isHost ? (isEn ? 'Host' : 'ホスト (卓主)') : (isEn ? 'Guest' : 'ゲスト')}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  {isEn
                    ? 'Star topology WebRTC synchronization • Anti-peeking encrypted P2P data'
                    : 'スター型トポロジー同期・覗き見防止暗号化通信'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onlineSession.leave();
                setOnlineSession(null);
                startNewGame();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isEn ? 'Leave Match' : '対局を抜ける'}
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/80 px-3.5 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white tracking-wide">
                    {isEn ? 'Single Player vs CPU' : '一人で対局 / CPU戦'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    {isEn ? '3 AI Opponents' : 'AI 3名対局'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {isEn
                    ? 'Cyber Mahjong AI (Shanten, Meld Logic, Defense & Push-Fold)'
                    : '電脳麻将AI（向聴数・牌効率・鳴き判断・現物筋牌守備・押し引き）'}
                </div>
              </div>
            </div>

            {/* Right: Online Match Trigger Button + 3 CPU Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsOnlineLobbyOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ring-1 ring-emerald-400/40 animate-pulse hover:animate-none"
                title={isEn ? 'Open 4-Player Real-time Multiplayer Lobby' : '4人リアルタイムオンライン対局ロビーを開く'}
              >
                <Users className="w-3.5 h-3.5" />
                {isEn ? 'Online Match' : 'オンライン対戦'}
              </button>

              {/* Seat 1: たけし (初級) */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-emerald-500/30 text-xs shadow-sm"
                title={
                  isEn
                    ? 'Novice Bot: Takeshi - Tile efficiency focus, aggressive push without fearing Riichi'
                    : '初級ボット: たけし - 牌効率重視・全押し型（向聴数を最優先し、リーチにも怯まず攻める）'
                }
              >
                <span className="text-sm">👦</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-200 text-[11px]">
                      {isEn ? 'Takeshi' : 'たけし'}
                    </span>
                    <span className="px-1 py-0.2 rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
                      {isEn ? 'Novice' : '初級'}
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-300/80">
                    {isEn ? 'Tile Efficiency' : '牌効率特化'}
                  </span>
                </div>
              </div>

              {/* Seat 2: あおい (中級) */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-xs shadow-sm"
                title={
                  isEn
                    ? 'Intermediate Bot: Aoi - Balanced offense & defense based on hand value and waits'
                    : '中級ボット: あおい - 攻守バランス型（手牌の打点と待ちを見極め、状況に応じた押し引き）'
                }
              >
                <span className="text-sm">👩</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-200 text-[11px]">
                      {isEn ? 'Aoi' : 'あおい'}
                    </span>
                    <span className="px-1 py-0.2 rounded-full bg-cyan-500/20 text-[9px] font-bold text-cyan-300">
                      {isEn ? 'Mid' : '中級'}
                    </span>
                  </div>
                  <span className="text-[9px] text-cyan-300/80">
                    {isEn ? 'Balanced' : '攻守バランス'}
                  </span>
                </div>
              </div>

              {/* Seat 3: けんじ (上級) */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-purple-500/30 text-xs shadow-sm"
                title={
                  isEn
                    ? 'Expert Bot: Kenji - Solid defense calculating genbutsu, suji, and kabe walls'
                    : '上級ボット: けんじ - 鉄壁守備・的確な押し引き（現物・筋牌・壁を計算し、好形高打点のみ押す）'
                }
              >
                <span className="text-sm">👨‍🦳</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-200 text-[11px]">
                      {isEn ? 'Kenji' : 'けんじ'}
                    </span>
                    <span className="px-1 py-0.2 rounded-full bg-purple-500/20 text-[9px] font-bold text-purple-300">
                      {isEn ? 'Expert' : '上級'}
                    </span>
                  </div>
                  <span className="text-[9px] text-purple-300/80">
                    {isEn ? 'Iron Defense' : '鉄壁守備'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TABLE CONTROL HEADER BAR
            ========================================================================= */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-20">
          {/* Left: Round & Wall Info */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm tracking-wide shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {formatRoundDisplayName(round.displayName, propLang)}
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300">
              {round.honba} {isEn ? 'Honba' : '本場'}
            </span>

            {/* Riichi Stick 供託棒 Graphic & Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-xs font-mono text-amber-300">
              {/* Realistic 1,000pt Riichi Stick */}
              <div
                className="w-7 h-2 rounded-[2px] bg-slate-100 border border-slate-300 flex items-center justify-center shadow-inner"
                title={isEn ? 'Riichi Deposit Stick (1,000 pts)' : '供託リーチ棒 (1,000点)'}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-sm" />
              </div>
              <span>x{round.riichiSticks}</span>
              <span className="hidden sm:inline text-amber-400/80 font-normal">
                ({round.riichiSticks * 1000}{isEn ? ' pts' : '点'})
              </span>
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-xs font-mono text-slate-300">
              {isEn ? 'Wall:' : '残り'} <strong className="text-white ml-0.5">{remainingTiles}</strong> {isEn ? 'left' : '枚'}
            </span>
          </div>

          {/* Center: Dora Indicator Bar */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              {isEn ? 'Dora Indicator' : 'ドラ表示牌'}
            </span>
            <div className="flex items-center gap-1">
              {doraIndicators.map((dora, i) => (
                <MahjongTile key={i} tile={dora} size="sm" isDora />
              ))}
              {/* Unrevealed Dora Slots */}
              {Array.from({ length: Math.max(0, 5 - doraIndicators.length) }).map((_, i) => (
                <div
                  key={`hidden-dora-${i}`}
                  className="w-7 h-[38px] rounded-[4px] border border-slate-700/60 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center shadow-inner opacity-80"
                  title={isEn ? 'Unrevealed Dora Slot' : '未開示ドラ表示牌'}
                >
                  <span className="text-[10px] text-amber-200/60 font-mono">🀫</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Controls & Sound Toggle */}
          <div className="flex items-center gap-2">
            {gameStatus === 'idle' ? (
              <button
                onClick={() => startNewGame()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isEn ? 'Start Game' : '対局開始'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={togglePause}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                    isPaused
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={isPaused ? (isEn ? 'Resume Match' : '対局を再開する') : (isEn ? 'Pause Match' : '対局を一時停止する')}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3 h-3 fill-current text-amber-300" />
                      {isEn ? 'Resume' : '再開'}
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 text-slate-300" />
                      {isEn ? 'Pause' : '一時停止'}
                    </>
                  )}
                </button>

                <button
                  onClick={() => startNewGame()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                  title={isEn ? 'Restart from East 1' : '最初からやり直す'}
                >
                  <RotateCw className="w-3 h-3" />
                  {isEn ? 'Restart' : '最初から'}
                </button>
              </div>
            )}

            {/* Game Speed Toggle */}
            <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setSpeedMode('normal')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  speedMode === 'normal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isEn ? 'Normal speed (~800ms AI delay)' : '通常速度（思考ディレイ 約800ms）'}
              >
                {isEn ? 'Normal' : '通常'}
              </button>
              <button
                onClick={() => setSpeedMode('fast')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  speedMode === 'fast'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isEn ? 'Fast speed (~250ms AI delay)' : '高速（思考ディレイ 約250ms）'}
              >
                {isEn ? 'Fast' : '高速'}
              </button>
            </div>

            {/* English Tile Corner Indices Toggle */}
            <button
              onClick={() => setShowIndices(!showIndices)}
              className={`px-2 py-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                showIndices
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={isEn ? 'Toggle English/Arabic numbers and letters on tiles' : '牌の英数字インデックス表示切替'}
            >
              <Hash className="w-3 h-3" />
              <span>{isEn ? 'Indices:' : '数字:'} {showIndices ? 'ON' : 'OFF'}</span>
            </button>

            {/* Evaluation Preview Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer transition shadow-sm"
                title={isEn ? 'Inspect Win, Draw, and Game Over Modals' : '和了画面・流局画面・終局画面の表示テスト'}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Demo UI' : '画面確認'}
              </button>
              {showDemoMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 text-xs">
                  <button
                    onClick={showDemoRon}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    {isEn ? 'Ron Win Demo (Haneman)' : 'ロン和了画面 (跳満)'}
                  </button>
                  <button
                    onClick={showDemoTsumo}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {isEn ? 'Tsumo Win Demo (Mangan)' : 'ツモ和了画面 (満貫)'}
                  </button>
                  <button
                    onClick={showDemoRyukyoku}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    {isEn ? 'Draw Demo (No-ten Penalty)' : '流局画面 (ノーテン罰符)'}
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={showDemoGameOver}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-amber-300 flex items-center gap-2 cursor-pointer font-bold"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {isEn ? 'Final Results (Uma & Oka)' : '終局・総合順位 (ウマ・オカ)'}
                  </button>
                </div>
              )}
            </div>

            {/* Sound Mute Button */}
            <button
              onClick={handleToggleMute}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-red-950/40 border-red-500/40 text-red-400 hover:bg-red-900/60'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 hover:text-emerald-300'
              }`}
              title={
                isMuted
                  ? (isEn ? 'Unmute Sound Effects' : '音声ミュート解除（打牌音・効果音を再生）')
                  : (isEn ? 'Mute Sound Effects' : '音声ミュート（効果音を停止）')
              }
              aria-label="Sound Toggle"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>


      {/* =========================================================================
          MAIN TABLE MAT ARENA (RICH JADE FELT WITH CROSS DISCARD PONDS)
          ========================================================================= */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative bg-gradient-to-b from-[#0b3323] via-[#082a1c] to-[#041a11] min-h-[640px] p-3 sm:p-5 flex flex-col justify-between items-center overflow-hidden"
      >
        {/* Felt Texture Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#10b981 1px, #041a11 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
          }}
        />

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-2xl mb-4 animate-pulse">
              <Pause className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
              {isEn ? 'Match Paused' : '対局を一時停止中'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-6 leading-relaxed">
              {isEn
                ? 'Review your hand, discards, and points. Click "Resume Match" when ready.'
                : '手牌や捨て牌、点数をじっくり確認できます。準備ができたら「対局を再開」を押してください。'}
            </p>
            <button
              onClick={togglePause}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              {isEn ? 'Resume Match' : '対局を再開する'}
            </button>
          </div>
        )}

        {/* Dramatic Riichi Announcement Floating Banner */}
        {riichiBanner && (
          <div className="absolute top-16 z-40 px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black text-sm sm:text-base shadow-2xl ring-4 ring-amber-300 animate-in zoom-in-95 duration-200 flex items-center gap-2">
            <Zap className="w-5 h-5 fill-current animate-bounce text-slate-950" />
            <span>{riichiBanner}</span>
          </div>
        )}

        {/* =========================================================================
            TOP PLAYER AREA (対面 - TOIMEN / CPU)
            ========================================================================= */}
        <div className="relative z-10 w-full flex flex-col items-center gap-1.5">
          {/* Opponent Info Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/75 border border-cyan-500/30 shadow-lg backdrop-blur-md">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-800 flex items-center justify-center text-sm shadow ring-1 ring-cyan-400/50">
              {toimen.avatar?.emoji || '👩'}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-100">
                  {formatPlayerDisplayName(toimen.name, propLang)}
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300">
                  {formatCpuLevel(toimen.levelLabel || '中級', propLang)}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                  {formatSeatName(toimen.seat, propLang)}
                </span>
                {toimen.isDealer && (
                  <span className="px-1.5 py-0.2 rounded bg-red-950 border border-red-500/50 text-[10px] font-bold text-red-300">
                    {isEn ? 'Dealer' : '親'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-cyan-200/70">
                {formatCpuTitle(toimen.title || '攻守バランス型', propLang)}
              </span>
            </div>
            <span className="font-mono text-sm font-black text-amber-300 ml-1">
              {toimen.score.toLocaleString()}{isEn ? ' pts' : '点'}
            </span>

            {/* Riichi Status & Stick */}
            {toimen.isRiichi && (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/20">
                <div
                  className="w-6 h-2 rounded-[2px] bg-slate-100 border border-slate-300 flex items-center justify-center shadow"
                  title={isEn ? 'Riichi Stick (1,000 pts)' : 'リーチ棒 (1,000点)'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                </div>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-[10px] text-amber-300 font-bold animate-pulse">
                  {isEn ? 'Riichi' : '立直'}
                </span>
              </div>
            )}

            {/* Thinking / Active Turn Indicator */}
            {(activeTurn === 2 || toimen.isThinking) && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400 text-cyan-300 text-[10px] font-bold animate-pulse ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>{isEn ? 'Thinking...' : '思考中...'}</span>
              </div>
            )}
          </div>

          {/* Concealed Tiles and Open Melds */}
          <div className="flex items-center gap-3">
            {/* Top Hand Tiles (Concealed backs facing down) */}
            <div className="flex items-center gap-0.5 scale-90 sm:scale-100">
              {Array.from({ length: toimen.handCount || 13 }).map((_, i) => (
                <MahjongTile key={i} tile="1z" isConcealed size="sm" />
              ))}
            </div>

            {/* Toimen Open Melds */}
            {renderOpenMelds(melds[2], 'sm')}
          </div>
        </div>

        {/* =========================================================================
            CENTER ARENA: CROSS DISCARD PONDS + CENTRAL COMPASS
            ========================================================================= */}
        <div className="relative z-10 w-full max-w-4xl flex items-center justify-between my-2 px-1">
          {/* LEFT PLAYER (上家 - KAMICHA / CPU) */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-black/75 border border-purple-500/30 shadow-lg backdrop-blur-md text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 via-violet-700 to-amber-900 flex items-center justify-center text-xs shadow ring-1 ring-purple-400/50">
                  {kamicha.avatar?.emoji || '👨‍🦳'}
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-100 text-[11px]">
                      {formatPlayerDisplayName(kamicha.shortName || kamicha.name, propLang)}
                    </span>
                    <span className="px-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-[9px] font-bold text-purple-300">
                      {formatCpuLevel(kamicha.levelLabel || '上級', propLang)}
                    </span>
                    <span className="px-1 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                      {formatSeatName(kamicha.seat, propLang)}
                    </span>
                  </div>
                  <span className="text-[9px] text-purple-200/70">
                    {formatCpuTitle(kamicha.title || '鉄壁守備', propLang)}
                  </span>
                </div>
              </div>
              <div className="font-mono text-xs font-bold text-amber-300">
                {kamicha.score.toLocaleString()}{isEn ? ' pts' : '点'}
              </div>

              {/* Riichi Stick */}
              {kamicha.isRiichi && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-5 h-1.5 rounded-[1px] bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-red-600" />
                  </div>
                  <span className="text-[9px] font-bold text-amber-300 animate-pulse">
                    {isEn ? 'Riichi' : '立直'}
                  </span>
                </div>
              )}

              {(activeTurn === 3 || kamicha.isThinking) && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/25 border border-purple-400 text-purple-300 text-[9px] font-bold animate-pulse mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  <span>{isEn ? 'Thinking' : '思考中'}</span>
                </div>
              )}
            </div>

            {/* Kamicha Concealed Tiles (Vertical Column) */}
            <div className="flex flex-col gap-0.5 scale-75 sm:scale-90">
              {Array.from({ length: Math.min(13, kamicha.handCount || 13) }).map((_, i) => (
                <MahjongTile key={i} tile="1z" isConcealed size="sm" isSideways />
              ))}
            </div>

            {/* Kamicha Melds */}
            {renderOpenMelds(melds[3], 'sm')}
          </div>

          {/* CROSS DISCARD ARENA (Top Pond, Left/Center/Right, Bottom Pond) */}
          <div className="flex-1 flex flex-col items-center justify-center mx-1 sm:mx-4 p-2 sm:p-3 rounded-3xl bg-black/55 border border-emerald-500/20 shadow-2xl backdrop-blur-sm">
            {/* 1. TOP DISCARD POND (Toimen 河) - 6 tiles per row */}
            <div className="mb-2">
              {renderDiscardPond(2)}
            </div>

            {/* 2. MIDDLE ROW: Left Pond (Kamicha), Center Compass, Right Pond (Shimocha) */}
            <div className="w-full flex items-center justify-between gap-1 sm:gap-3 my-1">
              {/* Kamicha Discard Pond (Left 河) */}
              <div className="flex-1 flex justify-center">
                {renderDiscardPond(3)}
              </div>

              {/* 卓中央 (Table Center Box & Compass) */}
              <div className="shrink-0 w-36 sm:w-44 h-36 sm:h-44 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-black border-2 border-emerald-500/40 shadow-inner flex flex-col items-center justify-between p-2 relative">
                {/* Top Wind Compass Edge (Toimen / Seat 2) */}
                <div
                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all ${
                    activeTurn === 2
                      ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400 animate-pulse'
                      : 'text-slate-400'
                  }`}
                >
                  {formatSeatName(toimen.seat, propLang)} ({formatPlayerDisplayName(toimen.name, propLang)})
                </div>

                {/* Middle Section: Round Display & Remaining Tiles */}
                <div className="w-full flex items-center justify-between px-1">
                  {/* Left Wind Compass Edge (Kamicha / Seat 3) */}
                  <div
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded transition-all ${
                      activeTurn === 3
                        ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-400 animate-pulse'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatSeatName(kamicha.seat, propLang)} ({formatPlayerDisplayName(kamicha.shortName || kamicha.name, propLang)})
                  </div>

                  {/* Center Badge */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm font-black text-emerald-400 tracking-wider">
                      {formatRoundDisplayName(round.displayName, propLang)}
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono mt-0.5">
                      {round.honba} {isEn ? 'Honba' : '本場'}
                    </span>
                    <div className="w-12 h-px bg-slate-800 my-1" />
                    <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {remainingTiles} {isEn ? 'Tiles Left' : '残 枚'}
                    </span>
                  </div>

                  {/* Right Wind Compass Edge (Shimocha / Seat 1) */}
                  <div
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded transition-all ${
                      activeTurn === 1
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400 animate-ping'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatSeatName(shimocha.seat, propLang)} ({formatPlayerDisplayName(shimocha.shortName || shimocha.name, propLang)})
                  </div>
                </div>

                {/* Bottom Wind Compass Edge (Self / Seat 0) */}
                <div
                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all ${
                    activeTurn === 0
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400 animate-pulse'
                      : 'text-slate-400'
                  }`}
                >
                  {formatSeatName(humanPlayer.seat, propLang)} ({formatPlayerDisplayName(humanPlayer.name, propLang)})
                </div>
              </div>

              {/* Shimocha Discard Pond (Right 河) */}
              <div className="flex-1 flex justify-center">
                {renderDiscardPond(1)}
              </div>
            </div>

            {/* 3. BOTTOM DISCARD POND (Human 河) - 6 tiles per row */}
            <div className="mt-2">
              {renderDiscardPond(0)}
            </div>
          </div>

          {/* RIGHT PLAYER (下家 - SHIMOCHA / CPU) */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-black/75 border border-emerald-500/30 shadow-lg backdrop-blur-md text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center text-xs shadow ring-1 ring-emerald-400/50">
                  {shimocha.avatar?.emoji || '👦'}
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-100 text-[11px]">
                      {formatPlayerDisplayName(shimocha.shortName || shimocha.name, propLang)}
                    </span>
                    <span className="px-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                      {formatCpuLevel(shimocha.levelLabel || '初級', propLang)}
                    </span>
                    <span className="px-1 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                      {formatSeatName(shimocha.seat, propLang)}
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-200/70">
                    {formatCpuTitle(shimocha.title || '牌効率特化', propLang)}
                  </span>
                </div>
              </div>
              <div className="font-mono text-xs font-bold text-amber-300">
                {shimocha.score.toLocaleString()}{isEn ? ' pts' : '点'}
              </div>

              {/* Riichi Stick */}
              {shimocha.isRiichi && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-5 h-1.5 rounded-[1px] bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-red-600" />
                  </div>
                  <span className="text-[9px] font-bold text-amber-300 animate-pulse">
                    {isEn ? 'Riichi' : '立直'}
                  </span>
                </div>
              )}

              {(activeTurn === 1 || shimocha.isThinking) && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-[9px] font-bold animate-pulse mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{isEn ? 'Thinking' : '思考中'}</span>
                </div>
              )}
            </div>

            {/* Shimocha Concealed Tiles (Vertical Column) */}
            <div className="flex flex-col gap-0.5 scale-75 sm:scale-90">
              {Array.from({ length: Math.min(13, shimocha.handCount || 13) }).map((_, i) => (
                <MahjongTile key={i} tile="1z" isConcealed size="sm" isSideways />
              ))}
            </div>

            {/* Shimocha Melds */}
            {renderOpenMelds(melds[1], 'sm')}
          </div>
        </div>

        {/* =========================================================================
            BOTTOM PLAYER AREA (手牌 - HUMAN PLAYER HAND & ACTION BAR)
            ========================================================================= */}
        <div className="relative z-20 w-full flex flex-col items-center gap-2 mt-2">
          {/* Action Bar (Only appears when legal actions exist) */}
          <MahjongActionBar
            availableActions={availableActions}
            isTenpai={myHand.isTenpai}
            isRiichiMode={isRiichiMode}
            onRiichiToggle={() => setIsRiichiMode(!isRiichiMode)}
            onTsumo={() => {
              soundManager.playWin();
              if (onlineSession) onlineSession.declareTsumo();
              else localDeclareTsumo();
            }}
            onRon={() => {
              soundManager.playWin();
              if (onlineSession) onlineSession.declareRon();
              else localDeclareRon();
            }}
            onChi={(meld) => {
              soundManager.playCall();
              if (onlineSession) onlineSession.callChi(meld);
              else localCallChi(meld);
            }}
            onPon={(meld) => {
              soundManager.playCall();
              if (onlineSession) onlineSession.callPeng(meld);
              else localCallPeng(meld);
            }}
            onKan={(meld) => {
              soundManager.playCall();
              if (onlineSession) onlineSession.callGang(meld);
              else localCallGang(meld);
            }}
            onPass={() => {
              if (onlineSession) onlineSession.passAction();
              else localPassAction();
            }}
            onKyuushuu={() => {
              if (onlineSession) onlineSession.declareKyuushuu();
              else localDeclareKyuushuu();
            }}
            lang={propLang}
            isPaused={isPaused}
          />

          {/* Player Profile & Tenpai/Shanten Badge */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-1 rounded-2xl bg-black/65 border border-emerald-500/25 shadow-md backdrop-blur-sm text-xs">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold shadow">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-200">
              {formatPlayerDisplayName(humanPlayer.name, propLang)}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
              {formatSeatName(humanPlayer.seat, propLang)}
            </span>
            {humanPlayer.isDealer && (
              <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-500/50 text-[10px] font-bold text-red-300">
                {isEn ? 'Dealer' : '親'}
              </span>
            )}
            <span className="font-mono text-sm font-black text-amber-300">
              {humanPlayer.score.toLocaleString()}{isEn ? ' pts' : '点'}
            </span>

            {/* Shanten / Tenpai Indicator */}
            {myHand.isTenpai ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs animate-pulse">
                <span>{isEn ? 'Tenpai (Ready)' : '聴牌 (テンパイ)'}</span>
                {myHand.waits.length > 0 && (
                  <span className="text-[11px] font-mono text-emerald-200 font-normal">
                    {isEn ? 'Waits: ' : '待ち: '}{myHand.waits.join(', ')}
                  </span>
                )}
              </div>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                {myHand.shanten >= 0
                  ? (isEn ? `${myHand.shanten}-Shanten` : `${myHand.shanten} 向聴`)
                  : (isEn ? 'Ready' : '向聴')}
              </span>
            )}

            {humanPlayer.isRiichi && (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/20">
                <div className="w-6 h-2 rounded-[2px] bg-slate-100 border border-slate-300 flex items-center justify-center shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                </div>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-[10px] text-amber-300 font-bold">
                  {isEn ? 'Riichi Active' : '立直中'}
                </span>
              </div>
            )}

            {/* Direct Discard button for Touch / Selected Tile */}
            {selectedTile && availableActions.canDiscard && activeTurn === 0 && (
              <button
                onClick={() => handleExecuteDiscard(selectedTile)}
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md animate-pulse cursor-pointer flex items-center gap-1"
              >
                {isRiichiMode
                  ? (isEn ? 'Discard for Riichi' : '立直打牌')
                  : (isEn ? 'Discard' : '打牌する')} ({selectedTile})
              </button>
            )}
          </div>

          {/* =====================================================================
              HAND TILES ROW (13 Upright Tiles + 14th Separated Tsumo Slot + Melds)
              ===================================================================== */}
          <div className="w-full flex items-end justify-center gap-1 max-w-full overflow-x-auto pb-2 pt-3 px-2">
            {/* 13 Concealed Hand Tiles (Sorted with smooth hover elevation) */}
            <div className="flex items-end gap-1">
              {myHand.concealedTiles.map((tile, idx) => {
                const isSelected = selectedTile === tile;
                const isRiichiValid =
                  isRiichiMode && availableActions.riichi.discardTiles.includes(tile);
                const isInteractive =
                  availableActions.canDiscard && activeTurn === 0;

                return (
                  <div
                    key={`concealed-${idx}-${tile}`}
                    draggable={isInteractive}
                    onDragStart={(e) => handleDragStart(e, tile)}
                    className="relative"
                  >
                    <MahjongTile
                      tile={tile}
                      size="md"
                      selected={isSelected}
                      onClick={() => handleTileClick(tile)}
                      className={`
                        transition-all duration-150 ease-out
                        ${isInteractive ? 'hover:-translate-y-2 hover:brightness-105 active:translate-y-0 cursor-pointer' : ''}
                        ${
                          isRiichiValid
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 rounded-sm animate-pulse'
                            : isRiichiMode
                            ? 'opacity-50'
                            : ''
                        }
                      `}
                    />
                  </div>
                );
              })}
            </div>

            {/* Separated 14th Tile Slot (ツモ牌 - Drawn Tile) */}
            {myHand.tsumoTile && (
              <div className="ml-3 sm:ml-5 flex flex-col items-center">
                <span className="text-[9px] font-bold text-emerald-400/80 mb-0.5 tracking-wider uppercase">
                  {isEn ? 'DRAWN' : 'ツモ'}
                </span>
                <div
                  draggable={availableActions.canDiscard && activeTurn === 0}
                  onDragStart={(e) => handleDragStart(e, myHand.tsumoTile!)}
                  className="relative p-0.5 rounded-[5px] bg-emerald-950/60 border border-emerald-500/40 shadow-inner"
                >
                  <MahjongTile
                    tile={myHand.tsumoTile}
                    size="md"
                    selected={selectedTile === myHand.tsumoTile}
                    onClick={() => handleTileClick(myHand.tsumoTile!)}
                    className={`
                      transition-all duration-150 ease-out
                      ${
                        availableActions.canDiscard && activeTurn === 0
                          ? 'hover:-translate-y-2 hover:brightness-105 active:translate-y-0 cursor-pointer'
                          : ''
                      }
                      ring-1 ring-emerald-400/80 ring-offset-1 ring-offset-emerald-950 rounded-sm
                    `}
                  />
                </div>
              </div>
            )}

            {/* Open Melds (鳴き) Neatly Grouped on Bottom-Right */}
            {melds[0] && melds[0].length > 0 && (
              <div className="ml-4 flex items-end gap-2 border-l border-white/20 pl-3">
                {renderOpenMelds(melds[0], 'sm')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROUND END / GAME OVER EVALUATION MODAL (AgariModal)
          ========================================================================= */}
      {((gameStatus === 'round_end' || gameStatus === 'game_over') && (roundResult || finalResult)) ||
      previewResult ||
      isPreviewGameOver ? (
        <AgariModal
          roundResult={previewResult || roundResult}
          finalResult={finalResult}
          round={round}
          players={players}
          scores={scores}
          isGameOver={isPreviewGameOver || gameStatus === 'game_over'}
          onNextRound={() => {
            if (previewResult) {
              setPreviewResult(null);
            } else if (onlineSession) {
              onlineSession.nextRound();
            } else {
              localNextRound();
            }
          }}
          onRestartGame={() => {
            setPreviewResult(null);
            setIsPreviewGameOver(false);
            if (onlineSession) {
              onlineSession.leave();
              setOnlineSession(null);
            }
            startNewGame();
          }}
          lang={propLang}
        />
      ) : null}

      {/* =========================================================================
          ONLINE MULTIPLAYER LOBBY MODAL
          ========================================================================= */}
      <OnlineLobbyModal
        isOpen={isOnlineLobbyOpen}
        onClose={() => setIsOnlineLobbyOpen(false)}
        onStartMultiplayer={(session) => {
          setOnlineSession(session);
          setIsOnlineLobbyOpen(false);
        }}
        lang={propLang}
      />
    </div>
    </MahjongLanguageContext.Provider>
  );
};

export default MahjongTable;
