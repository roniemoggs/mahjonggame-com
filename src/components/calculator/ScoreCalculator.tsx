import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MahjongTile } from '../mahjong/MahjongTile';
import {
  calculateHandScore,
  getDoraFromIndicator,
  PRESET_HANDS,
  PRACTICE_QUESTIONS,
  type SeatWind,
  type RoundWind,
  type ScoreCalculationResult,
  type HandPreset,
  type PracticeQuestion,
} from '../../lib/mahjong/calculatorEngine';
import {
  Sparkles,
  RotateCcw,
  Layers,
  ArrowRight,
  Flame,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Plus,
  Trash2,
  Share2,
  Copy,
  Info,
  Check,
  Trophy,
} from 'lucide-react';

const TILE_ORDER: string[] = [
  // Manzu
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '0m',
  // Pinzu
  '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '0p',
  // Souzu
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '0s',
  // Jihai (Honors)
  '1z', '2z', '3z', '4z', '5z', '6z', '7z',
];

const TILE_GROUPS = [
  {
    name: '萬子 (マンズ)',
    tiles: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '0m'],
  },
  {
    name: '筒子 (ピンズ)',
    tiles: ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '0p'],
  },
  {
    name: '索子 (ソーズ)',
    tiles: ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '0s'],
  },
  {
    name: '字牌 (ジハイ)',
    tiles: ['1z', '2z', '3z', '4z', '5z', '6z', '7z'],
  },
];

const TILE_LABELS: Record<string, string> = {
  '1m': '一萬', '2m': '二萬', '3m': '三萬', '4m': '四萬', '5m': '五萬',
  '6m': '六萬', '7m': '七萬', '8m': '八萬', '9m': '九萬', '0m': '赤五萬',
  '1p': '一筒', '2p': '二筒', '3p': '三筒', '4p': '四筒', '5p': '五筒',
  '6p': '六筒', '7p': '七筒', '8p': '八筒', '9p': '九筒', '0p': '赤五筒',
  '1s': '一索', '2s': '二索', '3s': '三索', '4s': '四索', '5s': '五索',
  '6s': '六索', '7s': '七索', '8s': '八索', '9s': '九索', '0s': '赤五索',
  '1z': '東', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '發', '7z': '中',
};

