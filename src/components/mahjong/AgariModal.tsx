import React, { useState, useEffect } from 'react';
import { MahjongTile } from './MahjongTile';
import { soundManager } from '../../lib/mahjong/sound';
import type {
  FinalGameResult,
  FinalPlayerRanking,
  Meld,
  PlayerInfo,
  RoundInfo,
  RoundResult,
  SeatName,
} from '../../lib/mahjong/types';
import {
  Trophy,
  Sparkles,
  ChevronRight,
  RotateCw,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Flame,
  Crown,
  Layers,
} from 'lucide-react';

const SEAT_NAMES: SeatName[] = ['東', '南', '西', '北'];

// Uma presets (+15, +5, -5, -15)
const UMA_PRESET = [15, 5, -5, -15];
// Oka preset (+20 for 1st place)
const OKA_PRESET = [20, 0, 0, 0];

export interface AgariModalProps {
  roundResult: RoundResult | null;
  finalResult: FinalGameResult | null;
  round: RoundInfo;
  players: PlayerInfo[];
  scores: number[];
  isGameOver?: boolean;
  onNextRound: () => void;
  onRestartGame: () => void;
  lang?: 'ja' | 'en';
}

/**
 * Calculates Level Title (役満, 倍満, 跳満, 満貫 etc.)
 */
export function getScoreTitle(
  han?: number,
  fu?: number,
  damanguan?: number
): { title: string; color: string; badgeBg: string } {
  if (damanguan && damanguan > 1) {
    const title =
      damanguan === 2
        ? 'ダブル役満'
        : damanguan === 3
        ? 'トリプル役満'
        : `${damanguan}倍役満`;
    return {
      title,
      color: 'from-amber-300 via-rose-300 to-amber-200',
      badgeBg: 'bg-gradient-to-r from-purple-900/90 via-rose-900/90 to-amber-900/90 border-amber-400/80 text-amber-200 shadow-amber-500/30',
    };
  }
  if (damanguan === 1) {
    return {
      title: '役満 (YAKUMAN)',
      color: 'from-amber-200 via-yellow-400 to-amber-300',
      badgeBg: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-amber-400 text-amber-300 shadow-amber-500/40',
    };
  }
  if (!han) return { title: '', color: '', badgeBg: '' };

  if (han >= 13) {
    return {
      title: '数え役満',
      color: 'from-amber-200 via-orange-300 to-yellow-200',
      badgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-300 shadow-amber-500/30',
    };
  }
  if (han >= 11) {
    return {
      title: '三倍満',
      color: 'from-rose-400 via-pink-400 to-amber-300',
      badgeBg: 'bg-rose-950/90 border-rose-400/80 text-rose-300 shadow-rose-500/30',
    };
  }
  if (han >= 8) {
    return {
      title: '倍満',
      color: 'from-purple-300 via-pink-300 to-rose-300',
      badgeBg: 'bg-purple-950/90 border-purple-400/80 text-purple-300 shadow-purple-500/30',
    };
  }
  if (han >= 6) {
    return {
      title: '跳満',
      color: 'from-blue-300 via-indigo-300 to-teal-200',
      badgeBg: 'bg-indigo-950/90 border-indigo-400/80 text-indigo-300 shadow-indigo-500/30',
    };
  }
  if (han === 5 || (han === 4 && fu && fu >= 40) || (han === 3 && fu && fu >= 70)) {
    return {
      title: '満貫',
      color: 'from-emerald-300 via-teal-300 to-cyan-200',
      badgeBg: 'bg-emerald-950/90 border-emerald-400/80 text-emerald-300 shadow-emerald-500/30',
    };
  }

  return { title: '', color: '', badgeBg: '' };
}

/**
 * Formats payments breakdown:
 * Non-dealer Tsumo: "ツモ: 2000・4000点"
 * Dealer Tsumo: "ツモ: 4000点オール"
 * Ron: "ロン: 8000点"
 */
