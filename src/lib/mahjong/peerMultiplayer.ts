/**
 * PeerJS-based Star-Topology WebRTC Riichi Mahjong Multiplayer Engine
 *
 * Architecture:
 * - Star-Topology: The designated Host acts as the Table Authority.
 * - The Host runs the `@kobalab/majiang-core` game engine.
 * - Anti-Cheat Security: The Host sends each guest only their own drawn tile,
 *   public discards, and public melds, preventing wall-peeking cheats.
 * - Guest seats filled by AI bots or disconnected players run CpuPlayer locally on Host.
 */

import Majiang, { type RuleConfig, type Shoupai, type Game, type Player } from '@kobalab/majiang-core';
import type { DataConnection } from 'peerjs';
import { CpuPlayer, createCpuPlayer, CPU_PROFILES } from './cpuPlayer';
import {
  createStandardRules,
  extractHandTiles,
  parseTile,
  sortTiles,
  toMajiangTile,
  toStandardTile,
  parseMeld,
} from './gameEngine';
import type {
  AvailableActions,
  ChiOption,
  DiscardTile,
  FinalGameResult,
  FinalPlayerRanking,
  GangOption,
  HandInfo,
  MahjongEvent,
  MahjongGameOptions,
  MahjongGameState,
  Meld,
  MultiplayerPlayer,
  MultiplayerRole,
  PengOption,
  PlayerInfo,
  RoundInfo,
  RoundResult,
  SeatName,
  WinningHandInfo,
  YakuResult,
} from './types';

const SEAT_NAMES: SeatName[] = ['東', '南', '西', '北'];

// Client-safe PeerJS dynamic import
async function getPeerClass() {
  if (typeof window === 'undefined') {
    throw new Error('PeerJS can only be initialized in browser environment');
  }
  const module = await import('peerjs');
  return module.default || module.Peer;
}

export type MultiplayerSessionStatus =
  | 'connecting'
  | 'waiting_for_players'
  | 'ready'
  | 'playing'
  | 'disconnected'
  | 'error';

export interface PeerNetworkMessage {
  type:
    | 'join'
    | 'join_ack'
    | 'game_init'
    | 'table_sync'
    | 'event'
    | 'turn_action_request'
    | 'call_action_request'
    | 'player_action_reply'
    | 'player_disconnected'
    | 'ping'
    | 'pong';
  seatIndex?: number;
  playerName?: string;
  data?: any;
  timestamp?: number;
}

/**
 * Common session interface shared by Host and Guest
 */
export interface PeerMultiplayerSession {
  readonly isHost: boolean;
  readonly mySeatIndex: number;
  readonly myRole: MultiplayerRole;
  readonly roomCode: string;
  readonly players: MultiplayerPlayer[];
  readonly status: MultiplayerSessionStatus;

  getState(): MahjongGameState;
  onStateChange(listener: (state: MahjongGameState) => void): () => void;
  onEvent(listener: (event: MahjongEvent) => void): () => void;
  onStatusChange(listener: (status: MultiplayerSessionStatus) => void): () => void;

  discard(tile: string): void;
  declareRiichi(tile: string): void;
  declareTsumo(): void;
  declareRon(): void;
  callChi(meld: string): void;
  callPeng(meld: string): void;
  callGang(meld: string): void;
  passAction(): void;
  declareKyuushuu(): void;
  nextRound(): void;
  leave(): void;
}

// ============================================================================
// 1. HOST AUTHORITY IMPLEMENTATION
// ============================================================================

/**
 * Proxy representing a remote guest connected via PeerJS DataConnection to the Host.
 * Implements Majiang.Player interface and sanitizes all secret information.
 */
class RemoteGuestPlayerProxy extends Majiang.Player {
  private _seatIndex: number;
  private _conn: DataConnection;
  private _host: MahjongHostAuthority;
  private _pendingCallback?: (reply?: any) => void;
  private _actionTimeout?: ReturnType<typeof setTimeout>;

  constructor(seatIndex: number, conn: DataConnection, host: MahjongHostAuthority) {
    super();
    this._seatIndex = seatIndex;
    this._conn = conn;
    this._host = host;

    this._conn.on('data', (raw: unknown) => {
      try {
        const msg = raw as PeerNetworkMessage;
        if (msg.type === 'player_action_reply') {
          this.handlePlayerActionReply(msg.data);
        }
      } catch (err) {
        console.error(`[RemoteGuest ${this._seatIndex}] Error handling incoming data:`, err);
      }
    });
  }

  public get conn() {
    return this._conn;
  }

  public setConnection(newConn: DataConnection) {
    this._conn = newConn;
  }

  action(msg: any, callback?: (reply?: any) => void) {
    this._pendingCallback = callback;
    super.action(msg, callback);
  }

  action_kaiju(kaiju: any) {
    this.reply({});
  }

  action_qipai(qipai: any) {
    // ANTI-CHEAT SANITIZATION:
    // Only send the guest's OWN 13 concealed tiles in shoupai!
    // Mask out other players' concealed hands completely.
    const sanitizedShoupai = (qipai.shoupai || []).map((sp: string, idx: number) => {
      if (idx === this._seatIndex) {
        return sp; // Guest's own private hand
      }
      // Concealed hands of opponents are completely masked
      return '?????????????';
    });

    const sanitizedMsg: PeerNetworkMessage = {
      type: 'table_sync',
      data: {
        type: 'qipai',
        zhuangfeng: qipai.zhuangfeng,
        jushu: qipai.jushu,
        changbang: qipai.changbang,
        lizhibang: qipai.lizhibang,
        defen: qipai.defen,
        baopai: qipai.baopai, // Public dora indicator
        shoupai: sanitizedShoupai[this._seatIndex],
        allShoupaiCounts: [13, 13, 13, 13],
      },
    };

    this.send(sanitizedMsg);
    this.reply({});
  }

