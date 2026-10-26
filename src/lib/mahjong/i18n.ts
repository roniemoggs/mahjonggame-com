import React, { createContext, useContext } from 'react';

/**
 * Internationalization and English accessibility helper for Mahjong game
 * Provides tile corner indices, tile labels, Yaku translations, CPU translations, and UI strings.
 */

export type MahjongLang = 'ja' | 'en';

export interface MahjongLanguageContextType {
  lang: MahjongLang;
  showIndices: boolean;
  setShowIndices?: (show: boolean) => void;
}

export const MahjongLanguageContext = createContext<MahjongLanguageContextType>({
  lang: 'ja',
  showIndices: false,
});

export const useMahjongLanguage = () => useContext(MahjongLanguageContext);

// English tile names for tooltips and accessibility
export const TILE_NAMES_EN: Record<string, string> = {
  // Characters / Manzu (萬子)
  '1m': '1 Character (1-Man)',
  '2m': '2 Character (2-Man)',
  '3m': '3 Character (3-Man)',
  '4m': '4 Character (4-Man)',
  '5m': '5 Character (5-Man)',
  '6m': '6 Character (6-Man)',
  '7m': '7 Character (7-Man)',
  '8m': '8 Character (8-Man)',
  '9m': '9 Character (9-Man)',
  '0m': 'Red 5 Character (Aka 5-Man)',

  // Dots / Pinzu (筒子)
  '1p': '1 Dot (1-Pin)',
  '2p': '2 Dot (2-Pin)',
  '3p': '3 Dot (3-Pin)',
  '4p': '4 Dot (4-Pin)',
  '5p': '5 Dot (5-Pin)',
  '6p': '6 Dot (6-Pin)',
  '7p': '7 Dot (7-Pin)',
  '8p': '8 Dot (8-Pin)',
  '9p': '9 Dot (9-Pin)',
  '0p': 'Red 5 Dot (Aka 5-Pin)',

  // Bamboo / Souzu (索子)
  '1s': '1 Bamboo (1-Sou / Peacock)',
  '2s': '2 Bamboo (2-Sou)',
  '3s': '3 Bamboo (3-Sou)',
  '4s': '4 Bamboo (4-Sou)',
  '5s': '5 Bamboo (5-Sou)',
  '6s': '6 Bamboo (6-Sou)',
  '7s': '7 Bamboo (7-Sou)',
  '8s': '8 Bamboo (8-Sou)',
  '9s': '9 Bamboo (9-Sou)',
  '0s': 'Red 5 Bamboo (Aka 5-Sou)',

  // Honors / Jihai (字牌)
  '1z': 'East Wind (Ton)',
  '2z': 'South Wind (Nan)',
  '3z': 'West Wind (Shaa)',
  '4z': 'North Wind (Pei)',
  '5z': 'White Dragon (Haku)',
  '6z': 'Green Dragon (Hatsu)',
  '7z': 'Red Dragon (Chun)',
};

export const TILE_NAMES_JA: Record<string, string> = {
  '1m': '一萬', '2m': '二萬', '3m': '三萬', '4m': '四萬', '5m': '五萬',
  '6m': '六萬', '7m': '七萬', '8m': '八萬', '9m': '九萬', '0m': '赤五萬',
  '1p': '一筒', '2p': '二筒', '3p': '三筒', '4p': '四筒', '5p': '五筒',
  '6p': '六筒', '7p': '七筒', '8p': '八筒', '9p': '九筒', '0p': '赤五筒',
  '1s': '一索', '2s': '二索', '3s': '三索', '4s': '四索', '5s': '五索',
  '6s': '六索', '7s': '七索', '8s': '八索', '9s': '九索', '0s': '赤五索',
  '1z': '東', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '發', '7z': '中',
};

