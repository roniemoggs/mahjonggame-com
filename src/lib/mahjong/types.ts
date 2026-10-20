/**
 * Riichi Mahjong TypeScript types for game engine and UI state management.
 */

export type TileSuit = 'm' | 'p' | 's' | 'z';

export type SeatWind = 0 | 1 | 2 | 3; // 0: 東 (East), 1: 南 (South), 2: 西 (West), 3: 北 (North)
export type SeatName = '東' | '南' | '西' | '北';

export type MeldType = 'chi' | 'peng' | 'minkan' | 'ankan' | 'kakan';

export interface Meld {
  raw: string; // e.g. 'm12-3'
  type: MeldType;
  suit: TileSuit;
  tiles: string[]; // Normalized tile codes, e.g. ['1m', '2m', '3m']
  calledTile: string; // The tile that was called from another player
  fromSeat: number; // 0: self, 1: shimocha, 2: toimen, 3: kamicha
  direction: 'self' | 'shimocha' | 'toimen' | 'kamicha';
}

export interface DiscardTile {
  tile: string; // e.g. '1m', '5p', '0s'
  raw: string;  // e.g. 'm1*', 'p5_'
  isRiichi: boolean; // Declared Riichi with this discard
  isTsumogiri: boolean; // Tile drawn this turn and immediately discarded
  isCalled: boolean; // Claimed by another player for Chi/Pon/Kan/Ron
}

export type CpuDifficulty = 'beginner' | 'normal' | 'advanced';

export interface CpuAvatar {
  emoji: string;
  bgGradient: string;
  ringColor: string;
  badgeBg: string;
  textColor: string;
}

export interface CpuProfile {
  id: number; // 1, 2, 3
  seatIndex: number; // 1: 南, 2: 西, 3: 北
  name: string; // e.g. '初級ボット: たけし'
  shortName: string; // e.g. 'たけし'
  difficulty: CpuDifficulty;
  levelLabel: string; // '初級' | '中級' | '上級'
  title: string; // e.g. '牌効率重視・全押し型'
  description: string;
  avatar: CpuAvatar;
  defenseTendency: 'pure_efficiency' | 'balanced' | 'strong_defense';
}

export interface PlayerInfo {
  id: number; // 0..3 (unique player ID)
  name: string; // e.g. 'あなた', '初級ボット: たけし', '中級ボット: あおい', '上級ボット: けんじ'
  shortName?: string; // Short display name (e.g. 'たけし')
  seat: SeatName; // '東' | '南' | '西' | '北'
  seatIndex: number; // 0: 東, 1: 南, 2: 西, 3: 北
  score: number; // Current points (e.g. 25000)
  isHuman: boolean;
  isDealer: boolean;
  isRiichi: boolean;
  isDoubleRiichi?: boolean;
  isIppatsu?: boolean;
  menzen: boolean; // Concealed hand (no open melds)
  melds: Meld[];
  discards: DiscardTile[];
  handCount: number; // Number of concealed tiles in hand
  difficulty?: CpuDifficulty;
  levelLabel?: string;
  title?: string;
  description?: string;
  avatar?: CpuAvatar;
  isThinking?: boolean;
}

export interface RoundInfo {
  gameType: 'hanchan' | 'tonpuu'; // 半荘 (東南戦) or 東風戦
  wind: SeatName; // Round wind: '東' or '南'
  roundNumber: number; // 1 to 4 (e.g. 1 in 東1局)
  displayName: string; // e.g. '東1局', '南4局 (オーラス)'
  honba: number; // 本場 (counters)
  riichiSticks: number; // 供託リーチ棒 (1,000 pts each)
  dealerIndex: number; // Current dealer (0: 東, 1: 南, 2: 西, 3: 北)
  isAllLast: boolean; // True if final round (南4局 in Hanchan, 東4局 in Tonpuu)
}

export interface ChiOption {
  meld: string; // e.g. 'm12-3'
  tiles: string[]; // e.g. ['1m', '2m', '3m']
}

export interface PengOption {
  meld: string; // e.g. 'p555+'
  tiles: string[]; // e.g. ['5p', '5p', '5p']
}

