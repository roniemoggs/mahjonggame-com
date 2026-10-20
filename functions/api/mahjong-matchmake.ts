/**
 * Cloudflare Pages Function: Matchmaking Queue for Riichi Mahjong 4-Player Rooms
 *
 * Tasks handled:
 * - Matchmaking queue managing 4-player rooms
 * - Endpoint accepts action: 'join' | 'poll' | 'cancel' | 'start_bots'
 * - Players choose game mode: 'tonpuu' (東風戦) or 'hanchan' (半荘戦)
 * - Once 4 tickets match, assigns role ('host' | 'guest'), roomCode, and seats (東・南・西・北)
 * - Auto-Bot Fallback: If fewer than 4 human players are in the queue after 15 seconds,
 *   fills remaining seats with CPU bots and starts the match immediately.
 * - Private Room with Code (合言葉): Matches players with matching room codes.
 */

export interface Ticket {
  ticketId: string;
  playerId: string;
  playerName: string;
  gameMode: 'tonpuu' | 'hanchan';
  roomCode: string; // 'QUICK' or uppercase private code e.g. '7777'
  peerId: string;
  createdAt: number; // Date.now() timestamp
  status: 'waiting' | 'matched' | 'canceled';
  roomId?: string;
  seatIndex?: number;
  seatName?: '東' | '南' | '西' | '北';
  role?: 'host' | 'guest';
}

export interface PlayerAssignment {
  seatIndex: number;
  seatName: '東' | '南' | '西' | '北';
  role: 'host' | 'guest';
  isHuman: boolean;
  ticketId?: string;
  playerId?: string;
  playerName: string;
  peerId?: string;
  cpuProfile?: {
    name: string;
    shortName: string;
    difficulty: 'beginner' | 'normal' | 'advanced';
    levelLabel: string;
    title: string;
  };
}

export interface Room {
  roomId: string;
  roomCode: string;
  gameMode: 'tonpuu' | 'hanchan';
  createdAt: number;
  hostPeerId: string;
  isBotFilled: boolean;
  players: PlayerAssignment[];
}

const SEATS: Array<'東' | '南' | '西' | '北'> = ['東', '南', '西', '北'];

const BOT_TEMPLATES = [
  {
    name: '初級ボット: たけし',
    shortName: 'たけし',
    difficulty: 'beginner' as const,
    levelLabel: '初級',
    title: '牌効率特化',
  },
  {
    name: '中級ボット: あおい',
    shortName: 'あおい',
    difficulty: 'normal' as const,
    levelLabel: '中級',
    title: '攻守バランス',
  },
  {
    name: '上級ボット: けんじ',
    shortName: 'けんじ',
    difficulty: 'advanced' as const,
    levelLabel: '上級',
    title: '鉄壁守備',
  },
];

// In-memory state maintained across requests in the worker isolate
const tickets = new Map<string, Ticket>();
const rooms = new Map<string, Room>();

const BOT_TIMEOUT_MS = 15000; // 15 seconds auto-bot fallback

/**
 * Periodically purge stale tickets and rooms older than 10 minutes
 */
function cleanupStaleData() {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;

  for (const [id, ticket] of tickets.entries()) {
    if (now - ticket.createdAt > TEN_MINUTES) {
      tickets.delete(id);
    }
  }

  for (const [id, room] of rooms.entries()) {
    if (now - room.createdAt > TEN_MINUTES) {
      rooms.delete(id);
    }
  }
}

/**
 * Creates a matched room for an array of human tickets, filling any vacancies with CPU bots.
 */
