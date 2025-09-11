export interface Player {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets?: number;
  isOut: boolean;
  dismissalType?: string;
  dismissedBy?: string;
}

export interface Team {
  name: string;
  players: Player[];
}

export interface Ball {
  run: number;
  display: string;
  isWide?: boolean;
  isNoball?: boolean;
  isBye?: boolean;
  isLegBye?: boolean;
  isWicket?: boolean;
}

export interface BowlerStats {
  playerId: string;
  overs: number;
  runs: number;
  wickets: number;
  balls: number;
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  overs: number;
  toss: {
    winner: string;
    decision: 'bat' | 'bowl';
  };
  battingTeam: string;
  bowlingTeam: string;
  innings: 1 | 2;
  status: 'pre-match' | 'live' | 'break' | 'finished';
  score: number;
  wickets: number;
  totalBalls: number;
  currentOverBalls: Ball[];
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  history: Match[];
  target: number;
  result?: string;
  createdAt: number;
}

export type Screen = 'home' | 'setup' | 'players' | 'scoring' | 'finished' | 'scorecard';