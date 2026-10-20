import Majiang from '@kobalab/majiang-core';

export type SeatWind = 0 | 1 | 2 | 3; // 0: 東, 1: 南, 2: 西, 3: 北
export type RoundWind = 0 | 1; // 0: 東, 1: 南

export interface OpenMeldInput {
  type: 'chi' | 'pon' | 'ankan' | 'minkan';
  tiles: string[]; // e.g. ['2m', '3m', '4m'] or ['7z', '7z', '7z']
}

export interface CalculationOptions {
  handTiles: string[]; // Concealed tiles, e.g. ['1m', '2m', ...]
  winTile: string; // The winning tile
  winType: 'tsumo' | 'ron';
  seatWind: SeatWind; // 0: 東 (親), 1: 南, 2: 西, 3: 北
  roundWind: RoundWind; // 0: 東, 1: 南
  riichi: 0 | 1 | 2; // 0: なし, 1: 立直, 2: ダブル立直
  ippatsu: boolean;
  haidi: 0 | 1 | 2; // 0: なし, 1: 海底摸月, 2: 河底撈魚
  rinshan: boolean;
  chankan: boolean;
  tianhu: 0 | 1 | 2; // 0: なし, 1: 天和, 2: 地和
  doraIndicators: string[]; // e.g. ['1m']
  uraDoraIndicators: string[]; // e.g. ['5s']
  honba: number; // 本場数
  riichiSticks: number; // 供託リーチ棒
  openMelds?: OpenMeldInput[];
}

export interface YakuItem {
  name: string;
  han: number | string;
}

export interface PaymentBreakdown {
  summary: string;
  total: number;
  ronPayer?: string;
  ronAmount?: number;
  tsumoDealer?: number;
  tsumoNonDealer?: number;
  honbaBonus: number;
  riichiStickBonus: number;
}

export interface FuItem {
  name: string;
  fu: number;
  note?: string;
}

export interface ScoreCalculationResult {
  isValidTileCount: boolean;
  isWinningHand: boolean;
  han: number;
  fu: number;
  damanguan?: number;
  basePoints: number;
  totalPoints: number;
  title: string;
  titleBadgeBg: string;
  yakuList: YakuItem[];
  payment: PaymentBreakdown;
  fuBreakdown: FuItem[];
  diagnostics?: {
    xiangting: number;
    tingpai: string[];
    isYakuNashi: boolean;
    reason: string;
  };
}

const WIND_NAMES = ['東', '南', '西', '北'] as const;

/**
 * Normalizes standard tile notation '1m'-'9m', '0m' to majiang-core 'm1'-'m9', 'm0'
 */
export function toMajiangTile(tile: string): string {
  const t = tile.trim().toLowerCase();
  if (/^[0-9][mpsz]$/.test(t)) {
    return t[1] + t[0];
  }
  return t;
}

/**
 * Converts majiang-core tile 'm1' to UI notation '1m'
 */
export function fromMajiangTile(tile: string): string {
  const t = tile.trim().toLowerCase().replace(/[^0-9mpsz]/g, '');
  if (/^[mpsz][0-9]$/.test(t)) {
    return t[1] + t[0];
  }
  return t;
}

/**
 * Returns the actual Dora tile given the Dora indicator tile
 */
export function getDoraFromIndicator(indicator: string): string {
  const mTile = toMajiangTile(indicator);
  const realDoraMajiang = Majiang.Shan.zhenbaopai(mTile);
  return fromMajiangTile(realDoraMajiang);
}

/**
 * Formats an array of UI tiles ('1m', '2m', '0m' etc.) into majiang-core paistr 'm123p456...'
 */
export function tilesToMajiangString(tiles: string[]): string {
  const suits: Record<string, string[]> = { m: [], p: [], s: [], z: [] };
  for (const t of tiles) {
    if (!t) continue;
    const num = t[0];
    const s = t[1];
    if (suits[s]) {
      suits[s].push(num);
    }
  }

  let result = '';
  for (const s of ['m', 'p', 's', 'z']) {
    if (suits[s].length > 0) {
      suits[s].sort((a, b) => {
        const valA = a === '0' ? 5.5 : Number(a);
        const valB = b === '0' ? 5.5 : Number(b);
        return valA - valB;
      });
      result += s + suits[s].join('');
    }
  }
  return result;
}

