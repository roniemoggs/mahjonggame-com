import Majiang from '@kobalab/majiang-core';
import MajiangAI from '@kobalab/majiang-ai';
import type { CpuDifficulty, CpuProfile } from './types';

// ============================================================================
// CPU PROFILES CONFIGURATION
// ============================================================================

export const CPU_PROFILES: Record<number, CpuProfile> = {
  1: {
    id: 1,
    seatIndex: 1,
    name: '初級ボット: たけし',
    shortName: 'たけし',
    difficulty: 'beginner',
    levelLabel: '初級',
    title: '牌効率重視・全押し型',
    description: '向聴数と有効牌の効率を最優先。相手のリーチにも怯まず攻め続ける攻撃的ビギナー。',
    avatar: {
      emoji: '👦',
      bgGradient: 'from-emerald-500 via-teal-600 to-emerald-800',
      ringColor: 'ring-emerald-400',
      badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      textColor: 'text-emerald-300',
    },
    defenseTendency: 'pure_efficiency',
  },
  2: {
    id: 2,
    seatIndex: 2,
    name: '中級ボット: あおい',
    shortName: 'あおい',
    difficulty: 'normal',
    levelLabel: '中級',
    title: '攻守バランス型',
    description: '手牌の打点と待ちの形を見極め、状況に応じて柔軟に押し引きを切り替える正統派。',
    avatar: {
      emoji: '👩',
      bgGradient: 'from-cyan-500 via-blue-600 to-indigo-800',
      ringColor: 'ring-cyan-400',
      badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
      textColor: 'text-cyan-300',
    },
    defenseTendency: 'balanced',
  },
  3: {
    id: 3,
    seatIndex: 3,
    name: '上級ボット: けんじ',
    shortName: 'けんじ',
    difficulty: 'advanced',
    levelLabel: '上級',
    title: '鉄壁守備・的確な押し引き',
    description: '現物・筋牌・壁（カベ）を徹底計算。相手のリーチには鉄壁のベタオリ、好形高打点のみ押す玄人。',
    avatar: {
      emoji: '👨‍🦳',
      bgGradient: 'from-purple-600 via-violet-700 to-amber-900',
      ringColor: 'ring-purple-400',
      badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
      textColor: 'text-purple-300',
    },
    defenseTendency: 'strong_defense',
  },
};

// ============================================================================
// CPU PLAYER CLASS
// ============================================================================

export interface CpuPlayerOptions {
  delayMs?: number;
  onThinkingChange?: (isThinking: boolean) => void;
  onAction?: (actionType: string, detail?: any) => void;
}

export class CpuPlayer extends MajiangAI {
  public readonly seat: number;
  public readonly profile: CpuProfile;
  private _delayMs: number = 800; // Configurable delay (default 800ms: within 600ms - 1000ms)
  private _activeTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isPaused: boolean = false;
  private _pendingCallback: ((reply?: any) => void) | null = null;
  private _pendingReply: any = null;
  private _onThinkingChange?: (isThinking: boolean) => void;
  private _onAction?: (actionType: string, detail?: any) => void;

  constructor(seat: number, profile?: CpuProfile, options: CpuPlayerOptions = {}) {
    super();
    this.seat = seat;
    this.profile = profile || CPU_PROFILES[seat] || CPU_PROFILES[1];
    this._delayMs = options.delayMs ?? 800;
    this._onThinkingChange = options.onThinkingChange;
    this._onAction = options.onAction;
  }

  public setDelay(delayMs: number): void {
    this._delayMs = Math.max(100, delayMs);
  }

  public pause(): void {
    this._isPaused = true;
    if (this._activeTimeout) {
      clearTimeout(this._activeTimeout);
      this._activeTimeout = null;
    }
  }