  action_zimo(zimo: any, gangzimo?: boolean) {
    // ANTI-CHEAT SANITIZATION:
    // Only send the drawn tile (zimo.p) if THIS guest drew it!
    // For other players, strip the tile parameter completely.
    const isSelf = zimo.l === this._seatIndex;
    const sanitizedMsg: PeerNetworkMessage = {
      type: 'table_sync',
      data: {
        type: 'zimo',
        l: zimo.l,
        p: isSelf ? zimo.p : '', // Mask tile drawn by opponents
        gangzimo,
      },
    };
    this.send(sanitizedMsg);

    if (isSelf) {
      // It is this remote guest's turn to act!
      const availableActions = this.computeTurnActions();
      this.send({
        type: 'turn_action_request',
        data: {
          drawnTile: zimo.p,
          availableActions,
        },
      });

      // 15-second safety auto-discard timer so table never freezes
      this.startSafetyTimer(() => {
        this.reply({ dapai: zimo.p }); // Tsumogiri default
      });
    } else {
      this.reply({});
    }
  }

  action_dapai(dapai: any) {
    // Public discard information
    this.send({
      type: 'table_sync',
      data: {
        type: 'dapai',
        l: dapai.l,
        p: dapai.p,
      },
    });

    if (dapai.l !== this._seatIndex) {
      // Opponent discarded: check if this guest has call/ron opportunities
      const callActions = this.computeCallActions(dapai);
      const hasAction =
        callActions.ron ||
        callActions.chi.length > 0 ||
        callActions.peng.length > 0 ||
        callActions.gang.length > 0;

      if (hasAction) {
        this.send({
          type: 'call_action_request',
          data: {
            dapai: dapai.p,
            discardSeat: dapai.l,
            availableActions: callActions,
          },
        });

        // 10-second safety pass timer
        this.startSafetyTimer(() => {
          this.reply({});
        });
      } else {
        this.reply({});
      }
    } else {
      this.reply({});
    }
  }

  action_fulou(fulou: any) {
    // Public meld call
    this.send({
      type: 'table_sync',
      data: {
        type: 'fulou',
        l: fulou.l,
        m: fulou.m,
      },
    });

    if (fulou.l === this._seatIndex && !fulou.m.match(/^[mpsz]\d{4}/)) {
      // Guest called Chi or Pon: prompt for discard
      const discardActions = this.computeDiscardOnlyActions();
      this.send({
        type: 'turn_action_request',
        data: {
          availableActions: discardActions,
        },
      });

      this.startSafetyTimer(() => {
        // Discard first available tile if timed out
        const defaultTile = this._shoupai ? this._shoupai.get_dapai()[0] : 'm1';
        this.reply({ dapai: defaultTile });
      });
    } else {
      this.reply({});
    }
  }

  action_gang(gang: any) {
    this.send({
      type: 'table_sync',
      data: {
        type: 'gang',
        l: gang.l,
        m: gang.m,
      },
    });
    this.reply({});
  }

  action_kaigang(kaigang: any) {
    this.send({
      type: 'table_sync',
      data: {
        type: 'kaigang',
        baopai: kaigang.baopai,
      },
    });
  }

  action_hule(hule: any) {
    // Win is public at round end
    this.send({
      type: 'table_sync',
      data: {
        type: 'hule',
        ...hule,
      },
    });
    this.reply({});
  }

  action_pingju(pingju: any) {
    this.send({
      type: 'table_sync',
      data: {
        type: 'pingju',
        ...pingju,
      },
    });
    this.reply({});
  }

  action_jieju(paipu: any) {
    this.send({
      type: 'table_sync',
      data: {
        type: 'jieju',
        paipu,
      },
    });
    this.reply({});
  }

  private send(msg: PeerNetworkMessage) {
    if (this._conn && this._conn.open) {
      try {
        this._conn.send(msg);
      } catch (err) {
        console.warn(`[RemoteGuest ${this._seatIndex}] Failed to send message:`, err);
      }
    }
  }

  private startSafetyTimer(onTimeout: () => void, ms = 15000) {
    this.clearSafetyTimer();
    this._actionTimeout = setTimeout(() => {
      this._actionTimeout = undefined;
      onTimeout();
    }, ms);
  }

  private clearSafetyTimer() {
    if (this._actionTimeout) {
      clearTimeout(this._actionTimeout);
      this._actionTimeout = undefined;
    }
  }

  private handlePlayerActionReply(reply: any) {
    this.clearSafetyTimer();
    this.reply(reply || {});
  }

  reply(response: any = {}) {
    const cb = this._pendingCallback;
    this._pendingCallback = undefined;
    if (cb) {
      cb(response);
    }
  }

  /**
   * Calculates turn actions (discard, riichi, tsumo, ankan) for guest
   */
  private computeTurnActions(): AvailableActions {
    const shoupai = this._shoupai;
    const rule = this._rule;
    if (!shoupai) return this.emptyActions();

    const discardableTiles = (shoupai.get_dapai(rule['喰い替え許可レベル']) || []).map((t: string) =>
      toStandardTile(t)
    );

    // Riichi check
    let riichiAllowed = false;
    let riichiDiscards: string[] = [];
    if (
      rule['一発あり'] !== undefined &&
      shoupai._menzen &&
      !this._model.lizhi[this._menfeng] &&
      this._model.defen[this._menfeng] >= 1000 &&
      this._model.shan.paishu >= 4
    ) {
      const lizhiTiles = shoupai.get_lizhi_dapai(rule['喰い替え許可レベル']);
      if (lizhiTiles && lizhiTiles.length > 0) {
        riichiAllowed = true;
        riichiDiscards = lizhiTiles.map((t: string) => toStandardTile(t));
      }
    }

    // Tsumo check
    const canTsumo = !!(
      rule &&
      Majiang.Util.hule(
        shoupai,
        null,
        this._zhuangfeng,
        this._menfeng,
        rule['場数'],
        rule['クイタンあり'],
        rule['後付けあり'],
        rule['形式テンパイあり']
      )
    );

    // Gang check (Ankan / Kakan)
    const gangOptions: GangOption[] = [];
    const ankanList = shoupai.get_gang_mianzi() || [];
    for (const m of ankanList) {
      const pm = parseMeld(m);
      gangOptions.push({
        meld: m,
        tiles: pm.tiles,
        type: pm.type as 'ankan' | 'kakan',
      });
    }

    return {
      canDiscard: true,
      discardableTiles,
      riichi: {
        allowed: riichiAllowed,
        discardTiles: riichiDiscards,
      },
      tsumo: canTsumo,
      ron: false,
      chi: [],
      peng: [],
      gang: gangOptions,
      pass: false,
      kyuushuu: false,
    };
  }