/**
 * Converts open melds into majiang-core fulou notation
 */
export function formatOpenMelds(melds: OpenMeldInput[]): string[] {
  return melds.map((m) => {
    const s = m.tiles[0][1];
    const nums = m.tiles.map((t) => t[0]);

    if (m.type === 'chi') {
      // Chi notation, e.g. m12-3
      return `${s}${nums[0]}${nums[1]}-${nums[2]}`;
    }
    if (m.type === 'pon') {
      // Pon notation, e.g. p555=
      return `${s}${nums[0]}${nums[1]}${nums[2]}=`;
    }
    if (m.type === 'ankan') {
      // Ankan notation, e.g. s8888
      return `${s}${nums.join('')}`;
    }
    if (m.type === 'minkan') {
      // Minkan notation, e.g. z2222-
      return `${s}${nums.join('')}-`;
    }
    return '';
  }).filter(Boolean);
}

/**
 * Calculates Level Title (役満, 倍満, 跳満, 満貫 etc.)
 */
export function getScoreTitle(
  han: number,
  fu: number,
  damanguan?: number
): { title: string; badgeBg: string } {
  if (damanguan && damanguan > 1) {
    return {
      title: damanguan === 2 ? 'ダブル役満' : `${damanguan}倍役満`,
      badgeBg: 'bg-gradient-to-r from-purple-900 via-rose-900 to-amber-900 border-amber-400 text-amber-200',
    };
  }
  if (damanguan === 1) {
    return {
      title: '役満 (YAKUMAN)',
      badgeBg: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-amber-400 text-amber-300',
    };
  }
  if (han >= 13) {
    return {
      title: '数え役満',
      badgeBg: 'bg-amber-950/90 border-amber-400 text-amber-300',
    };
  }
  if (han >= 11) {
    return {
      title: '三倍満',
      badgeBg: 'bg-rose-950/90 border-rose-400 text-rose-300',
    };
  }
  if (han >= 8) {
    return {
      title: '倍満',
      badgeBg: 'bg-purple-950/90 border-purple-400 text-purple-300',
    };
  }
  if (han >= 6) {
    return {
      title: '跳満',
      badgeBg: 'bg-indigo-950/90 border-indigo-400 text-indigo-300',
    };
  }
  if (han === 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
    return {
      title: '満貫',
      badgeBg: 'bg-emerald-950/90 border-emerald-400 text-emerald-300',
    };
  }
  return {
    title: `${fu}符 ${han}翻`,
    badgeBg: 'bg-slate-800 border-slate-700 text-slate-200',
  };
}

/**
 * Detailed Fu Breakdown analysis
 */
