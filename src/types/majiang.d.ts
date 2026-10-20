declare module '@kobalab/majiang-core' {
  export interface RuleConfig {
    '配給原点'?: number;
    '順位点'?: string[];
    '連風牌は2符'?: boolean;
    '赤牌'?: { m: number; p: number; s: number };
    'クイタンあり'?: boolean;
    '喰い替え許可レベル'?: number;
    '場数'?: number;
    '途中流局あり'?: boolean;
    '流し満貫あり'?: boolean;
    'ノーテン宣言あり'?: boolean;
    'ノーテン罰あり'?: boolean;
    '最大同時和了数'?: number;
    '連荘方式'?: number;
    'トビ終了あり'?: boolean;
    'オーラス止めあり'?: boolean;
    '延長戦方式'?: number;
    '一発あり'?: boolean;
    '裏ドラあり'?: boolean;
    'カンドラあり'?: boolean;
    'カン裏あり'?: boolean;
    'カンドラ後乗せ'?: boolean;
    'ツモ番なしリーチあり'?: boolean;
    'リーチ後暗槓許可レベル'?: number;
    '役満の複合あり'?: boolean;
    'ダブル役満あり'?: boolean;
    '数え役満あり'?: boolean;
    '役満パオあり'?: boolean;
    '切り上げ満貫あり'?: boolean;
    [key: string]: any;
  }

  export function rule(param?: Partial<RuleConfig>): RuleConfig;

  export class Shoupai {
    static valid_pai(p: string): string | undefined;
    static valid_mianzi(m: string): string | undefined;
    static fromString(paistr?: string): Shoupai;

    _bingpai: {
      _: number;
      m: number[];
      p: number[];
      s: number[];
      z: number[];
    };
    _fulou: string[];
    _zimo: string | null;
    _lizhi: boolean;

    constructor(qipai?: string[]);
    toString(): string;
    clone(): Shoupai;
    fromString(paistr: string): this;
    decrease(s: string, n: number): void;
    zimo(p: string, check?: boolean): this;
    dapai(p: string, check?: boolean): this;
    fulou(m: string, check?: boolean): this;
    gang(m: string, check?: boolean): this;

    get menqian(): boolean;
    get lizhi(): boolean;

    get_dapai(check?: boolean): string[] | null;
    get_chi_mianzi(p: string, check?: boolean): string[] | null;
    get_peng_mianzi(p: string): string[] | null;
    get_gang_mianzi(p?: string): string[] | null;
  }

  export class Shan {
    static zhenbaopai(p: string): string;
    constructor(rule: RuleConfig);
    zimo(): string;
    gangzimo(): string;
    kaigang(): this;
    close(): this;
    get paishu(): number;
    get baopai(): string[];
    get fubaopai(): string[] | null;
  }

  export class He {
    _pai: string[];
    _find: Record<string, boolean>;
    constructor();
    dapai(p: string): this;
    fulou(m: string): this;
    find(p: string): boolean;
  }

  export class Board {
    title: string;
    player: string[];
    qijia: number;
    zhuangfeng: number;
    jushu: number;
    changbang: number;
    lizhibang: number;
    defen: number[];
    shan: any;
    shoupai: Shoupai[];
    he: He[];
    player_id: number[];
    lunban: number;

    constructor(kaiju?: any);
    kaiju(kaiju: any): void;
    menfeng(id: number): number;
    qipai(qipai: any): void;
    lizhi(): void;
    zimo(zimo: any): void;
    dapai(dapai: any): void;
    fulou(fulou: any): void;
    gang(gang: any): void;
    kaigang(kaigang: any): void;
    hule(hule: any): void;
    pingju(pingju: any): void;
    last(): void;
    jieju(paipu: any): void;
  }

  export class Player {
    _model: Board;
    _id: number;
    _menfeng: number;
    _rule: RuleConfig;
    _callback?: (reply?: any) => void;

    constructor();
    action(msg: any, callback?: (reply?: any) => void): void;

    get shoupai(): Shoupai;
    get he(): He;
    get shan(): any;
    get hulepai(): string[];
    get model(): Board;

    kaiju(kaiju: any): void;
    qipai(qipai: any): void;
    zimo(zimo: any, gangzimo?: boolean): void;
    dapai(dapai: any): void;
    fulou(fulou: any): void;
    gang(gang: any): void;
    kaigang(kaigang: any): void;
    hule(hule: any): void;
    pingju(pingju: any): void;
    jieju(paipu: any): void;

    get_dapai(shoupai: Shoupai): string[];
    get_chi_mianzi(shoupai: Shoupai, p: string): string[];
    get_peng_mianzi(shoupai: Shoupai, p: string): string[];
    get_gang_mianzi(shoupai: Shoupai, p?: string): string[];
    allow_lizhi(shoupai: Shoupai, p?: string): string[] | boolean;
    allow_hule(shoupai: Shoupai, p?: string | null, hupai?: boolean | null): boolean;
    allow_pingju(shoupai: Shoupai): boolean;
    allow_no_daopai(shoupai: Shoupai): boolean;

    action_kaiju?(kaiju: any): void;
    action_qipai?(qipai: any): void;
    action_zimo?(zimo: any, gangzimo?: boolean): void;
    action_dapai?(dapai: any): void;
    action_fulou?(fulou: any): void;
    action_gang?(gang: any): void;
    action_hule?(hule: any): void;
    action_pingju?(pingju: any): void;
    action_jieju?(paipu: any): void;
  }

  export class Game {
    _players: Player[];
    _callback: (paipu: any) => void;
    _rule: RuleConfig;
    _model: any;
    _dwell: number;
    _speed: number;
    _status: string;
    _reply: any[];
    _sync: boolean;

    constructor(
      players: Player[],
      callback?: (paipu: any) => void,
      rule?: RuleConfig,
      title?: string
    );

    get model(): any;
    kaiju(qijia?: number): void;
    qipai(shan?: any): void;
    zimo(): void;
    dapai(dapai: string): void;
    fulou(fulou: string): void;
    gang(gang: string): void;
    gangzimo(): void;
    kaigang(): void;
    hule(): void;
    pingju(name?: string, shoupai?: string[]): void;
    last(): void;
    jieju(): void;
    reply(id: number, reply: any): void;
    next(): void;
    start(): void;
    stop(callback?: () => void): void;
    do_sync(): this;

    static get_dapai(rule: RuleConfig, shoupai: Shoupai): string[];
    static get_chi_mianzi(rule: RuleConfig, shoupai: Shoupai, p: string, paishu: number): string[];
    static get_peng_mianzi(rule: RuleConfig, shoupai: Shoupai, p: string, paishu: number): string[];
    static get_gang_mianzi(rule: RuleConfig, shoupai: Shoupai, p: string | undefined, paishu: number, n_gang: number): string[];
    static allow_lizhi(rule: RuleConfig, shoupai: Shoupai, p: string | undefined, paishu: number, defen: number): string[] | boolean;
    static allow_hule(rule: RuleConfig, shoupai: Shoupai, p: string | null | undefined, zhuangfeng: number, menfeng: number, hupai: boolean, neng_rong: boolean): boolean;
    static allow_pingju(rule: RuleConfig, shoupai: Shoupai, diyizimo: boolean): boolean;
    static allow_no_daopai(rule: RuleConfig, shoupai: Shoupai, paishu: number): boolean;
  }

  export namespace Util {
    export function xiangting(shoupai: Shoupai): number;
    export function tingpai(shoupai: Shoupai, f_xiangting?: (shoupai: Shoupai) => number): string[];
    export function xiangting_yiban(shoupai: Shoupai): number;
    export function xiangting_qidui(shoupai: Shoupai): number;
    export function xiangting_guoshi(shoupai: Shoupai): number;
    export function hule(shoupai: Shoupai, rongpai: string | null, param: any): any;
    export function hule_mianzi(shoupai: Shoupai, p: string): any;
  }

  namespace Majiang {
    export type { RuleConfig };
    export { Shoupai, Shan, He, Board, Player, Game, Util, rule };
  }

  export default Majiang;
}

