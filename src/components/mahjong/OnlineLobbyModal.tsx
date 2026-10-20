import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Swords,
  KeyRound,
  Clock,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  AlertCircle,
  X,
  Play,
  RotateCw,
  Share2,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { soundManager } from '../../lib/mahjong/sound';
import {
  createHostMultiplayerSession,
  createGuestMultiplayerSession,
  type PeerMultiplayerSession,
} from '../../lib/mahjong/peerMultiplayer';
import type {
  MatchmakeResponse,
  MultiplayerPlayer,
  MultiplayerRole,
  SeatName,
} from '../../lib/mahjong/types';

interface OnlineLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMultiplayer: (session: PeerMultiplayerSession) => void;
  lang?: 'ja' | 'en';
}

const SEAT_ORDER: SeatName[] = ['東', '南', '西', '北'];

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartMultiplayer,
  lang: _lang = 'ja',
}) => {
  const [tab, setTab] = useState<'quick' | 'private'>('quick');
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mahjong_username') || 'プレイヤー';
    }
    return 'プレイヤー';
  });
  const [gameMode, setGameMode] = useState<'tonpuu' | 'hanchan'>('tonpuu');
  const [privateRoomCode, setPrivateRoomCode] = useState<string>('');

  // Matchmaking status states
  const [matchingState, setMatchingState] = useState<
    'idle' | 'queuing' | 'matched' | 'connecting' | 'error'
  >('idle');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [queuedSeconds, setQueuedSeconds] = useState<number>(0);
  const [playerCount, setPlayerCount] = useState<number>(1);
  const [matchData, setMatchData] = useState<MatchmakeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Poll timer and countdown ref
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerIdRef = useRef<string>(`peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  // Detect ?room= query param from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setPrivateRoomCode(roomParam.trim().toUpperCase());
        setTab('private');
      }
    }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPlayerName(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mahjong_username', val);
    }
  };

  // 1. START MATCHMAKING (QUICK OR PRIVATE)
  const handleStartMatchmaking = async (customRoomCode?: string) => {
    soundManager.playTileClick();
    setErrorMessage(null);
    setMatchingState('queuing');
    setQueuedSeconds(0);
    setPlayerCount(1);

    const effectiveRoomCode = customRoomCode !== undefined ? customRoomCode : (tab === 'private' ? privateRoomCode.trim().toUpperCase() : undefined);

    try {
      const res = await fetch('/api/mahjong-matchmake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          playerId: peerIdRef.current,
          playerName: playerName.trim() || 'プレイヤー',
          gameMode,
          roomCode: effectiveRoomCode,
          peerId: peerIdRef.current,
        }),
      });

      const data: MatchmakeResponse = await res.json();

      if (data.status === 'error') {
        setMatchingState('error');
        setErrorMessage(data.message || 'マッチングエラーが発生しました');
        return;
      }

      if (data.status === 'matched') {
        handleMatchSuccess(data);
        return;
      }

      if (data.status === 'queued' && data.ticketId) {
        setTicketId(data.ticketId);
        setPlayerCount(data.playerCount || 1);
        startPolling(data.ticketId);
      }
    } catch (err: any) {
      setMatchingState('error');
      setErrorMessage(err?.message || '通信エラーが発生しました');
    }
  };

  // 2. START POLLING QUEUE STATUS
  const startPolling = (currentTicketId: string) => {
    stopPolling();

    // 1-second interval for local countdown display
    countdownTimerRef.current = setInterval(() => {
      setQueuedSeconds((prev) => prev + 1);
    }, 1000);

    // 1.5-second polling interval
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/mahjong-matchmake?action=poll&ticketId=${encodeURIComponent(currentTicketId)}`
        );
        const data: MatchmakeResponse = await res.json();

        if (data.status === 'matched') {
          stopPolling();
          handleMatchSuccess(data);
        } else if (data.status === 'queued') {
          if (data.playerCount) {
            setPlayerCount(data.playerCount);
          }
          if (typeof data.queuedSeconds === 'number') {
            setQueuedSeconds(data.queuedSeconds);
          }
        } else if (data.status === 'canceled') {
          stopPolling();
          setMatchingState('idle');
        }
      } catch (err) {
        console.warn('Matchmaking poll warning:', err);
      }
    }, 1500);
  };

  // 3. CANCEL MATCHMAKING
  const handleCancelMatchmaking = async () => {
    soundManager.playTileClick();
    stopPolling();
    if (ticketId) {
      try {
        await fetch('/api/mahjong-matchmake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            ticketId,
          }),
        });
      } catch {}
    }
    setMatchingState('idle');
    setTicketId(null);
  };

  // 4. FORCE START WITH BOTS (FOR PRIVATE ROOM HOST)
  const handleForceStartBots = async () => {
    if (!ticketId) return;
    soundManager.playTileClick();
    try {
      const res = await fetch('/api/mahjong-matchmake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_bots',
          ticketId,
        }),
      });
      const data: MatchmakeResponse = await res.json();
      if (data.status === 'matched') {
        stopPolling();
        handleMatchSuccess(data);
      }
    } catch {}
  };

  // 5. MATCH FOUND & P2P WEBRTC CONNECTION SETUP
  const handleMatchSuccess = async (data: MatchmakeResponse) => {
    soundManager.playRiichi();
    setMatchData(data);
    setMatchingState('matched');

    // Show matched fanfare screen briefly, then connect WebRTC
    setTimeout(async () => {
      setMatchingState('connecting');
      try {
        let session: PeerMultiplayerSession;
        if (data.role === 'host') {
          session = await createHostMultiplayerSession({
            roomCode: data.roomCode || 'ROOM',
            players: data.players || [],
            gameMode: data.gameMode || 'tonpuu',
            hostPeerId: data.hostPeerId || peerIdRef.current,
          });
        } else {
          session = await createGuestMultiplayerSession({
            roomCode: data.roomCode || 'ROOM',
            seatIndex: data.seatIndex ?? 1,
            hostPeerId: data.hostPeerId || '',
            ticketId: data.ticketId || '',
            players: data.players || [],
            gameMode: data.gameMode || 'tonpuu',
          });
        }

        // Ready! Launch table and pass session
        onStartMultiplayer(session);
        onClose();
      } catch (err: any) {
        console.error('Peer connection setup error:', err);
        setMatchingState('error');
        setErrorMessage('WebRTC P2P接続の初期化に失敗しました。再試行してください。');
      }
    }, 2200);
  };

  const copyRoomCode = () => {
    if (tab === 'private' && privateRoomCode) {
      navigator.clipboard.writeText(privateRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (typeof window !== 'undefined' && privateRoomCode) {
      const url = `${window.location.origin}/?room=${encodeURIComponent(privateRoomCode)}`;
      navigator.clipboard.writeText(url);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl shadow-emerald-950/30 overflow-hidden font-sans text-slate-100 flex flex-col">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white tracking-wide">
                  オンライン対戦（4人麻雀）
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                  P2P WebRTC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                登録不要・電脳麻将エンジンによるリアルタイム4人ネット対局
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleCancelMatchmaking();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* =================================================================
              VIEW 1: QUEUING / MATCHING RADAR VIEW
              ================================================================= */}
          {matchingState === 'queuing' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
              {/* Animated Radar Pulse Visual */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-teal-500/40 animate-pulse" />
                <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-emerald-900/60 to-teal-900/40 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                  <Radio className="w-8 h-8 text-emerald-300 animate-spin" />
                </div>
              </div>

              {/* Status Text & Player Count */}
              <div className="space-y-2">
                <div className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  マッチング中
                </div>

                <div className="text-2xl font-black text-white">
                  対戦相手を探しています...{' '}
                  <span className="text-emerald-300 font-mono">{playerCount}/4人</span>
                </div>

                {/* 15-second countdown & progress */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  待機時間: <strong className="text-white">{queuedSeconds}秒</strong> / 15秒
                </div>
              </div>

              {/* Auto-Bot Notice Banner */}
              <div className="max-w-md p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left text-xs text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">自動AIボット参戦機能:</span>{' '}
                  15秒経過しても4人に満たない場合は、不足席に電脳麻将AI（初級・中級・上級）が自動参戦し、待たずにすぐ対局が始まります。
                </div>
              </div>

              {/* Private Room Host Options */}
              {tab === 'private' && (
                <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                  <button
                    onClick={handleForceStartBots}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Bot className="w-4 h-4" />
                    今すぐ残りをAIで埋めて対局開始
                  </button>
                  <span className="text-[11px] text-slate-400">
                    友達が揃うのを待たずに即座に開始できます
                  </span>
                </div>
              )}

              {/* Cancel Button */}
              <button
                onClick={handleCancelMatchmaking}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                マッチングをキャンセル
              </button>
            </div>
          ) : matchingState === 'matched' || matchingState === 'connecting' ? (
            /* =================================================================
               VIEW 2: MATCH FOUND & 4-SEAT ASSIGNMENT PRESENTATION
               ================================================================= */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white tracking-wide">
                  対局が成立しました！
                </h4>
                <p className="text-xs text-emerald-300">
                  {matchingState === 'connecting'
                    ? '卓権限とWebRTC P2P接続を確立中...'
                    : '座席（東・南・西・北）を割り当てました'}
                </p>
              </div>

              {/* 4 Assigned Seats Presentation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
                {(matchData?.players || []).map((p, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      p.role === 'host'
                        ? 'bg-emerald-950/50 border-emerald-500/50 ring-1 ring-emerald-400/40'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-300">
                      {SEAT_ORDER[idx]}
                    </div>
                    <span className="font-bold text-xs text-white truncate max-w-[100px]">
                      {p.playerName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        p.isHuman
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {p.isHuman ? (p.role === 'host' ? 'ホスト (卓主)' : '人間') : 'AIボット'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                対局卓へ移動中...
              </div>
            </div>
          ) : (
            /* =================================================================
               VIEW 3: LOBBY CONFIGURATION (QUICK / PRIVATE TABS)
               ================================================================= */
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setTab('quick')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tab === 'quick'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  クイック対戦
                </button>
                <button
                  onClick={() => setTab('private')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tab === 'private'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  合言葉で友達と対局
                </button>
              </div>

              {/* Player Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  プレイヤー名
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={playerName}
                  onChange={handleNameChange}
                  placeholder="プレイヤー"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm font-medium transition-colors"
                />
              </div>

              {/* Game Mode Selector (東風戦 vs 半荘戦) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  対局方式（ゲームモード）
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGameMode('tonpuu')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gameMode === 'tonpuu'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white">東風戦（トンプウ）</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">約10分・手軽に対戦</div>
                  </button>

                  <button
                    onClick={() => setGameMode('hanchan')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gameMode === 'hanchan'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white">半荘戦（ハンチャン）</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">約20分・本格日本ルール</div>
                  </button>
                </div>
              </div>

              {/* Tab 2: Private Room Code Input */}
              {tab === 'private' && (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      合言葉（部屋コード）
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPrivateRoomCode(Math.random().toString(36).substring(2, 6).toUpperCase())
                      }
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      ランダム生成
                    </button>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={10}
                      value={privateRoomCode}
                      onChange={(e) => setPrivateRoomCode(e.target.value.toUpperCase())}
                      placeholder="例: 7777, TOKYO"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm font-mono tracking-wider uppercase font-bold"
                    />
                    {privateRoomCode && (
                      <button
                        onClick={copyInviteLink}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="友達招待リンクをコピー"
                      >
                        {copiedCode ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">招待リンク</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    同じ合言葉を入力した友達同士で同じ卓にマッチングされます。4人揃うか、残りをAIで埋めて対局できます。
                  </p>
                </div>
              )}

              {/* Error Message Display */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={() => handleStartMatchmaking()}
                disabled={tab === 'private' && !privateRoomCode.trim()}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${
                  tab === 'private' && !privateRoomCode.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 cursor-pointer active:scale-98'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {tab === 'quick' ? 'クイック対戦を開始する' : '合言葉で部屋に入る / 作成する'}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            配牌・自摸牌暗号化 / 覗き見防止仕様
          </span>
          <span>卓権限: スター型ホスト統括</span>
        </div>
      </div>
    </div>
  );
};
