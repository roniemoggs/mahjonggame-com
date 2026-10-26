import React, { useState, useEffect } from 'react';
import type { AvailableActions, ChiOption, GangOption } from '../../lib/mahjong/types';
import { MahjongTile } from './MahjongTile';
import { useMahjongLanguage, type MahjongLang } from '../../lib/mahjong/i18n';
import { Flame, Sparkles, Zap, X, ChevronUp, Clock } from 'lucide-react';

export interface MahjongActionBarProps {
  availableActions: AvailableActions;
  isTenpai?: boolean;
  isRiichiMode: boolean;
  onRiichiToggle: () => void;
  onTsumo: () => void;
  onRon: () => void;
  onChi: (meld: string) => void;
  onPon: (meld: string) => void;
  onKan: (meld: string) => void;
  onPass: () => void;
  onKyuushuu?: () => void;
  className?: string;
  lang?: MahjongLang;
  isPaused?: boolean;
}

export const MahjongActionBar: React.FC<MahjongActionBarProps> = ({
  availableActions,
  isTenpai = false,
  isRiichiMode,
  onRiichiToggle,
  onTsumo,
  onRon,
  onChi,
  onPon,
  onKan,
  onPass,
  onKyuushuu,
  className = '',
  lang: propLang,
  isPaused = false,
}) => {
  const context = useMahjongLanguage();
  const effectiveLang: MahjongLang = propLang || context?.lang || 'ja';
  const isEn = effectiveLang === 'en';

  const [showChiSelector, setShowChiSelector] = useState(false);
  const [showKanSelector, setShowKanSelector] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);

  // Check if any action is legal right now
  const canRiichi = availableActions.riichi.allowed && isTenpai;
  const canTsumo = availableActions.tsumo;
  const canRon = availableActions.ron;
  const canPon = availableActions.peng.length > 0;
  const canChi = availableActions.chi.length > 0;
  const canKan = availableActions.gang.length > 0;
  const canPass = availableActions.pass;
  const canKyuushuu = availableActions.kyuushuu;

  // Reset timer to 15 seconds when a call prompt appears
  useEffect(() => {
    if (canPass) {
      setSecondsLeft(15);
    }
  }, [canPass]);

  // Visual countdown for opponent discard call decisions (auto-passes at 0)
  useEffect(() => {
    if (!canPass || isPaused) {
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPass();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [canPass, isPaused, onPass]);

  const hasAnyAction =
    canTsumo ||
    canRon ||
    canRiichi ||
    canPon ||
    canChi ||
    canKan ||
    canPass ||
    canKyuushuu;

  if (!hasAnyAction) {
    return null;
  }

  const handleChiClick = () => {
    if (availableActions.chi.length === 1) {
      onChi(availableActions.chi[0].meld);
      setShowChiSelector(false);
    } else {
      setShowChiSelector((prev) => !prev);
      setShowKanSelector(false);
    }
  };

  const handleKanClick = () => {
    if (availableActions.gang.length === 1) {
      onKan(availableActions.gang[0].meld);
      setShowKanSelector(false);
    } else {
      setShowKanSelector((prev) => !prev);
      setShowChiSelector(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 z-30 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${className}`}
    >
      {/* Multiple Chi Options Dropdown / Modal */}
      {showChiSelector && availableActions.chi.length > 1 && (
        <div className="absolute bottom-full mb-3 p-3 bg-slate-900/95 border-2 border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 z-40">
          <div className="flex items-center justify-between w-full gap-4 text-xs font-bold text-cyan-300">
            <span>{isEn ? 'Select Chow (Chi) Sequence' : 'チーする面子を選択'}</span>
            <button
              onClick={() => setShowChiSelector(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availableActions.chi.map((option: ChiOption, index: number) => (
              <button
                key={index}
                onClick={() => {
                  onChi(option.meld);
                  setShowChiSelector(false);
                }}
                className="flex items-center gap-1 p-2 rounded-xl bg-slate-950/80 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-400 transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
              >
                {option.tiles.map((t, tIdx) => (
                  <MahjongTile key={tIdx} tile={t} size="sm" lang={effectiveLang} />
                ))}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multiple Kan Options Dropdown / Modal */}
      {showKanSelector && availableActions.gang.length > 1 && (
        <div className="absolute bottom-full mb-3 p-3 bg-slate-900/95 border-2 border-teal-500/50 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 z-40">
          <div className="flex items-center justify-between w-full gap-4 text-xs font-bold text-teal-300">
            <span>{isEn ? 'Select Kong (Kan) Combination' : 'カンする面子を選択'}</span>
            <button
              onClick={() => setShowKanSelector(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availableActions.gang.map((option: GangOption, index: number) => (
              <button
                key={index}
                onClick={() => {
                  onKan(option.meld);
                  setShowKanSelector(false);
                }}
                className="flex items-center gap-1 p-2 rounded-xl bg-slate-950/80 hover:bg-teal-950/80 border border-slate-700 hover:border-teal-400 transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
              >
                {option.tiles.map((t, tIdx) => (
                  <MahjongTile key={tIdx} tile={t} size="sm" lang={effectiveLang} />
                ))}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action Buttons Bar */}
      <div
        className={`flex flex-col items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-200 ${
          canPass
            ? 'bg-slate-950/95 border-amber-500/60 ring-2 ring-amber-500/30 shadow-amber-950/50'
            : 'bg-slate-950/85 border-slate-800/80'
        }`}
      >
        {/* Prominent Decision Banner when waiting on call/pass */}
        {canPass && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isEn ? 'Call Decision (or Pass):' : '鳴き（チー・ポン・カン）またはパスを選択:'}
            </span>
            <span className="font-mono bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 text-[10px]">
              {secondsLeft}s
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* [ ロン ] - Red */}
          {canRon && (
            <button
              onClick={onRon}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-lg shadow-red-950/60 ring-2 ring-red-400 ring-offset-2 ring-offset-slate-950 animate-bounce active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Flame className="w-4 h-4 fill-current animate-pulse text-yellow-300" />
              {isEn ? 'Ron (Win)' : 'ロン'}
            </button>
          )}

          {/* [ ツモ ] - Red */}
          {canTsumo && (
            <button
              onClick={onTsumo}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-lg shadow-red-950/60 ring-2 ring-red-400 ring-offset-2 ring-offset-slate-950 animate-bounce active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 fill-current animate-pulse text-yellow-300" />
              {isEn ? 'Tsumo (Win)' : 'ツモ'}
            </button>
          )}

          {/* [ リーチ ] - Gold (Only when Tenpai) */}
          {canRiichi && (
            <button
              onClick={onRiichiToggle}
              className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                isRiichiMode
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200 ring-offset-2 ring-offset-slate-950 shadow-amber-500/50 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-950/60'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              {isRiichiMode
                ? (isEn ? 'Riichi: Select Discard Tile' : 'リーチ宣言中（牌を選択）')
                : (isEn ? 'Riichi (Ready)' : 'リーチ')}
            </button>
          )}

          {/* [ チー ] - Blue/Teal */}
          {canChi && (
            <button
              onClick={handleChiClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm border border-cyan-400/40 shadow-md shadow-cyan-950/50 hover:shadow-cyan-500/30 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {isEn ? 'Chi (Chow)' : 'チー'}
              {availableActions.chi.length > 1 && (
                <span className="flex items-center text-[10px] bg-cyan-900/80 px-1.5 py-0.5 rounded-full border border-cyan-400/50">
                  {availableActions.chi.length}{isEn ? ' opts' : '択'}
                  <ChevronUp className="w-2.5 h-2.5 ml-0.5" />
                </span>
              )}
            </button>
          )}

          {/* [ ポン ] - Blue/Teal */}
          {canPon && (
            <button
              onClick={() => onPon(availableActions.peng[0].meld)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm border border-cyan-400/40 shadow-md shadow-cyan-950/50 hover:shadow-cyan-500/30 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {isEn ? 'Pon (Pung)' : 'ポン'}
            </button>
          )}

          {/* [ カン ] - Blue/Teal */}
          {canKan && (
            <button
              onClick={handleKanClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs sm:text-sm border border-cyan-400/40 shadow-md shadow-cyan-950/50 hover:shadow-cyan-500/30 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {isEn ? 'Kan (Kong)' : 'カン'}
              {availableActions.gang.length > 1 && (
                <span className="flex items-center text-[10px] bg-cyan-900/80 px-1.5 py-0.5 rounded-full border border-cyan-400/50">
                  {availableActions.gang.length}{isEn ? ' opts' : '択'}
                  <ChevronUp className="w-2.5 h-2.5 ml-0.5" />
                </span>
              )}
            </button>
          )}

          {/* [ 九種九牌 ] */}
          {canKyuushuu && onKyuushuu && (
            <button
              onClick={onKyuushuu}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-500 text-slate-200 font-bold text-xs sm:text-sm shadow active:scale-95 cursor-pointer"
            >
              {isEn ? '9 Terminals (Abort)' : '九種九牌'}
            </button>
          )}

          {/* [ パス / スルー ] - Gray with countdown */}
          {canPass && (
            <button
              onClick={onPass}
              className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium text-xs sm:text-sm shadow active:scale-95 cursor-pointer flex items-center gap-1.5 ring-1 ring-slate-500/40"
            >
              <span>{isEn ? 'Pass' : 'パス / スルー'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-600 text-amber-300 font-bold">
                {secondsLeft}s
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MahjongActionBar;