function createRoomForTickets(matchedTickets: Ticket[]): Room {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const firstTicket = matchedTickets[0];
  const roomCode = firstTicket.roomCode === 'QUICK'
    ? Math.random().toString(36).substring(2, 6).toUpperCase()
    : firstTicket.roomCode;
  const gameMode = firstTicket.gameMode;
  const hostPeerId = firstTicket.peerId;

  const players: PlayerAssignment[] = [];
  const isBotFilled = matchedTickets.length < 4;

  // Assign human players
  for (let i = 0; i < matchedTickets.length; i++) {
    const t = matchedTickets[i];
    const isHost = i === 0;
    const assignment: PlayerAssignment = {
      seatIndex: i,
      seatName: SEATS[i],
      role: isHost ? 'host' : 'guest',
      isHuman: true,
      ticketId: t.ticketId,
      playerId: t.playerId,
      playerName: t.playerName || `プレイヤー ${i + 1}`,
      peerId: t.peerId,
    };
    players.push(assignment);

    // Update ticket state
    t.status = 'matched';
    t.roomId = roomId;
    t.seatIndex = i;
    t.seatName = SEATS[i];
    t.role = isHost ? 'host' : 'guest';
    tickets.set(t.ticketId, t);
  }

  // Fill remaining vacancies with CPU bots
  for (let i = matchedTickets.length; i < 4; i++) {
    const botIdx = i - 1; // 0, 1, 2
    const botTemplate = BOT_TEMPLATES[botIdx] || BOT_TEMPLATES[0];
    const botAssignment: PlayerAssignment = {
      seatIndex: i,
      seatName: SEATS[i],
      role: 'guest',
      isHuman: false,
      playerName: botTemplate.name,
      cpuProfile: botTemplate,
    };
    players.push(botAssignment);
  }

  const room: Room = {
    roomId,
    roomCode,
    gameMode,
    createdAt: Date.now(),
    hostPeerId,
    isBotFilled,
    players,
  };

  rooms.set(roomId, room);
  return room;
}

/**
 * Checks the queue for a given roomCode and gameMode.
 * Matches immediately if 4 tickets are waiting, or if any ticket has reached the 15-second timeout.
 */
function tryMatchQueue(queueKey: string): Room | null {
  const waitingTickets: Ticket[] = [];

  for (const t of tickets.values()) {
    if (t.status === 'waiting') {
      const key = `${t.roomCode}:${t.gameMode}`;
      if (key === queueKey) {
        waitingTickets.push(t);
      }
    }
  }

  if (waitingTickets.length === 0) return null;

  // Sort by earliest arrival
  waitingTickets.sort((a, b) => a.createdAt - b.createdAt);

  // If 4 or more human players are queued -> Match all 4 immediately!
  if (waitingTickets.length >= 4) {
    const group = waitingTickets.slice(0, 4);
    return createRoomForTickets(group);
  }

  // Check 15-second Auto-Bot Fallback timeout
  const oldestTicket = waitingTickets[0];
  const waitDuration = Date.now() - oldestTicket.createdAt;
  if (waitDuration >= BOT_TIMEOUT_MS) {
    // Fill remaining seats with CPU bots and launch immediately
    return createRoomForTickets(waitingTickets);
  }

  return null;
}

/**
 * Core business logic handler for matching requests
 */
