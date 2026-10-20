import React from 'react';

export type TileSize = 'sm' | 'md' | 'lg' | 'xl';

export interface MahjongTileProps {
  tile: string; // e.g. '1m'-'9m', '1p'-'9p', '1s'-'9s', '1z'-'7z', '0m', '0p', '0s'
  isDora?: boolean;
  isSideways?: boolean;
  isConcealed?: boolean;
  size?: TileSize;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}

// Map tile codes to Japanese readable names for accessibility and tooltips
const TILE_NAMES: Record<string, string> = {
  '1m': '一萬', '2m': '二萬', '3m': '三萬', '4m': '四萬', '5m': '五萬',
  '6m': '六萬', '7m': '七萬', '8m': '八萬', '9m': '九萬', '0m': '赤五萬',
  '1p': '一筒', '2p': '二筒', '3p': '三筒', '4p': '四筒', '5p': '五筒',
  '6p': '六筒', '7p': '七筒', '8p': '八筒', '9p': '九筒', '0p': '赤五筒',
  '1s': '一索', '2s': '二索', '3s': '三索', '4s': '四索', '5s': '五索',
  '6s': '六索', '7s': '七索', '8s': '八索', '9s': '九索', '0s': '赤五索',
  '1z': '東', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '發', '7z': '中',
};

const KANJI_NUMERALS: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};

export const MahjongTile: React.FC<MahjongTileProps> = ({
  tile,
  isDora = false,
  isSideways = false,
  isConcealed = false,
  size = 'md',
  onClick,
  className = '',
  selected = false,
}) => {
  const rawTile = tile?.trim().toLowerCase().replace(/[*_+=-\s]/g, '') || '1z';
  const normTile = /^[mpsz]\d$/.test(rawTile) ? rawTile[1] + rawTile[0] : rawTile;
  const isRedFive = normTile === '0m' || normTile === '0p' || normTile === '0s' || (isDora && (normTile === '5m' || normTile === '5p' || normTile === '5s'));
  
  // Dimensions for standard Japanese Mahjong proportions (approx 1 : 1.34)
  const sizeMap: Record<TileSize, { w: number; h: number; fontSize: number }> = {
    sm: { w: 28, h: 38, fontSize: 13 },
    md: { w: 42, h: 56, fontSize: 18 },
    lg: { w: 54, h: 72, fontSize: 24 },
    xl: { w: 68, h: 90, fontSize: 30 },
  };

  const dim = sizeMap[size] || sizeMap.md;
  const currentWidth = isSideways ? dim.h : dim.w;
  const currentHeight = isSideways ? dim.w : dim.h;

  const tileLabel = isConcealed ? '伏せ牌' : (TILE_NAMES[normTile] || normTile);

  return (
    <div
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      title={tileLabel}
      aria-label={tileLabel}
      style={{
        width: `${currentWidth}px`,
        height: `${currentHeight}px`,
      }}
      className={`
        relative select-none inline-flex items-center justify-center shrink-0
        transition-all duration-150 ease-out
        ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-105 active:translate-y-0' : 'cursor-default'}
        ${selected ? '-translate-y-2.5 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 rounded-sm' : ''}
        ${className}
      `}
    >
      {/* 3D Tile Body */}
      <div
        className={`
          w-full h-full relative rounded-[4px] overflow-hidden
          ${isSideways ? 'tile-sideways-shadow' : 'tile-shadow'}
          border border-[#c7bc9f]/60
        `}
        style={{
          background: isConcealed
            ? 'linear-gradient(145deg, #f59e0b 0%, #b45309 60%, #92400e 100%)' // Traditional Japanese yellow plastic back
            : 'linear-gradient(175deg, #ffffff 0%, #faf7ee 45%, #f1ecd8 85%, #e6dec2 100%)', // Authentic ivory face
        }}
      >
        {/* Subtle Ivory Texture Sheen */}
        {!isConcealed && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/35 to-transparent pointer-events-none" />
        )}

        {/* Traditional Back Pattern (for concealed / opponents tiles) */}
        {isConcealed ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-1">
            <div className="w-full h-full rounded-[2px] border border-amber-300/40 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center overflow-hidden shadow-inner">
              {/* Fine bamboo lattice micro-texture */}
              <div 
                className="w-full h-full opacity-25"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 4px)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20 pointer-events-none" />
            </div>
          </div>
        ) : (
          /* Face Content */
          <div
            className="w-full h-full flex items-center justify-center relative p-[2px]"
            style={{
              transform: isSideways ? 'rotate(90deg)' : 'none',
              transformOrigin: 'center center',
              width: `${dim.w}px`,
              height: `${dim.h}px`,
            }}
          >
            {/* Red Dora Indicator Star/Dot for visual delight */}
            {isRedFive && (
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-red-600 ring-1 ring-red-400 shadow-sm animate-pulse z-20" />
            )}

            <TileFace tileCode={normTile} isRed={isRedFive} size={size} />
          </div>
        )}

        {/* Inner Border Bevel */}
        <div className="absolute inset-[1px] rounded-[3px] border border-white/60 pointer-events-none" />
      </div>
    </div>
  );
};