function analyzeFuBreakdown(
  handTiles: string[],
  winTile: string,
  winType: 'tsumo' | 'ron',
  seatWind: SeatWind,
  roundWind: RoundWind,
  openMelds: OpenMeldInput[],
  isChiitoitsu: boolean,
  isPinfu: boolean,
  calculatedFu: number
): FuItem[] {
  if (isChiitoitsu) {
    return [{ name: '七対子（固定符）', fu: 25, note: '七対子は符の加算を行わず常に25符固定' }];
  }

  const items: FuItem[] = [];
  items.push({ name: '副底（基本符）', fu: 20, note: '和了したすべての手に与えられる基本点' });

  // Agari way
  const isMenzen = openMelds.filter((m) => m.type !== 'ankan').length === 0;
  if (winType === 'ron' && isMenzen) {
    items.push({ name: '門前加符（メンゼンロン）', fu: 10, note: '鳴いていない状態での出アガリ' });
  } else if (winType === 'tsumo' && !isPinfu) {
    items.push({ name: 'ツモ符', fu: 2, note: '自力ツモによる加符（平和ツモを除く）' });
  }

  // Head (雀頭)
  const allTiles = [...handTiles];
  const counts: Record<string, number> = {};
  for (const t of allTiles) {
    const norm = t === '0m' ? '5m' : t === '0p' ? '5p' : t === '0s' ? '5s' : t;
    counts[norm] = (counts[norm] || 0) + 1;
  }

  // Check yakuhai head
  const seatWindTile = `${seatWind + 1}z`;
  const roundWindTile = `${roundWind + 1}z`;
  const dragonTiles = ['5z', '6z', '7z'];

  if (counts[seatWindTile] >= 2 && counts[roundWindTile] >= 2 && seatWindTile === roundWindTile) {
    items.push({ name: `連風牌の雀頭（${WIND_NAMES[seatWind]}）`, fu: 2, note: '場風かつ自風の対子' });
  } else if (counts[seatWindTile] >= 2) {
    items.push({ name: `自風牌の雀頭（${WIND_NAMES[seatWind]}）`, fu: 2 });
  } else if (counts[roundWindTile] >= 2) {
    items.push({ name: `場風牌の雀頭（${WIND_NAMES[roundWind]}）`, fu: 2 });
  } else {
    for (const d of dragonTiles) {
      if (counts[d] >= 2) {
        const dragonName = d === '5z' ? '白' : d === '6z' ? '發' : '中';
        items.push({ name: `三元牌の雀頭（${dragonName}）`, fu: 2 });
        break;
      }
    }
  }

  // Note for rounded fu
  const rawSum = items.reduce((acc, curr) => acc + curr.fu, 0);
  if (calculatedFu > rawSum) {
    const diff = calculatedFu - rawSum;
    items.push({
      name: '面子・待ち牌による加符 & 10符単位切り上げ',
      fu: diff,
      note: `刻子・槓子の符および待ち牌（嵌張・辺張・単騎）の加符を含む切り上げ計算`,
    });
  }

  return items;
}

/**
 * Core scoring calculation function
 */