// Western corner indices printed on the top-left of each tile for non-Japanese speakers
export const TILE_WESTERN_INDEX: Record<string, { label: string; color: string; sub?: string }> = {
  // Manzu (Arabic numeral)
  '1m': { label: '1', color: '#1e293b' },
  '2m': { label: '2', color: '#1e293b' },
  '3m': { label: '3', color: '#1e293b' },
  '4m': { label: '4', color: '#1e293b' },
  '5m': { label: '5', color: '#1e293b' },
  '0m': { label: '5', color: '#dc2626' },
  '6m': { label: '6', color: '#1e293b' },
  '7m': { label: '7', color: '#1e293b' },
  '8m': { label: '8', color: '#1e293b' },
  '9m': { label: '9', color: '#1e293b' },

  // Pinzu
  '1p': { label: '1', color: '#1e293b' },
  '2p': { label: '2', color: '#1e293b' },
  '3p': { label: '3', color: '#1e293b' },
  '4p': { label: '4', color: '#1e293b' },
  '5p': { label: '5', color: '#1e293b' },
  '0p': { label: '5', color: '#dc2626' },
  '6p': { label: '6', color: '#1e293b' },
  '7p': { label: '7', color: '#1e293b' },
  '8p': { label: '8', color: '#1e293b' },
  '9p': { label: '9', color: '#1e293b' },

  // Souzu
  '1s': { label: '1', color: '#1e293b' },
  '2s': { label: '2', color: '#1e293b' },
  '3s': { label: '3', color: '#1e293b' },
  '4s': { label: '4', color: '#1e293b' },
  '5s': { label: '5', color: '#1e293b' },
  '0s': { label: '5', color: '#dc2626' },
  '6s': { label: '6', color: '#1e293b' },
  '7s': { label: '7', color: '#1e293b' },
  '8s': { label: '8', color: '#1e293b' },
  '9s': { label: '9', color: '#1e293b' },

  // Winds (E, S, W, N)
  '1z': { label: 'E', color: '#1e293b' },
  '2z': { label: 'S', color: '#1e293b' },
  '3z': { label: 'W', color: '#1e293b' },
  '4z': { label: 'N', color: '#1e293b' },

  // Dragons
  // 5z: White Dragon (P for Plain/Po, or W for White)
  '5z': { label: 'W', color: '#64748b' },
  // 6z: Green Dragon (G for Green / Hatsu)
  '6z': { label: 'G', color: '#15803d' },
  // 7z: Red Dragon (R for Red / Chun)
  '7z': { label: 'R', color: '#dc2626' },
};