// Subcomponent to render SVG or styled characters based on tile type
interface TileFaceProps {
  tileCode: string;
  isRed: boolean;
  size: TileSize;
}

const TileFace: React.FC<TileFaceProps> = ({ tileCode, isRed, size }) => {
  const match = tileCode.match(/^(\d)([mps])$|^([1-7])z$/);
  if (!match) return <div className="text-xs font-mono font-bold text-red-700">{tileCode}</div>;

  const num = parseInt(match[1] || match[3] || '0', 10);
  const suit = match[2] || 'z';

  switch (suit) {
    case 'm':
      return <ManzuFace num={num === 0 ? 5 : num} isRed={isRed} size={size} />;
    case 'p':
      return <PinzuFace num={num === 0 ? 5 : num} isRed={isRed} size={size} />;
    case 's':
      return <SouzuFace num={num === 0 ? 5 : num} isRed={isRed} size={size} />;
    case 'z':
      return <JihaiFace num={num} size={size} />;
    default:
      return <div>{tileCode}</div>;
  }
};

/* -------------------------------------------------------------
   萬子 (MANZU) RENDERING
   Top: Chinese numeral (一〜九) in black/red.
   Bottom: Traditional 「萬」 character in red.
-------------------------------------------------------------- */
const ManzuFace: React.FC<{ num: number; isRed: boolean; size: TileSize }> = ({ num, isRed }) => {
  const numeral = KANJI_NUMERALS[num] || '一';
  const textColor = isRed ? '#dc2626' : '#1e293b';
  const wanColor = isRed ? '#dc2626' : '#b91c1c';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full font-serif select-none leading-none scale-95">
      <span
        style={{ color: textColor }}
        className="font-bold tracking-tight text-[1.45em] drop-shadow-[0_0.5px_0_rgba(0,0,0,0.15)] font-['Noto_Sans_JP']"
      >
        {numeral}
      </span>
      <span
        style={{ color: wanColor }}
        className="font-black text-[1.15em] -mt-0.5 drop-shadow-[0_0.5px_0_rgba(0,0,0,0.2)] font-['Noto_Sans_JP']"
      >
        萬
      </span>
    </div>
  );
};

/* -------------------------------------------------------------
   筒子 (PINZU) RENDERING
   SVG Circles with authentic colors:
   Classic Japanese pinzu has blue/deep-green (#15803d) and crimson-red (#dc2626)
-------------------------------------------------------------- */
const PinzuFace: React.FC<{ num: number; isRed: boolean; size: TileSize }> = ({ num, isRed }) => {
  const red = '#dc2626';
  const blue = '#1d4ed8';
  const green = '#15803d';

  if (isRed) {
    // All circles red for Aka-dora
    return <PinzuLayout num={num} c1={red} c2={red} c3={red} is1pSpecial={num === 1} />;
  }

  switch (num) {
    case 1:
      return <Pinzu1PFlower />;
    case 2:
      return <PinzuLayout num={2} c1={green} c2={blue} c3={blue} />;
    case 3:
      return <PinzuLayout num={3} c1={blue} c2={red} c3={green} />;
    case 4:
      return <PinzuLayout num={4} c1={blue} c2={green} c3={green} />;
    case 5:
      return <PinzuLayout num={5} c1={blue} c2={green} c3={red} />;
    case 6:
      return <PinzuLayout num={6} c1={green} c2={red} c3={red} />;
    case 7:
      return <PinzuLayout num={7} c1={green} c2={red} c3={red} />;
    case 8:
      return <PinzuLayout num={8} c1={blue} c2={blue} c3={blue} />;
    case 9:
      return <PinzuLayout num={9} c1={blue} c2={red} c3={green} />;
    default:
      return <div>{num}p</div>;
  }
};