export function calculateHandScore(options: CalculationOptions): ScoreCalculationResult {
  const {
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
    openMelds = [],
  } = options;

  const totalTilesCount = handTiles.length + openMelds.length * 3;
  const isDealer = seatWind === 0;

  // Basic validation
  if (totalTilesCount !== 14) {
    return {
      isValidTileCount: false,
      isWinningHand: false,
      han: 0,
      fu: 0,
      basePoints: 0,
      totalPoints: 0,
      title: '手牌枚数不足',
      titleBadgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
      yakuList: [],
      payment: {
        summary: `手牌が14枚になっていません (現在: ${totalTilesCount}枚)`,
        total: 0,
        honbaBonus: 0,
        riichiStickBonus: 0,
      },
      fuBreakdown: [],
      diagnostics: {
        xiangting: 99,
        tingpai: [],
        isYakuNashi: false,
        reason: `手牌を14枚（副露含む）選択してください。`,
      },
    };
  }

  try {
    const meldStrings = formatOpenMelds(openMelds);
    const mWinTile = toMajiangTile(winTile);

    let shoupai: any;
    let rongpaiParam: string | null = null;

    if (winType === 'tsumo') {
      // TSUMO: 14 tiles string, with winTile as the drawn tile
      const otherTiles = [...handTiles];
      const winTileIdx = otherTiles.lastIndexOf(winTile);
      if (winTileIdx !== -1) {
        otherTiles.splice(winTileIdx, 1);
      }
      // Combine 13 tiles + winTile
      const mConcealed = tilesToMajiangString(otherTiles);
      const fulouPart = meldStrings.length > 0 ? `,${meldStrings.join(',')}` : '';
      const fullPaistr = `${mConcealed}${mWinTile}${fulouPart}`;
      shoupai = Majiang.Shoupai.fromString(fullPaistr);
      rongpaiParam = null;
    } else {
      // RON: 13 tiles concealed before ron, and rongpaiParam = 'm1-'
      const otherTiles = [...handTiles];
      const winTileIdx = otherTiles.lastIndexOf(winTile);
      if (winTileIdx !== -1) {
        otherTiles.splice(winTileIdx, 1);
      }
      const mConcealed = tilesToMajiangString(otherTiles);
      const fulouPart = meldStrings.length > 0 ? `,${meldStrings.join(',')}` : '';
      const fullPaistr = `${mConcealed}${fulouPart}`;
      shoupai = Majiang.Shoupai.fromString(fullPaistr);
      // Rongpai must end with '-' (indicating kamicha) or '=' / '+'
      rongpaiParam = `${mWinTile}-`;
    }

    const param = Majiang.Util.hule_param({
      zhuangfeng: roundWind,
      menfeng: seatWind,
      baopai: doraIndicators.map(toMajiangTile),
      fubaopai: riichi > 0 ? uraDoraIndicators.map(toMajiangTile) : null,
      lizhi: riichi,
      yifa: ippatsu && riichi > 0,
      haidi: haidi,
      lingshang: rinshan,
      qianggang: chankan,
      tianhu: tianhu,
      changbang: honba,
      lizhibang: riichiSticks,
    });

    const huleResult = Majiang.Util.hule(shoupai, rongpaiParam, param);

    if (!huleResult || !huleResult.hupai || huleResult.hupai.length === 0) {
      // Not a winning hand! Run diagnostics (xiangting & tingpai)
      const xiangting = Majiang.Util.xiangting(shoupai);
      let tingpaiList: string[] = [];
      try {
        const rawTing = Majiang.Util.tingpai(shoupai);
        tingpaiList = (rawTing || []).map(fromMajiangTile);
      } catch (e) {
        tingpaiList = [];
      }

      const isTenpai = xiangting === 0;
      let reason = 'アガリ形（4面子1雀頭、または七対子・国士無双）になっていません。';
      let isYakuNashi = false;

      if (isTenpai) {
        // Hand might be completed shape but has 0 Han (役なし)!
        isYakuNashi = true;
        reason = 'テンパイしていますが役がありません（役なし）。役牌・タンヤオ・平和・リーチ等が必要です。';
      } else if (xiangting === 1) {
        reason = '一向聴（イーシャンテン）です。あと1枚でテンパイになります。';
      } else if (xiangting > 1) {
        reason = `${xiangting}向聴（シャンテン）です。`;
      }

      return {
        isValidTileCount: true,
        isWinningHand: false,
        han: 0,
        fu: 0,
        basePoints: 0,
        totalPoints: 0,
        title: isYakuNashi ? '役なし (No Yaku)' : '不聴 (ノーテン)',
        titleBadgeBg: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
        yakuList: [],
        payment: {
          summary: isYakuNashi ? '役がないため和了できません' : '和了形が成立していません',
          total: 0,
          honbaBonus: 0,
          riichiStickBonus: 0,
        },
        fuBreakdown: [],
        diagnostics: {
          xiangting,
          tingpai: tingpaiList,
          isYakuNashi,
          reason,
        },
      };
    }

    // Winning Hand!
    const han = huleResult.fanshu || 0;
    const fu = huleResult.fu || 0;
    const damanguan = huleResult.damanguan;
    const baseDefen = huleResult.defen || 0;

    const { title, badgeBg } = getScoreTitle(han, fu, damanguan);

    // Honba bonus: +300 on Ron, +100 each on Tsumo (+300 total)
    const honbaPoints = honba * 300;
    const riichiStickPoints = riichiSticks * 1000;
    const totalWithBonus = baseDefen + honbaPoints + riichiStickPoints;

    // Payment breakdown
    const isPinfu = (huleResult.hupai || []).some((h: any) => h.name === '平和');
    const isChiitoitsu = (huleResult.hupai || []).some((h: any) => h.name === '七対子');

    let paymentSummary = '';
    let ronAmount: number | undefined;
    let tsumoDealer: number | undefined;
    let tsumoNonDealer: number | undefined;

    if (winType === 'ron') {
      ronAmount = baseDefen + honbaPoints;
      paymentSummary = `放銃者から ${ronAmount.toLocaleString()}点 支払い`;
      if (riichiStickPoints > 0) {
        paymentSummary += `（＋供託棒 ${riichiStickPoints.toLocaleString()}点）`;
      }
    } else {
      // Tsumo
      if (isDealer) {
        // Dealer tsumo: 3 children pay equally
        const perPlayer = Math.ceil((baseDefen / 3) / 100) * 100 + honba * 100;
        tsumoNonDealer = perPlayer;
        paymentSummary = `子3名から各 ${perPlayer.toLocaleString()}点 支払い（オール）`;
      } else {
        // Non-dealer tsumo: dealer pays ~half, other 2 children pay ~quarter
        // Calculate based on Majiang fenpei
        const fenpei = huleResult.fenpei || [0, 0, 0, 0];
        const dealerPay = Math.abs(fenpei[0]);
        const nonDealerPay = Math.abs(fenpei[(seatWind + 1) % 4] || 0);

        tsumoDealer = dealerPay;
        tsumoNonDealer = nonDealerPay;
        paymentSummary = `親: ${dealerPay.toLocaleString()}点 / 子2名: 各${nonDealerPay.toLocaleString()}点 支払い`;
      }
      if (riichiStickPoints > 0) {
        paymentSummary += `（＋供託棒 ${riichiStickPoints.toLocaleString()}点）`;
      }
    }

    const yakuList: YakuItem[] = (huleResult.hupai || []).map((h: any) => ({
      name: h.name,
      han: h.fanshu,
    }));

    const fuBreakdown = analyzeFuBreakdown(
      handTiles,
      winTile,
      winType,
      seatWind,
      roundWind,
      openMelds,
      isChiitoitsu,
      isPinfu,
      fu
    );

    return {
      isValidTileCount: true,
      isWinningHand: true,
      han,
      fu,
      damanguan,
      basePoints: baseDefen,
      totalPoints: totalWithBonus,
      title,
      titleBadgeBg: badgeBg,
      yakuList,
      payment: {
        summary: paymentSummary,
        total: totalWithBonus,
        ronAmount,
        tsumoDealer,
        tsumoNonDealer,
        honbaBonus: honbaPoints,
        riichiStickBonus: riichiStickPoints,
      },
      fuBreakdown,
    };
  } catch (error) {
    return {
      isValidTileCount: true,
      isWinningHand: false,
      han: 0,
      fu: 0,
      basePoints: 0,
      totalPoints: 0,
      title: '計算エラー',
      titleBadgeBg: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
      yakuList: [],
      payment: {
        summary: '牌の構成を再確認してください',
        total: 0,
        honbaBonus: 0,
        riichiStickBonus: 0,
      },
      fuBreakdown: [],
      diagnostics: {
        xiangting: 99,
        tingpai: [],
        isYakuNashi: false,
        reason: error instanceof Error ? error.message : '手牌の形式が無効です',
      },
    };
  }
}