export async function handleMatchmake(payload: Record<string, any>): Promise<Record<string, any>> {
  cleanupStaleData();

  const action = payload.action;

  // 1. JOIN MATCHMAKING QUEUE
  if (action === 'join') {
    const playerId = String(payload.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const playerName = String(payload.playerName || 'プレイヤー').trim() || 'プレイヤー';
    const gameMode = payload.gameMode === 'tonpuu' ? 'tonpuu' : 'hanchan';
    const rawRoomCode = payload.roomCode ? String(payload.roomCode).trim().toUpperCase() : 'QUICK';
    const peerId = String(payload.peerId || '').trim();

    if (!peerId) {
      return { status: 'error', message: 'peerId is required for WebRTC connection' };
    }

    // Cancel any previous waiting tickets for this playerId
    for (const [id, t] of tickets.entries()) {
      if (t.playerId === playerId && t.status === 'waiting') {
        t.status = 'canceled';
        tickets.set(id, t);
      }
    }

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ticket: Ticket = {
      ticketId,
      playerId,
      playerName,
      gameMode,
      roomCode: rawRoomCode,
      peerId,
      createdAt: Date.now(),
      status: 'waiting',
    };

    tickets.set(ticketId, ticket);

    const queueKey = `${rawRoomCode}:${gameMode}`;
    const matchedRoom = tryMatchQueue(queueKey);

    if (matchedRoom) {
      const myAssignment = matchedRoom.players.find((p) => p.ticketId === ticketId);
      return {
        status: 'matched',
        ticketId,
        roomId: matchedRoom.roomId,
        roomCode: matchedRoom.roomCode,
        gameMode: matchedRoom.gameMode,
        role: myAssignment?.role || 'guest',
        seatIndex: myAssignment?.seatIndex ?? 0,
        seatName: myAssignment?.seatName ?? '東',
        hostPeerId: matchedRoom.hostPeerId,
        isBotFilled: matchedRoom.isBotFilled,
        players: matchedRoom.players,
      };
    }

    // Still queued
    const currentQueueCount = Array.from(tickets.values()).filter(
      (t) => t.status === 'waiting' && `${t.roomCode}:${t.gameMode}` === queueKey
    ).length;

    return {
      status: 'queued',
      ticketId,
      roomCode: rawRoomCode,
      gameMode,
      queuedSeconds: 0,
      playerCount: currentQueueCount,
      maxPlayers: 4,
    };
  }

  // 2. POLL TICKET STATUS
  if (action === 'poll') {
    const ticketId = String(payload.ticketId || '');
    const ticket = tickets.get(ticketId);

    if (!ticket) {
      return { status: 'canceled', message: 'Ticket not found or expired' };
    }

    if (ticket.status === 'matched' && ticket.roomId) {
      const room = rooms.get(ticket.roomId);
      if (room) {
        return {
          status: 'matched',
          ticketId,
          roomId: room.roomId,
          roomCode: room.roomCode,
          gameMode: room.gameMode,
          role: ticket.role,
          seatIndex: ticket.seatIndex,
          seatName: ticket.seatName,
          hostPeerId: room.hostPeerId,
          isBotFilled: room.isBotFilled,
          players: room.players,
        };
      }
    }

    if (ticket.status === 'canceled') {
      return { status: 'canceled', ticketId };
    }

    // Try matching if 15 seconds elapsed or 4 players present
    const queueKey = `${ticket.roomCode}:${ticket.gameMode}`;
    const matchedRoom = tryMatchQueue(queueKey);

    if (matchedRoom) {
      const updatedTicket = tickets.get(ticketId);
      return {
        status: 'matched',
        ticketId,
        roomId: matchedRoom.roomId,
        roomCode: matchedRoom.roomCode,
        gameMode: matchedRoom.gameMode,
        role: updatedTicket?.role || 'guest',
        seatIndex: updatedTicket?.seatIndex ?? 0,
        seatName: updatedTicket?.seatName ?? '東',
        hostPeerId: matchedRoom.hostPeerId,
        isBotFilled: matchedRoom.isBotFilled,
        players: matchedRoom.players,
      };
    }

    const queuedSeconds = Math.floor((Date.now() - ticket.createdAt) / 1000);
    const currentQueueCount = Array.from(tickets.values()).filter(
      (t) => t.status === 'waiting' && `${t.roomCode}:${t.gameMode}` === queueKey
    ).length;

    return {
      status: 'queued',
      ticketId,
      roomCode: ticket.roomCode,
      gameMode: ticket.gameMode,
      queuedSeconds,
      playerCount: currentQueueCount,
      maxPlayers: 4,
    };
  }

  // 3. CANCEL MATCHMAKING TICKET
  if (action === 'cancel') {
    const ticketId = String(payload.ticketId || '');
    const ticket = tickets.get(ticketId);
    if (ticket) {
      ticket.status = 'canceled';
      tickets.set(ticketId, ticket);
    }
    return { status: 'canceled', ticketId };
  }

  // 4. MANUAL FORCE START WITH BOTS (FOR PRIVATE ROOM HOST)
  if (action === 'start_bots') {
    const ticketId = String(payload.ticketId || '');
    const ticket = tickets.get(ticketId);
    if (ticket && ticket.status === 'waiting') {
      const queueKey = `${ticket.roomCode}:${ticket.gameMode}`;
      const waiting = Array.from(tickets.values()).filter(
        (t) => t.status === 'waiting' && `${t.roomCode}:${t.gameMode}` === queueKey
      );
      if (waiting.length > 0) {
        const room = createRoomForTickets(waiting);
        const myAssignment = room.players.find((p) => p.ticketId === ticketId);
        return {
          status: 'matched',
          ticketId,
          roomId: room.roomId,
          roomCode: room.roomCode,
          gameMode: room.gameMode,
          role: myAssignment?.role || 'host',
          seatIndex: myAssignment?.seatIndex ?? 0,
          seatName: myAssignment?.seatName ?? '東',
          hostPeerId: room.hostPeerId,
          isBotFilled: room.isBotFilled,
          players: room.players,
        };
      }
    }
    return { status: 'error', message: 'Unable to start room with bots' };
  }

  return { status: 'error', message: `Unknown action: ${action}` };
}

/**
 * Standard CORS headers
 */
const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Cloudflare Pages Function entry points
 */
export async function onRequestPost(context: { request: Request }): Promise<Response> {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handleMatchmake(body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'error', message: err?.message || 'Server error' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((val, key) => {
      params[key] = val;
    });
    const result = await handleMatchmake(params);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'error', message: err?.message || 'Server error' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