// 1P: Beautiful authentic multi-layer Japanese Pinzu flower rosette
const Pinzu1PFlower: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-[82%] h-[82%] drop-shadow-sm">
    <defs>
      <radialGradient id="pin1Grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="40%" stopColor="#b91c1c" />
        <stop offset="70%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#047857" />
      </radialGradient>
    </defs>
    {/* Outer Rosette Gear / Petals */}
    <g transform="translate(50,50)">
      {Array.from({ length: 16 }).map((_, i) => (
        <circle
          key={i}
          cx={36 * Math.cos((i * Math.PI) / 8)}
          cy={36 * Math.sin((i * Math.PI) / 8)}
          r="6.5"
          fill="#15803d"
          stroke="#0f172a"
          strokeWidth="0.8"
        />
      ))}
      <circle r="36" fill="none" stroke="#15803d" strokeWidth="4" />
      <circle r="26" fill="#fef2f2" stroke="#dc2626" strokeWidth="2.5" />
      {/* Inner Petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <circle
          key={`in-${i}`}
          cx={18 * Math.cos((i * Math.PI) / 4)}
          cy={18 * Math.sin((i * Math.PI) / 4)}
          r="4.5"
          fill="#dc2626"
        />
      ))}
      {/* Center Jewel */}
      <circle r="9" fill="url(#pin1Grad)" stroke="#7f1d1d" strokeWidth="1" />
      <circle r="3" fill="#fff" opacity="0.9" />
    </g>
  </svg>
);

interface PinzuLayoutProps {
  num: number;
  c1: string;
  c2: string;
  c3: string;
  is1pSpecial?: boolean;
}

const CircleNode: React.FC<{ cx: number; cy: number; r: number; color: string }> = ({ cx, cy, r, color }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={color} stroke="#0f172a" strokeWidth="0.8" />
    <circle cx={cx} cy={cy} r={r * 0.55} fill="#fdfbf7" opacity="0.85" />
    <circle cx={cx} cy={cy} r={r * 0.28} fill={color} />
  </g>
);