  private computeCallActions(dapai: any): AvailableActions {
    const shoupai = this._shoupai;
    const rule = this._rule;
    if (!shoupai) return this.emptyActions();

    const tile = dapai.p;
    const fromSeat = dapai.l;
    const isKamicha = (fromSeat + 1) % 4 === this._menfeng;

    // Ron check
    const canRon = !!(
      rule &&
      Majiang.Util.hule(
        shoupai,
        tile + '-',
        this._zhuangfeng,
        this._menfeng,
        rule['場数'],
        rule['クイタンあり'],
        rule['後付けあり'],
        rule['形式テンパイあり']
      )
    );

    // Chi check (Kamicha discard only)
    const chiOptions: ChiOption[] = [];
    if (isKamicha && !this._model.lizhi[this._menfeng]) {
      const chiMelds = shoupai.get_chi_mianzi(tile, rule['喰い替え許可レベル']) || [];
      for (const m of chiMelds) {
        const pm = parseMeld(m);
        chiOptions.push({ meld: m, tiles: pm.tiles });
      }
    }

    // Pon check
    const pengOptions: PengOption[] = [];
    if (!this._model.lizhi[this._menfeng]) {
      const pengMelds = shoupai.get_peng_mianzi(tile) || [];
      for (const m of pengMelds) {
        const pm = parseMeld(m);
        pengOptions.push({ meld: m, tiles: pm.tiles });
      }
    }

    // Minkan check
    const gangOptions: GangOption[] = [];
    if (!this._model.lizhi[this._menfeng] && this._model.shan.paishu > 0) {
      const minkanMelds = shoupai.get_gang_mianzi(tile) || [];
      for (const m of minkanMelds) {
        const pm = parseMeld(m);
        gangOptions.push({ meld: m, tiles: pm.tiles, type: 'minkan' });
      }
    }

    const hasAnyCall = canRon || chiOptions.length > 0 || pengOptions.length > 0 || gangOptions.length > 0;

    return {
      canDiscard: false,
      discardableTiles: [],
      riichi: { allowed: false, discardTiles: [] },
      tsumo: false,
      ron: canRon,
      chi: chiOptions,
      peng: pengOptions,
      gang: gangOptions,
      pass: hasAnyCall,
      kyuushuu: false,
    };
  }