export interface GangOption {
  meld: string;
  tiles: string[];
  type: 'ankan' | 'kakan' | 'minkan';
}

export interface AvailableActions {
  canDiscard: boolean;
  discardableTiles: string[];
  riichi: {
    allowed: boolean;
    discardTiles: string[]; // Which discards allow declaring Riichi
  };
  tsumo: boolean; // Can declare Tsumo win
  ron: boolean;   // Can declare Ron win
  chi: ChiOption[]; // Chi choices available on opponent discard
  peng: PengOption[]; // Pon choices available on opponent discard
  gang: GangOption[]; // Ankan/Kakan on turn, or Minkan on opponent discard
  pass: boolean;  // Can pass on call / win opportunity
  kyuushuu: boolean; // Can declare 九種九牌 (9 orphan terminal tiles)
}

export interface HandInfo {
  tiles: string[]; // All concealed tiles + tsumo tile, sorted
  concealedTiles: string[]; // Concealed tiles without current drawn tile, sorted
  tsumoTile: string | null; // 14th tile drawn this turn
  melds: Meld[];
  isTenpai: boolean;
  shanten: number; // -1: Win, 0: Tenpai, 1: 1-shanten, 2: 2-shanten, etc.
  waits: string[]; // Waiting tiles if tenpai
}

export interface YakuResult {
  name: string;
  han: number;
}

export interface WinningHandInfo {
  seat: number;
  playerName: string;
  isDealer: boolean;
  isRiichi: boolean;
  concealedTiles: string[];
  winTile: string;
  winType: 'tsumo' | 'ron';
  melds: Meld[];
  doraIndicators: string[];
  uraDoraIndicators?: string[];
  doraCount?: number;
  akaDoraCount?: number;
  uraDoraCount?: number;
}

export interface RoundResult {
  type: 'hule' | 'pingju'; // 和了 or 流局
  name: string; // 'ツモ', 'ロン', '流局', '荒牌平局', '四風連打', '九種九牌', etc.
  winnerSeat?: number; // 0..3 seat wind of winner
  winnerName?: string;
  loserSeat?: number; // 0..3 seat wind of payer (for Ron)
  loserName?: string;
  han?: number;
  fu?: number;
  damanguan?: number;
  points?: number; // Net score won
  yaku?: YakuResult[];
  deltaScores: number[]; // Points change for seat 0..3 [東, 南, 西, 北]
  initialScores?: number[]; // Scores before round end (for transfer animation)
  doraIndicators: string[];
  uraDoraIndicators?: string[];
  winTile?: string;
  winType?: 'tsumo' | 'ron';
  winningHand?: WinningHandInfo;
  isGameOver?: boolean;
  revealedHands?: Array<{
    seat: number;
    playerName: string;
    tiles: string[];
    melds: Meld[];
    isTenpai?: boolean;
    waits?: string[];
  }>;
}

export interface FinalPlayerRanking {
  rank: number; // 1, 2, 3, 4
  seat: number; // 0..3
  name: string;
  score: number; // Raw final points, e.g. 38500
  rawPoint: number; // (score - 30000) / 1000
  uma: number; // +15, +5, -5, -15
  oka: number; // +20 for 1st, 0 for others
  totalPoint: number; // Total balance point, e.g. +43.5
  isHuman: boolean;
  avatar?: CpuAvatar;
}

export interface FinalGameResult {
  rankings: FinalPlayerRanking[];
  gameType: 'hanchan' | 'tonpuu';
  totalRounds?: number;
}

export type GameStatus = 'idle' | 'playing' | 'round_end' | 'game_over';