/**
 * Educational Hand Presets
 */
export interface HandPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  tiles: string[];
  winTile: string;
  winType: 'tsumo' | 'ron';
  seatWind: SeatWind;
  roundWind: RoundWind;
  riichi: 0 | 1 | 2;
  doraIndicators: string[];
}

export const PRESET_HANDS: HandPreset[] = [
  {
    id: 'pinfu-tsumo',
    name: '平和・門前清自摸和 (20符 2翻)',
    category: '基本形',
    description: '符がつかない平和のツモアガリ。麻雀で唯一の20符計算（子400・700 / 親700オール）。',
    tiles: ['2m', '3m', '4m', '5p', '6p', '7p', '3s', '4s', '5s', '6s', '7s', '9m', '9m', '8s'],
    winTile: '8s',
    winType: 'tsumo',
    seatWind: 1, // 南 (子)
    roundWind: 0, // 東
    riichi: 0,
    doraIndicators: ['1p'],
  },
  {
    id: 'menzen-riichi-ron',
    name: 'リーチ・一発・ドラ1 (40符 3翻)',
    category: '実戦頻出',
    description: 'カンチャン待ちのリーチ一発出アガリ。40符3翻で子5,200点 / 親7,700点。',
    tiles: ['2m', '3m', '4m', '7p', '9p', '2s', '3s', '4s', '6s', '7s', '8s', '1z', '1z', '8p'],
    winTile: '8p',
    winType: 'ron',
    seatWind: 1,
    roundWind: 0,
    riichi: 1,
    doraIndicators: ['1m'], // 2m is dora
  },
  {
    id: 'tanyao-dora3-mangan',
    name: 'メンゼンタンヤオ・赤ドラ2・ドラ1 (満貫 8,000点)',
    category: '満貫級',
    description: '赤五筒・赤五索を絡めた強烈なタンヤオ満貫手。',
    tiles: ['2m', '3m', '4m', '3p', '4p', '0p', '6p', '7p', '8p', '3s', '4s', '0s', '7s', '7s'],
    winTile: '7s',
    winType: 'ron',
    seatWind: 1,
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['2m'], // 3m is dora
  },
  {
    id: 'chiitoitsu-dora2',
    name: '七対子・ドラ2 (25符 4翻 6,400点)',
    category: '特殊形',
    description: '25符固定の七対子。ドラ2枚内蔵で跳満寸前の高打点。',
    tiles: ['2m', '2m', '5m', '5m', '8p', '8p', '1s', '1s', '9s', '9s', '3z', '3z', '7z', '7z'],
    winTile: '7z',
    winType: 'ron',
    seatWind: 1,
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['4m'], // 5m is dora (2枚)
  },
  {
    id: 'sanshoku-pinfu',
    name: 'リーチ・ピンフ・三色同順 (満貫確定)',
    category: '美手・大技',
    description: '美しい三色同順（234）とピンフの完璧な複合。メンピンドラ三色。',
    tiles: ['2m', '3m', '4m', '2p', '3p', '4p', '2s', '3s', '4s', '6s', '7s', '8s', '9p', '9p'],
    winTile: '8s',
    winType: 'ron',
    seatWind: 0, // 親
    roundWind: 0,
    riichi: 1,
    doraIndicators: ['8p'], // 9p is dora
  },
  {
    id: 'honitsu-yakuhai',
    name: '混一色・役牌2 (跳満 12,000点)',
    category: '染め手',
    description: '索子のメンゼンホンイツに白・發が乗った強力な跳満手。',
    tiles: ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '5z', '5z', '5z', '6z', '6z'],
    winTile: '6z',
    winType: 'tsumo',
    seatWind: 1,
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['2p'],
  },
  {
    id: 'chinitsu-baiman',
    name: '清一色・平和・ドラ1 (倍満 16,000点)',
    category: '大技・倍満',
    description: '萬子のみで構成されたメンゼンチンイツ。6翻＋平和1翻＋ドラ1翻で倍満達成。',
    tiles: ['1m', '2m', '3m', '3m', '4m', '5m', '6m', '7m', '8m', '8m', '8m', '9m', '9m', '9m'],
    winTile: '4m',
    winType: 'tsumo',
    seatWind: 1,
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['7m'], // 8m is dora
  },
  {
    id: 'kokushi-musou',
    name: '国士無双 (役満 32,000点)',
    category: '役満',
    description: '一・九・字牌の13種を揃えた伝説の役満。',
    tiles: ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', '1m'],
    winTile: '1m',
    winType: 'ron',
    seatWind: 1,
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['3s'],
  },
  {
    id: 'daisangen',
    name: '大三元 (役満 32,000点)',
    category: '役満',
    description: '白・發・中の刻子3組をすべて揃えた麻雀の王道役満。',
    tiles: ['5z', '5z', '5z', '6z', '6z', '6z', '7z', '7z', '7z', '2m', '3m', '4m', '8s', '8s'],
    winTile: '8s',
    winType: 'tsumo',
    seatWind: 1,
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['9p'],
  },
];