const PinzuLayout: React.FC<PinzuLayoutProps> = ({ num, c1, c2, c3, is1pSpecial }) => {
  if (num === 1 && is1pSpecial) {
    return <Pinzu1PFlower />;
  }

  return (
    <svg viewBox="0 0 100 130" className="w-[82%] h-[82%] drop-shadow-sm">
      {num === 2 && (
        <>
          <CircleNode cx={50} cy={35} r={17} color={c1} />
          <CircleNode cx={50} cy={95} r={17} color={c2} />
        </>
      )}
      {num === 3 && (
        <>
          <CircleNode cx={28} cy={30} r={14} color={c1} />
          <CircleNode cx={50} cy={65} r={14} color={c2} />
          <CircleNode cx={72} cy={100} r={14} color={c3} />
        </>
      )}
      {num === 4 && (
        <>
          <CircleNode cx={30} cy={35} r={14} color={c1} />
          <CircleNode cx={70} cy={35} r={14} color={c2} />
          <CircleNode cx={30} cy={95} r={14} color={c2} />
          <CircleNode cx={70} cy={95} r={14} color={c1} />
        </>
      )}
      {num === 5 && (
        <>
          <CircleNode cx={28} cy={30} r={13} color={c1} />
          <CircleNode cx={72} cy={30} r={13} color={c2} />
          <CircleNode cx={50} cy={65} r={14} color={c3} />
          <CircleNode cx={28} cy={100} r={13} color={c2} />
          <CircleNode cx={72} cy={100} r={13} color={c1} />
        </>
      )}
      {num === 6 && (
        <>
          <CircleNode cx={32} cy={28} r={12} color={c1} />
          <CircleNode cx={68} cy={28} r={12} color={c1} />
          <CircleNode cx={32} cy={65} r={12} color={c2} />
          <CircleNode cx={68} cy={65} r={12} color={c2} />
          <CircleNode cx={32} cy={102} r={12} color={c3} />
          <CircleNode cx={68} cy={102} r={12} color={c3} />
        </>
      )}
      {num === 7 && (
        <>
          {/* Slanted 3 */}
          <CircleNode cx={26} cy={22} r={10} color={c1} />
          <CircleNode cx={50} cy={33} r={10} color={c1} />
          <CircleNode cx={74} cy={44} r={10} color={c1} />
          {/* Bottom 4 */}
          <CircleNode cx={32} cy={74} r={11} color={c2} />
          <CircleNode cx={68} cy={74} r={11} color={c2} />
          <CircleNode cx={32} cy={106} r={11} color={c3} />
          <CircleNode cx={68} cy={106} r={11} color={c3} />
        </>
      )}
      {num === 8 && (
        <>
          <CircleNode cx={32} cy={22} r={10.5} color={c1} />
          <CircleNode cx={68} cy={22} r={10.5} color={c1} />
          <CircleNode cx={32} cy={50} r={10.5} color={c1} />
          <CircleNode cx={68} cy={50} r={10.5} color={c1} />
          <CircleNode cx={32} cy={78} r={10.5} color={c1} />
          <CircleNode cx={68} cy={78} r={10.5} color={c1} />
          <CircleNode cx={32} cy={106} r={10.5} color={c1} />
          <CircleNode cx={68} cy={106} r={10.5} color={c1} />
        </>
      )}
      {num === 9 && (
        <>
          <CircleNode cx={25} cy={25} r={11} color={c1} />
          <CircleNode cx={50} cy={25} r={11} color={c1} />
          <CircleNode cx={75} cy={25} r={11} color={c1} />
          <CircleNode cx={25} cy={65} r={11} color={c2} />
          <CircleNode cx={50} cy={65} r={11} color={c2} />
          <CircleNode cx={75} cy={65} r={11} color={c2} />
          <CircleNode cx={25} cy={105} r={11} color={c3} />
          <CircleNode cx={50} cy={105} r={11} color={c3} />
          <CircleNode cx={75} cy={105} r={11} color={c3} />
        </>
      )}
    </svg>
  );
};

/* -------------------------------------------------------------
   索子 (SOUZU) RENDERING
   1s: Distinctive Japanese Peacock (孔雀)
   2s-9s: Authentic bamboo sticks with joint details
-------------------------------------------------------------- */
const SouzuFace: React.FC<{ num: number; isRed: boolean; size: TileSize }> = ({ num, isRed }) => {
  if (num === 1) {
    return <Souzu1Peacock isRed={isRed} />;
  }
  return <SouzuBamboo num={num} isRed={isRed} />;
};

