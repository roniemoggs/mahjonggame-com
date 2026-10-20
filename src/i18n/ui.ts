export const languages = {
  ja: '日本語',
  en: 'English',
} as const;

export const defaultLang = 'ja';
export const showDefaultLang = false;

export const routes = {
  en: {
    // subpage routes if added later
    rules: 'rules',
    guide: 'guide',
  },
};

export const ui = {
  ja: {
    // Metadata
    'site.title': '麻雀web - 無料オンライン麻雀 | 麻雀ゲーム.com',
    'site.description': '登録不要ですぐに遊べる無料オンライン麻雀ゲーム。美しいSVG牌描画、AI対戦、段位戦、牌譜検討機能を備えた最新のブラウザ麻雀です。',
    'site.keywords': '麻雀, オンライン麻雀, 無料麻雀, 麻雀ゲーム, 天聖, ブラウザ麻雀, 四人麻雀, 三人麻雀, サンマ, 牌譜検討, 麻雀AI',

    // Header & Navigation
    'nav.brand': '麻雀web',
    'nav.tagline': '無料オンライン麻雀',
    'nav.showcase': '牌コンポーネント検証',
    'nav.features': '特徴・機能',
    'nav.comparison': '競合比較と改善戦略',
    'nav.rules': 'ルール設定',
    'nav.playDemo': '対局デモ',
    'nav.noReg': '登録不要・即座に対局',

    // Hero Section
    'hero.badge': 'Next-Gen Riichi Mahjong Engine v1.0',
    'hero.title': '麻雀web - 無料オンライン麻雀',
    'hero.desc': '伝統的な麻雀の奥深さと、最先端のモダンWeb技術（Astro 5 + React 19 + Tailwind v4）が融合。SVGベクター描画による本物の象牙牌の質感、スマホ・PC両対応の快適なUIを提供します。',

    // Showcase Section
    'showcase.title': '牌コンポーネント実機デモ（MahjongTile）',
    'showcase.desc': '萬子・筒子・索子・字牌・赤ドラ・横倒し（リーチ・鳴き）・伏せ牌（裏向き）を完全サポート。',

    // Comparison Section
    'comparison.badge': '競合サイト（麻雀天聖 / web-jong.com）徹底分析＆差別化戦略',
    'comparison.title': '「麻雀ゲーム.com」が競合を圧倒するための進化ポイント',
    'comparison.desc': '競合「麻雀天聖」が持つ優れた特徴（登録不要、CPU段位戦、手牌オープン機能など）を継承しつつ、2026年基準の最新技術で大幅に進化させます。',

    'comparison.card1.title': '1. 完全レスポンシブ ＆ 高精細SVG',
    'comparison.card1.issue': '❌ 競合の課題: 横幅905px固定のCanvas仕様。スマホでは縮小されて牌が見づらく、拡大すると粗い画像がぼやける。',
    'comparison.card1.solution': '✨ 当サイトの改善: 画面幅に自動追従するベクターSVG牌。Retinaや4Kモニター、スマホの縦横画面でも常にピンボケせず滑らか。',

    'comparison.card2.title': '2. 画面を邪魔しない洗練されたデザイン',
    'comparison.card2.issue': '❌ 競合の課題: 画面の上下左右に大量のバナー広告が配置され、誤クリックの温床になり対局の没入感を損なう。',
    'comparison.card2.solution': '✨ 当サイトの改善: 高級感ある雀卓（深緑ラシャ・木目フレーム）とダークモード。ゲーム卓中央に集中できるクリーンな配置。',

    'comparison.card3.title': '3. 初心者アシスト ＆ リアルタイム何切る',
    'comparison.card3.issue': '❌ 競合の課題: 手牌オープンはあるが、どの牌を切れば効率的か（受入れ枚数・シャンテン数）のアドバイスがない。',
    'comparison.card3.solution': '✨ 当サイトの改善: 向聴数（シャンテン数）常時表示、有効牌ハイライト、フリテン警告、待ち牌の残り枚数カウントをオプション搭載。',

    'comparison.card4.title': '4. 豊富な対局モードの進化',
    'comparison.card4.issue': '競合の人気機能: 段位戦、トーナメント、サシウマ戦、1500麻雀（短期決戦サバイバル）。',
    'comparison.card4.solution': '✨ 当サイトの進化: 三人麻雀（サンマ）＆四人麻雀（ヨンマ）の完全対応に加え、デイリー詰将棋ならぬ「今日の一局・牌効率パズル」を追加。',

    'comparison.card5.title': '5. 牌譜再生 ＆ グラフ戦績分析',
    'comparison.card5.issue': '❌ 競合の課題: グラフ描画が古く、局ごとの詳しい打牌ログ（牌譜）を1巡ずつ振り返ることができない。',
    'comparison.card5.solution': '✨ 当サイトの改善: 点数推移グラフ、和了率・放銃率・立直率のレーダーチャート、1巡ごとの牌譜リプレイ・分岐シミュレータを実装可能。',

    'comparison.card6.title': '6. URL共有ですぐ遊べる友人戦',
    'comparison.card6.issue': '❌ 競合の課題: 完全CPU対戦専用で、友達とオンラインで遊ぶことができない。',
    'comparison.card6.solution': '✨ 当サイトの改善: URLをLINEやDiscordでシェアするだけで即座に合流できる友人対局機能（足りない枠はCPUが自動参戦）。',

    // Rules Section
    'rules.title': '対応予定のルール設定（天聖互換 ＋ 競技ルール）',
    'rules.matchType': '試合形式',
    'rules.matchTypeVal': '東風戦 / 東南戦',
    'rules.playerType': '人数形式',
    'rules.playerTypeVal': '四人麻雀 / 三人麻雀',
    'rules.redDora': '赤ドラ',
    'rules.redDoraVal': 'あり（各1枚） / なし',
    'rules.kuitan': '喰いタン',
    'rules.kuitanVal': 'あり / なし',
    'rules.tobi': 'トビ終了',
    'rules.tobiVal': 'あり（ハコ割れ）',
    'rules.cpuDifficulty': 'CPU難易度',
    'rules.cpuDifficultyVal': '初級 / 中級 / 上級 / 鬼神',

    // Footer
    'footer.desc': '日本の伝統的な四人・三人麻雀（リーチ麻雀）をWebブラウザで手軽に楽しめる次世代プラットフォームです。',
    'footer.rights': '© 2026 麻雀ゲーム.com All Rights Reserved.',
    'footer.lang': '言語設定',
  },
  en: {
    // Metadata
    'site.title': 'Mahjong Web - Free Online Japanese Riichi Mahjong | Mahjong-Game.com',
    'site.description': 'Play authentic Japanese Riichi Mahjong online in your browser for free. No registration required. Features crisp vector SVG tiles, smart AI opponents, ranked play, and tile efficiency tools.',
    'site.keywords': 'riichi mahjong, japanese mahjong, mahjong online, free mahjong game, browser mahjong, 3 player mahjong, sanma, mahjong ai, mahjong tile game',

    // Header & Navigation
    'nav.brand': 'Mahjong Web',
    'nav.tagline': 'Free Online Mahjong',
    'nav.showcase': 'Tile Engine Demo',
    'nav.features': 'Features',
    'nav.comparison': 'Advantages & Comparison',
    'nav.rules': 'Rules & Settings',
    'nav.playDemo': 'Play Demo',
    'nav.noReg': 'No Registration • Play Instantly',

    // Hero Section
    'hero.badge': 'Next-Gen Riichi Mahjong Engine v1.0',
    'hero.title': 'Mahjong Web - Free Online Riichi Mahjong',
    'hero.desc': 'The timeless strategy of Japanese Riichi Mahjong powered by cutting-edge web tech (Astro 5 + React 19 + Tailwind v4). Experience lifelike ivory tile textures rendered in crisp vector SVG, crafted for seamless play on both PC and mobile.',

    // Showcase Section
    'showcase.title': 'Interactive Tile Engine Showcase (MahjongTile)',
    'showcase.desc': 'Full vector support for Characters (Man), Dots (Pin), Bamboo (Sou), Honors (Jihai), Red Dora, rotated tiles (Riichi / Melds), and concealed face-down tiles.',

    // Comparison Section
    'comparison.badge': 'Competitive Analysis & Modern Mahjong Strategy',
    'comparison.title': 'Why Mahjong-Game.com Redefines Browser Riichi Mahjong',
    'comparison.desc': 'We take beloved core features (zero signup, ranked AI play, open hand practice) and elevate them with 2026-era responsive web standards, beautiful aesthetics, and intelligent assistance.',

    'comparison.card1.title': '1. Fully Responsive & Crisp Vector SVG',
    'comparison.card1.issue': '❌ Legacy Problem: Outdated fixed-width 905px canvas. On mobile screens, tiles shrink or blur when zoomed.',
    'comparison.card1.solution': '✨ Modern Upgrade: Scalable vector SVG tiles. Flawless pixel clarity on Retina, 4K displays, tablets, and smartphones alike.',

    'comparison.card2.title': '2. Clean, Distraction-Free Layout',
    'comparison.card2.issue': '❌ Legacy Problem: Cluttered with aggressive banner ads surrounding the board, risking misclicks and ruining immersion.',
    'comparison.card2.solution': '✨ Modern Upgrade: Elegant dark felt table (deep forest cloth & wood border), zero invasive ads, and distraction-free gaming.',

    'comparison.card3.title': '3. Beginner Assist & Real-Time Tile Efficiency',
    'comparison.card3.issue': '❌ Legacy Problem: Hand reveals exist, but lack guidance on optimal discards (shanten counts and tile acceptance).',
    'comparison.card3.solution': '✨ Modern Upgrade: Real-time shanten counter, acceptance tile highlights, furiten warnings, and remaining tile counts.',

    'comparison.card4.title': '4. Versatile Game Modes (4-Player & 3-Player Sanma)',
    'comparison.card4.issue': 'Classic Favorites: Dan rank matches, survival challenges, tournaments, and rapid 1500-point games.',
    'comparison.card4.solution': '✨ Modern Upgrade: Full support for both 4-player (Yonma) and high-speed 3-player (Sanma), plus daily tactical puzzles.',

    'comparison.card5.title': '5. Replay Viewer & Advanced Stats Analytics',
    'comparison.card5.issue': '❌ Legacy Problem: Basic outdated tables; cannot replay hands move-by-move or analyze tactical branch points.',
    'comparison.card5.solution': '✨ Modern Upgrade: Interactive point flow charts, win/deal-in/riichi rate radar metrics, and turn-by-turn replay inspection.',

    'comparison.card6.title': '6. Instant Multiplayer via Shareable Room Links',
    'comparison.card6.issue': '❌ Legacy Problem: Restricted to solo vs CPU play with no online social match capabilities.',
    'comparison.card6.solution': '✨ Modern Upgrade: Create a room and share the link on Discord or chat; bots seamlessly fill any vacant seats.',

    // Rules Section
    'rules.title': 'Supported Game Rules (Standard & Competitive)',
    'rules.matchType': 'Match Length',
    'rules.matchTypeVal': 'Tonpuusen (East) / Hanchan (South)',
    'rules.playerType': 'Player Count',
    'rules.playerTypeVal': '4-Player (Yonma) / 3-Player (Sanma)',
    'rules.redDora': 'Red Dora (Akadora)',
    'rules.redDoraVal': 'Active (1 each: 5m, 5p, 5s) / Off',
    'rules.kuitan': 'Open Tanyao (Kuitan)',
    'rules.kuitanVal': 'Allowed / Not Allowed',
    'rules.tobi': 'Bankruptcy (Bust / Tobi)',
    'rules.tobiVal': 'Enabled (Negative score ends match)',
    'rules.cpuDifficulty': 'AI Difficulty',
    'rules.cpuDifficultyVal': 'Novice / Intermediate / Expert / Master',

    // Footer
    'footer.desc': 'A next-generation browser platform for traditional Japanese 4-player and 3-player Riichi Mahjong.',
    'footer.rights': '© 2026 Mahjong-Game.com. All Rights Reserved.',
    'footer.lang': 'Language',
  },
} as const;