/**
 * Practice Questions / Scoring Quiz Drills
 */
export interface PracticeQuestion {
  id: string;
  title: string;
  difficulty: '初級' | '中級' | '上級';
  tiles: string[];
  winTile: string;
  winType: 'tsumo' | 'ron';
  seatWind: SeatWind;
  roundWind: RoundWind;
  riichi: 0 | 1 | 2;
  doraIndicators: string[];
  correctHan: number;
  correctFu: number;
  correctScore: number;
  scoreDisplay: string;
  explanation: string;
  options: {
    hanOptions: number[];
    fuOptions: number[];
    scoreOptions: number[];
  };
}

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: 'q1',
    title: '平和のツモアガリの符と点数',
    difficulty: '初級',
    tiles: ['2m', '3m', '4m', '5p', '6p', '7p', '2s', '3s', '4s', '6s', '7s', '9m', '9m', '8s'],
    winTile: '8s',
    winType: 'tsumo',
    seatWind: 1, // 南 (子)
    roundWind: 0, // 東
    riichi: 0,
    doraIndicators: ['1z'],
    correctHan: 2,
    correctFu: 20,
    correctScore: 1500,
    scoreDisplay: '子 400・700点（計1,500点）',
    explanation: '「門前清自摸和（1翻）」＋「平和（1翻）」の計2翻。平和ツモは麻雀で唯一ツモ符（2符）がつかない特例ルールがあり、常に「20符固定」となります。子の20符2翻は400点・700点（計1,500点）です。',
    options: {
      hanOptions: [1, 2, 3, 4],
      fuOptions: [20, 25, 30, 40],
      scoreOptions: [1000, 1500, 2000, 2600],
    },
  },
  {
    id: 'q2',
    title: '子の定番30符2翻のロンアガリ',
    difficulty: '初級',
    tiles: ['1m', '2m', '3m', '4p', '5p', '6p', '7s', '8s', '9s', '5z', '5z', '5z', '2p', '2p'],
    winTile: '2p',
    winType: 'ron',
    seatWind: 1, // 南 (子)
    roundWind: 0, // 東
    riichi: 0,
    doraIndicators: ['4s'],
    correctHan: 1,
    correctFu: 30,
    correctScore: 1000,
    scoreDisplay: '1,000点',
    explanation: '役は「役牌 白（1翻）」。符は副底20符＋白の明刻（中張牌なら2符、幺九・字牌は倍の4符）＋門前ロン加符10符＝34符 → 10符単位で切り上げて「40符」...と思いきや、白を鳴いていれば門前加符がなく30符。門前なら40符1翻（1,300点）となります！',
    options: {
      hanOptions: [1, 2, 3, 4],
      fuOptions: [20, 30, 40, 50],
      scoreOptions: [1000, 1300, 2000, 2600],
    },
  },
  {
    id: 'q3',
    title: '七対子の符と点数計算',
    difficulty: '中級',
    tiles: ['1m', '1m', '4m', '4m', '8p', '8p', '3s', '3s', '7s', '7s', '2z', '2z', '6z', '6z'],
    winTile: '6z',
    winType: 'ron',
    seatWind: 1, // 子
    roundWind: 0,
    riichi: 1, // リーチ
    doraIndicators: ['3p'],
    correctHan: 3,
    correctFu: 25,
    correctScore: 3200,
    scoreDisplay: '3,200点',
    explanation: '役は「立直（1翻）」＋「七対子（2翻）」の計3翻。七対子は対子符や単騎待ち符を計算せず、常に「25符固定」として扱われます。子の25符3翻は3,200点です。',
    options: {
      hanOptions: [2, 3, 4, 5],
      fuOptions: [20, 25, 30, 40],
      scoreOptions: [2400, 3200, 4800, 6400],
    },
  },
  {
    id: 'q4',
    title: '暗刻が重なった高符（50符）の手',
    difficulty: '上級',
    tiles: ['1m', '1m', '1m', '9s', '9s', '9s', '3p', '4p', '5p', '6p', '7p', '8p', '2z', '2z'],
    winTile: '2z',
    winType: 'ron',
    seatWind: 0, // 親 (東家)
    roundWind: 0,
    riichi: 0,
    doraIndicators: ['2m'],
    correctHan: 2,
    correctFu: 50,
    correctScore: 4800,
    scoreDisplay: '親 4,800点',
    explanation: '役は「自風 東（1翻）」＋「場風 東（1翻）」＝連風牌2翻。符は副底20符＋一萬の暗刻8符＋九索の暗刻8符＋単騎待ち2符＋門前ロン10符＝48符 → 切り上げ「50符」！親の50符2翻は4,800点となります。',
    options: {
      hanOptions: [1, 2, 3, 4],
      fuOptions: [30, 40, 50, 60],
      scoreOptions: [2900, 3900, 4800, 5800],
    },
  },
];
