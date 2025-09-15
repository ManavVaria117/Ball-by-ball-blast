export interface ApiPlayer {
  id: string;
  name: string;
}

export interface CreateMatchRequest {
  code: string;
  teamA: { name: string; players: ApiPlayer[] };
  teamB: { name: string; players: ApiPlayer[] };
  oversLimit: number;
  toss: { winner: string; decision: 'bat' | 'bowl' };
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export async function createMatch(payload: CreateMatchRequest) {
  const res = await fetch(`${API_BASE}/api/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create match failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function appendEvent(matchId: string, type: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}/api/matches/${matchId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Append event failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function undoEvent(matchId: string) {
  const res = await fetch(`${API_BASE}/api/matches/${matchId}/undo`, {
    method: 'POST'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Undo failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getMatchByCode(code: string) {
  const res = await fetch(`${API_BASE}/api/matches/code/${code}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch by code failed: ${res.status} ${text}`);
  }
  return res.json();
}