// 1S Peacock SVG Graphic
const Souzu1Peacock: React.FC<{ isRed: boolean }> = ({ isRed }) => {
  const primary = isRed ? '#dc2626' : '#15803d';
  const accent = isRed ? '#f87171' : '#b91c1c';
  const tail = isRed ? '#b91c1c' : '#047857';

  return (
    <svg viewBox="0 0 100 130" className="w-[85%] h-[85%] drop-shadow-sm">
      {/* Decorative Tail Feathers Fan */}
      <g stroke="#0f172a" strokeWidth="0.8">
        <path d="M 50 75 Q 20 50 16 26 Q 24 22 30 38 Q 42 60 50 75 Z" fill={tail} />
        <path d="M 50 75 Q 35 38 35 15 Q 45 16 45 35 Q 47 56 50 75 Z" fill={primary} />
        <path d="M 50 75 Q 50 30 50 10 Q 58 10 57 32 Q 54 58 50 75 Z" fill={accent} />
        <path d="M 50 75 Q 65 38 65 15 Q 55 16 55 35 Q 53 56 50 75 Z" fill={primary} />
        <path d="M 50 75 Q 80 50 84 26 Q 76 22 70 38 Q 58 60 50 75 Z" fill={tail} />
      </g>
      {/* Peacock Eyes on Feathers */}
      <circle cx="21" cy="27" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6" />
      <circle cx="39" cy="18" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6" />
      <circle cx="53" cy="13" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6" />
      <circle cx="61" cy="18" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6" />
      <circle cx="79" cy="27" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6" />

      {/* Bird Body & Neck */}
      <path
        d="M 46 95 C 44 80 48 70 54 66 C 60 62 62 52 58 45 C 56 42 58 38 61 39 C 64 40 68 46 66 54 C 64 62 58 72 56 95 Z"
        fill={accent}
        stroke="#0f172a"
        strokeWidth="0.8"
      />
      {/* Head & Beak */}
      <ellipse cx="61" cy="38" rx="4.5" ry="3.5" fill={accent} />
      <polygon points="65,37 72,40 65,42" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
      <circle cx="61" cy="37" r="1" fill="#fff" />
      <circle cx="61" cy="37" r="0.5" fill="#000" />
      
      {/* Perch Bamboo Branch */}
      <rect x="25" y="98" width="50" height="7" rx="2" fill="#15803d" stroke="#064e3b" strokeWidth="0.8" />
      <line x1="42" y1="98" x2="42" y2="105" stroke="#047857" strokeWidth="1.5" />
      <line x1="58" y1="98" x2="58" y2="105" stroke="#047857" strokeWidth="1.5" />
      {/* Claws */}
      <line x1="48" y1="94" x2="48" y2="99" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="53" y1="94" x2="53" y2="99" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// Bamboo stick single unit with joint notch
const BambooStick: React.FC<{ x: number; y: number; h?: number; w?: number; color: string }> = ({
  x,
  y,
  h = 36,
  w = 9,
  color,
}) => {
  const halfH = h / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Upper Segment */}
      <rect x={-w / 2} y={-halfH} width={w} height={halfH - 1.5} rx={2} fill={color} stroke="#0f172a" strokeWidth="0.7" />
      <line x1={-w / 2 + 1.5} y1={-halfH + 3} x2={-w / 2 + 1.5} y2={-3} stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
      {/* Joint Knot */}
      <ellipse cx={0} cy={0} rx={w * 0.65} ry={2.5} fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />
      {/* Lower Segment */}
      <rect x={-w / 2} y={1.5} width={w} height={halfH - 1.5} rx={2} fill={color} stroke="#0f172a" strokeWidth="0.7" />
      <line x1={-w / 2 + 1.5} y1={4} x2={-w / 2 + 1.5} y2={halfH - 3} stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
    </g>
  );
};