  private computeDiscardOnlyActions(): AvailableActions {
    const shoupai = this._shoupai;
    if (!shoupai) return this.emptyActions();
    const discardableTiles = (shoupai.get_dapai(this._rule['喰い替え許可レベル']) || []).map((t: string) =>
      toStandardTile(t)
    );
    return {
      canDiscard: true,
      discardableTiles,
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

  private emptyActions(): AvailableActions {
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
}

/**
 * Host Table Authority:
 * Runs the majiang-core engine and coordinates all players.
 */
export class MahjongHostAuthority implements PeerMultiplayerSession {
  public readonly isHost = true;
  public readonly mySeatIndex = 0;
  public readonly myRole: MultiplayerRole = 'host';
  public readonly roomCode: string;
  public readonly players: MultiplayerPlayer[];

  private _peer: any = null;
  private _status: MultiplayerSessionStatus = 'connecting';
  private _game: Game | null = null;
  private _rule: RuleConfig;
  private _humanHostPlayer: any = null;
  private _guestProxies: Map<number, RemoteGuestPlayerProxy> = new Map();
  private _cpuPlayers: Map<number, CpuPlayer> = new Map();
  private _state: MahjongGameState;
  private _stateListeners: Set<(state: MahjongGameState) => void> = new Set();
  private _eventListeners: Set<(event: MahjongEvent) => void> = new Set();
  private _statusListeners: Set<(status: MultiplayerSessionStatus) => void> = new Set();

  constructor(options: {
    roomCode: string;
    players: MultiplayerPlayer[];
    gameMode: 'tonpuu' | 'hanchan';
    hostPeerId: string;
  }) {
    this.roomCode = options.roomCode;
    this.players = options.players;
    this._rule = createStandardRules({ gameType: options.gameMode });
    this._state = this.getInitialState(options.gameMode);
  }

  public get status() {
    return this._status;
  }

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

  public onStatusChange(listener: (status: MultiplayerSessionStatus) => void): () => void {
    this._statusListeners.add(listener);
    listener(this._status);
    return () => this._statusListeners.delete(listener);
  }

  private setStatus(status: MultiplayerSessionStatus) {
    this._status = status;
    this._statusListeners.forEach((l) => l(status));
  }

  private updateState(partial: Partial<MahjongGameState>) {
    this._state = { ...this._state, ...partial };
    this._stateListeners.forEach((l) => l(this._state));
  }

  private broadcast(msg: PeerNetworkMessage) {
    this._guestProxies.forEach((proxy) => {
      if (proxy.conn && proxy.conn.open) {
        try {
          proxy.conn.send(msg);
        } catch {}
      }
    });
  }

  /**
   * Initializes PeerJS listener and launches the match once remote human guests are connected
   */
  public async init(peerInstance?: any): Promise<void> {
    const PeerClass = await getPeerClass();
    const myAssignment = this.players.find((p) => p.seatIndex === 0);
    const hostPeerId = myAssignment?.peerId || `mahjong_host_${this.roomCode}_${Date.now()}`;

    this._peer =
      peerInstance ||
      new PeerClass(hostPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

    this._peer.on('open', () => {
      this.setStatus('waiting_for_players');
      this.checkStartGame();
    });

    this._peer.on('connection', (conn: DataConnection) => {
      conn.on('data', (raw: unknown) => {
        const msg = raw as PeerNetworkMessage;
        if (msg.type === 'join') {
          const seat = msg.seatIndex ?? 1;
          const proxy = new RemoteGuestPlayerProxy(seat, conn, this);
          this._guestProxies.set(seat, proxy);

          conn.send({
            type: 'join_ack',
            seatIndex: seat,
            data: {
              roomCode: this.roomCode,
              players: this.players,
            },
          });

          this.checkStartGame();
        }
      });

      conn.on('close', () => {
        // Find disconnected seat
        for (const [seat, proxy] of this._guestProxies.entries()) {
          if (proxy.conn === conn) {
            console.warn(`[Host] Guest at seat ${seat} disconnected. Hot-swapping to CPU bot!`);
            this.hotSwapGuestToCpu(seat);
            break;
          }
        }
      });
    });

    this._peer.on('error', (err: any) => {
      console.error('[Host] PeerJS error:', err);
    });
  }

  private checkStartGame() {
    // Check if all human guests have connected
    const humanGuests = this.players.filter((p) => p.seatIndex !== 0 && p.isHuman);
    const allConnected = humanGuests.every((g) => this._guestProxies.has(g.seatIndex));

    if (allConnected && this._status !== 'playing') {
      this.setStatus('ready');
      setTimeout(() => this.startGame(), 400);
    }
  }

  private hotSwapGuestToCpu(seatIndex: number) {
    const cpu = createCpuPlayer(seatIndex, {
      delayMs: 600,
    });
    this._cpuPlayers.set(seatIndex, cpu);
    this._guestProxies.delete(seatIndex);

    // Notify other players
    this.broadcast({
      type: 'player_disconnected',
      seatIndex,
      data: {
        message: `座席 ${SEAT_NAMES[seatIndex]} のプレイヤーが切断されたため、CPUボットが代打に入りました。`,
      },
    });
  }

  private startGame() {
    this.setStatus('playing');

    // Create Local Human Player for Host (Seat 0)
    class HostHumanPlayer extends Majiang.Player {
      private _authority: MahjongHostAuthority;
      private _pendingCb?: (reply?: any) => void;

      constructor(authority: MahjongHostAuthority) {
        super();
        this._authority = authority;
      }

      action(msg: any, callback?: (reply?: any) => void) {
        this._pendingCb = callback;
        super.action(msg, callback);
      }

      action_kaiju(kaiju: any) {
        this._authority.handleHostKaiju(kaiju);
        this.reply({});
      }

      action_qipai(qipai: any) {
        this._authority.handleHostQipai(qipai);
        this.reply({});
      }

      action_zimo(zimo: any, gangzimo?: boolean) {
        this._authority.handleHostZimo(zimo, gangzimo);
        if (zimo.l === this._menfeng) {
          this._authority.computeHostTurnActions();
        } else {
          this.reply({});
        }
      }

      action_dapai(dapai: any) {
        this._authority.handleHostDapai(dapai);
        if (dapai.l !== this._menfeng) {
          this._authority.computeHostCallActions(dapai);
        } else {
          this.reply({});
        }
      }

      action_fulou(fulou: any) {
        this._authority.handleHostFulou(fulou);
        if (fulou.l === this._menfeng && !fulou.m.match(/^[mpsz]\d{4}/)) {
          this._authority.computeHostDiscardOnlyActions();
        } else {
          this.reply({});
        }
      }

      action_gang(gang: any) {
        this._authority.handleHostGang(gang);
        this.reply({});
      }

      action_kaigang(kaigang: any) {
        this._authority.handleHostKaigang(kaigang);
      }

      action_hule(hule: any) {
        this._authority.handleHostHule(hule);
        this.reply({});
      }

      action_pingju(pingju: any) {
        this._authority.handleHostPingju(pingju);
        this.reply({});
      }

      action_jieju(paipu: any) {
        this._authority.handleHostJieju(paipu);
        this.reply({});
      }

      reply(res: any = {}) {
        const cb = this._pendingCb;
        this._pendingCb = undefined;
        if (cb) cb(res);
      }
    }

    this._humanHostPlayer = new HostHumanPlayer(this);

    // Build the 4 players for Majiang.Game
    const majiangPlayers: Player[] = [this._humanHostPlayer];

    for (let i = 1; i < 4; i++) {
      const assignment = this.players.find((p) => p.seatIndex === i);
      if (assignment?.isHuman && this._guestProxies.has(i)) {
        majiangPlayers.push(this._guestProxies.get(i)!);
      } else {
        // CPU Bot
        const cpu = createCpuPlayer(i, { delayMs: 600 });
        this._cpuPlayers.set(i, cpu);
        majiangPlayers.push(cpu);
      }
    }

    this._game = new Majiang.Game(
      majiangPlayers,
      (paipu) => this.handleHostJieju(paipu),
      this._rule
    );

    this._game.model.player = this.players.map((p) => p.playerName);
    this._game._speed = 1;
    this._game._dwell = 250;

    this.updateState({
      gameStatus: 'playing',
      scores: [25000, 25000, 25000, 25000],
    });

    this._game.kaiju(0);
  }

  // Host Action handlers
  private handleHostKaiju(kaiju: any) {
    this.broadcast({
      type: 'table_sync',
      data: { type: 'kaiju', ...kaiju },
    });
  }

  private handleHostQipai(qipai: any) {
    const round: RoundInfo = {
      gameType: (this._rule['場数'] === 1 ? 'tonpuu' : 'hanchan'),
      wind: SEAT_NAMES[qipai.zhuangfeng] || '東',
      roundNumber: qipai.jushu + 1,
      displayName: `${SEAT_NAMES[qipai.zhuangfeng]}${qipai.jushu + 1}局`,
      honba: qipai.changbang,
      riichiSticks: qipai.lizhibang,
      dealerIndex: qipai.jushu,
      isAllLast: (qipai.zhuangfeng === 1 && qipai.jushu === 3) || (this._rule['場数'] === 1 && qipai.jushu === 3),
    };

    const myShoupaiStr = qipai.shoupai[0];
    const myShoupai = Majiang.Shoupai.fromString(myShoupaiStr);
    const handInfo = extractHandTiles(myShoupai);

    this.updateState({
      round,
      scores: [...qipai.defen],
      doraIndicators: [toStandardTile(qipai.baopai)],
      discards: [[], [], [], []],
      melds: [[], [], [], []],
      remainingTiles: 70,
      activeTurn: 0,
      roundResult: null,
      myHand: {
        ...handInfo,
        isTenpai: false,
        shanten: 8,
        waits: [],
      },
      availableActions: this.emptyActions(),
    });
  }

  private handleHostZimo(zimo: any, gangzimo?: boolean) {
    const remaining = this._game?.model.shan.paishu ?? Math.max(0, this._state.remainingTiles - 1);
    this.updateState({
      remainingTiles: remaining,
      activeTurn: zimo.l,
    });

    if (zimo.l === 0) {
      // Host's own draw
      const shoupai = this._humanHostPlayer?._shoupai;
      if (shoupai) {
        const hand = extractHandTiles(shoupai);
        this.updateState({
          myHand: {
            ...this._state.myHand,
            ...hand,
          },
        });
      }
    }
  }

  private handleHostDapai(dapai: any) {
    const stdTile = toStandardTile(dapai.p);
    const isRiichi = dapai.p.includes('*');
    const isTsumogiri = dapai.p.includes('_');

    const discardItem: DiscardTile = {
      tile: stdTile,
      raw: dapai.p,
      isRiichi,
      isTsumogiri,
      isCalled: false,
    };

    const newDiscards = this._state.discards.map((pond, idx) =>
      idx === dapai.l ? [...pond, discardItem] : pond
    );

    this.updateState({
      discards: newDiscards,
      lastDiscard: { seat: dapai.l, tile: stdTile, isRiichi },
      availableActions: this.emptyActions(),
    });
  }

  private handleHostFulou(fulou: any) {
    const meldObj = parseMeld(fulou.m);
    const newMelds = this._state.melds.map((mList, idx) =>
      idx === fulou.l ? [...mList, meldObj] : mList
    );

    this.updateState({
      melds: newMelds,
      activeTurn: fulou.l,
    });
  }

  private handleHostGang(gang: any) {
    // Handled in kaigang/fulou
  }

  private handleHostKaigang(kaigang: any) {
    const dora = toStandardTile(kaigang.baopai);
    this.updateState({
      doraIndicators: [...this._state.doraIndicators, dora],
    });
  }

  private handleHostHule(hule: any) {
    const deltaScores = hule.fenpei || [0, 0, 0, 0];
    const newScores = this._state.scores.map((s, idx) => s + (deltaScores[idx] || 0));

    const roundResult: RoundResult = {
      type: 'hule',
      name: hule.baojia !== undefined ? 'ロン和了' : 'ツモ和了',
      winnerSeat: hule.l,
      winnerName: this.players[hule.l]?.playerName || `席 ${SEAT_NAMES[hule.l]}`,
      loserSeat: hule.baojia,
      loserName: hule.baojia !== undefined ? this.players[hule.baojia]?.playerName : undefined,
      han: hule.fanshu,
      fu: hule.fu,
      points: hule.defen,
      deltaScores,
      doraIndicators: [...this._state.doraIndicators],
      uraDoraIndicators: (hule.fubaopai || []).map(toStandardTile),
      winTile: toStandardTile(hule.hupai),
      winType: hule.baojia !== undefined ? 'ron' : 'tsumo',
    };

    this.updateState({
      gameStatus: 'round_end',
      scores: newScores,
      roundResult,
      availableActions: this.emptyActions(),
    });
  }

  private handleHostPingju(pingju: any) {
    const deltaScores = pingju.fenpei || [0, 0, 0, 0];
    const newScores = this._state.scores.map((s, idx) => s + (deltaScores[idx] || 0));

    const roundResult: RoundResult = {
      type: 'pingju',
      name: pingju.name || '荒牌平局 (流局)',
      deltaScores,
      doraIndicators: [...this._state.doraIndicators],
    };

    this.updateState({
      gameStatus: 'round_end',
      scores: newScores,
      roundResult,
      availableActions: this.emptyActions(),
    });
  }

  private handleHostJieju(paipu: any) {
    this.updateState({
      gameStatus: 'game_over',
    });
  }

  // Action calculation for Host (Seat 0)
  public computeHostTurnActions() {
    const shoupai = this._humanHostPlayer?._shoupai;
    if (!shoupai) return;

    const discardableTiles = (shoupai.get_dapai(this._rule['喰い替え許可レベル']) || []).map((t: string) =>
      toStandardTile(t)
    );

    let riichiAllowed = false;
    let riichiDiscards: string[] = [];
    if (
      shoupai._menzen &&
      !this._game?.model.lizhi[0] &&
      this._state.scores[0] >= 1000 &&
      this._state.remainingTiles >= 4
    ) {
      const lizhiTiles = shoupai.get_lizhi_dapai(this._rule['喰い替え許可レベル']);
      if (lizhiTiles && lizhiTiles.length > 0) {
        riichiAllowed = true;
        riichiDiscards = lizhiTiles.map((t: string) => toStandardTile(t));
      }
    }

    const canTsumo = !!Majiang.Util.hule(
      shoupai,
      null,
      this._game?.model.zhuangfeng,
      0,
      this._rule['場数'],
      this._rule['クイタンあり'],
      this._rule['後付けあり'],
      this._rule['形式テンパイあり']
    );

    this.updateState({
      availableActions: {
        canDiscard: true,
        discardableTiles,
        riichi: { allowed: riichiAllowed, discardTiles: riichiDiscards },
        tsumo: canTsumo,
        ron: false,
        chi: [],
        peng: [],
        gang: [],
        pass: false,
        kyuushuu: false,
      },
    });
  }

  public computeHostCallActions(dapai: any) {
    const shoupai = this._humanHostPlayer?._shoupai;
    if (!shoupai) return;

    const tile = dapai.p;
    const isKamicha = dapai.l === 3;

    const canRon = !!Majiang.Util.hule(
      shoupai,
      tile + '-',
      this._game?.model.zhuangfeng,
      0,
      this._rule['場数'],
      this._rule['クイタンあり'],
      this._rule['後付けあり'],
      this._rule['形式テンパイあり']
    );

    const chiOptions: ChiOption[] = [];
    if (isKamicha && !this._game?.model.lizhi[0]) {
      const chiMelds = shoupai.get_chi_mianzi(tile, this._rule['喰い替え許可レベル']) || [];
      for (const m of chiMelds) {
        const pm = parseMeld(m);
        chiOptions.push({ meld: m, tiles: pm.tiles });
      }
    }

    const pengOptions: PengOption[] = [];
    if (!this._game?.model.lizhi[0]) {
      const pengMelds = shoupai.get_peng_mianzi(tile) || [];
      for (const m of pengMelds) {
        const pm = parseMeld(m);
        pengOptions.push({ meld: m, tiles: pm.tiles });
      }
    }

    const hasAnyCall = canRon || chiOptions.length > 0 || pengOptions.length > 0;

    if (hasAnyCall) {
      this.updateState({
        availableActions: {
          canDiscard: false,
          discardableTiles: [],
          riichi: { allowed: false, discardTiles: [] },
          tsumo: false,
          ron: canRon,
          chi: chiOptions,
          peng: pengOptions,
          gang: [],
          pass: true,
          kyuushuu: false,
        },
      });
    } else {
      this._humanHostPlayer?.reply({});
    }
  }

  public computeHostDiscardOnlyActions() {
    const shoupai = this._humanHostPlayer?._shoupai;
    if (!shoupai) return;
    const discardableTiles = (shoupai.get_dapai(this._rule['喰い替え許可レベル']) || []).map((t: string) =>
      toStandardTile(t)
    );
    this.updateState({
      availableActions: {
        canDiscard: true,
        discardableTiles,
        riichi: { allowed: false, discardTiles: [] },
        tsumo: false,
        ron: false,
        chi: [],
        peng: [],
        gang: [],
        pass: false,
        kyuushuu: false,
      },
    });
  }

  // UI Commands (Host Actions)
  public discard(tile: string) {
    const mjTile = toMajiangTile(tile);
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ dapai: mjTile });
  }

  public declareRiichi(tile: string) {
    const mjTile = toMajiangTile(tile) + '*';
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ dapai: mjTile });
  }