  public resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    if (this._pendingCallback && this._pendingReply !== null) {
      const cb = this._pendingCallback;
      const reply = this._pendingReply;
      this._pendingCallback = null;
      this._pendingReply = null;
      this._notifyThinking(false);
      cb(reply);
    }
  }

  public stop(): void {
    this._isPaused = false;
    if (this._activeTimeout) {
      clearTimeout(this._activeTimeout);
      this._activeTimeout = null;
    }
    this._pendingCallback = null;
    this._pendingReply = null;
    this._notifyThinking(false);
  }

  private _notifyThinking(isThinking: boolean): void {
    if (this._onThinkingChange) {
      this._onThinkingChange(isThinking);
    }
  }

  // ==========================================================================
  // ACTION HANDLERS WITH HUMANIZED TIMING
  // ==========================================================================

  public action_zimo(zimo: any, gangzimo?: boolean): void {
    // If not this CPU's turn, respond immediately with empty action
    if (zimo.l !== this._menfeng) {
      if (this._callback) this._callback();
      return;
    }

    // Determine the AI's decision
    let reply: any;
    let m: string | undefined;

    if (this.select_hule(null, gangzimo)) {
      reply = { hule: '-' };
    } else if (this.select_pingju()) {
      reply = { daopai: '-' };
    } else if ((m = this.select_gang())) {
      reply = { gang: m };
    } else {
      reply = { dapai: this.select_dapai() };
    }

    this._notifyThinking(true);

    // Calculate natural humanized delay: e.g. base 800ms +/- 120ms (range: 680ms - 920ms)
    const jitter = (Math.random() - 0.5) * 240;
    const actualDelay = Math.max(120, Math.round(this._delayMs + jitter));

    const executeReply = () => {
      this._activeTimeout = null;
      this._notifyThinking(false);
      if (this._onAction && reply.dapai) {
        this._onAction('dapai', { seat: this.seat, dapai: reply.dapai });
      }
      if (this._callback) {
        this._callback(reply);
      }
    };

    if (this._isPaused) {
      this._pendingCallback = this._callback || null;
      this._pendingReply = reply;
      return;
    }

    this._activeTimeout = setTimeout(executeReply, actualDelay);
  }

  public action_dapai(dapai: any): void {
    // Own discard: check if Riichi declaration completion
    if (dapai.l === this._menfeng) {
      if (this.select_daopai()) {
        if (this._callback) this._callback({ daopai: '-' });
      } else {
        if (this._callback) this._callback();
      }
      return;
    }

    // Opponent discarded: evaluate Ron or Call (Chi / Pon / Kan)
    let m: string | undefined;

    if (this.select_hule(dapai)) {
      // Ron call: brief dramatic pause (300ms)
      this._notifyThinking(true);
      const delay = Math.min(350, Math.round(this._delayMs * 0.4));
      this._activeTimeout = setTimeout(() => {
        this._activeTimeout = null;
        this._notifyThinking(false);
        if (this._callback) this._callback({ hule: '-' });
      }, delay);
      return;
    } else if ((m = this.select_fulou(dapai))) {
      // Pon / Chi call: slight reaction pause (300ms)
      this._notifyThinking(true);
      const delay = Math.min(350, Math.round(this._delayMs * 0.4));
      this._activeTimeout = setTimeout(() => {
        this._activeTimeout = null;
        this._notifyThinking(false);
        if (this._callback) this._callback({ fulou: m });
      }, delay);
      return;
    } else if (this.select_daopai()) {
      if (this._callback) this._callback({ daopai: '-' });
      return;
    } else {
      // Passed: reply immediately so flow is never stalled when not calling
      if (this._callback) this._callback();
    }
  }

  public action_fulou(fulou: any): void {
    if (fulou.l !== this._menfeng) {
      if (this._callback) this._callback();
      return;
    }
    // If Daiminkan, turn continues automatically
    if (fulou.m.match(/^[mpsz]\d{4}/)) {
      if (this._callback) this._callback();
      return;
    }

    // CPU called Chi or Pon: needs to discard a tile
    const dapai = this.select_dapai();
    this._notifyThinking(true);

    const jitter = (Math.random() - 0.5) * 150;
    const actualDelay = Math.max(120, Math.round(this._delayMs * 0.8 + jitter));

    const executeReply = () => {
      this._activeTimeout = null;
      this._notifyThinking(false);
      if (this._callback) this._callback({ dapai });
    };

    if (this._isPaused) {
      this._pendingCallback = this._callback || null;
      this._pendingReply = { dapai };
      return;
    }

    this._activeTimeout = setTimeout(executeReply, actualDelay);
  }

  // ==========================================================================
  // CUSTOM AI DISCARD LOGIC BY PROFILE
  // ==========================================================================

  public select_dapai(info?: any[]): string {
    const diff = this.profile.difficulty;

    if (diff === 'beginner') {
      return this._selectDapaiBeginner(info);
    } else if (diff === 'advanced') {
      return this._selectDapaiAdvanced(info);
    }

    // Normal bot (あおい): balanced play using standard MajiangAI
    return super.select_dapai(info);
  }

  /**
   * 初級ボット: たけし (Beginner)
   * Pure tile efficiency (向聴数・有効牌枚数・搭子のできやすさ最大化).
   * Rarely defends against Riichi (攻め重視・全押し).
   */
  private _selectDapaiBeginner(info?: any[]): string {
    let dapai = '';
    let max = -1;
    const n_xiangting = Majiang.Util.xiangting(this.shoupai);
    const paishu = this._suanpai?.get_paishu ? this._suanpai.get_paishu() : null;
    const paijia = this._suanpai?.make_paijia ? this._suanpai.make_paijia(this.shoupai) : () => 0;
    const cmp = (a: string, b: string) => paijia(a) - paijia(b);

    const candidates = this.get_dapai(this.shoupai).reverse().sort(cmp);

    for (const p of candidates) {
      if (!dapai) dapai = p;
      const shoupai = this.shoupai.clone().dapai(p);
      if (Majiang.Util.xiangting(shoupai) > n_xiangting) continue;

      let ev = 0;
      if (this.eval_shoupai && paishu) {
        ev = this.eval_shoupai(shoupai, paishu);
      } else {
        const tingpai = Majiang.Util.tingpai(shoupai);
        ev = tingpai ? tingpai.length : 0;
      }

      if (ev > max) {
        max = ev;
        dapai = p;
      }
    }

    if (!dapai && candidates.length > 0) {
      dapai = candidates[0];
    }

    // Always declare Riichi if in Tenpai and permitted
    if (this.select_lizhi(dapai)) {
      dapai += '*';
    }

    return dapai;
  }

  /**
   * 上級ボット: けんじ (Advanced)
   * Strong defense (現物・筋牌 preference, 壁・安牌優先, 押し引き厳格).
   */
  private _selectDapaiAdvanced(info?: any[]): string {
    const riichiSeats: number[] = [];
    if (this._model && this._model.shoupai) {
      for (let l = 0; l < 4; l++) {
        if (l !== this._menfeng && this._model.shoupai[l]?.lizhi) {
          riichiSeats.push(l);
        }
      }
    }

    // If no one is Riichi, use optimal MajiangAI play
    if (riichiSeats.length === 0) {
      return super.select_dapai(info);
    }

    const n_xiangting = Majiang.Util.xiangting(this.shoupai);
    const paishu = this._suanpai?.get_paishu ? this._suanpai.get_paishu() : null;
    const candidates = this.get_dapai(this.shoupai);

    // Calculate danger map across all opponents
    const weixian = this._suanpai?.suan_weixian_all
      ? this._suanpai.suan_weixian_all(this.shoupai._bingpai)
      : null;

    // Check for 100% Genbutsu (現物 - discarded by all Riichi players)
    const isGenbutsuForAll = (p: string) => {
      const pClean = p.slice(0, 2);
      return riichiSeats.every((seat) => this._model.he?.[seat]?.find(pClean));
    };

    const isGenbutsuForAny = (p: string) => {
      const pClean = p.slice(0, 2);
      return riichiSeats.some((seat) => this._model.he?.[seat]?.find(pClean));
    };

    // If Kenji is NOT in Tenpai (n_xiangting > 0) -> FOLD (ベタオリ)!
    if (n_xiangting > 0) {
      // 1. First priority: complete Genbutsu against all Riichi players
      const allGenbutsu = candidates.filter(isGenbutsuForAll);
      if (allGenbutsu.length > 0) {
        return allGenbutsu[0];
      }

      // 2. Second priority: Genbutsu against at least one Riichi player
      const anyGenbutsu = candidates.filter(isGenbutsuForAny);
      if (anyGenbutsu.length > 0) {
        return anyGenbutsu[0];
      }

      // 3. Third priority: safest tile by danger calculation (suji / kabe / honor)
      if (weixian) {
        let safest = candidates[0];
        let minRisk = Infinity;
        for (const p of candidates) {
          const risk = weixian(p);
          if (risk < minRisk) {
            minRisk = risk;
            safest = p;
          }
        }
        return safest;
      }
    } else {
      // Kenji IS in Tenpai (n_xiangting === 0): evaluate 押し引き (Push or Fold)
      // Check hand value / expected points:
      let ev = 0;
      if (this.eval_shoupai && paishu) {
        ev = this.eval_shoupai(this.shoupai, paishu);
      }

      const tingpai = Majiang.Util.tingpai(this.shoupai) || [];
      const isGoodWait = tingpai.length >= 2;

      // If hand is high value (ev >= 500) and good wait -> PUSH (全押し)!
      if (ev >= 500 && isGoodWait) {
        return super.select_dapai(info);
      }

      // If low value or bad wait and candidate discard is dangerous (risk >= 5.0) -> FOLD!
      const defaultDapai = super.select_dapai(info);
      const cleanDapai = defaultDapai.replace(/\*$/, '');
      const dapaiRisk = weixian ? weixian(cleanDapai) : 0;

      if (dapaiRisk >= 5.0) {
        // High danger: Kenji chooses safety over bad tenpai
        const allGenbutsu = candidates.filter(isGenbutsuForAll);
        if (allGenbutsu.length > 0) return allGenbutsu[0];
        const anyGenbutsu = candidates.filter(isGenbutsuForAny);
        if (anyGenbutsu.length > 0) return anyGenbutsu[0];
      }

      return defaultDapai;
    }

    return super.select_dapai(info);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createCpuPlayer(seatIndex: number, options: CpuPlayerOptions = {}): CpuPlayer {
  const profile = CPU_PROFILES[seatIndex] || CPU_PROFILES[1];
  return new CpuPlayer(seatIndex, profile, options);
}

export function createAllCpuPlayers(options: CpuPlayerOptions = {}): CpuPlayer[] {
  return [
    createCpuPlayer(1, options), // Seat 1: たけし (Beginner)
    createCpuPlayer(2, options), // Seat 2: あおい (Normal)
    createCpuPlayer(3, options), // Seat 3: けんじ (Advanced)
  ];
}