const SouzuBamboo: React.FC<{ num: number; isRed: boolean }> = ({ num, isRed }) => {
  const green = isRed ? '#dc2626' : '#15803d';
  const red = '#dc2626';
  const blue = '#1d4ed8';

  return (
    <svg viewBox="0 0 100 130" className="w-[84%] h-[84%] drop-shadow-sm">
      {num === 2 && (
        <>
          <BambooStick x={50} y={34} h={44} color={green} />
          <BambooStick x={50} y={96} h={44} color={blue} />
        </>
      )}
      {num === 3 && (
        <>
          <BambooStick x={50} y={30} h={38} color={blue} />
          <BambooStick x={32} y={88} h={42} color={green} />
          <BambooStick x={68} y={88} h={42} color={green} />
        </>
      )}
      {num === 4 && (
        <>
          <BambooStick x={32} y={36} h={40} color={blue} />
          <BambooStick x={68} y={36} h={40} color={green} />
          <BambooStick x={32} y={94} h={40} color={green} />
          <BambooStick x={68} y={94} h={40} color={blue} />
        </>
      )}
      {num === 5 && (
        <>
          <BambooStick x={28} y={34} h={38} color={green} />
          <BambooStick x={72} y={34} h={38} color={blue} />
          <BambooStick x={50} y={65} h={38} color={red} />
          <BambooStick x={28} y={96} h={38} color={blue} />
          <BambooStick x={72} y={96} h={38} color={green} />
        </>
      )}
      {num === 6 && (
        <>
          <BambooStick x={28} y={35} h={38} color={green} />
          <BambooStick x={50} y={35} h={38} color={green} />
          <BambooStick x={72} y={35} h={38} color={green} />
          <BambooStick x={28} y={95} h={38} color={blue} />
          <BambooStick x={50} y={95} h={38} color={blue} />
          <BambooStick x={72} y={95} h={38} color={blue} />
        </>
      )}
      {num === 7 && (
        <>
          <BambooStick x={50} y={24} h={30} color={red} />
          <BambooStick x={28} y={66} h={32} color={green} />
          <BambooStick x={50} y={66} h={32} color={green} />
          <BambooStick x={72} y={66} h={32} color={green} />
          <BambooStick x={28} y={104} h={32} color={green} />
          <BambooStick x={50} y={104} h={32} color={green} />
          <BambooStick x={72} y={104} h={32} color={green} />
        </>
      )}
      {num === 8 && (
        <>
          {/* Classic Japanese Chevron layout */}
          <g transform="rotate(-20 32 36)">
            <BambooStick x={32} y={36} h={30} color={green} />
          </g>
          <g transform="rotate(20 68 36)">
            <BambooStick x={68} y={36} h={30} color={green} />
          </g>
          <g transform="rotate(20 32 68)">
            <BambooStick x={32} y={68} h={30} color={blue} />
          </g>
          <g transform="rotate(-20 68 68)">
            <BambooStick x={68} y={68} h={30} color={blue} />
          </g>
          <BambooStick x={22} y={104} h={28} color={green} />
          <BambooStick x={41} y={104} h={28} color={green} />
          <BambooStick x={59} y={104} h={28} color={green} />
          <BambooStick x={78} y={104} h={28} color={green} />
        </>
      )}
      {num === 9 && (
        <>
          <BambooStick x={26} y={28} h={32} color={blue} />
          <BambooStick x={50} y={28} h={32} color={red} />
          <BambooStick x={74} y={28} h={32} color={green} />
          <BambooStick x={26} y={65} h={32} color={blue} />
          <BambooStick x={50} y={65} h={32} color={red} />
          <BambooStick x={74} y={65} h={32} color={green} />
          <BambooStick x={26} y={102} h={32} color={blue} />
          <BambooStick x={50} y={102} h={32} color={red} />
          <BambooStick x={74} y={102} h={32} color={green} />
        </>
      )}
    </svg>
  );
};

/* -------------------------------------------------------------
   字牌 (JIHAI / HONORS) RENDERING
   1z: 東 (East)
   2z: 南 (South)
   3z: 西 (West)
   4z: 北 (North)
   5z: 白 (Haku / White Dragon - pristine blank ivory)
   6z: 發 (Hatsu / Green Dragon - vibrant emerald green)
   7z: 中 (Chun / Red Dragon - bold crimson red)
-------------------------------------------------------------- */
const JihaiFace: React.FC<{ num: number; size: TileSize }> = ({ num }) => {
  // 5z (White Dragon) in Japanese Riichi Mahjong is completely blank, embodying pure white!
  if (num === 5) {
    return (
      <div className="w-full h-full flex items-center justify-center p-1.5 opacity-40">
        <div className="w-full h-full rounded border border-slate-300/40" />
      </div>
    );
  }

  const jihaiConfig: Record<number, { char: string; color: string; fontClass?: string }> = {
    1: { char: '東', color: '#1e293b' },
    2: { char: '南', color: '#1e293b' },
    3: { char: '西', color: '#1e293b' },
    4: { char: '北', color: '#1e293b' },
    6: { char: '發', color: '#15803d' },
    7: { char: '中', color: '#dc2626' },
  };

  const item = jihaiConfig[num] || { char: '?', color: '#000' };

  return (
    <div className="w-full h-full flex items-center justify-center select-none font-bold">
      <span
        style={{ color: item.color }}
        className="text-[2.2em] font-serif leading-none tracking-normal drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] font-['Noto_Sans_JP']"
      >
        {item.char}
      </span>
    </div>
  );
};

export default MahjongTile;