// Comprehensive Japanese to English Yaku translation mapping
export const YAKU_TRANSLATIONS: Record<string, string> = {
  // 1 Han
  '門前清自摸和': 'Fully Concealed Hand (Tsumo)',
  '立直': 'Riichi (Ready Hand)',
  '一発': 'Ippatsu (One-Shot Win)',
  '断幺九': 'All Simples (Tanyao)',
  '平和': 'Pinfu (All Sequences)',
  '一盃口': 'Pure Double Sequence (Iipeikou)',
  '役牌 白': 'White Dragon (Haku)',
  '白': 'White Dragon (Haku)',
  '役牌 發': 'Green Dragon (Hatsu)',
  '發': 'Green Dragon (Hatsu)',
  '役牌 中': 'Red Dragon (Chun)',
  '中': 'Red Dragon (Chun)',
  '役牌:自風牌': 'Seat Wind',
  '自風 東': 'Seat Wind: East',
  '自風 南': 'Seat Wind: South',
  '自風 西': 'Seat Wind: West',
  '自風 北': 'Seat Wind: North',
  '役牌:場風牌': 'Prevalent Wind',
  '場風 東': 'Round Wind: East',
  '場風 南': 'Round Wind: South',
  '場風 西': 'Round Wind: West',
  '場風 北': 'Round Wind: North',
  '槍槓': 'Robbing a Kan (Chankan)',
  '嶺上開花': 'Dead Wall Draw (Rinshan Kaihou)',
  '海底摸月': 'Under the Sea (Haitei Raoyue)',
  '河底撈魚': 'Under the River (Houtei Raoyui)',

  // 2 Han
  '三色同順': 'Three Colored Sequences (Sanshoku Doujun)',
  '一気通貫': 'Straight (Ikkitsukan)',
  '混全帯幺九': 'Terminal or Honor in Each Meld (Chanta)',
  '七対子': 'Seven Pairs (Chiitoitsu)',
  '対々和': 'All Triplets (Toitoi)',
  '三暗刻': 'Three Concealed Triplets (San Ankou)',
  '三槓子': 'Three Kans (San Kantsu)',
  '三色同刻': 'Three Colored Triplets (Sanshoku Doukou)',
  '混老頭': 'All Terminals & Honors (Honroutou)',
  '小三元': 'Little Three Dragons (Shousangen)',
  'ダブル立直': 'Double Riichi',

  // 3 Han
  '混一色': 'Half Flush (Honitsu)',
  '純全帯幺九': 'Pure Terminals in Each Meld (Junchan)',
  '二盃口': 'Twice Pure Double Sequence (Ryanpeikou)',

  // 6 Han
  '清一色': 'Full Flush (Chinitsu)',

  // Dora
  'ドラ': 'Dora',
  '赤ドラ': 'Red Dora',
  '裏ドラ': 'Ura Dora',
  '抜きドラ': 'Kita (North) Dora',

  // Yakuman
  '国士無双': 'Thirteen Orphans (Kokushi Musou)',
  '国士無双十三面待ち': 'Thirteen Orphans 13-Wait (Double Yakuman)',
  '四暗刻': 'Four Concealed Triplets (Suuankou)',
  '四暗刻単騎': 'Four Concealed Triplets Single Wait (Double Yakuman)',
  '大三元': 'Big Three Dragons (Daisangen)',
  '字一色': 'All Honors (Tsuuiisou)',
  '緑一色': 'All Green (Ryuuiisou)',
  '清老頭': 'All Terminals (Chinroutou)',
  '四槓子': 'Four Kans (Suukantsu)',
  '小四喜': 'Four Little Winds (Shousuushii)',
  '大四喜': 'Four Big Winds (Daisuushii / Double Yakuman)',
  '九蓮宝燈': 'Nine Gates (Chuuren Poutou)',
  '純正九蓮宝燈': 'Pure Nine Gates 9-Wait (Double Yakuman)',
  '天和': 'Heavenly Hand (Tenhou)',
  '地和': 'Earthly Hand (Chiihou)',
  '人和': 'Hand of Man (Renhou)',
  '数え役満': 'Counted Yakuman',
};

// Seat mappings
export function formatSeatName(seat: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return seat;
  const map: Record<string, string> = {
    '東': 'East',
    '南': 'South',
    '西': 'West',
    '北': 'North',
  };
  return map[seat] || seat;
}

export function formatSeatShort(seat: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return seat;
  const map: Record<string, string> = {
    '東': 'E',
    '南': 'S',
    '西': 'W',
    '北': 'N',
  };
  return map[seat] || seat;
}

// Round display translation (e.g. '東1局' -> 'East 1', '南4局 (オーラス)' -> 'South 4 (Final Round)')
export function formatRoundDisplayName(displayName: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return displayName;
  const windMap: Record<string, string> = {
    '東': 'East',
    '南': 'South',
    '西': 'West',
    '北': 'North',
  };
  const match = displayName.match(/^([東南西北])(\d)局(?:\s*\((.*?)\))?/);
  if (!match) return displayName;
  const wind = windMap[match[1]] || match[1];
  const num = match[2];
  const isFinal = match[3] ? ' (Final Round)' : '';
  return `${wind} ${num}${isFinal}`;
}

// Player name translation
export function formatPlayerDisplayName(name: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return name;
  if (name === 'あなた' || name === '自分') return 'You';
  if (name.includes('たけし')) return 'Takeshi';
  if (name.includes('あおい')) return 'Aoi';
  if (name.includes('けんじ')) return 'Kenji';
  if (name === 'プレイヤー') return 'Player';
  return name;
}