export interface MahjongGameState {
  gameStatus: GameStatus;
  isPaused: boolean;
  speedMode: 'normal' | 'fast';
  round: RoundInfo;
  scores: number[]; // In seat order: [東, 南, 西, 北]
  myHand: HandInfo;
  doraIndicators: string[];
  discards: DiscardTile[][]; // 4 players' discard ponds: [東, 南, 西, 北]
  melds: Meld[][]; // 4 players' open melds: [東, 南, 西, 北]
  remainingTiles: number; // Wall tiles remaining (starts at 70)
  activeTurn: number; // Seat index of current active turn player (0..3)
  availableActions: AvailableActions;
  players: PlayerInfo[];
  roundResult: RoundResult | null;
  finalResult: FinalGameResult | null;
  lastDiscard: {
    seat: number;
    tile: string;
    isRiichi: boolean;
  } | null;
}

/**
 * Table and Player Event types dispatched by the engine.
 */
export type MahjongEvent =
  | { type: 'game_start'; title: string; players: string[] }
  | { type: 'round_start'; round: RoundInfo; scores: number[]; doraIndicator: string }
  | { type: 'zimo'; player: number; tile?: string; remainingTiles: number }
  | { type: 'dapai'; player: number; tile: string; isRiichi: boolean; isTsumogiri: boolean }
  | { type: 'fulou'; player: number; meld: Meld }
  | { type: 'gang'; player: number; meld: Meld }
  | { type: 'kaigang'; doraIndicator: string }
  | { type: 'riichi_declared'; player: number }
  | { type: 'round_end'; result: RoundResult }
  | { type: 'game_over'; finalScores: number[]; ranks: number[] };

/**
 * Configuration options for starting a game.
 */
export interface MahjongGameOptions {
  gameType?: 'hanchan' | 'tonpuu'; // Default: 'hanchan'
  playerNames?: string[]; // Defaults: ['あなた', '初級ボット: たけし', '中級ボット: あおい', '上級ボット: けんじ']
  initialScore?: number; // Default: 25000
  returnScore?: number;  // Default: 30000
  hasAkaDora?: boolean;  // Default: true (赤5萬, 赤5筒, 赤5索)
  hasKuitan?: boolean;  // Default: true (喰い断あり)
  hasAtozuke?: boolean; // Default: true (後付けあり)
  hasKeishikiTenpai?: boolean; // Default: true (形式テンパイあり)
  hasTobi?: boolean;    // Default: true (トビ終了あり)
  turnDelayMs?: number; // Delay between AI turns in ms (Default: 800ms)
  speedMode?: 'normal' | 'fast'; // Default: 'normal'
}

/**
 * Multiplayer and WebRTC PeerJS specific types
 */
export type MultiplayerRole = 'host' | 'guest';

export interface MultiplayerPlayer {
  seatIndex: number; // 0: 東, 1: 南, 2: 西, 3: 北
  seatName: SeatName;
  role: MultiplayerRole;
  isHuman: boolean;
  ticketId?: string;
  playerId?: string;
  playerName: string;
  peerId?: string;
  avatar?: CpuAvatar;
  difficulty?: CpuDifficulty;
  levelLabel?: string;
  title?: string;
}

export interface MatchmakeJoinRequest {
  action: 'join';
  playerId: string;
  playerName?: string;
  gameMode: 'tonpuu' | 'hanchan';
  roomCode?: string; // Private room password / code
  peerId: string;    // PeerJS Peer ID
}

export interface MatchmakePollRequest {
  action: 'poll';
  ticketId: string;
}

export interface MatchmakeCancelRequest {
  action: 'cancel';
  ticketId: string;
}

export interface MatchmakeStartBotsRequest {
  action: 'start_bots';
  ticketId: string;
}

export type MatchmakeActionRequest =
  | MatchmakeJoinRequest
  | MatchmakePollRequest
  | MatchmakeCancelRequest
  | MatchmakeStartBotsRequest;

export interface MatchmakeResponse {
  status: 'queued' | 'matched' | 'canceled' | 'error';
  ticketId?: string;
  queuedSeconds?: number;
  playerCount?: number;
  maxPlayers?: number;
  gameMode?: 'tonpuu' | 'hanchan';
  roomCode?: string;
  roomId?: string;
  role?: MultiplayerRole;
  seatIndex?: number;
  seatName?: SeatName;
  hostPeerId?: string;
  isBotFilled?: boolean;
  players?: MultiplayerPlayer[];
  message?: string;
}

