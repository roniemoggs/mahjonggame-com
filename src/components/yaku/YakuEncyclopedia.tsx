import React, { useState, useMemo } from 'react';
import { MahjongTile } from '../mahjong/MahjongTile';
import { YAKU_LIST, type YakuDefinition, type YakuCategory } from '../../data/yakuData';
import {
  MahjongLanguageContext,
  type MahjongLang,
} from '../../lib/mahjong/i18n';
import {
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Layers,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  HelpCircle,
  X,
  Volume2,
} from 'lucide-react';

interface YakuEncyclopediaProps {
  lang?: MahjongLang;
}

const TAG_TRANSLATIONS: Record<string, string> = {
  '門前役': 'Concealed',
  '鳴き可': 'Open Allowed',
  '喰い下がり': 'Kuisagari (-1 Han)',
  '基本役': 'Fundamental',
  '偶然役': 'Situational',
  '順子系': 'Sequences',
  '刻子系': 'Triplets',
  '一色手': 'Flush Hand',
  '一九字牌': 'Terminals & Honors',
  '幺九牌': 'Terminals & Honors',
  '特殊役': 'Special Form',
  '役満': 'Yakuman',
  'ダブル役満': 'Double Yakuman',
};

export const YakuEncyclopedia: React.FC<YakuEncyclopediaProps> = ({ lang = 'ja' }) => {
  const isEn = lang === 'en';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedYakuId, setExpandedYakuId] = useState<string | null>(null);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: YAKU_LIST.length,
      '1han': 0,
      '2han': 0,
      '3han': 0,
      '6han': 0,
      yakuman: 0,
      double_yakuman: 0,
    };
    YAKU_LIST.forEach((y) => {
      if (counts[y.category] !== undefined) {
        counts[y.category]++;
      }
    });
    return counts;
  }, []);

  // Filtered list
  const filteredYaku = useMemo(() => {
    return YAKU_LIST.filter((yaku) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'yakuman_all') {
          if (yaku.category !== 'yakuman' && yaku.category !== 'double_yakuman') return false;
        } else if (yaku.category !== selectedCategory) {
          return false;
        }
      }

      // Tag filter
      if (selectedTag !== 'all') {
        if (selectedTag === 'menzen_only') {
          if (!yaku.tags.includes('門前役')) return false;
        } else if (selectedTag === 'open_ok') {
          if (!yaku.tags.includes('鳴き可') && !yaku.tags.includes('喰い下がり')) return false;
        } else if (selectedTag === 'kuisagari') {
          if (!yaku.tags.includes('喰い下がり')) return false;
        } else if (!yaku.tags.includes(selectedTag)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = yaku.name.toLowerCase().includes(query);
        const matchReading = yaku.reading.toLowerCase().includes(query);
        const matchEng = yaku.englishName.toLowerCase().includes(query);
        const matchSummary = yaku.summary.toLowerCase().includes(query);
        const matchTips = yaku.tips.toLowerCase().includes(query);
        const matchTags = yaku.tags.some((t) => t.toLowerCase().includes(query));

        if (!matchName && !matchReading && !matchEng && !matchSummary && !matchTips && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, selectedTag, searchQuery]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedTag('all');
    setSearchQuery('');
  };

  const getCategoryBadge = (cat: YakuCategory, hanMenzen: number | string) => {
    if (cat === 'double_yakuman') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-purple-900 via-rose-900 to-amber-900 text-amber-200 border border-amber-400 shadow-md shadow-amber-500/20">
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
          {isEn ? 'Double Yakuman' : 'ダブル役満'}
        </span>
      );
    }
    if (cat === 'yakuman') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 text-amber-300 border border-amber-400/80 shadow-md shadow-amber-500/20">
          <Award className="w-3.5 h-3.5 text-amber-300" />
          {isEn ? 'Yakuman' : '役満 (YAKUMAN)'}
        </span>
      );
    }
    const hanText = isEn ? `${hanMenzen} Han` : `${hanMenzen}翻役`;
    if (cat === '6han') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-pink-950/80 text-pink-300 border border-pink-500/40">
          {hanText}
        </span>
      );
    }
    if (cat === '3han') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
          {hanText}
        </span>
      );
    }
    if (cat === '2han') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
          {hanText}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
        {hanText}
      </span>
    );
  };

  const formatFrequency = (freq: string, label: string) => {
    if (!isEn) return label;
    switch (freq) {
      case 'very_high':
        return 'Freq: ★★★★★ (Very High)';
      case 'high':
        return 'Freq: ★★★★☆ (Common)';
      case 'medium':
        return 'Freq: ★★★☆☆ (Moderate)';
      case 'low':
        return 'Freq: ★★☆☆☆ (Low)';
      case 'rare':
        return 'Freq: ★☆☆☆☆ (Rare)';
      default:
        return label;
    }
  };

  const formatOpenHan = (val: number | string) => {
    const s = String(val);
    if (!isEn) {
      return typeof val === 'number' ? `${val}翻` : val;
    }
    if (s.includes('なし')) return 'None (Concealed)';
    if (s.includes('喰い下がり')) {
      return s.replace('喰い下がり', '').replace('翻', '') + ' Han (Open)';
    }
    if (s.includes('役満')) return 'Yakuman';
    return `${val} Han`;
  };

  return (
    <MahjongLanguageContext.Provider value={{ lang, showIndices: isEn, setShowIndices: () => {} }}>
      <div className="space-y-8">
      {/* Search & Filter Header Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? 'Search by English name, Romaji, Kanji, or keyword (e.g., Tanyao, Pinfu, Daisangen, Concealed...)'
                : '役名・読み仮名・キーワードで検索（例: タンヤオ, ピンフ, 大三元, 門前...）'
            }
            className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Han Category Tabs */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              {isEn ? 'Filter by Han Value' : '翻数別フィルター'}
            </span>
            <span className="text-slate-400 text-[11px]">
              {isEn ? (
                <>Showing: <strong className="text-emerald-400 font-bold">{filteredYaku.length}</strong> / {YAKU_LIST.length} Yaku</>
              ) : (
                <>該当: <strong className="text-emerald-400 font-bold">{filteredYaku.length}</strong> 件 / 全 {YAKU_LIST.length} 役</>
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: isEn ? 'All Yaku' : 'すべて', count: YAKU_LIST.length },
              { id: '1han', label: isEn ? '1 Han' : '1翻役', count: categoryCounts['1han'] },
              { id: '2han', label: isEn ? '2 Han' : '2翻役', count: categoryCounts['2han'] },
              { id: '3han', label: isEn ? '3 Han' : '3翻役', count: categoryCounts['3han'] },
              { id: '6han', label: isEn ? '6 Han' : '6翻役', count: categoryCounts['6han'] },
              {
                id: 'yakuman_all',
                label: isEn ? 'Yakuman' : '役満・ダブル役満',
                count: categoryCounts.yakuman + categoryCounts.double_yakuman,
                highlight: true,
              },
            ].map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5
                    ${
                      isActive
                        ? tab.highlight
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-900/40 ring-1 ring-amber-400 scale-[1.02]'
                          : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400 scale-[1.02]'
                        : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Condition Filters */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            {isEn ? 'Hand Types & Winning Conditions' : '条件・タイプ別絞り込み'}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {[
              { id: 'all', label: isEn ? 'All Types' : '全条件' },
              { id: 'menzen_only', label: isEn ? 'Concealed Only' : '門前限定 (鳴き不可)' },
              { id: 'open_ok', label: isEn ? 'Open Hand OK' : '鳴きOK (ポン・チー可)' },
              { id: 'kuisagari', label: isEn ? 'Kuisagari (-1 Han)' : '喰い下がり役' },
              { id: '順子系', label: isEn ? 'Sequences' : '順子系' },
              { id: '刻子系', label: isEn ? 'Triplets' : '刻子系' },
              { id: '一色手', label: isEn ? 'Flush Hands' : '一色手' },
              { id: '幺九牌', label: isEn ? 'Terminals & Honors' : '一九字牌' },
              { id: '偶然役', label: isEn ? 'Situational' : '偶然役' },
            ].map((tag) => {
              const isActive = selectedTag === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`
                    px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }
                  `}
                >
                  {tag.label}
                </button>
              );
            })}

            {(selectedCategory !== 'all' || selectedTag !== 'all' || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4 px-2 py-1 ml-auto"
              >
                {isEn ? 'Reset Filters' : 'フィルター全解除'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Yaku Cards Grid */}
      {filteredYaku.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 text-xl">
            🀄
          </div>
          <h3 className="text-lg font-bold text-white">
            {isEn ? 'No Matching Yaku Found' : '該当する役が見つかりませんでした'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {isEn
              ? 'Try modifying your search query or reset the filter tags.'
              : '検索条件またはフィルターを変更してお試しください。'}
          </p>
          <button
            onClick={resetFilters}
            className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all"
          >
            {isEn ? 'Show All Yaku' : '全役一覧に戻す'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredYaku.map((yaku) => {
            const isExpanded = expandedYakuId === yaku.id;
            const handString = [...yaku.sampleHand.tiles, yaku.sampleHand.winTile].join('');
            const calcBase = isEn ? '/en/calculator' : '/calculator';
            const calcUrl = `${calcBase}?hand=${encodeURIComponent(handString)}&winTile=${encodeURIComponent(
              yaku.sampleHand.winTile
            )}&isTsumo=${yaku.sampleHand.isTsumo ? 'true' : 'false'}`;

            return (
              <div
                key={yaku.id}
                className="bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 transition-all duration-200 shadow-xl flex flex-col justify-between group"
              >
                {/* Card Top Header */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide group-hover:text-emerald-400 transition-colors">
                          {isEn ? yaku.englishName : yaku.name}
                        </h3>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          {isEn ? yaku.name : yaku.reading}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-sans">
                        {isEn ? yaku.reading : yaku.englishName}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {getCategoryBadge(yaku.category, yaku.hanMenzen)}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatFrequency(yaku.frequency, yaku.frequencyLabel)}
                      </span>
                    </div>
                  </div>

                  {/* Han breakdown: Menzen vs Open */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-400">{isEn ? 'Concealed:' : '門前:'}</span>
                      <strong className="text-white font-bold">
                        {typeof yaku.hanMenzen === 'number'
                          ? isEn
                            ? `${yaku.hanMenzen} Han`
                            : `${yaku.hanMenzen}翻`
                          : yaku.hanMenzen}
                      </strong>
                    </div>

                    <div className="px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-400">{isEn ? 'Open:' : '鳴き:'}</span>
                      <strong
                        className={
                          yaku.hanOpen.toString().includes('なし')
                            ? 'text-rose-400 font-normal'
                            : yaku.hanOpen.toString().includes('喰い下がり')
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {formatOpenHan(yaku.hanOpen)}
                      </strong>
                    </div>

                    {yaku.tags.map((t) => (
                      <span
                        key={t}
                        className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/40"
                      >
                        #{isEn ? TAG_TRANSLATIONS[t] || t : t}
                      </span>
                    ))}
                  </div>

                  {/* Summary */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                    {yaku.summary}
                  </p>

                  {/* Sample Hand Visualization */}
                  <div className="space-y-1.5 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800/90 shadow-inner overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-emerald-400" />
                        {isEn ? 'Sample Winning Hand (14 Tiles)' : '和了手牌サンプル（14枚）'}
                      </span>
                      <span className="text-[10px] text-amber-300 font-mono">
                        {yaku.sampleHand.isTsumo
                          ? isEn
                            ? 'Win by Tsumo'
                            : 'ツモ和了'
                          : isEn
                          ? 'Win by Ron'
                          : 'ロン和了'}
                      </span>
                    </div>

                    {/* Tiles Row */}
                    <div className="overflow-x-auto pb-1 scrollbar-none">
                      <div className="inline-flex items-end gap-1 sm:gap-1.5 min-w-max p-1">
                        {/* 13 Hand Tiles */}
                        {yaku.sampleHand.tiles.map((tileCode, idx) => (
                          <MahjongTile
                            key={`${yaku.id}-tile-${idx}-${tileCode}`}
                            tile={tileCode}
                            size="sm"
                          />
                        ))}

                        {/* Gap between hand and winning tile */}
                        <div className="w-2.5 sm:w-3.5 flex items-center justify-center text-slate-600 font-bold text-xs">
                          +
                        </div>

                        {/* Winning Tile Highlighted */}
                        <div className="relative flex flex-col items-center">
                          <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter bg-amber-950/90 border border-amber-500/50 px-1 rounded -mb-1 z-10 shadow-sm animate-bounce">
                            {isEn ? 'Win' : '和了'}
                          </span>
                          <div className="ring-2 ring-amber-400/90 ring-offset-2 ring-offset-slate-950 rounded-[4px] shadow-lg shadow-amber-500/20">
                            <MahjongTile
                              tile={yaku.sampleHand.winTile}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Conditions & Tips */}
                  {isExpanded && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Conditions Checklist */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {isEn ? 'Winning Conditions' : '和了成立の必須条件'}
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
                          {yaku.conditions.map((cond, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              <span>{cond}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Strategy & Tips Box */}
                      <div className="bg-gradient-to-br from-amber-950/30 to-emerald-950/20 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          {isEn ? 'Strategy & Pro Tips' : '実戦での狙い目・ワンポイント攻略'}
                        </div>
                        <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                          {yaku.tips}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Controls */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedYakuId(isExpanded ? null : yaku.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <span>
                      {isExpanded
                        ? isEn
                          ? 'Hide details'
                          : '詳細を閉じる'
                        : isEn
                        ? 'Conditions & Tips'
                        : '成立条件・攻略のコツを見る'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <a
                    href={calcUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all shadow-sm group/btn"
                    title={isEn ? 'Load hand into Score Calculator' : 'この手牌を点数計算機に読み込んで符・翻を検証する'}
                  >
                    <span>{isEn ? 'Test in Calculator' : '計算機で検証'}</span>
                    <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </MahjongLanguageContext.Provider>
  );
};

export default YakuEncyclopedia;