function getPaymentBreakdown(roundResult: RoundResult, _round?: RoundInfo): string {
  if (roundResult.type !== 'hule') return '';
  const winnerSeat = roundResult.winnerSeat ?? 0;
  const isDealer = winnerSeat === 0; // Current hand dealer is seat 0
  const delta = roundResult.deltaScores;

  if (roundResult.loserSeat !== undefined) {
    // Ron win: single payer
    const loserSeat = roundResult.loserSeat;
    const paid = Math.abs(delta[loserSeat] || roundResult.points || 0);
    return `ロン: ${paid.toLocaleString()}点`;
  }

  // Tsumo win: multiple payers
  const otherLosses = [0, 1, 2, 3]
    .filter((s) => s !== winnerSeat)
    .map((s) => Math.abs(delta[s] || 0));

  if (isDealer) {
    const each = otherLosses[0] || Math.round((roundResult.points || 0) / 3);
    return `ツモ: ${each.toLocaleString()}点オール`;
  }

  // Non-dealer won: dealer pays more than other two players
  // Dealer is seat 0
  const dealerPaid = Math.abs(delta[0] || 0);
  const otherPaid = otherLosses.find((amt) => amt !== dealerPaid) || otherLosses[0];

  return `ツモ: ${otherPaid.toLocaleString()}・${dealerPaid.toLocaleString()}点`;
}