export const ScoreCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'practice'>('calculator');

  // Calculator State
  const [handTiles, setHandTiles] = useState<string[]>([
    '2m', '3m', '4m', '5p', '6p', '7p', '3s', '4s', '5s', '6s', '7s', '9m', '9m', '8s',
  ]);
  const [winTile, setWinTile] = useState<string>('8s');
  const [winType, setWinType] = useState<'tsumo' | 'ron'>('tsumo');
  const [seatWind, setSeatWind] = useState<SeatWind>(1); // 1: 南 (子)
  const [roundWind, setRoundWind] = useState<RoundWind>(0); // 0: 東 (東場)
  const [riichi, setRiichi] = useState<0 | 1 | 2>(0);
  const [ippatsu, setIppatsu] = useState<boolean>(false);
  const [haidi, setHaidi] = useState<0 | 1 | 2>(0);
  const [rinshan, setRinshan] = useState<boolean>(false);
  const [chankan, setChankan] = useState<boolean>(false);
  const [tianhu, setTianhu] = useState<0 | 1 | 2>(0);
  const [doraIndicators, setDoraIndicators] = useState<string[]>(['1p']);
  const [uraDoraIndicators, setUraDoraIndicators] = useState<string[]>([]);
  const [honba, setHonba] = useState<number>(0);
  const [riichiSticks, setRiichiSticks] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Practice Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [userHanAnswer, setUserHanAnswer] = useState<number | null>(null);
  const [userFuAnswer, setUserFuAnswer] = useState<number | null>(null);
  const [userScoreAnswer, setUserScoreAnswer] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  // Load URL params if passed from Yaku Encyclopedia (e.g. /calculator?hand=...&winTile=...&isTsumo=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const handParam = params.get('hand');
    const winTileParam = params.get('winTile');
    const isTsumoParam = params.get('isTsumo');

    if (handParam) {
      // Parse tile codes
      const matches = handParam.match(/[0-9][mpsz]/g);
      if (matches && matches.length >= 1) {
        setHandTiles(matches);
        if (winTileParam) {
          setWinTile(winTileParam);
        } else {
          setWinTile(matches[matches.length - 1]);
        }
      }
    }
    if (isTsumoParam !== null) {
      setWinType(isTsumoParam === 'true' ? 'tsumo' : 'ron');
    }
  }, []);

  // Remaining tile counts (max 4 per tile, max 1 for 0m/0p/0s)
  const tileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of handTiles) {
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [handTiles]);

  // Add tile to hand
  const handleAddTile = (tile: string) => {
    if (handTiles.length >= 14) return;
    const current = tileCounts[tile] || 0;
    const max = tile.startsWith('0') ? 1 : 4;
    if (current >= max) return;

    const newHand = [...handTiles, tile];
    setHandTiles(newHand);
    // If it's the 14th tile, automatically make it the winTile
    if (newHand.length === 14) {
      setWinTile(tile);
    }
  };

  // Remove tile from hand
  const handleRemoveTile = (index: number) => {
    const newHand = handTiles.filter((_, i) => i !== index);
    setHandTiles(newHand);
    // If winTile was removed and not in hand anymore, adjust
    if (newHand.length > 0 && !newHand.includes(winTile)) {
      setWinTile(newHand[newHand.length - 1]);
    }
  };

  // Sort hand (理牌 - Riipai)
  const handleSortHand = () => {
    const sorted = [...handTiles].sort((a, b) => {
      const idxA = TILE_ORDER.indexOf(a);
      const idxB = TILE_ORDER.indexOf(b);
      return idxA - idxB;
    });
    setHandTiles(sorted);
  };

  // Clear hand
  const handleClearHand = () => {
    setHandTiles([]);
    setWinTile('');
  };

  // Load Preset
  const handleLoadPreset = (preset: HandPreset) => {
    setHandTiles([...preset.tiles]);
    setWinTile(preset.winTile);
    setWinType(preset.winType);
    setSeatWind(preset.seatWind);
    setRoundWind(preset.roundWind);
    setRiichi(preset.riichi);
    setIppatsu(false);
    setHaidi(0);
    setRinshan(false);
    setChankan(false);
    setTianhu(0);
    setDoraIndicators([...preset.doraIndicators]);
    setUraDoraIndicators([]);
    setHonba(0);
    setRiichiSticks(0);
  };

  // Run calculation
  const calcResult: ScoreCalculationResult = useMemo(() => {
    return calculateHandScore({
      handTiles,
      winTile,
      winType,
      seatWind,
      roundWind,
      riichi,
      ippatsu,
      haidi,
      rinshan,
      chankan,
      tianhu,
      doraIndicators,
      uraDoraIndicators,
      honba,
      riichiSticks,
    });
  }, [
    handTiles,
    winTile,
    winType,
    seatWind,
    roundWind,
    riichi,
    ippatsu,
    haidi,
    rinshan,
    chankan,
    tianhu,
    doraIndicators,
    uraDoraIndicators,
    honba,
    riichiSticks,
  ]);

  // Copy share URL
  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/calculator?hand=${encodeURIComponent(
      handTiles.join('')
    )}&winTile=${encodeURIComponent(winTile)}&isTsumo=${winType === 'tsumo' ? 'true' : 'false'}`;
    navigator.clipboard.writeText(url);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Practice Quiz Handlers
  const currentQuiz: PracticeQuestion = PRACTICE_QUESTIONS[currentQuizIndex];

  const handleQuizSubmit = () => {
    if (userHanAnswer === null || userFuAnswer === null || userScoreAnswer === null) return;
    setIsQuizSubmitted(true);
    const isAllCorrect =
      userHanAnswer === currentQuiz.correctHan &&
      userFuAnswer === currentQuiz.correctFu &&
      userScoreAnswer === currentQuiz.correctScore;

    setQuizScore((prev) => ({
      correct: isAllCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
  };

  const handleNextQuiz = () => {
    setIsQuizSubmitted(false);
    setUserHanAnswer(null);
    setUserFuAnswer(null);
    setUserScoreAnswer(null);
    setCurrentQuizIndex((prev) => (prev + 1) % PRACTICE_QUESTIONS.length);
  };

  return (
    <div className="space-y-8">
      {/* Top Mode Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`
              px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2
              ${
                activeTab === 'calculator'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }
            `}
          >
            <span>点数計算シミュレーター</span>
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`
              px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2
              ${
                activeTab === 'practice'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }
            `}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>点数計算練習ドリル (クイズ)</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30">
              New
            </span>
          </button>
        </div>

        {activeTab === 'calculator' && (
          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors shadow-sm"
            title="現在の手牌と条件をURLとしてコピー"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">URLコピー完了!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>手牌URLを共有</span>
              </>
            )}
          </button>
        )}
      </div>

      {activeTab === 'calculator' ? (
        /* ============================================================== */
        /* TAB 1: INTERACTIVE CALCULATOR                                  */
        /* ============================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Hand Display & Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hand Area Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                    選択中の手牌 ({handTiles.length} / 14枚)
                  </h3>
                  <span className="text-xs text-slate-400">
                    （牌をクリックで和了牌に指定）
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSortHand}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors border border-slate-700"
                    title="手牌を萬子・筒子・索子・字牌の順に並べ替えます"
                  >
                    理牌 (並び替え)
                  </button>
                  <button
                    onClick={handleClearHand}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold transition-colors border border-rose-800/40"
                    title="手牌を全消去します"
                  >
                    全消去
                  </button>
                </div>
              </div>

              {/* Hand Tiles Row */}
              <div className="min-h-[92px] bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex items-center overflow-x-auto shadow-inner">
                {handTiles.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center w-full py-4">
                    下の牌パレットから牌をクリックして手牌（14枚）を作成してください
                  </div>
                ) : (
                  <div className="inline-flex items-end gap-1 sm:gap-1.5 min-w-max">
                    {handTiles.map((tileCode, index) => {
                      const isWinning = tileCode === winTile;
                      return (
                        <div
                          key={`hand-tile-${index}-${tileCode}`}
                          className="relative group flex flex-col items-center"
                        >
                          {/* Winning Tile Badge */}
                          {isWinning ? (
                            <span className="text-[9px] font-black text-amber-300 bg-amber-950/90 border border-amber-500/60 px-1 py-0.2 rounded -mb-1 z-10 shadow-sm animate-bounce">
                              和了
                            </span>
                          ) : (
                            <span className="text-[9px] opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity -mb-1 z-10">
                              指定
                            </span>
                          )}

                          <div
                            className={`transition-all duration-150 cursor-pointer ${
                              isWinning
                                ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 rounded-[4px] shadow-lg shadow-amber-500/20 -translate-y-1'
                                : 'hover:-translate-y-1'
                            }`}
                            onClick={() => setWinTile(tileCode)}
                            title={`${TILE_LABELS[tileCode] || tileCode} を和了牌に指定`}
                          >
                            <MahjongTile tile={tileCode} size="sm" />
                          </div>

                          {/* Quick delete button on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTile(index);
                            }}
                            className="w-4 h-4 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-[10px]"
                            title="この牌を削除"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hand Presets Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  手牌プリセット（ワンクリックで読み込み）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_HANDS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tile Palette (Picker) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  牌パレット（クリックで手牌に追加）
                </h3>
                <span className="text-xs text-slate-400">
                  牌右上の数字: 手牌に含まれる枚数（最大4枚）
                </span>
              </div>

              <div className="space-y-3.5">
                {TILE_GROUPS.map((group) => (
                  <div key={group.name} className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400">
                      {group.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                      {group.tiles.map((tileCode) => {
                        const count = tileCounts[tileCode] || 0;
                        const isMax = tileCode.startsWith('0') ? count >= 1 : count >= 4;
                        const isFull = handTiles.length >= 14;

                        return (
                          <div
                            key={`palette-${tileCode}`}
                            className="relative flex flex-col items-center"
                          >
                            <button
                              disabled={isMax || isFull}
                              onClick={() => handleAddTile(tileCode)}
                              className={`
                                transition-all rounded-[4px]
                                ${
                                  isMax || isFull
                                    ? 'opacity-35 grayscale cursor-not-allowed'
                                    : 'hover:-translate-y-1 hover:brightness-110 active:translate-y-0 cursor-pointer'
                                }
                              `}
                              title={`${TILE_LABELS[tileCode] || tileCode} を手牌に追加`}
                            >
                              <MahjongTile tile={tileCode} size="sm" />
                            </button>
                            {count > 0 && (
                              <span
                                className={`
                                  text-[9px] font-black px-1 rounded-full absolute -top-1 -right-1 z-10 shadow-sm
                                  ${isMax ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}
                                `}
                              >
                                {count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Conditions & Modifiers */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                局状況・和了条件設定
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Win Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    和了方式
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setWinType('tsumo')}
                      className={`
                        py-2 rounded-xl text-xs font-bold transition-all
                        ${
                          winType === 'tsumo'
                            ? 'bg-emerald-600 text-white ring-1 ring-emerald-400 shadow-md shadow-emerald-900/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                        }
                      `}
                    >
                      ツモ和了
                    </button>
                    <button
                      onClick={() => setWinType('ron')}
                      className={`
                        py-2 rounded-xl text-xs font-bold transition-all
                        ${
                          winType === 'ron'
                            ? 'bg-emerald-600 text-white ring-1 ring-emerald-400 shadow-md shadow-emerald-900/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                        }
                      `}
                    >
                      ロン和了 (出アガリ)
                    </button>
                  </div>
                </div>

                {/* Seat Wind */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    プレイヤーの風 (自風 / 親子)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { wind: 0 as SeatWind, name: '東 (親)' },
                      { wind: 1 as SeatWind, name: '南 (子)' },
                      { wind: 2 as SeatWind, name: '西 (子)' },
                      { wind: 3 as SeatWind, name: '北 (子)' },
                    ].map((item) => (
                      <button
                        key={item.wind}
                        onClick={() => setSeatWind(item.wind)}
                        className={`
                          py-2 rounded-xl text-xs font-bold transition-all
                          ${
                            seatWind === item.wind
                              ? 'bg-cyan-600 text-white ring-1 ring-cyan-400 shadow-md shadow-cyan-900/30'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                          }
                        `}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Round Wind */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    場風 (東場 / 南場)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRoundWind(0)}
                      className={`
                        py-2 rounded-xl text-xs font-bold transition-all
                        ${
                          roundWind === 0
                            ? 'bg-cyan-600 text-white ring-1 ring-cyan-400 shadow-md shadow-cyan-900/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                        }
                      `}
                    >
                      東場 (トンバ)
                    </button>
                    <button
                      onClick={() => setRoundWind(1)}
                      className={`
                        py-2 rounded-xl text-xs font-bold transition-all
                        ${
                          roundWind === 1
                            ? 'bg-cyan-600 text-white ring-1 ring-cyan-400 shadow-md shadow-cyan-900/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                        }
                      `}
                    >
                      南場 (ナンバ)
                    </button>
                  </div>
                </div>

                {/* Riichi Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    立直 (リーチ)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 0 as const, label: 'なし' },
                      { val: 1 as const, label: '立直 (1翻)' },
                      { val: 2 as const, label: 'ダブリー (2翻)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => {
                          setRiichi(item.val);
                          if (item.val === 0) setIppatsu(false);
                        }}
                        className={`
                          py-2 rounded-xl text-xs font-bold transition-all
                          ${
                            riichi === item.val
                              ? 'bg-amber-600 text-white ring-1 ring-amber-400 shadow-md shadow-amber-900/30'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                          }
                        `}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dora Indicators */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    ドラ表示牌（クリックで変更）
                  </label>
                  <span className="text-[11px] text-slate-400">
                    実ドラ: <strong className="text-amber-400 font-bold">{doraIndicators.map(getDoraFromIndicator).map(d => TILE_LABELS[d] || d).join(', ')}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {doraIndicators.map((ind, i) => (
                    <div
                      key={`dora-ind-${i}`}
                      className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800"
                    >
                      <MahjongTile tile={ind} size="sm" />
                      <button
                        onClick={() => {
                          if (doraIndicators.length > 1) {
                            setDoraIndicators(doraIndicators.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="このドラ表示牌を削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Add Dora indicator dropdown or quick pills */}
                  {doraIndicators.length < 5 && (
                    <div className="flex items-center gap-1">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setDoraIndicators([...doraIndicators, e.target.value]);
                            e.target.value = '';
                          }
                        }}
                        className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">＋ ドラ表示牌を追加...</option>
                        {TILE_ORDER.filter(t => !t.startsWith('0')).map((t) => (
                          <option key={`dora-opt-${t}`} value={t}>
                            {TILE_LABELS[t]} ({t})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Incidental Yaku Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <label className="text-xs font-semibold text-slate-400">
                  偶発役・オプション
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={ippatsu}
                      disabled={riichi === 0}
                      onChange={(e) => setIppatsu(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>一発 (リーチ必須)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={haidi === 1}
                      onChange={(e) => setHaidi(e.target.checked ? 1 : 0)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>海底摸月 (ツモ)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={haidi === 2}
                      onChange={(e) => setHaidi(e.target.checked ? 2 : 0)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>河底撈魚 (ロン)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={rinshan}
                      onChange={(e) => setRinshan(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>嶺上開花</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={chankan}
                      onChange={(e) => setChankan(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>槍槓</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={tianhu === 1}
                      disabled={seatWind !== 0}
                      onChange={(e) => setTianhu(e.target.checked ? 1 : 0)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>天和 (親限定)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={tianhu === 2}
                      disabled={seatWind === 0}
                      onChange={(e) => setTianhu(e.target.checked ? 2 : 0)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>地和 (子限定)</span>
                  </label>
                </div>
              </div>

              {/* Counters: Honba & Riichi Sticks */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-300 font-semibold">
                    本場数（+300点/本）
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHonba(Math.max(0, honba - 1))}
                      className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-400 w-4 text-center">
                      {honba}
                    </span>
                    <button
                      onClick={() => setHonba(honba + 1)}
                      className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-300 font-semibold">
                    供託リーチ棒（+1,000点）
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRiichiSticks(Math.max(0, riichiSticks - 1))}
                      className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-400 w-4 text-center">
                      {riichiSticks}
                    </span>
                    <button
                      onClick={() => setRiichiSticks(riichiSticks + 1)}
                      className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Score Results (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Main Score Result Card */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  リアルタイム計算結果
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${calcResult.titleBadgeBg}`}>
                  {calcResult.title}
                </span>
              </div>

              {calcResult.isWinningHand ? (
                /* WINNING HAND DISPLAY */
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Big Score Callout */}
                  <div className="bg-gradient-to-br from-slate-950 via-slate-950/80 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2 shadow-inner">
                    <div className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                      {seatWind === 0 ? '親の和了' : '子の和了'} • {winType === 'tsumo' ? 'ツモ' : 'ロン'}
                    </div>
                    <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight drop-shadow-md">
                      {calcResult.totalPoints.toLocaleString()}
                      <span className="text-lg font-bold text-slate-300 ml-1.5 font-sans">
                        点
                      </span>
                    </div>
                    <div className="text-xs text-amber-300 font-medium">
                      {calcResult.payment.summary}
                    </div>
                  </div>

                  {/* Han & Fu Summary Pills */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center space-y-0.5">
                      <div className="text-[11px] text-slate-400">合計翻数</div>
                      <div className="text-xl font-black text-white font-mono">
                        {calcResult.han} <span className="text-xs font-normal text-slate-400">翻</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center space-y-0.5">
                      <div className="text-[11px] text-slate-400">計算符数</div>
                      <div className="text-xl font-black text-white font-mono">
                        {calcResult.fu} <span className="text-xs font-normal text-slate-400">符</span>
                      </div>
                    </div>
                  </div>

                  {/* Yaku Breakdown List */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        成立役の内訳 ({calcResult.yakuList.length}役)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {calcResult.yakuList.map((yaku, idx) => (
                        <div
                          key={`yaku-${idx}`}
                          className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800/80 text-xs"
                        >
                          <span className="font-bold text-white tracking-wide">
                            {yaku.name}
                          </span>
                          <span className="font-mono font-bold text-emerald-400">
                            {typeof yaku.han === 'number' ? `${yaku.han}翻` : yaku.han}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fu Calculation Step-by-Step Breakdown */}
                  {calcResult.fuBreakdown.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        符計算の詳細内訳
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {calcResult.fuBreakdown.map((item, idx) => (
                          <div
                            key={`fu-${idx}`}
                            className="flex items-start justify-between bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/50"
                          >
                            <div>
                              <div className="text-slate-300 font-medium">
                                {item.name}
                              </div>
                              {item.note && (
                                <div className="text-[10px] text-slate-500">
                                  {item.note}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-bold text-cyan-400 shrink-0 ml-2">
                              +{item.fu}符
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* NOT WINNING / DIAGNOSTICS DISPLAY */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      <HelpCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-sm font-bold text-white">
                      {calcResult.diagnostics?.isYakuNashi ? '役がありません (役なし)' : '和了形が未完成です'}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      {calcResult.diagnostics?.reason}
                    </p>
                  </div>

                  {/* Xiangting & Tingpai info */}
                  {calcResult.diagnostics && calcResult.diagnostics.xiangting !== 99 && (
                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">向聴数（シャンテン）:</span>
                        <strong className="text-amber-400 font-bold font-mono">
                          {calcResult.diagnostics.xiangting === 0 ? 'テンパイ (聴牌)' : `${calcResult.diagnostics.xiangting}向聴`}
                        </strong>
                      </div>

                      {/* Tingpai tiles */}
                      {calcResult.diagnostics.tingpai.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] text-slate-400">
                            待ち牌（あとこの牌が入れば和了形完成）:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {calcResult.diagnostics.tingpai.map((t, idx) => (
                              <MahjongTile key={`ting-${idx}-${t}`} tile={t} size="sm" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Educational Advice Box */}
                  <div className="bg-gradient-to-br from-blue-950/30 to-emerald-950/20 border border-blue-500/20 rounded-xl p-3.5 text-xs space-y-1 text-slate-300">
                    <div className="font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      点数計算の基本ルール
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      麻雀であがるには手牌14枚が「4面子＋1雀頭」かつ「1翻以上の役」が必要です。<br />
                      上のプリセットボタンから様々な定番手を読み込んで、符と翻の変化を観察してみましょう。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* TAB 2: SCORING PRACTICE DRILL / QUIZ MODE                      */
        /* ============================================================== */
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Quiz Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                <Trophy className="w-3 h-3 text-amber-400" />
                第 {currentQuizIndex + 1} 問 / 全 {PRACTICE_QUESTIONS.length} 問
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {currentQuiz.title}
              </h3>
              <p className="text-xs text-slate-400">
                表示された手牌と状況から、正確な「翻数」「符数」「支払点数」を選択してください。
              </p>
            </div>

            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
              <div className="text-[10px] text-slate-400">累計スコア</div>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {quizScore.correct} / {quizScore.total} 問正解
              </div>
            </div>
          </div>

          {/* Quiz Question Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Situation Indicators */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {currentQuiz.seatWind === 0 ? '自風: 東 (親)' : '自風: 南 (子)'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800/40">
                {currentQuiz.roundWind === 0 ? '場風: 東場' : '場風: 南場'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                和了方式: {currentQuiz.winType === 'tsumo' ? 'ツモ' : 'ロン'}
              </span>
              {currentQuiz.riichi > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800/40">
                  立直 (リーチ宣言あり)
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                ドラ表示牌: {currentQuiz.doraIndicators.map(d => TILE_LABELS[d] || d).join(', ')}
              </span>
            </div>

            {/* Hand Display */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800/80 shadow-inner overflow-x-auto">
              <div className="inline-flex items-end gap-1.5 min-w-max">
                {currentQuiz.tiles.slice(0, 13).map((tileCode, idx) => (
                  <MahjongTile key={`q-tile-${idx}`} tile={tileCode} size="sm" />
                ))}

                <div className="w-3 flex items-center justify-center text-slate-600 font-bold text-xs">
                  +
                </div>

                <div className="relative flex flex-col items-center">
                  <span className="text-[9px] font-black text-amber-300 bg-amber-950/90 border border-amber-500/50 px-1 rounded -mb-1 z-10 animate-bounce">
                    和了
                  </span>
                  <div className="ring-2 ring-amber-400/90 ring-offset-2 ring-offset-slate-950 rounded-[4px]">
                    <MahjongTile tile={currentQuiz.winTile} size="sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Q1: Han */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Q1. 翻数は何翻？
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {currentQuiz.options.hanOptions.map((h) => {
                    const isSelected = userHanAnswer === h;
                    const isCorrect = isQuizSubmitted && h === currentQuiz.correctHan;
                    const isWrong = isQuizSubmitted && isSelected && h !== currentQuiz.correctHan;

                    return (
                      <button
                        key={`han-opt-${h}`}
                        disabled={isQuizSubmitted}
                        onClick={() => setUserHanAnswer(h)}
                        className={`
                          py-2.5 rounded-xl text-xs font-bold transition-all
                          ${
                            isCorrect
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : isWrong
                              ? 'bg-rose-600 text-white'
                              : isSelected
                              ? 'bg-cyan-600 text-white ring-1 ring-cyan-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                          }
                        `}
                      >
                        {h} 翻
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Q2: Fu */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Q2. 符数は何符？
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {currentQuiz.options.fuOptions.map((f) => {
                    const isSelected = userFuAnswer === f;
                    const isCorrect = isQuizSubmitted && f === currentQuiz.correctFu;
                    const isWrong = isQuizSubmitted && isSelected && f !== currentQuiz.correctFu;

                    return (
                      <button
                        key={`fu-opt-${f}`}
                        disabled={isQuizSubmitted}
                        onClick={() => setUserFuAnswer(f)}
                        className={`
                          py-2.5 rounded-xl text-xs font-bold transition-all
                          ${
                            isCorrect
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : isWrong
                              ? 'bg-rose-600 text-white'
                              : isSelected
                              ? 'bg-cyan-600 text-white ring-1 ring-cyan-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                          }
                        `}
                      >
                        {f} 符
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Q3: Score */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Q3. 支払点数は？
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {currentQuiz.options.scoreOptions.map((s) => {
                    const isSelected = userScoreAnswer === s;
                    const isCorrect = isQuizSubmitted && s === currentQuiz.correctScore;
                    const isWrong = isQuizSubmitted && isSelected && s !== currentQuiz.correctScore;

                    return (
                      <button
                        key={`score-opt-${s}`}
                        disabled={isQuizSubmitted}
                        onClick={() => setUserScoreAnswer(s)}
                        className={`
                          py-2.5 rounded-xl text-xs font-bold transition-all
                          ${
                            isCorrect
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : isWrong
                              ? 'bg-rose-600 text-white'
                              : isSelected
                              ? 'bg-cyan-600 text-white ring-1 ring-cyan-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                          }
                        `}
                      >
                        {s.toLocaleString()} 点
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit & Next Button */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              {!isQuizSubmitted ? (
                <button
                  disabled={userHanAnswer === null || userFuAnswer === null || userScoreAnswer === null}
                  onClick={handleQuizSubmit}
                  className={`
                    px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ml-auto
                    ${
                      userHanAnswer !== null && userFuAnswer !== null && userScoreAnswer !== null
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }
                  `}
                >
                  回答を提出する
                </button>
              ) : (
                <div className="w-full flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {userHanAnswer === currentQuiz.correctHan &&
                    userFuAnswer === currentQuiz.correctFu &&
                    userScoreAnswer === currentQuiz.correctScore ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        全問正解！お見事です！
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                        <XCircle className="w-5 h-5" />
                        惜しい！正解を確認してみましょう。
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleNextQuiz}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-cyan-900/30 transition-all"
                  >
                    <span>次の問題へ</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Explanation revealed on submit */}
            {isQuizSubmitted && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  正解の解説: {currentQuiz.correctFu}符 {currentQuiz.correctHan}翻 ({currentQuiz.scoreDisplay})
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentQuiz.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreCalculator;
