import Majiang, {
  type RuleConfig,
  type Shoupai,
  type Game,
  type Player,
} from '@kobalab/majiang-core';
import MajiangAI from '@kobalab/majiang-ai';
import { CpuPlayer, createCpuPlayer, CPU_PROFILES } from './cpuPlayer';
import { soundManager } from './sound';
import type {
  AvailableActions,
  ChiOption,
  DiscardTile,
  GangOption,
  HandInfo,
  MahjongEvent,
  MahjongGameOptions,
  MahjongGameState,
  Meld,
  MeldType,
  PengOption,
  PlayerInfo,
  RoundInfo,
  RoundResult,
  SeatName,
  TileSuit,
  YakuResult,
  WinningHandInfo,
  FinalPlayerRanking,
  FinalGameResult,
} from './types';

export * from './types';

// ============================================================================
// 1. RULE PRESETS
// ============================================================================

/**
 * Standard Japanese Riichi Mahjong Rule Preset (Tenhou / 電脳麻将 standard):
 * - 25,000点持ち / 30,000点返し (トビ終了あり)
 * - 赤ドラ3枚 (赤5萬, 赤5筒, 赤5索)
 * - 喰い断あり (Open Tanyao enabled)
 * - 後付けあり (Atozuke enabled)
 * - 形式テンパイあり (Keishiki Tenpai enabled)
 */
export const STANDARD_RULE_CONFIG = {
  '配給原点': 25000,
  '順位点': ['20.0', '10.0', '-10.0', '-20.0'],
  '連風牌は2符': false,
  '赤牌': { m: 1, p: 1, s: 1 }, // 赤ドラ3枚
  'クイタンあり': true, // 喰い断あり
  '喰い替え許可レベル': 0, // 喰い替えなし
  '場数': 2, // 2: 半荘 (東南戦), 1: 東風戦
  '途中流局あり': true, // 九種九牌, 四風連打, 四家立直, 四開槓
  '流し満貫あり': true,
  'ノーテン宣言あり': false,
  'ノーテン罰あり': true, // 形式テンパイあり
  '最大同時和了数': 2, // ダブロンあり, トリロン流局
  '連荘方式': 2, // テンパイ連荘
  'トビ終了あり': true, // 0点未満トビ終了
  'オーラス止めあり': true,
  '延長戦方式': 1, // サドンデス
  '一発あり': true,
  '裏ドラあり': true,
  'カンドラあり': true,
  'カン裏あり': true,
  'カンドラ後乗せ': true,
  'ツモ番なしリーチあり': false,
  'リーチ後暗槓許可レベル': 2, // 待ちの変わる暗槓不可
  '役満の複合あり': true,
  'ダブル役満あり': true,
  '数え役満あり': true,
  '役満パオあり': true,
  '切り上げ満貫あり': false,
};

export function createStandardRules(options: MahjongGameOptions = {}) {
  const customConfig = { ...STANDARD_RULE_CONFIG };

  if (options.gameType === 'tonpuu') {
    customConfig['場数'] = 1; // 東風戦
  } else {
    customConfig['場数'] = 2; // 半荘
  }

  if (options.initialScore !== undefined) {
    customConfig['配給原点'] = options.initialScore;
  }

  if (options.hasAkaDora === false) {
    customConfig['赤牌'] = { m: 0, p: 0, s: 0 };
  }

  if (options.hasKuitan === false) {
    customConfig['クイタンあり'] = false;
  }

  if (options.hasTobi === false) {
    customConfig['トビ終了あり'] = false;
  }

  return Majiang.rule(customConfig);
}

// ============================================================================
// 2. TILE UTILITIES & SORTING
// ============================================================================

const SEAT_NAMES: SeatName[] = ['東', '南', '西', '北'];

/**
 * Normalizes any tile notation to standard UI notation (e.g. '1m', '0m', '5p', '1z').
 */
export function toStandardTile(tile: string): string {
  if (!tile) return '';
  const clean = tile.trim().replace(/[*_+=-\s]/g, '');
  if (!clean) return '';

  // If format is 'm1', 'm0', 'z1' -> convert to '1m', '0m', '1z'
  if (/^[mpsz]\d$/i.test(clean)) {
    return clean[1] + clean[0].toLowerCase();
  }
  // If already '1m', '0m', '1z'
  if (/^\d[mpsz]$/i.test(clean)) {
    return clean[0] + clean[1].toLowerCase();
  }
  return clean;
}

/**
 * Normalizes any tile notation to Majiang-core engine notation (e.g. 'm1', 'm0', 'p5', 'z1').
 */
export function toMajiangTile(tile: string): string {
  if (!tile) return '';
  const clean = tile.trim();
  // If format is '1m', '0m', '1z' -> convert to 'm1', 'm0', 'z1'
  if (/^\d[mpsz]/i.test(clean)) {
    return clean[1].toLowerCase() + clean[0] + clean.slice(2);
  }
  // If already 'm1', 'm0', 'z1'
  if (/^[mpsz]\d/i.test(clean)) {
    return clean[0].toLowerCase() + clean.slice(1);
  }
  return clean;
}

export interface ParsedTile {
  suit: TileSuit;
  num: number;
  isRed: boolean;
  suitOrder: number;
  numOrder: number;
  raw: string;
}

/**
 * Parses any tile string into structured components.
 */
export function parseTile(tile: string): ParsedTile {
  const clean = tile.trim().replace(/[*_+=-\s]/g, '');
  let suit: TileSuit = 'm';
  let num = 1;

  if (/^[mpsz]\d/i.test(clean)) {
    suit = clean[0].toLowerCase() as TileSuit;
    num = parseInt(clean[1], 10);
  } else if (/^\d[mpsz]/i.test(clean)) {
    num = parseInt(clean[0], 10);
    suit = clean[1].toLowerCase() as TileSuit;
  }

  const isRed = num === 0;
  const suitOrderMap: Record<TileSuit, number> = { m: 0, p: 1, s: 2, z: 3 };
  const suitOrder = suitOrderMap[suit] ?? 99;
  // Red 5 is treated as 4.9 so it neatly sits right before 5
  const numOrder = isRed ? 4.9 : num;

  return { suit, num, isRed, suitOrder, numOrder, raw: tile };
}

/**
 * Sorts hands according to standard Japanese Mahjong order:
 * 萬子 (m) -> 筒子 (p) -> 索子 (s) -> 字牌 (z)
 * Within suits: 1 -> 9 (red 5 is placed alongside 5).
 * Within honor tiles: 東 (1z) -> 南 (2z) -> 西 (3z) -> 北 (4z) -> 白 (5z) -> 發 (6z) -> 中 (7z).
 *
 * Supports both '1m' and 'm1' notations and preserves input formatting.
 */