export const AgariModal: React.FC<AgariModalProps> = ({
  roundResult,
  finalResult,
  round,
  players,
  scores,
  isGameOver = false,
  onNextRound,
  onRestartGame,
  lang: _lang = 'ja',
}) => {
  // Tabs: 'round' (和了/流局画面) or 'standings' (終局総合順位表)
  const [activeTab, setActiveTab] = useState<'round' | 'standings'>(() => {
    return isGameOver && !roundResult ? 'standings' : 'round';
  });

  // Animated scores during transfer
  const initialScores = roundResult?.initialScores || scores;
  const targetScores = scores;
  const [animatedScores, setAnimatedScores] = useState<number[]>(initialScores);
  const [transferProgress, setTransferProgress] = useState<number>(0); // 0 -> 1

  // Point transfer animation
  useEffect(() => {
    if (!roundResult) return;

    // Trigger sound
    soundManager.playPointTransfer();

    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2s smooth count-up

    const startScores = roundResult.initialScores || scores.map((s, idx) => s - (roundResult.deltaScores[idx] || 0));
    const deltas = roundResult.deltaScores;

    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      setTransferProgress(progress);

      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const current = startScores.map((startVal, idx) => {
        const delta = deltas[idx] || 0;
        return Math.round(startVal + delta * ease);
      });
      setAnimatedScores(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setAnimatedScores(targetScores);
      }
    };

    animFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animFrame);
  }, [roundResult, targetScores]);

  // Keyboard shortcut: Press Enter or Space for Next Round
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeTab === 'round' && (isGameOver || roundResult?.isGameOver)) {
          setActiveTab('standings');
        } else if (activeTab === 'standings') {
          onRestartGame();
        } else {
          onNextRound();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isGameOver, roundResult, onNextRound, onRestartGame]);

  if (!roundResult && !finalResult && !isGameOver) {
    return null;
  }

  const isWin = roundResult?.type === 'hule';
  const isRyukyoku = roundResult?.type === 'pingju';
  const hasGameOver = isGameOver || !!roundResult?.isGameOver || !!finalResult;

  // Level Title calculation for winning hand
  const levelTitleInfo = isWin
    ? getScoreTitle(roundResult.han, roundResult.fu, roundResult.damanguan)
    : { title: '', color: '', badgeBg: '' };

  const winnerSeat = roundResult?.winnerSeat ?? 0;
  const winnerPlayer = players[winnerSeat];
  const isDealerWin = winnerSeat === 0;

  // Winning hand breakdown
  const winningHand = roundResult?.winningHand;
  const concealedTiles = winningHand?.concealedTiles || [];
  const winTile = roundResult?.winTile || winningHand?.winTile || '';
  const winMelds = winningHand?.melds || [];
  const doraIndicators = roundResult?.doraIndicators || [];
  const uraDoraIndicators = roundResult?.uraDoraIndicators;
  const isRiichiWon = winningHand?.isRiichi || roundResult?.yaku?.some((y) => y.name.includes('立直'));

  // Calculate Dora and Red Dora counts
  const akaDoraYaku = roundResult?.yaku?.find((y) => y.name.includes('赤ドラ'));
  const regularDoraYaku = roundResult?.yaku?.find((y) => y.name === 'ドラ');
  const uraDoraYaku = roundResult?.yaku?.find((y) => y.name.includes('裏ドラ'));

  // Render open melds in winning hand
  const renderWinningMeld = (meld: Meld, meldIndex: number) => {
    return (
      <div key={meldIndex} className="inline-flex items-end gap-0.5 bg-slate-950/70 p-1 rounded border border-amber-500/20 shadow-inner">
        {meld.tiles.map((t, idx) => {
          const isCalled = t === meld.calledTile && idx === (meld.fromSeat === 1 ? meld.tiles.length - 1 : 0);
          return (
            <MahjongTile
              key={idx}
              tile={t}
              size="sm"
              isSideways={isCalled}
              className="drop-shadow-sm"
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden shadow-black/80 my-auto">
        {/* Glow Accent Top Border */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            isWin
              ? 'from-amber-400 via-rose-500 to-amber-300'
              : hasGameOver
              ? 'from-amber-500 via-yellow-400 to-amber-500'
              : 'from-teal-400 via-cyan-500 to-emerald-400'
          }`}
        />

        {/* Modal Top Navigation Tabs (if both round result & game over are relevant) */}
        {hasGameOver && roundResult && (
          <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 pt-3 gap-2">
            <button
              onClick={() => setActiveTab('round')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'round'
                  ? 'bg-slate-900 text-amber-300 border-t-2 border-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              局の精算 (和了・流局)
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'standings'
                  ? 'bg-slate-900 text-amber-300 border-t-2 border-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              最終総合順位 (終局)
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-5">
          {/* =========================================================================
              VIEW 1: ROUND EVALUATION (和了画面 or 流局画面)
              ========================================================================= */}
          {activeTab === 'round' && roundResult && (
            <>
              {/* Header Title Banner */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-2xl ${
                      isWin
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                        : 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40'
                    }`}
                  >
                    {isWin ? <Flame className="w-6 h-6 animate-pulse" /> : <Layers className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                        {roundResult.name}
                      </h2>
                      {levelTitleInfo.title && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-black border uppercase tracking-wider ${levelTitleInfo.badgeBg}`}
                        >
                          {levelTitleInfo.title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {round.displayName}（{round.honba}本場 / 供託 {round.riichiSticks * 1000}点）
                    </p>
                  </div>
                </div>

                {hasGameOver && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-[11px] font-black text-rose-300 animate-pulse">
                    対局終了
                  </span>
                )}
              </div>

              {/* -------------------------------------------------------------------
                  SUB-VIEW A: 和了画面 (Ron / Tsumo Win)
                  ------------------------------------------------------------------- */}
              {isWin && (
                <div className="space-y-4">
                  {/* Winner Card & Total Score Summary */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 p-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      {/* Winner Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 via-yellow-600 to-slate-900 flex items-center justify-center text-xl shadow-lg ring-2 ring-amber-400/50">
                          {winnerPlayer?.avatar?.emoji || (winnerSeat === 0 ? '👤' : '🤖')}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              {SEAT_NAMES[winnerSeat]}家 {isDealerWin ? '・親' : '・子'}
                            </span>
                            {winnerSeat === 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                あなた
                              </span>
                            )}
                          </div>
                          <div className="text-lg font-black text-white mt-0.5">
                            {roundResult.winnerName}
                          </div>
                          {roundResult.loserName && (
                            <div className="text-xs text-rose-400 font-medium">
                              放銃: {roundResult.loserName} ({SEAT_NAMES[roundResult.loserSeat ?? 0]}家)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score Summary */}
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-mono tracking-tight">
                          {roundResult.points?.toLocaleString()}
                          <span className="text-sm font-bold text-amber-300 ml-1">点</span>
                        </div>
                        <div className="text-xs font-mono text-slate-300 font-bold">
                          {roundResult.han}翻 {roundResult.fu}符
                          {levelTitleInfo.title ? `【${levelTitleInfo.title}】` : ''}
                        </div>
                        <div className="text-[11px] text-amber-300/80 font-medium">
                          {getPaymentBreakdown(roundResult, round)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Winning Hand Tiles Display */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        和了手牌 (Winning Hand)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {roundResult.loserSeat !== undefined ? 'ロン和了' : '自摸和了'}
                      </span>
                    </div>

                    {/* Tiles Row */}
                    <div className="flex flex-wrap items-end gap-1 sm:gap-1.5 overflow-x-auto py-1">
                      {/* Concealed Tiles */}
                      <div className="flex items-end gap-0.5 sm:gap-1">
                        {concealedTiles.map((tile, i) => (
                          <MahjongTile key={i} tile={tile} size="sm" className="drop-shadow" />
                        ))}
                      </div>

                      {/* Winning Tile (Separated with gap and highlighted badge) */}
                      {winTile && (
                        <div className="relative ml-2 pl-2 border-l border-white/20 flex flex-col items-center">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 uppercase mb-0.5 tracking-wider shadow">
                            {roundResult.loserSeat !== undefined ? 'ロン' : 'ツモ'}
                          </span>
                          <MahjongTile
                            tile={winTile}
                            size="sm"
                            className="ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 rounded"
                          />
                        </div>
                      )}

                      {/* Open Melds (鳴き) */}
                      {winMelds && winMelds.length > 0 && (
                        <div className="ml-3 pl-3 border-l border-slate-700 flex items-end gap-2">
                          {winMelds.map(renderWinningMeld)}
                        </div>
                      )}
                    </div>

                    {/* Dora & Ura-Dora Reveal Row */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {/* Omote Dora Row */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">ドラ表示牌:</span>
                        <div className="flex items-center gap-1">
                          {doraIndicators.map((dora, i) => (
                            <MahjongTile key={i} tile={dora} size="sm" className="opacity-95" />
                          ))}
                        </div>
                        {regularDoraYaku && (
                          <span className="text-amber-300 font-mono font-bold text-[11px]">
                            {regularDoraYaku.name} ×{regularDoraYaku.han}
                          </span>
                        )}
                        {akaDoraYaku && (
                          <span className="text-rose-400 font-mono font-bold text-[11px]">
                            {akaDoraYaku.name} ×{akaDoraYaku.han}
                          </span>
                        )}
                      </div>

                      {/* Ura-Dora Row */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">裏ドラ表示牌:</span>
                        {isRiichiWon ? (
                          <div className="flex items-center gap-1">
                            {uraDoraIndicators && uraDoraIndicators.length > 0 ? (
                              uraDoraIndicators.map((ura, i) => (
                                <MahjongTile
                                  key={i}
                                  tile={ura}
                                  size="sm"
                                  className="ring-1 ring-amber-400/80 rounded"
                                />
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 font-mono">なし</span>
                            )}
                            {uraDoraYaku && (
                              <span className="text-amber-400 font-mono font-bold text-[11px] ml-1">
                                {uraDoraYaku.name} ×{uraDoraYaku.han}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            （立直なしのため非公開）
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Yaku Breakdown Grid */}
                  {roundResult.yaku && roundResult.yaku.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">成立役 (Yaku Breakdown)</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {roundResult.yaku.map((y, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs shadow-sm hover:border-slate-700 transition"
                          >
                            <span className="text-slate-200 font-medium truncate">{y.name}</span>
                            <span className="font-mono font-bold text-amber-400 ml-2 shrink-0">
                              {y.han}翻
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------------------
                  SUB-VIEW B: 流局画面 (Ryukyoku / Exhaustive Draw)
                  ------------------------------------------------------------------- */}
              {isRyukyoku && (
                <div className="space-y-4">
                  {/* Ryukyoku Status Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-teal-500/30 text-center space-y-1">
                    <div className="text-lg font-black text-teal-300">
                      {roundResult.name || '荒牌平局 (流局)'}
                    </div>
                    <div className="text-xs text-slate-400">
                      場に3,000点のノーテン罰符が精算されます
                    </div>
                  </div>

                  {/* 4 Players Tenpai vs Noten Hands */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400">各プレイヤーの聴牌状況</span>
                    <div className="space-y-2">
                      {players.map((p, seatIdx) => {
                        const revealed = roundResult.revealedHands?.find((r) => r.seat === seatIdx);
                        const isTenpai = revealed?.isTenpai ?? false;
                        const delta = roundResult.deltaScores[seatIdx] || 0;

                        return (
                          <div
                            key={seatIdx}
                            className={`p-3 rounded-2xl border transition-all ${
                              isTenpai
                                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                                : 'bg-slate-950/80 border-slate-800/80 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {SEAT_NAMES[seatIdx]}
                                </span>
                                <span className="text-sm font-bold text-white">
                                  {p.name}
                                </span>
                                {seatIdx === 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    あなた
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Tenpai / Noten Badge */}
                                {isTenpai ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-xs font-black text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    聴牌 (Tenpai)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400 flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    ノーテン
                                  </span>
                                )}

                                {/* Delta Pill */}
                                <span
                                  className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                                    delta > 0
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                      : delta < 0
                                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                      : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}点
                                </span>
                              </div>
                            </div>

                            {/* Revealed tiles if Tenpai */}
                            {revealed && isTenpai && revealed.tiles && revealed.tiles.length > 0 && (
                              <div className="flex items-center gap-1 overflow-x-auto py-1">
                                {revealed.tiles.map((tile, tIdx) => (
                                  <MahjongTile key={tIdx} tile={tile} size="sm" />
                                ))}
                                {revealed.waits && revealed.waits.length > 0 && (
                                  <div className="ml-2 pl-2 border-l border-white/20 flex items-center gap-1 text-[11px] text-emerald-300 font-mono">
                                    <span className="text-slate-400">待ち:</span>
                                    {revealed.waits.map((wait, wIdx) => (
                                      <MahjongTile key={wIdx} tile={wait} size="sm" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------------
                  SECTION 3: SCORE TRANSFER ANIMATION (点数移動)
                  ------------------------------------------------------------------- */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    点数移動 (Score Transfer)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {transferProgress >= 1 ? '精算完了' : '計算中...'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {players.map((p, seatIdx) => {
                    const delta = roundResult.deltaScores[seatIdx] || 0;
                    const animatedScore = animatedScores[seatIdx] ?? scores[seatIdx];
                    const isPositive = delta > 0;
                    const isNegative = delta < 0;

                    return (
                      <div
                        key={seatIdx}
                        className={`p-3 rounded-2xl border transition-all text-center relative overflow-hidden ${
                          isPositive
                            ? 'bg-gradient-to-b from-emerald-950/40 to-slate-950 border-emerald-500/40 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400/30'
                            : isNegative
                            ? 'bg-gradient-to-b from-rose-950/30 to-slate-950 border-rose-500/30'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {/* Top Seat and Name */}
                        <div className="text-[11px] font-medium text-slate-400 truncate">
                          {SEAT_NAMES[seatIdx]}家 {p.shortName || p.name}
                        </div>

                        {/* Animated Current Score Counter */}
                        <div className="text-base sm:text-lg font-mono font-black text-white mt-0.5 tracking-tight">
                          {animatedScore.toLocaleString()}
                        </div>

                        {/* Delta Badge with animation */}
                        <div
                          className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold mt-1 px-1.5 py-0.2 rounded-full ${
                            isPositive
                              ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 animate-pulse'
                              : isNegative
                              ? 'text-rose-400 bg-rose-950/80 border border-rose-500/40'
                              : 'text-slate-500 bg-slate-900'
                          }`}
                        >
                          {isPositive && <ArrowUpRight className="w-3 h-3" />}
                          {isNegative && <ArrowDownRight className="w-3 h-3" />}
                          {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Next Round or View Final Standings */}
              <div className="pt-2">
                {hasGameOver ? (
                  <button
                    onClick={() => setActiveTab('standings')}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Trophy className="w-5 h-5" />
                    対局終了：最終結果発表を見る
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onNextRound}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    次局へ進む
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[11px] font-mono text-emerald-200/80 ml-1">
                      (Enter)
                    </span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* =========================================================================
              VIEW 2: FINAL GAME OVER SCREEN (終局 / 総合順位)
              ========================================================================= */}
          {activeTab === 'standings' && (
            <div className="space-y-5">
              {/* Grand Final Banner */}
              <div className="text-center space-y-1.5 py-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  対局終了 - 総合結果発表
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                  {round.gameType === 'tonpuu' ? '東風戦 終局' : '半荘戦 終局'}
                </h2>
                <p className="text-xs text-slate-400">
                  全対局が終了しました。ウマ・オカ（順位点）を含む総合収支です。
                </p>
              </div>

              {/* Standings Table with Uma and Oka */}
              <div className="space-y-2">
                {/* Ranking Rows */}
                {(() => {
                  // If finalResult exists, use its rankings, else compute from current scores
                  const rankings: FinalPlayerRanking[] =
                    finalResult?.rankings ||
                    scores
                      .map((sc, seat) => ({
                        seat,
                        score: sc,
                        name:
                          seat === 0
                            ? 'あなた'
                            : players[seat]?.name || `CPU ${SEAT_NAMES[seat]}`,
                        isHuman: seat === 0,
                        avatar: players[seat]?.avatar,
                      }))
                      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.seat - b.seat))
                      .map((p, idx) => {
                        const rank = idx + 1;
                        const rawPoint = (p.score - 30000) / 1000;
                        const uma = UMA_PRESET[idx];
                        const oka = OKA_PRESET[idx];
                        const totalPoint = parseFloat((rawPoint + uma + oka).toFixed(1));
                        return {
                          rank,
                          seat: p.seat,
                          name: p.name,
                          score: p.score,
                          rawPoint: parseFloat(rawPoint.toFixed(1)),
                          uma,
                          oka,
                          totalPoint,
                          isHuman: p.isHuman,
                          avatar: p.avatar,
                        };
                      });

                  return (
                    <div className="space-y-2.5">
                      {rankings.map((r) => {
                        const isFirst = r.rank === 1;
                        const isSecond = r.rank === 2;
                        const isThird = r.rank === 3;
                        const isPositive = r.totalPoint > 0;

                        return (
                          <div
                            key={r.seat}
                            className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isFirst
                                ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-amber-400/70 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40'
                                : isSecond
                                ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                                : isThird
                                ? 'bg-slate-950/90 border-slate-800'
                                : 'bg-slate-950/60 border-slate-800/60 opacity-80'
                            }`}
                          >
                            {/* Left: Rank Badge & Player Info */}
                            <div className="flex items-center gap-3">
                              {/* Rank Medal */}
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow ${
                                  isFirst
                                    ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 ring-2 ring-amber-300'
                                    : isSecond
                                    ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 ring-1 ring-white/50'
                                    : isThird
                                    ? 'bg-gradient-to-br from-amber-700 to-orange-900 text-amber-200'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isFirst ? <Crown className="w-5 h-5" /> : `${r.rank}位`}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm sm:text-base font-black text-white">
                                    {r.name}
                                  </span>
                                  {r.isHuman && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      あなた
                                    </span>
                                  )}
                                  <span className="text-xs font-mono text-slate-400">
                                    ({SEAT_NAMES[r.seat]}家)
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5">
                                  持ち点: <span className="font-bold text-slate-200">{r.score.toLocaleString()}点</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Detailed Breakdown: 素点 + オカ + ウマ = 最終PT */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                              {/* Breakdown Pills */}
                              <div className="text-right text-[11px] font-mono text-slate-400 space-y-0.5">
                                <div>
                                  素点: <span className="text-slate-300">{r.rawPoint > 0 ? `+${r.rawPoint}` : r.rawPoint}pt</span>
                                </div>
                                <div>
                                  オカ: <span className="text-amber-300">+{r.oka}pt</span> / ウマ:{' '}
                                  <span className={r.uma > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                                    {r.uma > 0 ? `+${r.uma}` : r.uma}pt
                                  </span>
                                </div>
                              </div>

                              {/* Total Points Big Display */}
                              <div className="text-right pl-3 sm:border-l border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  トータル収支
                                </span>
                                <div
                                  className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                                    isPositive
                                      ? 'text-emerald-400'
                                      : r.totalPoint < 0
                                      ? 'text-rose-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {isPositive ? `+${r.totalPoint.toFixed(1)}` : r.totalPoint.toFixed(1)}
                                  <span className="text-xs ml-0.5">pt</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Rules Explanation Note */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-amber-400 font-bold">順位点計算ルール:</span> 25,000点持ち / 30,000点返し。
                1位にオカ(+20pt)加算。ウマ順位点 (+15, +5, -5, -15)。
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {roundResult && (
                  <button
                    onClick={() => setActiveTab('round')}
                    className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4" />
                    和了・流局の牌譜を見る
                  </button>
                )}
                <button
                  onClick={onRestartGame}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <RotateCw className="w-4 h-4" />
                  もう一度遊ぶ (Play Again)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgariModal;