  public declareTsumo() {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ hule: '-' });
  }

  public declareRon() {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ hule: '-' });
  }

  public callChi(meld: string) {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ fulou: meld });
  }

  public callPeng(meld: string) {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ fulou: meld });
  }

  public callGang(meld: string) {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ gang: meld });
  }

  public passAction() {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({});
  }

  public declareKyuushuu() {
    this.updateState({ availableActions: this.emptyActions() });
    this._humanHostPlayer?.reply({ daopai: '-' });
  }

  public nextRound() {
    if (this._game && this._state.gameStatus === 'round_end') {
      this.updateState({
        gameStatus: 'playing',
        roundResult: null,
        availableActions: this.emptyActions(),
      });
      this._game.last();
    }
  }

  public leave() {
    if (this._game) {
      try {
        this._game.stop();
      } catch {}
    }
    if (this._peer) {
      try {
        this._peer.destroy();
      } catch {}
    }
    this.setStatus('disconnected');
  }

  private emptyActions(): AvailableActions {
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

  private getInitialState(gameMode: 'tonpuu' | 'hanchan'): MahjongGameState {
    const initialPlayers: PlayerInfo[] = this.players.map((p, idx) => ({
      id: idx,
      name: p.playerName,
      shortName: p.playerName,
      seat: SEAT_NAMES[idx],
      seatIndex: idx,
      score: 25000,
      isHuman: p.isHuman,
      isDealer: idx === 0,
      isRiichi: false,
      menzen: true,
      melds: [],
      discards: [],
      handCount: 13,
      difficulty: p.difficulty,
      levelLabel: p.levelLabel,
      title: p.title,
      avatar: p.avatar || {
        emoji: p.isHuman ? '👤' : '🤖',
        bgGradient: 'from-emerald-600 via-teal-700 to-slate-900',
        ringColor: 'ring-emerald-400',
        badgeBg: 'bg-emerald-500/20 text-emerald-300',
        textColor: 'text-emerald-300',
      },
    }));

    return {
      gameStatus: 'idle',
      isPaused: false,
      speedMode: 'normal',
      round: {
        gameType: gameMode,
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
      availableActions: this.emptyActions(),
      players: initialPlayers,
      roundResult: null,
      finalResult: null,
      lastDiscard: null,
    };
  }
}

// ============================================================================
// 2. GUEST CLIENT IMPLEMENTATION
// ============================================================================

/**
 * Guest Table Client:
 * Connects to Host's Table Authority over PeerJS, receives sanitized game state,
 * and transmits human actions back to the Host.
 */
export class MahjongGuestClient implements PeerMultiplayerSession {
  public readonly isHost = false;
  public readonly mySeatIndex: number;
  public readonly myRole: MultiplayerRole = 'guest';
  public readonly roomCode: string;
  public readonly players: MultiplayerPlayer[];

  private _hostPeerId: string;
  private _peer: any = null;
  private _conn: DataConnection | null = null;
  private _status: MultiplayerSessionStatus = 'connecting';
  private _state: MahjongGameState;
  private _stateListeners: Set<(state: MahjongGameState) => void> = new Set();
  private _eventListeners: Set<(event: MahjongEvent) => void> = new Set();
  private _statusListeners: Set<(status: MultiplayerSessionStatus) => void> = new Set();
  private _ticketId: string;
  private _myShoupai: Shoupai | null = null;

  constructor(options: {
    roomCode: string;
    seatIndex: number;
    hostPeerId: string;
    ticketId: string;
    players: MultiplayerPlayer[];
    gameMode: 'tonpuu' | 'hanchan';
  }) {
    this.roomCode = options.roomCode;
    this.mySeatIndex = options.seatIndex;
    this._hostPeerId = options.hostPeerId;
    this._ticketId = options.ticketId;
    this.players = options.players;
    this._state = this.getInitialState(options.gameMode);
  }

  public get status() {
    return this._status;
  }

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

  public onStatusChange(listener: (status: MultiplayerSessionStatus) => void): () => void {
    this._statusListeners.add(listener);
    listener(this._status);
    return () => this._statusListeners.delete(listener);
  }

  private setStatus(status: MultiplayerSessionStatus) {
    this._status = status;
    this._statusListeners.forEach((l) => l(status));
  }

  private updateState(partial: Partial<MahjongGameState>) {
    this._state = { ...this._state, ...partial };
    this._stateListeners.forEach((l) => l(this._state));
  }

  public async connect(): Promise<void> {
    const PeerClass = await getPeerClass();
    this.setStatus('connecting');

    const myAssignment = this.players.find((p) => p.seatIndex === this.mySeatIndex);
    const guestPeerId = myAssignment?.peerId || `guest_${this.mySeatIndex}_${Date.now()}`;

    this._peer = new PeerClass(guestPeerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    this._peer.on('open', () => {
      const conn = this._peer.connect(this._hostPeerId, { reliable: true });
      this._conn = conn;

      conn.on('open', () => {
        this.setStatus('ready');
        // Send handshake
        conn.send({
          type: 'join',
          seatIndex: this.mySeatIndex,
          data: {
            ticketId: this._ticketId,
          },
        });
      });

      conn.on('data', (raw: unknown) => {
        this.handleHostMessage(raw as PeerNetworkMessage);
      });

      conn.on('close', () => {
        this.setStatus('disconnected');
      });

      conn.on('error', (err: any) => {
        console.error('[Guest] Connection error:', err);
      });
    });

    this._peer.on('error', (err: any) => {
      console.error('[Guest] Peer error:', err);
      this.setStatus('error');
    });
  }

  private handleHostMessage(msg: PeerNetworkMessage) {
    if (msg.type === 'table_sync') {
      this.handleTableSync(msg.data);
    } else if (msg.type === 'turn_action_request') {
      this.setStatus('playing');
      const data = msg.data || {};
      this.updateState({
        activeTurn: this.mySeatIndex,
        availableActions: data.availableActions || this.emptyActions(),
      });
    } else if (msg.type === 'call_action_request') {
      const data = msg.data || {};
      this.updateState({
        availableActions: data.availableActions || this.emptyActions(),
      });
    } else if (msg.type === 'player_disconnected') {
      // Disconnection notice
    }
  }

  private handleTableSync(data: any) {
    if (!data) return;

    if (data.type === 'qipai') {
      const round: RoundInfo = {
        gameType: this._state.round.gameType,
        wind: SEAT_NAMES[data.zhuangfeng] || '東',
        roundNumber: data.jushu + 1,
        displayName: `${SEAT_NAMES[data.zhuangfeng]}${data.jushu + 1}局`,
        honba: data.changbang,
        riichiSticks: data.lizhibang,
        dealerIndex: data.jushu,
        isAllLast: data.jushu === 3,
      };

      if (data.shoupai) {
        this._myShoupai = Majiang.Shoupai.fromString(data.shoupai);
        const hand = extractHandTiles(this._myShoupai);
        this.updateState({
          myHand: { ...this._state.myHand, ...hand },
        });
      }

      this.updateState({
        gameStatus: 'playing',
        round,
        scores: [...data.defen],
        doraIndicators: [toStandardTile(data.baopai)],
        discards: [[], [], [], []],
        melds: [[], [], [], []],
        remainingTiles: 70,
        activeTurn: 0,
        roundResult: null,
        availableActions: this.emptyActions(),
      });
    } else if (data.type === 'zimo') {
      const remaining = Math.max(0, this._state.remainingTiles - 1);
      const isSelf = data.l === this.mySeatIndex;

      if (isSelf && data.p && this._myShoupai) {
        this._myShoupai.zimo(data.p);
        const hand = extractHandTiles(this._myShoupai);
        this.updateState({
          myHand: { ...this._state.myHand, ...hand },
        });
      }

      this.updateState({
        remainingTiles: remaining,
        activeTurn: data.l,
      });
    } else if (data.type === 'dapai') {
      const stdTile = toStandardTile(data.p);
      const isRiichi = data.p.includes('*');
      const isTsumogiri = data.p.includes('_');

      if (data.l === this.mySeatIndex && this._myShoupai) {
        this._myShoupai.dapai(data.p);
        const hand = extractHandTiles(this._myShoupai);
        this.updateState({
          myHand: { ...this._state.myHand, ...hand },
        });
      }

      const discardItem: DiscardTile = {
        tile: stdTile,
        raw: data.p,
        isRiichi,
        isTsumogiri,
        isCalled: false,
      };

      const newDiscards = this._state.discards.map((pond, idx) =>
        idx === data.l ? [...pond, discardItem] : pond
      );

      this.updateState({
        discards: newDiscards,
        lastDiscard: { seat: data.l, tile: stdTile, isRiichi },
        availableActions: this.emptyActions(),
      });
    } else if (data.type === 'fulou') {
      const meldObj = parseMeld(data.m);
      if (data.l === this.mySeatIndex && this._myShoupai) {
        this._myShoupai.fulou(data.m);
        const hand = extractHandTiles(this._myShoupai);
        this.updateState({
          myHand: { ...this._state.myHand, ...hand },
        });
      }

      const newMelds = this._state.melds.map((mList, idx) =>
        idx === data.l ? [...mList, meldObj] : mList
      );

      this.updateState({
        melds: newMelds,
        activeTurn: data.l,
      });
    } else if (data.type === 'kaigang') {
      const dora = toStandardTile(data.baopai);
      this.updateState({
        doraIndicators: [...this._state.doraIndicators, dora],
      });
    } else if (data.type === 'hule') {
      const deltaScores = data.fenpei || [0, 0, 0, 0];
      const newScores = this._state.scores.map((s, idx) => s + (deltaScores[idx] || 0));

      const roundResult: RoundResult = {
        type: 'hule',
        name: data.baojia !== undefined ? 'ロン和了' : 'ツモ和了',
        winnerSeat: data.l,
        winnerName: this.players[data.l]?.playerName || `席 ${SEAT_NAMES[data.l]}`,
        loserSeat: data.baojia,
        loserName: data.baojia !== undefined ? this.players[data.baojia]?.playerName : undefined,
        han: data.fanshu,
        fu: data.fu,
        points: data.defen,
        deltaScores,
        doraIndicators: [...this._state.doraIndicators],
        uraDoraIndicators: (data.fubaopai || []).map(toStandardTile),
        winTile: toStandardTile(data.hupai),
        winType: data.baojia !== undefined ? 'ron' : 'tsumo',
      };

      this.updateState({
        gameStatus: 'round_end',
        scores: newScores,
        roundResult,
        availableActions: this.emptyActions(),
      });
    } else if (data.type === 'pingju') {
      const deltaScores = data.fenpei || [0, 0, 0, 0];
      const newScores = this._state.scores.map((s, idx) => s + (deltaScores[idx] || 0));

      const roundResult: RoundResult = {
        type: 'pingju',
        name: data.name || '荒牌平局 (流局)',
        deltaScores,
        doraIndicators: [...this._state.doraIndicators],
      };

      this.updateState({
        gameStatus: 'round_end',
        scores: newScores,
        roundResult,
        availableActions: this.emptyActions(),
      });
    } else if (data.type === 'jieju') {
      this.updateState({ gameStatus: 'game_over' });
    }
  }

  private sendReply(reply: any) {
    if (this._conn && this._conn.open) {
      this._conn.send({
        type: 'player_action_reply',
        seatIndex: this.mySeatIndex,
        data: reply,
      });
    }
    this.updateState({ availableActions: this.emptyActions() });
  }

  // Guest UI commands
  public discard(tile: string) {
    const mjTile = toMajiangTile(tile);
    this.sendReply({ dapai: mjTile });
  }

  public declareRiichi(tile: string) {
    const mjTile = toMajiangTile(tile) + '*';
    this.sendReply({ dapai: mjTile });
  }

  public declareTsumo() {
    this.sendReply({ hule: '-' });
  }

  public declareRon() {
    this.sendReply({ hule: '-' });
  }

  public callChi(meld: string) {
    this.sendReply({ fulou: meld });
  }

  public callPeng(meld: string) {
    this.sendReply({ fulou: meld });
  }

  public callGang(meld: string) {
    this.sendReply({ gang: meld });
  }

  public passAction() {
    this.sendReply({});
  }

  public declareKyuushuu() {
    this.sendReply({ daopai: '-' });
  }

  public nextRound() {
    // Guest waits for Host to advance
  }

  public leave() {
    if (this._conn) {
      try {
        this._conn.close();
      } catch {}
    }
    if (this._peer) {
      try {
        this._peer.destroy();
      } catch {}
    }
    this.setStatus('disconnected');
  }

  private emptyActions(): AvailableActions {
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

  private getInitialState(gameMode: 'tonpuu' | 'hanchan'): MahjongGameState {
    const initialPlayers: PlayerInfo[] = this.players.map((p, idx) => ({
      id: idx,
      name: p.playerName,
      shortName: p.playerName,
      seat: SEAT_NAMES[idx],
      seatIndex: idx,
      score: 25000,
      isHuman: p.isHuman,
      isDealer: idx === 0,
      isRiichi: false,
      menzen: true,
      melds: [],
      discards: [],
      handCount: 13,
      difficulty: p.difficulty,
      levelLabel: p.levelLabel,
      title: p.title,
      avatar: p.avatar || {
        emoji: p.isHuman ? '👤' : '🤖',
        bgGradient: 'from-emerald-600 via-teal-700 to-slate-900',
        ringColor: 'ring-emerald-400',
        badgeBg: 'bg-emerald-500/20 text-emerald-300',
        textColor: 'text-emerald-300',
      },
    }));

    return {
      gameStatus: 'idle',
      isPaused: false,
      speedMode: 'normal',
      round: {
        gameType: gameMode,
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
      availableActions: this.emptyActions(),
      players: initialPlayers,
      roundResult: null,
      finalResult: null,
      lastDiscard: null,
    };
  }
}

// ============================================================================
// 3. MULTIPLAYER SESSION FACTORY
// ============================================================================

export async function createHostMultiplayerSession(options: {
  roomCode: string;
  players: MultiplayerPlayer[];
  gameMode: 'tonpuu' | 'hanchan';
  hostPeerId: string;
}): Promise<MahjongHostAuthority> {
  const hostAuthority = new MahjongHostAuthority(options);
  await hostAuthority.init();
  return hostAuthority;
}

export async function createGuestMultiplayerSession(options: {
  roomCode: string;
  seatIndex: number;
  hostPeerId: string;
  ticketId: string;
  players: MultiplayerPlayer[];
  gameMode: 'tonpuu' | 'hanchan';
}): Promise<MahjongGuestClient> {
  const guestClient = new MahjongGuestClient(options);
  await guestClient.connect();
  return guestClient;
}