export function sortTiles(tiles: string[]): string[] {
  if (!tiles || !tiles.length) return [];
  return [...tiles].sort((a, b) => {
    const pa = parseTile(a);
    const pb = parseTile(b);
    if (pa.suitOrder !== pb.suitOrder) {
      return pa.suitOrder - pb.suitOrder;
    }
    if (pa.numOrder !== pb.numOrder) {
      return pa.numOrder - pb.numOrder;
    }
    return a.localeCompare(b);
  });
}

/**
 * Parses a majiang-core meld string (e.g. 'm12-3', 'p555+', 'z1111') into a Meld object.
 */
export function parseMeld(m: string): Meld {
  const suit = m[0].toLowerCase() as TileSuit;
  const directionMatch = m.match(/[\+\=\-]/);
  let direction: Meld['direction'] = 'self';
  let fromSeat = 0;

  if (directionMatch) {
    if (directionMatch[0] === '-') {
      direction = 'kamicha';
      fromSeat = 3; // Left
    } else if (directionMatch[0] === '=') {
      direction = 'toimen';
      fromSeat = 2; // Across
    } else if (directionMatch[0] === '+') {
      direction = 'shimocha';
      fromSeat = 1; // Right
    }
  }

  // Find called tile digit
  const calledDigitMatch = m.match(/\d(?=[\+\=\-])/);
  const calledTile = calledDigitMatch ? toStandardTile(calledDigitMatch[0] + suit) : '';

  // Extract all tile digits in meld
  const digits = m.slice(1).replace(/[\+\=\-]/g, '').split('');
  const tiles = digits.map((d) => toStandardTile(d + suit));

  let type: MeldType = 'chi';
  if (m.match(/^[mpsz]\d{4}$/)) {
    type = 'ankan';
  } else if (m.match(/^[mpsz]\d{3}[\+\=\-]\d$/)) {
    type = 'kakan';
  } else if (m.match(/^[mpsz]\d{4}[\+\=\-]/)) {
    type = 'minkan';
  } else if (m.match(/^[mpsz]\d{3}[\+\=\-]/)) {
    type = 'peng';
  } else {
    type = 'chi';
  }

  return {
    raw: m,
    type,
    suit,
    tiles,
    calledTile,
    fromSeat,
    direction,
  };
}

/**
 * Extracts and sorts concealed tiles and the drawn tsumo tile from a Shoupai object.
 */
export function extractHandTiles(shoupai: Shoupai): {
  tiles: string[];
  concealedTiles: string[];
  tsumoTile: string | null;
  melds: Meld[];
} {
  const concealed: string[] = [];
  const melds: Meld[] = (shoupai._fulou || []).map(parseMeld);
  const zimo = shoupai._zimo && shoupai._zimo.length === 2 ? shoupai._zimo : null;

  for (const s of ['m', 'p', 's', 'z']) {
    const bp = shoupai._bingpai[s as TileSuit];
    const nHongpai = s === 'z' ? 0 : bp[0];
    let redLeft = nHongpai;

    for (let n = 1; n < bp.length; n++) {
      let count = bp[n];
      if (zimo) {
        if (s + n === zimo) count--;
        if (n === 5 && s + '0' === zimo) {
          count--;
          redLeft--;
        }
      }
      for (let i = 0; i < count; i++) {
        if (n === 5 && redLeft > 0) {
          concealed.push(toStandardTile('0' + s));
          redLeft--;
        } else {
          concealed.push(toStandardTile(n + s));
        }
      }
    }
  }

  const sortedConcealed = sortTiles(concealed);
  const stdTsumo = zimo ? toStandardTile(zimo) : null;
  const allTiles = stdTsumo ? [...sortedConcealed, stdTsumo] : sortedConcealed;

  return {
    tiles: allTiles,
    concealedTiles: sortedConcealed,
    tsumoTile: stdTsumo,
    melds,
  };
}

// ============================================================================
// 3. HUMAN PLAYER WRAPPER
// ============================================================================

export class HumanPlayer extends Majiang.Player {
  private _engine: MahjongGameEngine;
  private _pendingCallback?: (reply?: any) => void;

  constructor(engine: MahjongGameEngine) {
    super();
    this._engine = engine;
  }

  get pendingCallback() {
    return this._pendingCallback;
  }

  action(msg: any, callback?: (reply?: any) => void) {
    this._pendingCallback = callback;
    try {
      super.action(msg, callback);
    } catch (err) {
      console.error('[HumanPlayer] super.action error:', err);
      this.reply({});
    }
  }

  action_kaiju(kaiju: any) {
    try {
      this._engine.handleKaiju(kaiju);
    } catch (err) {
      console.error('[HumanPlayer] action_kaiju error:', err);
    } finally {
      this.reply({});
    }
  }

  action_qipai(qipai: any) {
    try {
      this._engine.handleQipai(qipai);
    } catch (err) {
      console.error('[HumanPlayer] action_qipai error:', err);
    } finally {
      this.reply({});
    }
  }

  action_zimo(zimo: any, gangzimo?: boolean) {
    try {
      this._engine.handleZimo(zimo, gangzimo);
      if (zimo.l === this._menfeng) {
        // It is the human player's turn to act!
        this._engine.computeTurnActions();
      } else {
        this.reply({});
      }
    } catch (err) {
      console.error('[HumanPlayer] action_zimo error:', err);
      this.reply({});
    }
  }

  action_dapai(dapai: any) {
    try {
      this._engine.handleDapai(dapai);
      if (dapai.l !== this._menfeng) {
        // Opponent discarded: check if human player can Ron, Chi, Pon, or Kan
        this._engine.computeCallActions(dapai);
      } else {
        this.reply({});
      }
    } catch (err) {
      console.error('[HumanPlayer] action_dapai error:', err);
      this.reply({});
    }
  }

  action_fulou(fulou: any) {
    try {
      this._engine.handleFulou(fulou);
      if (fulou.l === this._menfeng && !fulou.m.match(/^[mpsz]\d{4}/)) {
        // Human called Chi/Pon: now need to discard
        this._engine.computeDiscardOnlyActions();
      } else {
        this.reply({});
      }
    } catch (err) {
      console.error('[HumanPlayer] action_fulou error:', err);
      this.reply({});
    }
  }

  action_gang(gang: any) {
    try {
      this._engine.handleGang(gang);
    } catch (err) {
      console.error('[HumanPlayer] action_gang error:', err);
    } finally {
      this.reply({});
    }
  }