declare module '@kobalab/majiang-ai' {
  import { Player } from '@kobalab/majiang-core';
  export default class AIPlayer extends Player {
    constructor();
    _suanpai: any;
    _eval_cache: Record<string, any>;
    _defen_cache: Record<string, any>;
    select_hule(data?: any, hupai?: any, info?: any[]): boolean;
    select_pingju(): boolean;
    select_fulou(dapai: any, info?: any[]): string | undefined;
    select_gang(info?: any[]): string | undefined;
    select_dapai(info?: any[]): string;
    select_lizhi(p: string): boolean;
    select_daopai(): boolean;
    eval_shoupai(shoupai: any, paishu?: any, p?: string): number;
    eval_backtrack(shoupai: any, paishu: any, back: string, max: number): number;
    get_defen(shoupai: any, rongpai?: string): number;
    get_dapai(shoupai: any): string[];
    get_chi_mianzi(shoupai: any, p: string): string[];
    get_peng_mianzi(shoupai: any, p: string): string[];
    get_gang_mianzi(shoupai: any, p?: string): string[];
    allow_hule(shoupai: any, p?: string, hupai?: any): boolean;
    allow_pingju(shoupai: any): boolean;
    allow_lizhi(shoupai: any, p: string): boolean;
    allow_no_daopai(shoupai: any): boolean;
  }
}