// CPU Level translation
export function formatCpuLevel(level: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return level;
  const map: Record<string, string> = {
    '初級': 'Novice',
    '中級': 'Intermediate',
    '上級': 'Expert',
  };
  return map[level] || level;
}

// CPU Title translation
export function formatCpuTitle(title: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return title;
  const map: Record<string, string> = {
    '牌効率特化': 'Tile Efficiency',
    '牌効率重視・全押し型': 'Tile Efficiency & Aggressive',
    '攻守バランス': 'Balanced Play',
    '攻守バランス型': 'Balanced Offense & Defense',
    '鉄壁守備': 'Iron Defense',
    '鉄壁守備・的確な押し引き': 'Iron Defense & Push/Fold',
  };
  return map[title] || title;
}

// Yaku translation with fallback
export function formatYakuName(yakuName: string, lang: MahjongLang = 'ja'): string {
  if (lang !== 'en') return yakuName;
  if (YAKU_TRANSLATIONS[yakuName]) return YAKU_TRANSLATIONS[yakuName];

  // Pattern matches (e.g. 自風 or 場風)
  for (const [key, value] of Object.entries(YAKU_TRANSLATIONS)) {
    if (yakuName.includes(key)) {
      return value;
    }
  }
  return yakuName;
}

// Score level titles in English
export function getScoreTitleEn(
  han?: number,
  fu?: number,
  damanguan?: number
): { title: string; color: string; badgeBg: string } {
  if (damanguan && damanguan > 1) {
    const title =
      damanguan === 2
        ? 'DOUBLE YAKUMAN'
        : damanguan === 3
        ? 'TRIPLE YAKUMAN'
        : `${damanguan}x YAKUMAN`;
    return {
      title,
      color: 'from-amber-300 via-rose-300 to-amber-200',
      badgeBg: 'bg-gradient-to-r from-purple-900/90 via-rose-900/90 to-amber-900/90 border-amber-400/80 text-amber-200 shadow-amber-500/30',
    };
  }
  if (damanguan === 1) {
    return {
      title: 'YAKUMAN (Limit Hand)',
      color: 'from-amber-200 via-yellow-400 to-amber-300',
      badgeBg: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-amber-400 text-amber-300 shadow-amber-500/40',
    };
  }
  if (!han) return { title: '', color: '', badgeBg: '' };

  if (han >= 13) {
    return {
      title: 'COUNTED YAKUMAN (13+ Han)',
      color: 'from-amber-200 via-orange-300 to-yellow-200',
      badgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-300 shadow-amber-500/30',
    };
  }
  if (han >= 11) {
    return {
      title: 'SANBAIMAN (Triple Mangan: 11-12 Han)',
      color: 'from-rose-400 via-pink-400 to-amber-300',
      badgeBg: 'bg-rose-950/90 border-rose-400/80 text-rose-300 shadow-rose-500/30',
    };
  }
  if (han >= 8) {
    return {
      title: 'BAIMAN (Double Mangan: 8-10 Han)',
      color: 'from-purple-300 via-pink-300 to-rose-300',
      badgeBg: 'bg-purple-950/90 border-purple-400/80 text-purple-300 shadow-purple-500/30',
    };
  }
  if (han >= 6) {
    return {
      title: 'HANEMAN (1.5x Mangan: 6-7 Han)',
      color: 'from-blue-300 via-indigo-300 to-teal-200',
      badgeBg: 'bg-indigo-950/90 border-indigo-400/80 text-indigo-300 shadow-indigo-500/30',
    };
  }
  if (han === 5 || (han === 4 && fu && fu >= 40) || (han === 3 && fu && fu >= 70)) {
    return {
      title: 'MANGAN (Limit Hand: 5 Han)',
      color: 'from-emerald-300 via-teal-300 to-cyan-200',
      badgeBg: 'bg-emerald-950/90 border-emerald-400/80 text-emerald-300 shadow-emerald-500/30',
    };
  }

  return { title: '', color: '', badgeBg: '' };
}