  action_kaigang(kaigang: any) {
    try {
      this._engine.handleKaigang(kaigang);
    } catch (err) {
      console.error('[HumanPlayer] action_kaigang error:', err);
    }
  }

  action_hule(hule: any) {
    try {
      this._engine.handleHule(hule);
    } catch (err) {
      console.error('[HumanPlayer] action_hule error:', err);
    } finally {
      this.reply({});
    }
  }

  action_pingju(pingju: any) {
    try {
      this._engine.handlePingju(pingju);
    } catch (err) {
      console.error('[HumanPlayer] action_pingju error:', err);
    } finally {
      this.reply({});
    }
  }

  action_jieju(paipu: any) {
    try {
      this._engine.handleJieju(paipu);
    } catch (err) {
      console.error('[HumanPlayer] action_jieju error:', err);
    } finally {
      this.reply({});
    }
  }

  reply(response: any = {}) {
    const cb = this._pendingCallback;
    this._pendingCallback = undefined;
    if (cb) {
      try {
        cb(response);
      } catch (err) {
        console.error('[HumanPlayer] reply callback error:', err);
      }
    }
  }
}

// ============================================================================
// 4. MAHJONG GAME ENGINE
// ============================================================================

export class MahjongGameEngine {
  private _game: Game | null = null;
  private _rule: RuleConfig;
  private _humanPlayer: HumanPlayer | null = null;
  private _cpuPlayers: CpuPlayer[] = [];
  private _players: Player[] = [];
  private _options: MahjongGameOptions;
  private _state: MahjongGameState;
  private _stateListeners: Set<(state: MahjongGameState) => void> = new Set();
  private _eventListeners: Set<(event: MahjongEvent) => void> = new Set();
  private _speedMode: 'normal' | 'fast' = 'normal';
  private _speedMs: number = 800;
  private _isPaused: boolean = false;
  private _watchdogInterval: ReturnType<typeof setInterval> | null = null;
  private _lastActivityTime: number = Date.now();
  private _autoPassTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: MahjongGameOptions = {}) {
    this._options = options;
    this._rule = createStandardRules(options);
    this._speedMode = options.speedMode ?? 'normal';
    this._speedMs = options.turnDelayMs ?? (this._speedMode === 'fast' ? 250 : 800);
    this._state = this._getInitialState();
  }

  private _getInitialState(): MahjongGameState {
    const initialPlayers: PlayerInfo[] = [0, 1, 2, 3].map((idx) => {
      const isHuman = idx === 0;
      const cpuProfile = !isHuman ? CPU_PROFILES[idx] : undefined;
      return {
        id: idx,
        name: isHuman ? 'あなた' : cpuProfile?.name || `CPU ${SEAT_NAMES[idx]}`,
        shortName: isHuman ? 'あなた' : cpuProfile?.shortName || `CPU ${SEAT_NAMES[idx]}`,
        seat: SEAT_NAMES[idx],
        seatIndex: idx,
        score: this._options.initialScore ?? 25000,
        isHuman,
        isDealer: idx === 0,
        isRiichi: false,
        menzen: true,
        melds: [],
        discards: [],
        handCount: 13,
        difficulty: cpuProfile?.difficulty,
        levelLabel: cpuProfile?.levelLabel,
        title: cpuProfile?.title,
        description: cpuProfile?.description,
        avatar: cpuProfile?.avatar || {
          emoji: '👤',
          bgGradient: 'from-emerald-600 via-teal-700 to-slate-900',
          ringColor: 'ring-emerald-400',
          badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          textColor: 'text-emerald-300',
        },
        isThinking: false,
      };
    });

    return {
      gameStatus: 'idle',
      isPaused: false,
      speedMode: this._speedMode,
      round: {
        gameType: this._options.gameType || 'hanchan',
        wind: '東',
        roundNumber: 1,
        displayName: '東1局',
        honba: 0,
        riichiSticks: 0,
        dealerIndex: 0,
        isAllLast: false,
      },
      scores: [25000, 25000, 25000, 25000],
      myHand: {
        tiles: [],
        concealedTiles: [],
        tsumoTile: null,
        melds: [],
        isTenpai: false,
        shanten: 8,
        waits: [],
      },
      doraIndicators: [],
      discards: [[], [], [], []],
      melds: [[], [], [], []],
      remainingTiles: 70,
      activeTurn: 0,
      availableActions: this._getEmptyActions(),
      players: initialPlayers,
      roundResult: null,
      finalResult: null,
      lastDiscard: null,
    };
  }

  private _getEmptyActions(): AvailableActions {
    return {
      canDiscard: false,
      discardableTiles: [],
      riichi: { allowed: false, discardTiles: [] },
      tsumo: false,
      ron: false,
      chi: [],
      peng: [],
      gang: [],
      pass: false,
      kyuushuu: false,
    };
  }

  // ==========================================================================
  // Public Lifecycle & Controls
  // ==========================================================================

  public start(): void {
    this.stop();

    this._humanPlayer = new HumanPlayer(this);
    this._cpuPlayers = [
      createCpuPlayer(1, {
        delayMs: this._speedMs,
        onThinkingChange: (isThinking) => this._setPlayerThinking(1, isThinking),
      }),
      createCpuPlayer(2, {
        delayMs: this._speedMs,
        onThinkingChange: (isThinking) => this._setPlayerThinking(2, isThinking),
      }),
      createCpuPlayer(3, {
        delayMs: this._speedMs,
        onThinkingChange: (isThinking) => this._setPlayerThinking(3, isThinking),
      }),
    ];

    this._players = [
      this._humanPlayer,
      this._cpuPlayers[0],
      this._cpuPlayers[1],
      this._cpuPlayers[2],
    ];

    this._game = new Majiang.Game(
      this._players,
      (paipu) => {
        this.handleJieju(paipu);
      },
      this._rule
    );

    this._game.model.player = [
      'あなた',
      CPU_PROFILES[1].name,
      CPU_PROFILES[2].name,
      CPU_PROFILES[3].name,
    ];

    this._game._speed = 1;
    this._game._dwell = this._speedMode === 'fast' ? 100 : 350;

    this._isPaused = false;
    this._updateState({
      gameStatus: 'playing',
      isPaused: false,
      scores: [0, 1, 2, 3].map(() => this._options.initialScore ?? 25000),
    });

    this._startWatchdog();

    // Start with East dealer
    this._game.kaiju(0);
  }

  public stop(): void {
    this._stopWatchdog();
    if (this._cpuPlayers && this._cpuPlayers.length > 0) {
      this._cpuPlayers.forEach((cpu) => cpu.stop());
      this._cpuPlayers = [];
    }
    this._isPaused = false;
    if (this._game) {
      this._game.stop();
      this._game = null;
    }
    this._updateState({ gameStatus: 'idle', isPaused: false });
  }

  public pause(): void {
    if (this._state.gameStatus !== 'playing') return;
    this._isPaused = true;
    this._clearAutoPassTimer();
    this._cpuPlayers.forEach((cpu) => cpu.pause());
    this._updateState({ isPaused: true });
  }

  public resume(): void {
    if (this._state.gameStatus !== 'playing') return;
    this._isPaused = false;
    this._lastActivityTime = Date.now();
    this._cpuPlayers.forEach((cpu) => cpu.resume());
    // If the human player was waiting on a call decision when paused, restart auto-pass timer
    if (this._state.availableActions.pass && this._humanPlayer?.pendingCallback) {
      if (this._autoPassTimer) clearTimeout(this._autoPassTimer);
      this._autoPassTimer = setTimeout(() => {
        if (this._humanPlayer?.pendingCallback && this._state.availableActions.pass) {
          console.warn('[MahjongGameEngine] Call action timed out (15s). Auto-passing to resume game.');
          this.passAction();
        }
      }, 15000);
    }
    this._updateState({ isPaused: false });
  }

  public togglePause(): void {
    if (this._isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public isPaused(): boolean {
    return this._isPaused;
  }

  public nextRound(): void {
    if (this._state.gameStatus === 'round_end' && this._game) {
      this._clearAutoPassTimer();
      this._updateState({
        gameStatus: 'playing',
        isPaused: false,
        roundResult: null,
        availableActions: this._getEmptyActions(),
      });
      this._lastActivityTime = Date.now();
      // Majiang-core advances to next hand via last()
      this._game.last();
    }
  }

  public setSpeedMode(mode: 'normal' | 'fast'): void {
    this._speedMode = mode;
    this._speedMs = mode === 'fast' ? 250 : 800;
    this._cpuPlayers.forEach((cpu) => cpu.setDelay(this._speedMs));
    if (this._game) {
      this._game._dwell = mode === 'fast' ? 100 : 350;
    }
    this._updateState({ speedMode: mode });
  }

  public setSpeed(delayMs: number): void {
    this._speedMs = Math.max(100, delayMs);
    this._speedMode = delayMs <= 400 ? 'fast' : 'normal';
    this._cpuPlayers.forEach((cpu) => cpu.setDelay(this._speedMs));
    if (this._game) {
      this._game._dwell = Math.min(200, Math.round(this._speedMs / 2));
    }
    this._updateState({ speedMode: this._speedMode });
  }

  private _setPlayerThinking(seatIndex: number, isThinking: boolean): void {
    const players = this._state.players.map((p, idx) =>
      idx === seatIndex ? { ...p, isThinking } : p
    );
    this._updateState({ players });
  }

  // ==========================================================================
  // Production Watchdog & Stall Recovery
  // ==========================================================================

  private _startWatchdog(): void {
    this._stopWatchdog();
    this._lastActivityTime = Date.now();
    this._watchdogInterval = setInterval(() => {
      this._checkWatchdog();
    }, 1200);
  }

  private _stopWatchdog(): void {
    if (this._watchdogInterval) {
      clearInterval(this._watchdogInterval);
      this._watchdogInterval = null;
    }
    this._clearAutoPassTimer();
  }

  private _checkWatchdog(): void {
    if (this._isPaused || this._state.gameStatus !== 'playing' || !this._game) return;

    // NEVER trigger watchdog if human player is currently deciding on a call action (Chi, Peng, Gang, Ron, Pass)
    if (this._state.availableActions.pass || this._autoPassTimer !== null) {
      return;
    }

    // NEVER trigger watchdog if it's the human player's turn to discard
    if (this._state.activeTurn === 0 || this._state.availableActions.canDiscard) {
      return;
    }

    const idleMs = Date.now() - this._lastActivityTime;

    // Failsafe 1: If it's a CPU bot's turn (seat 1, 2, or 3) and no action for > 3500ms
    if (this._state.activeTurn !== 0 && idleMs > 3500) {
      console.warn(`[Watchdog] CPU stall detected on seat ${this._state.activeTurn} (idle ${idleMs}ms). Unsticking engine...`);

      // 1. Flush any pending CPU timeout
      for (const cpu of this._cpuPlayers) {
        cpu.forceFlushPendingAction();
      }

      // 2. Unstick Majiang.Game if it is waiting in call_players for CPU bots only (never touch human player)
      const game = this._game as any;
      if (game && Array.isArray(game._reply)) {
        let filledAny = false;
        // Check only CPU bot seats (1, 2, 3) - NEVER auto-fill human player (seat 0)
        for (let l = 1; l < 4; l++) {
          const id = game._model?.player_id?.[l];
          if (id !== undefined && id !== 0 && !game._reply[id]) {
            console.warn(`[Watchdog] CPU Player ${id} (seat ${l}) missing reply in game._reply, auto-filling.`);
            game._reply[id] = {};
            filledAny = true;
          }
        }
        if (filledAny && !game._timeout_id) {
          try {
            game._timeout_id = setTimeout(() => game.next(), 0);
          } catch (err) {
            console.error('[Watchdog] Error triggering game.next():', err);
          }
        }
      }

      this._lastActivityTime = Date.now();
    }
  }

  private _clearAutoPassTimer(): void {
    if (this._autoPassTimer) {
      clearTimeout(this._autoPassTimer);
      this._autoPassTimer = null;
    }
  }

  // ==========================================================================
  // Human Player Action Triggers
  // ==========================================================================

  public discard(tile: string): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    const majiangTile = toMajiangTile(tile);
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ dapai: majiangTile });
  }

  public declareRiichi(tile: string): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    const majiangTile = toMajiangTile(tile);
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ dapai: majiangTile + '*' });
  }

  public declareTsumo(): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ hule: '-' });
  }

  public declareRon(): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ hule: '-' });
  }

  public callChi(meld: string): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ fulou: meld });
  }

  public callPeng(meld: string): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ fulou: meld });
  }

  public callGang(meld: string): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    // If Daiminkan (on opponent discard), send fulou. If Ankan/Kakan (on turn), send gang.
    if (meld.match(/^[mpsz]\d{4}[\+\=\-]/)) {
      this._humanPlayer.reply({ fulou: meld });
    } else {
      this._humanPlayer.reply({ gang: meld });
    }
  }

  public declareKyuushuu(): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({ daopai: '-' });
  }

  public passAction(): void {
    this._clearAutoPassTimer();
    if (!this._humanPlayer?.pendingCallback) return;
    this._updateState({ availableActions: this._getEmptyActions() });
    this._humanPlayer.reply({});
  }

  // ==========================================================================
  // State Listeners & Subscriptions
  // ==========================================================================

  public getState(): MahjongGameState {
    return this._state;
  }

  public onStateChange(listener: (state: MahjongGameState) => void): () => void {
    this._stateListeners.add(listener);
    listener(this._state);
    return () => this._stateListeners.delete(listener);
  }

  public onEvent(listener: (event: MahjongEvent) => void): () => void {
    this._eventListeners.add(listener);
    return () => this._eventListeners.delete(listener);
  }

  private _updateState(partial: Partial<MahjongGameState>): void {
    this._lastActivityTime = Date.now();
    this._state = { ...this._state, ...partial };
    this._stateListeners.forEach((listener) => listener(this._state));
  }

  private _dispatchEvent(event: MahjongEvent): void {
    this._eventListeners.forEach((listener) => listener(event));
  }

  // ==========================================================================
  // Internal Event Handlers & State Sync
  // ==========================================================================

  public handleKaiju(kaiju: any): void {
    const playerNames = kaiju.player || ['あなた', 'CPU 下家', 'CPU 対面', 'CPU 上家'];
    this._dispatchEvent({
      type: 'game_start',
      title: kaiju.title || '麻雀ゲーム',
      players: playerNames,
    });
  }

  public handleQipai(qipai: any): void {
    if (!this._humanPlayer) return;
    const model = this._humanPlayer.model;

    const roundWind = qipai.zhuangfeng === 0 ? '東' : '南';
    const roundNumber = qipai.jushu + 1;
    const isAllLast =
      (this._options.gameType === 'tonpuu' && roundWind === '東' && roundNumber === 4) ||
      (roundWind === '南' && roundNumber === 4);

    const displayName = isAllLast
      ? `${roundWind}${roundNumber}局 (オーラス)`
      : `${roundWind}${roundNumber}局`;

    const round: RoundInfo = {
      gameType: this._options.gameType || 'hanchan',
      wind: roundWind as SeatName,
      roundNumber,
      displayName,
      honba: qipai.changbang || 0,
      riichiSticks: qipai.lizhibang || 0,
      dealerIndex: 0, // Seat 0 (東) of this hand is dealer
      isAllLast,
    };

    const scores = [0, 1, 2, 3].map((l) => {
      const pid = model.player_id[l];
      return model.defen[pid] ?? 25000;
    });

    const doraIndicators = [toStandardTile(qipai.baopai)];
    const myHand = this._computeMyHandInfo();

    const players: PlayerInfo[] = [0, 1, 2, 3].map((seatIdx) => {
      const pid = model.player_id[seatIdx];
      const isHuman = pid === 0;
      const cpuProfile = !isHuman ? CPU_PROFILES[seatIdx] : undefined;
      return {
        id: pid,
        name: isHuman ? 'あなた' : cpuProfile?.name || model.player[pid] || `CPU ${SEAT_NAMES[seatIdx]}`,
        shortName: isHuman ? 'あなた' : cpuProfile?.shortName || `CPU ${SEAT_NAMES[seatIdx]}`,
        seat: SEAT_NAMES[seatIdx],
        seatIndex: seatIdx,
        score: scores[seatIdx],
        isHuman,
        isDealer: seatIdx === 0,
        isRiichi: false,
        menzen: true,
        melds: [],
        discards: [],
        handCount: 13,
        difficulty: cpuProfile?.difficulty,
        levelLabel: cpuProfile?.levelLabel,
        title: cpuProfile?.title,
        description: cpuProfile?.description,
        avatar: cpuProfile?.avatar || {
          emoji: '👤',
          bgGradient: 'from-emerald-600 via-teal-700 to-slate-900',
          ringColor: 'ring-emerald-400',
          badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          textColor: 'text-emerald-300',
        },
        isThinking: false,
      };
    });

    this._updateState({
      round,
      scores,
      doraIndicators,
      discards: [[], [], [], []],
      melds: [[], [], [], []],
      remainingTiles: 70,
      activeTurn: 0,
      myHand,
      players,
      availableActions: this._getEmptyActions(),
      lastDiscard: null,
    });

    this._dispatchEvent({
      type: 'round_start',
      round,
      scores,
      doraIndicator: doraIndicators[0],
    });
  }

  public handleZimo(zimo: any, _gangzimo?: boolean): void {
    if (!this._humanPlayer) return;
    const model = this._humanPlayer.model;
    const remaining = model.shan?.paishu ?? 70;
    const turnSeat = zimo.l; // Seat 0..3

    // Update player hand counts
    const players = this._state.players.map((p, idx) => ({
      ...p,
      handCount: idx === turnSeat ? 14 : 13,
    }));

    const myHand = this._computeMyHandInfo();

    this._updateState({
      remainingTiles: remaining,
      activeTurn: turnSeat,
      myHand,
      players,
    });

    this._dispatchEvent({
      type: 'zimo',
      player: turnSeat,
      tile: zimo.p ? toStandardTile(zimo.p) : undefined,
      remainingTiles: remaining,
    });
  }

  public handleDapai(dapai: any): void {
    if (!this._humanPlayer) return;
    const seat = dapai.l;
    const rawTile = dapai.p;
    const isRiichi = rawTile.slice(-1) === '*';
    const isTsumogiri = rawTile.includes('_');
    const tile = toStandardTile(rawTile);

    const discardTile: DiscardTile = {
      tile,
      raw: rawTile,
      isRiichi,
      isTsumogiri,
      isCalled: false,
    };

    const newDiscards = this._state.discards.map((row, idx) =>
      idx === seat ? [...row, discardTile] : [...row]
    );

    const players = this._state.players.map((p, idx) => {
      if (idx === seat) {
        return {
          ...p,
          isRiichi: p.isRiichi || isRiichi,
          handCount: 13,
        };
      }
      return p;
    });

    this._updateState({
      discards: newDiscards,
      players,
      lastDiscard: { seat, tile, isRiichi },
    });

    this._dispatchEvent({
      type: 'dapai',
      player: seat,
      tile,
      isRiichi,
      isTsumogiri,
    });

    soundManager.playTileDiscard();

    if (isRiichi) {
      soundManager.playRiichi();
      this._dispatchEvent({ type: 'riichi_declared', player: seat });
    }
  }

  public handleFulou(fulou: any): void {
    if (!this._humanPlayer) return;
    const seat = fulou.l;
    const meld = parseMeld(fulou.m);

    // Mark previous discard as called
    const lastSeat = (seat + '_-=+'.indexOf(fulou.m.match(/[\+\=\-]/)?.[0] || ' ')) % 4;
    const newDiscards = this._state.discards.map((row, idx) => {
      if (idx === lastSeat && row.length > 0) {
        const lastIndex = row.length - 1;
        const updated = [...row];
        updated[lastIndex] = { ...updated[lastIndex], isCalled: true };
        return updated;
      }
      return row;
    });

    const newMelds = this._state.melds.map((row, idx) =>
      idx === seat ? [...row, meld] : [...row]
    );

    const players = this._state.players.map((p, idx) =>
      idx === seat
        ? {
            ...p,
            menzen: p.menzen && meld.type === 'ankan',
            melds: newMelds[idx],
          }
        : p
    );

    const myHand = this._computeMyHandInfo();

    this._updateState({
      discards: newDiscards,
      melds: newMelds,
      players,
      myHand,
      activeTurn: seat,
    });

    soundManager.playCall();

    this._dispatchEvent({ type: 'fulou', player: seat, meld });
  }

  public handleGang(gang: any): void {
    const seat = gang.l;
    const meld = parseMeld(gang.m);

    const newMelds = this._state.melds.map((row, idx) => {
      if (idx === seat) {
        if (meld.type === 'kakan') {
          // Upgrade existing Pon
          const basePrefix = meld.raw.slice(0, 5);
          return row.map((m) => (m.raw.startsWith(basePrefix) ? meld : m));
        }
        return [...row, meld];
      }
      return row;
    });

    const players = this._state.players.map((p, idx) =>
      idx === seat
        ? {
            ...p,
            melds: newMelds[idx],
          }
        : p
    );

    const myHand = this._computeMyHandInfo();

    this._updateState({
      melds: newMelds,
      players,
      myHand,
      activeTurn: seat,
    });

    this._dispatchEvent({ type: 'gang', player: seat, meld });
  }

  public handleKaigang(kaigang: any): void {
    const newDora = toStandardTile(kaigang.baopai);
    const doraIndicators = [...this._state.doraIndicators, newDora];
    this._updateState({ doraIndicators });
    this._dispatchEvent({ type: 'kaigang', doraIndicator: newDora });
  }

  public handleHule(hule: any): void {
    if (!this._humanPlayer) return;
    const model = this._humanPlayer.model;
    const winnerSeat = hule.l;
    const loserSeat = hule.baojia !== null ? hule.baojia : undefined;
    const winnerPid = model.player_id[winnerSeat];
    const loserPid = loserSeat !== undefined ? model.player_id[loserSeat] : undefined;

    const winnerName = model.player[winnerPid] || `Seat ${SEAT_NAMES[winnerSeat]}`;
    const loserName = loserPid !== undefined ? model.player[loserPid] : undefined;

    soundManager.playWin();

    const yaku: YakuResult[] = (hule.hupai || []).map((h: any) => ({
      name: h.name,
      han: h.fanshu,
    }));

    const deltaScores = hule.fenpei || [0, 0, 0, 0];
    const initialScores = [...this._state.scores];
    const newScores = initialScores.map((sc, i) => sc + (deltaScores[i] || 0));

    // Determine winning tile
    let winTile: string = '';
    if (loserSeat !== undefined) {
      winTile = this._state.lastDiscard?.tile || '';
    } else {
      const zimo = model.shoupai[winnerSeat]?._zimo;
      winTile = zimo ? toStandardTile(zimo) : '';
    }

    // Extract winner's hand
    let winnerConcealed: string[] = [];
    let winnerMelds: Meld[] = [];
    if (hule.shoupai) {
      try {
        const winnerShoupai = Majiang.Shoupai.fromString(hule.shoupai);
        const extracted = extractHandTiles(winnerShoupai);
        winnerConcealed = extracted.concealedTiles;
        winnerMelds = extracted.melds;
        if (!winTile && extracted.tsumoTile) {
          winTile = extracted.tsumoTile;
        }
      } catch {
        const extracted = extractHandTiles(model.shoupai[winnerSeat]);
        winnerConcealed = extracted.concealedTiles;
        winnerMelds = extracted.melds;
      }
    } else {
      const extracted = extractHandTiles(model.shoupai[winnerSeat]);
      winnerConcealed = extracted.concealedTiles;
      winnerMelds = extracted.melds;
    }

    const winnerIsRiichi =
      !!this._state.players[winnerSeat]?.isRiichi ||
      yaku.some((y) => y.name.includes('立直'));

    const uraDoraIndicators =
      hule.fubaopai && winnerIsRiichi
        ? hule.fubaopai.map(toStandardTile)
        : undefined;

    const winningHand: WinningHandInfo = {
      seat: winnerSeat,
      playerName: winnerName,
      isDealer: winnerSeat === 0,
      isRiichi: winnerIsRiichi,
      concealedTiles: winnerConcealed,
      winTile: winTile || (winnerConcealed[winnerConcealed.length - 1] || '1m'),
      winType: loserSeat !== undefined ? 'ron' : 'tsumo',
      melds: winnerMelds,
      doraIndicators: this._state.doraIndicators,
      uraDoraIndicators,
    };

    const revealedHands = [0, 1, 2, 3].map((seatIdx) => {
      const shoupai = model.shoupai[seatIdx];
      const extracted = extractHandTiles(shoupai);
      return {
        seat: seatIdx,
        playerName: model.player[model.player_id[seatIdx]],
        tiles: extracted.tiles,
        melds: extracted.melds,
      };
    });

    const isTobi = newScores.some((s) => s < 0);

    const roundResult: RoundResult = {
      type: 'hule',
      name: loserSeat !== undefined ? 'ロン和了' : 'ツモ和了',
      winnerSeat,
      winnerName,
      loserSeat,
      loserName,
      han: hule.fanshu,
      fu: hule.fu,
      damanguan: hule.damanguan,
      points: hule.defen,
      yaku,
      deltaScores,
      initialScores,
      doraIndicators: this._state.doraIndicators,
      uraDoraIndicators,
      winTile: winningHand.winTile,
      winType: winningHand.winType,
      winningHand,
      revealedHands,
      isGameOver: isTobi,
    };

    this._updateState({
      scores: newScores,
      roundResult,
      gameStatus: 'round_end',
      availableActions: this._getEmptyActions(),
    });

    this._dispatchEvent({ type: 'round_end', result: roundResult });
  }

  public handlePingju(pingju: any): void {
    if (!this._humanPlayer) return;
    const model = this._humanPlayer.model;
    const deltaScores = pingju.fenpei || [0, 0, 0, 0];
    const initialScores = [...this._state.scores];
    const newScores = initialScores.map((sc, i) => sc + (deltaScores[i] || 0));

    soundManager.playRyukyoku();

    const revealedHands = [0, 1, 2, 3].map((seatIdx) => {
      const shoupai = model.shoupai[seatIdx];
      const extracted = extractHandTiles(shoupai);
      const isTenpai = Majiang.Util.xiangting(shoupai) === 0;
      let waits: string[] = [];
      if (isTenpai) {
        waits = (Majiang.Util.tingpai(shoupai) || []).map(toStandardTile);
      }
      return {
        seat: seatIdx,
        playerName: model.player[model.player_id[seatIdx]],
        tiles: extracted.tiles,
        melds: extracted.melds,
        isTenpai,
        waits,
      };
    });

    const isTobi = newScores.some((s) => s < 0);

    const roundResult: RoundResult = {
      type: 'pingju',
      name: pingju.name || '荒牌平局',
      deltaScores,
      initialScores,
      doraIndicators: this._state.doraIndicators,
      revealedHands,
      isGameOver: isTobi,
    };

    this._updateState({
      scores: newScores,
      roundResult,
      gameStatus: 'round_end',
      availableActions: this._getEmptyActions(),
    });

    this._dispatchEvent({ type: 'round_end', result: roundResult });
  }

  public calculateFinalResult(scores?: number[]): FinalGameResult {
    const rawScores = scores || this._state.scores;
    const seatScores = rawScores.map((score, seat) => ({
      seat,
      score,
      name:
        seat === 0
          ? 'あなた'
          : this._state.players[seat]?.name || CPU_PROFILES[seat]?.name || `CPU ${SEAT_NAMES[seat]}`,
      isHuman: seat === 0,
      avatar: seat === 0 ? this._state.players[0]?.avatar : CPU_PROFILES[seat]?.avatar,
    }));

    // Sort by score descending. Tie-break: starting seat order 0 > 1 > 2 > 3 (起家優先)
    seatScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.seat - b.seat;
    });

    // Uma: 1位: +15, 2位: +5, 3位: -5, 4位: -15
    const UMA_POINTS = [15, 5, -5, -15];
    // Oka: 1位 gets +20, others get 0
    const OKA_POINTS = [20, 0, 0, 0];

    const rankings: FinalPlayerRanking[] = seatScores.map((p, rankIndex) => {
      const rank = rankIndex + 1;
      const rawPoint = (p.score - 30000) / 1000;
      const uma = UMA_POINTS[rankIndex];
      const oka = OKA_POINTS[rankIndex];
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

    return {
      rankings,
      gameType: this._options.gameType || 'hanchan',
    };
  }

  public handleJieju(paipu: any): void {
    const finalScores = paipu.defen || this._state.scores;
    const finalResult = this.calculateFinalResult(finalScores);

    soundManager.playGameOver();

    const roundResult = this._state.roundResult
      ? { ...this._state.roundResult, isGameOver: true }
      : null;

    this._updateState({
      scores: finalScores,
      finalResult,
      roundResult,
      gameStatus: 'game_over',
      availableActions: this._getEmptyActions(),
    });

    this._dispatchEvent({
      type: 'game_over',
      finalScores,
      ranks: finalResult.rankings.map((r) => r.rank),
    });
  }

  public triggerGameOver(): void {
    const finalResult = this.calculateFinalResult();
    soundManager.playGameOver();
    const roundResult = this._state.roundResult
      ? { ...this._state.roundResult, isGameOver: true }
      : null;

    this._updateState({
      gameStatus: 'game_over',
      finalResult,
      roundResult,
      availableActions: this._getEmptyActions(),
    });
  }

  // ==========================================================================
  // Action Computation for Human Player
  // ==========================================================================

  public computeTurnActions(): void {
    if (!this._humanPlayer) return;
    const shoupai = this._humanPlayer.shoupai;

    // Discard options
    const legalDapai = this._humanPlayer.get_dapai(shoupai) || [];
    const stdDapai = legalDapai.map(toStandardTile);

    // Tsumo win check
    const canTsumo = this._humanPlayer.allow_hule(shoupai, null, null);

    // Riichi check
    const riichiDiscards = this._humanPlayer.allow_lizhi(shoupai);
    const riichiAllowed = Array.isArray(riichiDiscards) && riichiDiscards.length > 0;
    const stdRiichiDiscards = riichiAllowed
      ? (riichiDiscards as string[]).map(toStandardTile)
      : [];

    // Kan options (Ankan or Kakan)
    const rawGang = this._humanPlayer.get_gang_mianzi(shoupai) || [];
    const gangOptions: GangOption[] = rawGang.map((m) => {
      const parsed = parseMeld(m);
      return {
        meld: m,
        tiles: parsed.tiles,
        type: parsed.type as 'ankan' | 'kakan',
      };
    });

    // Kyuushuu Kyuuhai (九種九牌)
    const canKyuushuu = this._humanPlayer.allow_pingju(shoupai);

    const availableActions: AvailableActions = {
      canDiscard: true,
      discardableTiles: stdDapai,
      riichi: {
        allowed: riichiAllowed,
        discardTiles: stdRiichiDiscards,
      },
      tsumo: canTsumo,
      ron: false,
      chi: [],
      peng: [],
      gang: gangOptions,
      pass: false,
      kyuushuu: canKyuushuu,
    };

    this._updateState({ availableActions });
  }

  public computeCallActions(dapai: any): void {
    if (!this._humanPlayer) return;

    try {
      const shoupai = this._humanPlayer.shoupai;
      const cleanTile = (dapai.p || '').replace(/[_*]/g, '');
      const discardSeat = dapai.l;
      const humanSeat = this._humanPlayer._menfeng;

      // Ron check
      let canRon = false;
      try {
        canRon = this._humanPlayer.allow_hule(shoupai, cleanTile);
      } catch (err) {
        console.error('[HumanPlayer] allow_hule error:', err);
      }

      // Chi check: Can only call Chi from Kamicha (player on left)
      const isKamicha = (discardSeat + 1) % 4 === humanSeat;
      let chiOptions: ChiOption[] = [];
      if (isKamicha) {
        try {
          const rawChi = this._humanPlayer.get_chi_mianzi(shoupai, cleanTile + '-') || [];
          chiOptions = rawChi.map((m) => ({
            meld: m,
            tiles: parseMeld(m).tiles,
          }));
        } catch (err) {
          console.error('[HumanPlayer] get_chi_mianzi error:', err);
        }
      }

      // Pon check: Can call Pon from any player
      const directionChar = ['_', '+', '=', '-'][(4 + discardSeat - humanSeat) % 4];
      let pengOptions: PengOption[] = [];
      try {
        const rawPeng = this._humanPlayer.get_peng_mianzi(shoupai, cleanTile + directionChar) || [];
        pengOptions = rawPeng.map((m) => ({
          meld: m,
          tiles: parseMeld(m).tiles,
        }));
      } catch (err) {
        console.error('[HumanPlayer] get_peng_mianzi error:', err);
      }

      // Daiminkan check: Can call Minkan from any player
      let gangOptions: GangOption[] = [];
      try {
        const rawGang = this._humanPlayer.get_gang_mianzi(shoupai, cleanTile + directionChar) || [];
        gangOptions = rawGang.map((m) => {
          const parsed = parseMeld(m);
          return {
            meld: m,
            tiles: parsed.tiles,
            type: 'minkan',
          };
        });
      } catch (err) {
        console.error('[HumanPlayer] get_gang_mianzi error:', err);
      }

      const hasAnyAction =
        canRon ||
        chiOptions.length > 0 ||
        pengOptions.length > 0 ||
        gangOptions.length > 0;

      if (hasAnyAction) {
        const availableActions: AvailableActions = {
          canDiscard: false,
          discardableTiles: [],
          riichi: { allowed: false, discardTiles: [] },
          tsumo: false,
          ron: canRon,
          chi: chiOptions,
          peng: pengOptions,
          gang: gangOptions,
          pass: true, // User can pass on calls/ron
          kyuushuu: false,
        };
        this._updateState({ availableActions });

        // Auto-pass timer (15s) so game never hangs indefinitely if user is AFK/confused
        if (this._autoPassTimer) clearTimeout(this._autoPassTimer);
        this._autoPassTimer = setTimeout(() => {
          if (this._humanPlayer?.pendingCallback && this._state.availableActions.pass) {
            console.warn('[MahjongGameEngine] Call action timed out (15s). Auto-passing to resume game.');
            this.passAction();
          }
        }, 15000);
      } else {
        // No actions available: immediately proceed
        if (this._autoPassTimer) {
          clearTimeout(this._autoPassTimer);
          this._autoPassTimer = null;
        }
        this._humanPlayer.reply({});
      }
    } catch (err) {
      console.error('[MahjongGameEngine] computeCallActions error, auto-proceeding:', err);
      if (this._autoPassTimer) {
        clearTimeout(this._autoPassTimer);
        this._autoPassTimer = null;
      }
      this._humanPlayer.reply({});
    }
  }

  public computeDiscardOnlyActions(): void {
    if (!this._humanPlayer) return;
    try {
      const shoupai = this._humanPlayer.shoupai;
      let legalDapai: string[] = [];
      try {
        legalDapai = this._humanPlayer.get_dapai(shoupai) || [];
      } catch (err) {
        console.warn('[computeDiscardOnlyActions] get_dapai error:', err);
      }
      let stdDapai = legalDapai.map(toStandardTile);
      if (stdDapai.length === 0) {
        const handInfo = extractHandTiles(shoupai);
        stdDapai = handInfo.concealedTiles;
      }

      const availableActions: AvailableActions = {
        canDiscard: true,
        discardableTiles: stdDapai,
        riichi: { allowed: false, discardTiles: [] },
        tsumo: false,
        ron: false,
        chi: [],
        peng: [],
        gang: [],
        pass: false,
        kyuushuu: false,
      };

      this._updateState({ availableActions });
    } catch (err) {
      console.error('[computeDiscardOnlyActions] error:', err);
    }
  }

  private _computeMyHandInfo(): HandInfo {
    if (!this._humanPlayer) {
      return {
        tiles: [],
        concealedTiles: [],
        tsumoTile: null,
        melds: [],
        isTenpai: false,
        shanten: 8,
        waits: [],
      };
    }

    try {
      const shoupai = this._humanPlayer.shoupai;
      const extracted = extractHandTiles(shoupai);
      let shanten = 8;
      try {
        shanten = Majiang.Util.xiangting(shoupai);
      } catch {
        shanten = 8;
      }
      const isTenpai = shanten === 0;

      let waits: string[] = [];
      if (isTenpai) {
        try {
          let tempShoupai = shoupai;
          if (shoupai._zimo) {
            // Only dapai if _zimo is a single 2-char tile (e.g. 'm1', 'z7')
            // After fulou, _zimo is a meld string like 'm4-56' which cannot be discarded!
            if (typeof shoupai._zimo === 'string' && shoupai._zimo.length === 2 && !shoupai._zimo.match(/[-+=]/)) {
              tempShoupai = shoupai.clone().dapai(shoupai._zimo, false);
            } else {
              const clone = shoupai.clone();
              clone._zimo = null;
              tempShoupai = clone;
            }
          }
          waits = (Majiang.Util.tingpai(tempShoupai) || []).map(toStandardTile);
        } catch (err) {
          waits = [];
        }
      }

      return {
        tiles: extracted.tiles,
        concealedTiles: extracted.concealedTiles,
        tsumoTile: extracted.tsumoTile,
        melds: extracted.melds,
        isTenpai,
        shanten,
        waits,
      };
    } catch (err) {
      console.error('[MahjongGameEngine] _computeMyHandInfo error:', err);
      return {
        tiles: [],
        concealedTiles: [],
        tsumoTile: null,
        melds: [],
        isTenpai: false,
        shanten: 8,
        waits: [],
      };
    }
  }

  // ==========================================================================
  // Public Utility Analysis Methods
  // ==========================================================================

  public calculateShanten(tiles: string[]): number {
    try {
      const majiangTiles = tiles.map(toMajiangTile);
      const shoupai = new Majiang.Shoupai(majiangTiles);
      return Majiang.Util.xiangting(shoupai);
    } catch {
      return 8;
    }
  }

  public calculateWaits(tiles: string[]): string[] {
    try {
      const majiangTiles = tiles.map(toMajiangTile);
      const shoupai = new Majiang.Shoupai(majiangTiles);
      if (Majiang.Util.xiangting(shoupai) === 0) {
        return (Majiang.Util.tingpai(shoupai) || []).map(toStandardTile);
      }
      return [];
    } catch {
      return [];
    }
  }
}
