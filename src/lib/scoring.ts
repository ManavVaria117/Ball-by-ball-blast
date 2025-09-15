import { Match, Ball } from '@/types/cricket';

export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye';

export interface ProcessBallOptions {
  runs: number;
  isExtra?: boolean;
  extraType?: ExtraType;
  batRunsOnNoBall?: number;
}

export function cloneMatch(match: Match): Match {
  return JSON.parse(JSON.stringify(match));
}

export function rotateStrike(match: Match) {
  const temp = match.strikerId;
  match.strikerId = match.nonStrikerId;
  match.nonStrikerId = temp;
}

export function processBallGeneric(match: Match, options: ProcessBallOptions): Match {
  const updated = cloneMatch(match);
  // push previous snapshot and cap history length to 50 to reduce memory churn
  const prev = cloneMatch(match);
  const newHistory = [...updated.history, prev];
  if (newHistory.length > 50) newHistory.shift();
  updated.history = newHistory;

  const { runs, isExtra = false, extraType, batRunsOnNoBall = 0 } = options;

  let displayText = runs.toString();
  if (extraType === 'wide') displayText = runs > 1 ? `WD+${runs - 1}` : 'WD';
  if (extraType === 'noball') displayText = batRunsOnNoBall ? `NB+${batRunsOnNoBall}` : 'NB';
  if (extraType === 'bye') displayText = runs ? `B${runs}` : 'B';
  if (extraType === 'legbye') displayText = runs ? `LB${runs}` : 'LB';

  const ball: Ball = {
    run: runs,
    display: displayText,
    isWide: extraType === 'wide',
    isNoball: extraType === 'noball',
    isBye: extraType === 'bye',
    isLegBye: extraType === 'legbye'
  };

  updated.currentOverBalls = [...updated.currentOverBalls, ball];

  // Score increments
  if (extraType === 'noball') {
    updated.score += 1 + batRunsOnNoBall; // base no-ball + bat runs
  } else if (extraType === 'wide') {
    updated.score += runs; // wides can be multiple; ball doesn't count
  } else if (extraType === 'bye' || extraType === 'legbye') {
    updated.score += runs;
    updated.totalBalls += 1;
  } else {
    updated.score += runs;
    updated.totalBalls += 1;
  }

  // Batting stats (no credit for byes/leg byes)
  if (!ball.isBye && !ball.isLegBye && updated.strikerId) {
    const battingTeam = updated.battingTeam === updated.teamA.name ? updated.teamA : updated.teamB;
    const striker = battingTeam.players.find(p => p.id === updated.strikerId);
    if (striker) {
      const runsCredited = extraType === 'noball' ? batRunsOnNoBall : runs;
      striker.runs += runsCredited;
      if (extraType !== 'wide' && extraType !== 'noball') striker.balls += 1;
      if (runsCredited === 4) striker.fours += 1;
      if (runsCredited === 6) striker.sixes += 1;
    }
  }

  // Bowler stats
  if (updated.bowlerId) {
    const bowlingTeam = updated.bowlingTeam === updated.teamA.name ? updated.teamA : updated.teamB;
    const bowler = bowlingTeam.players.find(p => p.id === updated.bowlerId);
    if (bowler) {
      const conceded = extraType === 'noball' ? 1 + batRunsOnNoBall : runs;
      bowler.bowlRuns = (bowler.bowlRuns || 0) + conceded;
      if (extraType !== 'wide' && extraType !== 'noball') bowler.bowlBalls = (bowler.bowlBalls || 0) + 1;
    }
  }

  // Strike rotation on odd runs from bat or byes/leg byes; end-over rotation separately
  const oddFromBat = extraType === 'noball' ? (batRunsOnNoBall % 2 === 1) : (runs % 2 === 1);
  const isBallCounted = !(extraType === 'wide' || extraType === 'noball');
  const oddFromExtras = (extraType === 'bye' || extraType === 'legbye') && (runs % 2 === 1);
  if ((oddFromBat || oddFromExtras) && (!isBallCounted || updated.totalBalls % 6 !== 0)) {
    rotateStrike(updated);
  }

  // End of over transition (if ball counted)
  if (isBallCounted && updated.totalBalls % 6 === 0) {
    updated.currentOverBalls = [];
    rotateStrike(updated);
  }

  return updated;
}

export function processWicketGeneric(match: Match): Match {
  const updated = cloneMatch(match);
  updated.history = [...updated.history, cloneMatch(match)];

  updated.wickets += 1;
  updated.totalBalls += 1;

  const battingTeam = updated.battingTeam === updated.teamA.name ? updated.teamA : updated.teamB;
  const striker = battingTeam.players.find(p => p.id === updated.strikerId!);
  if (striker) {
    striker.isOut = true;
    striker.balls += 1;
  }

  if (updated.bowlerId) {
    const bowlingTeam = updated.bowlingTeam === updated.teamA.name ? updated.teamA : updated.teamB;
    const bowler = bowlingTeam.players.find(p => p.id === updated.bowlerId);
    if (bowler) {
      bowler.bowlBalls = (bowler.bowlBalls || 0) + 1;
      bowler.bowlWickets = (bowler.bowlWickets || 0) + 1;
    }
  }

  const ball: Ball = { run: 0, display: 'W', isWicket: true } as Ball;
  updated.currentOverBalls = [...updated.currentOverBalls, ball];

  if (updated.totalBalls % 6 === 0) {
    updated.currentOverBalls = [];
    rotateStrike(updated);
  }

  return updated;
}


