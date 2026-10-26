import React, { useState } from 'react';
import { MahjongTile, type TileSize } from './MahjongTile';
import { Eye, EyeOff, RotateCw, Sparkles, Info } from 'lucide-react';
import { MahjongLanguageContext, type MahjongLang } from '../../lib/mahjong/i18n';

export interface TileShowcaseProps {
  lang?: MahjongLang;
}

export const TileShowcase: React.FC<TileShowcaseProps> = ({ lang = 'ja' }) => {
  const isEn = lang === 'en';
  const [selectedSize, setSelectedSize] = useState<TileSize>('md');
  const [isConcealedMode, setIsConcealedMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'hands' | 'all'>('hands');
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string>(
    isEn
      ? 'Click any tile to inspect, select, or simulate discards'
      : '牌をクリックして選択・打牌シミュレーションを行えます'
  );

  // Standard Winning Hand (Pinfu, Tanyao, Akadora, Iipeikou):
  // 234m, 45(red)6p, 234s, 789s, 88m
  const standardHand = [
    { tile: '2m' }, { tile: '3m' }, { tile: '4m' },
    { tile: '4p' }, { tile: '0p', isDora: true }, { tile: '6p' },
    { tile: '2s' }, { tile: '3s' }, { tile: '4s' },
    { tile: '7s' }, { tile: '8s' }, { tile: '9s' },
    { tile: '8m' }, { tile: '8m' }, // Atama
    { tile: '5m', isDora: true }, // Tsumo tile
  ];

  // Kokushi Musou (Yakuman):
  // 1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z + 1z (13-wait)
  const kokushiHand = [
    '1m', '9m', '1p', '9p', '1s', '9s',
    '1z', '2z', '3z', '4z', '5z', '6z', '7z',
    '1z'
  ];

  // Red Fives & Dora sample
  const redFives = [
    { tile: '5m' }, { tile: '0m', isDora: true },
    { tile: '5p' }, { tile: '0p', isDora: true },
    { tile: '5s' }, { tile: '0s', isDora: true },
  ];

  // Discard river sample with Riichi declaration (sideways tile)
  const riverTiles = [
    { tile: '1z' }, { tile: '9m' }, { tile: '1p' }, { tile: '9s' }, { tile: '4z' }, { tile: '2m' },
    { tile: '5s', isSideways: true }, // Riichi declaration tile!
    { tile: '8p' }, { tile: '3s' }, { tile: '7m' }, { tile: '2p' }, { tile: '6s' },
  ];

  // All 34 standard tiles + 3 red dora
  const allManzu = ['1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m'];
  const allPinzu = ['1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p'];
  const allSouzu = ['1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s'];
  const allJihai = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];

  const handleTileClick = (name: string, index?: number) => {
    if (index !== undefined) {
      setSelectedTileIndex(index);
    }
    if (isEn) {
      setMessage(`Selected "${name}". Discard & hand-sorting simulation active.`);
    } else {
      setMessage(`「${name}」を選択しました。打牌や理牌のシミュレーションが動作しています。`);
    }
  };

  return (
    <MahjongLanguageContext.Provider value={{ lang, showIndices: isEn, setShowIndices: () => {} }}>
      <div className="space-y-10">
      {/* Control Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-400">
            {isEn ? 'Tile Size:' : '表示サイズ:'}
          </span>
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            {(['sm', 'md', 'lg', 'xl'] as TileSize[]).map((sz) => (
              <button
                key={sz}
                onClick={() => setSelectedSize(sz)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all uppercase ${
                  selectedSize === sz
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConcealedMode(!isConcealedMode)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isConcealedMode
                ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isConcealedMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isConcealedMode
              ? isEn ? 'Concealed Hand (Face Down)' : '手牌伏せ中 (裏向き)'
              : isEn ? 'Show Face-Up' : '表向き表示'}
          </button>

          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setActiveTab('hands')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'hands' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Winning Hands & Yaku' : '役・実践手牌'}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Complete 37-Tile Set' : '全37種 牌一覧'}
            </button>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center justify-between text-sm text-emerald-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
        <span className="text-xs text-emerald-400/70 font-mono">SVG Crisp Vector Engine</span>
      </div>

      {activeTab === 'hands' ? (
        <div className="space-y-8">
          {/* Section 1: Standard Hand */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    {isEn ? 'Mangan / 4 Han 30 Fu' : '満貫 / 4翻 30符'}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {isEn
                      ? 'Winning Hand Example (Riichi, Tanyao, Pinfu, Red Dora)'
                      : '実践和了形（リーチ・タンヤオ・平和・赤ドラ）'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn
                    ? 'Self-draw winning hand (Tsumo). The rightmost "5m" is the winning tile, placed slightly apart.'
                    : 'ツモアガリ時の手牌構成。右端の「5m」がアガリ牌（ツモ牌）として少し離れて配置されています。'}
                </p>
              </div>
              <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                {isEn ? 'Dora Indicator: ' : 'ドラ表示牌: '}
                <span className="text-amber-400 font-bold ml-1">4m</span>
                <span className="text-slate-400 ml-1">({isEn ? 'Dora: 5m' : 'ドラ: 5m'})</span>
              </div>
            </div>

            {/* Hand Tiles Container with Green Mat Backdrop */}
            <div className="bg-[#114b32] rounded-xl p-6 shadow-inner border border-[#1b6d49] flex flex-wrap items-center gap-1 sm:gap-1.5">
              {standardHand.slice(0, 14).map((item, idx) => (
                <MahjongTile
                  key={`std-${idx}`}
                  tile={item.tile}
                  isDora={item.isDora}
                  isConcealed={isConcealedMode}
                  size={selectedSize}
                  selected={selectedTileIndex === idx}
                  onClick={() => handleTileClick(`${item.tile} (#${idx + 1})`, idx)}
                />
              ))}

              {/* Tsumo Separation Gap */}
              <div className="w-4 sm:w-6" />

              {/* Winning / Tsumo Tile */}
              <div className="relative">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-300 tracking-wider">
                  {isEn ? 'TSUMO' : 'ツモ'}
                </span>
                <MahjongTile
                  tile={standardHand[14].tile}
                  isDora={standardHand[14].isDora}
                  isConcealed={isConcealedMode}
                  size={selectedSize}
                  selected={selectedTileIndex === 14}
                  onClick={() => handleTileClick(isEn ? 'Winning Tile (5m Red Dora)' : 'ツモ牌 (5m 赤ドラ)', 14)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Kokushi Musou (国士無双) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                    {isEn ? 'Yakuman (Grand Limit Hand)' : '役満 (Yakuman)'}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {isEn
                      ? 'Kokushi Musou / Thirteen Orphans (13-Wait Ready Tenpai)'
                      : '国士無双（十三面待ちテンパイ）'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn
                    ? 'Legendary hand containing all 13 terminal and honor tiles. Ready to win on any matching tile.'
                    : '幺九牌（一九字牌）13種すべてが揃った究極のテンパイ形。どれでも和了可能。'}
                </p>
              </div>
            </div>

            <div className="bg-[#0f402c] rounded-xl p-6 shadow-inner border border-[#175c40] flex flex-wrap items-center gap-1 sm:gap-1.5">
              {kokushiHand.map((tileCode, idx) => (
                <MahjongTile
                  key={`koku-${idx}`}
                  tile={tileCode}
                  isConcealed={isConcealedMode}
                  size={selectedSize}
                  onClick={() => handleTileClick(isEn ? `Thirteen Orphans: ${tileCode}` : `国士無双: ${tileCode}`, 100 + idx)}
                />
              ))}
            </div>
          </div>

          {/* Section 3: Red Fives & Dora System */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Red Dora showcase */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <h4 className="text-base font-bold text-white">
                  {isEn ? 'Red Fives & Dora (Akadora: 5m, 5p, 5s)' : '赤ドラ（赤五萬・赤五筒・赤五索）'}
                </h4>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                {isEn
                  ? 'Standard in modern Japanese competitive and online rules (Tenhou / Mahjong Soul). Distinctive ruby accents.'
                  : '日本の競技・ネット麻雀（天鳳や雀魂）標準の赤牌ルールに対応。ルビーレッドのアクセントと鮮明な刻印。'}
              </p>
              <div className="bg-[#124230] rounded-xl p-4 flex flex-wrap items-center gap-2 border border-[#1b5d44]">
                {redFives.map((item, idx) => (
                  <div key={`red-${idx}`} className="flex flex-col items-center gap-1">
                    <MahjongTile
                      tile={item.tile}
                      isDora={item.isDora}
                      size={selectedSize}
                      onClick={() => handleTileClick(isEn ? `Tile: ${item.tile}` : `赤牌/通常牌: ${item.tile}`)}
                    />
                    <span className="text-[10px] text-slate-300 font-mono">
                      {item.isDora ? (isEn ? 'Red Dora' : '赤牌') : (isEn ? 'Normal' : '通常')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discard River & Riichi Declaration (Sideways Tile) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <RotateCw className="w-4 h-4 text-amber-400" />
                <h4 className="text-base font-bold text-white">
                  {isEn ? 'Discard River & Riichi Declaration (Sideways Tile)' : '捨牌河 ＆ リーチ宣言牌（横向き）'}
                </h4>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                {isEn
                  ? 'Rotated tile indicators for Riichi calls (Turn 7: 5 Sou) and open melds (Pon, Chi, Kan).'
                  : 'リーチ宣言時の捨て牌（7巡目 5索）や鳴き（ポン・チー・カン）の横倒し牌表現に対応。'}
              </p>
              <div className="bg-[#124230] rounded-xl p-4 border border-[#1b5d44] space-y-2">
                {/* 1st row of 6 */}
                <div className="flex items-end gap-1">
                  {riverTiles.slice(0, 6).map((item, idx) => (
                    <MahjongTile
                      key={`riv-1-${idx}`}
                      tile={item.tile}
                      isSideways={item.isSideways}
                      size="sm"
                    />
                  ))}
                </div>
                {/* 2nd row with Riichi sideways tile */}
                <div className="flex items-end gap-1">
                  {riverTiles.slice(6, 12).map((item, idx) => (
                    <MahjongTile
                      key={`riv-2-${idx}`}
                      tile={item.tile}
                      isSideways={item.isSideways}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Tile Matrix */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {isEn
                ? 'Complete Mahjong Tile Matrix (34 Types + 3 Red Dora = 37 Total)'
                : '全牌種一覧（34種 + 赤牌3種 = 計37種）'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Characters (Manzu), Dots (Pinzu), Bamboo (Souzu), and Honors (Winds & Dragons). Realistic ivory shading and vector detail.'
                : '萬子（マンズ）・筒子（ピンズ）・索子（ソーズ）・字牌（東南西北白發中）。細部までこだわったアイボリーの象牙風テクスチャと面取り表現。'}
            </p>
          </div>

          {/* Manzu */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-300">
              {isEn ? 'Characters (Manzu / 1m–9m + Red 5m)' : '萬子（マンズ / 1m〜9m + 赤5m）'}
            </h4>
            <div className="bg-[#124230] p-4 rounded-xl flex flex-wrap gap-1.5 border border-[#1b5d44]">
              {allManzu.map((t) => (
                <MahjongTile
                  key={t}
                  tile={t}
                  size={selectedSize}
                  onClick={() => handleTileClick(t)}
                />
              ))}
            </div>
          </div>

          {/* Pinzu */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-300">
              {isEn ? 'Dots (Pinzu / 1p–9p + Red 5p)' : '筒子（ピンズ / 1p〜9p + 赤5p）'}
            </h4>
            <div className="bg-[#124230] p-4 rounded-xl flex flex-wrap gap-1.5 border border-[#1b5d44]">
              {allPinzu.map((t) => (
                <MahjongTile
                  key={t}
                  tile={t}
                  size={selectedSize}
                  onClick={() => handleTileClick(t)}
                />
              ))}
            </div>
          </div>

          {/* Souzu */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-300">
              {isEn ? 'Bamboo (Souzu / 1s–9s + Red 5s)' : '索子（ソーズ / 1s〜9s + 赤5s）'}
            </h4>
            <div className="bg-[#124230] p-4 rounded-xl flex flex-wrap gap-1.5 border border-[#1b5d44]">
              {allSouzu.map((t) => (
                <MahjongTile
                  key={t}
                  tile={t}
                  size={selectedSize}
                  onClick={() => handleTileClick(t)}
                />
              ))}
            </div>
          </div>

          {/* Jihai */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-300">
              {isEn ? 'Honors (Winds: E S W N / Dragons: White Green Red)' : '字牌（風牌: 東南西北 / 三元牌: 白發中）'}
            </h4>
            <div className="bg-[#124230] p-4 rounded-xl flex flex-wrap gap-1.5 border border-[#1b5d44]">
              {allJihai.map((t) => (
                <MahjongTile
                  key={t}
                  tile={t}
                  size={selectedSize}
                  onClick={() => handleTileClick(t)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </MahjongLanguageContext.Provider>
  );
};

export default TileShowcase;
