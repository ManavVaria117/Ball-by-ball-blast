import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeftRight, Trophy, Users, RotateCcw, Eye, Target, Clock, LogOut } from 'lucide-react';
import { Match, Screen, Player, Ball } from '@/types/cricket';
import { createMatch, appendEvent, undoEvent, getMatchByCode } from '@/lib/api';
import { processBallGeneric, processWicketGeneric } from '@/lib/scoring';
import { useAuth } from '@/components/AuthProvider';

const CricketScorer = () => {
  const { signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [match, setMatch] = useState<Match | null>(null);
  const [matchId, setMatchId] = useState('');
  const [setupData, setSetupData] = useState({
    teamA: '',
    teamB: '',
    overs: 1,
    tossWinner: '',
    tossDecision: 'bat' as 'bat' | 'bowl'
  });
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>(Array(11).fill(''));
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>(Array(11).fill(''));
  const [showStrikerDialog, setShowStrikerDialog] = useState(false);
  const [selectedStriker, setSelectedStriker] = useState('');
  const [selectedNonStriker, setSelectedNonStriker] = useState('');
  const [showBowlerDialog, setShowBowlerDialog] = useState(false);
  const [selectedBowler, setSelectedBowler] = useState('');
  const [showNextBowlerDialog, setShowNextBowlerDialog] = useState(false);
  const [selectedNextBowler, setSelectedNextBowler] = useState('');
  const [showNextBatsmanDialog, setShowNextBatsmanDialog] = useState(false);
  const [selectedNextBatsman, setSelectedNextBatsman] = useState('');
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [extrasType, setExtrasType] = useState<'wide' | 'noball' | 'bye' | null>(null);
  const [extrasRuns, setExtrasRuns] = useState<number>(1);
  const [noBallBatRuns, setNoBallBatRuns] = useState<number>(0);
  const [showInningsOpenersDialog, setShowInningsOpenersDialog] = useState(false);
  const [inningsStriker, setInningsStriker] = useState('');
  const [inningsNonStriker, setInningsNonStriker] = useState('');
  const [inningsBowler, setInningsBowler] = useState('');
  const saveTimerRef = useRef<number | null>(null);

  // Generate players for a team based on filled names only
  const generatePlayers = (teamName: string, playerNames: string[]): Player[] => {
    const filledPlayers = playerNames.filter(name => name.trim() !== '');
    return filledPlayers.map((name, i) => ({
      id: `${teamName.toLowerCase()}_p${i + 1}`,
      name: name.trim(),
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false
    }));
  };

  // Check if at least one player is filled for each team
  const areMinimumPlayersFilled = () => {
    const teamAHasPlayers = teamAPlayers.some(player => player.trim() !== '');
    const teamBHasPlayers = teamBPlayers.some(player => player.trim() !== '');
    return teamAHasPlayers && teamBHasPlayers;
  };

  // Handle striker selection and show bowler dialog
  const handleStrikerSelection = () => {
    if (!selectedStriker || !selectedNonStriker) return;
    setShowStrikerDialog(false);
    setShowBowlerDialog(true);
  };

  // Handle bowler selection and start match
  const handleBowlerSelection = async () => {
    if (!selectedBowler) return;
    const newMatchId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newMatch: Match = {
      id: newMatchId,
      teamA: {
        name: setupData.teamA,
        players: generatePlayers(setupData.teamA, teamAPlayers)
      },
      teamB: {
        name: setupData.teamB,
        players: generatePlayers(setupData.teamB, teamBPlayers)
      },
      overs: setupData.overs,
      toss: {
        winner: setupData.tossWinner,
        decision: setupData.tossDecision
      },
      battingTeam: setupData.tossWinner === setupData.teamA 
        ? (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB)
        : (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA),
      bowlingTeam: setupData.tossWinner === setupData.teamA 
        ? (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA)
        : (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB),
      innings: 1,
      status: 'live',
      score: 0,
      wickets: 0,
      totalBalls: 0,
      currentOverBalls: [],
      strikerId: selectedStriker,
      nonStrikerId: selectedNonStriker,
      bowlerId: selectedBowler,
      history: [],
      target: 0,
      createdAt: Date.now()
    };
    
    setMatch(newMatch);
    setMatchId(newMatchId);
    setShowBowlerDialog(false);
    setCurrentScreen('scoring');

    // Fire-and-forget creation on backend (best-effort). Keep UI responsive.
    try {
      const battingTeamName = newMatch.battingTeam;
      const bowlingTeamName = newMatch.bowlingTeam;
      const batting = battingTeamName === newMatch.teamA.name ? newMatch.teamA : newMatch.teamB;
      const bowling = bowlingTeamName === newMatch.teamA.name ? newMatch.teamA : newMatch.teamB;
      await createMatch({
        code: newMatchId,
        teamA: { name: newMatch.teamA.name, players: newMatch.teamA.players.map(p => ({ id: p.id, name: p.name })) },
        teamB: { name: newMatch.teamB.name, players: newMatch.teamB.players.map(p => ({ id: p.id, name: p.name })) },
        oversLimit: newMatch.overs,
        toss: newMatch.toss,
        strikerId: newMatch.strikerId,
        nonStrikerId: newMatch.nonStrikerId,
        bowlerId: newMatch.bowlerId
      });
    } catch (e) {
      console.warn('Backend createMatch failed', e);
    }
  };

  // Initialize a new match (legacy function - will be replaced by striker selection)
  const startNewMatch = () => {
    if (areMinimumPlayersFilled()) {
      setShowStrikerDialog(true);
    }
  };

  // localStorage: restore match on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bbb_current_match');
      if (saved) {
        const parsed = JSON.parse(saved) as Match;
        setMatch(parsed);
        setCurrentScreen('scoring');
      }
    } catch {}
  }, []);

  // localStorage: debounced save on match change, omit heavy history
  useEffect(() => {
    try {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (match) {
        const toSave = { ...match, history: [] as any[] };
        saveTimerRef.current = window.setTimeout(() => {
          try {
            localStorage.setItem('bbb_current_match', JSON.stringify(toSave));
          } catch {}
        }, 200);
      } else {
        localStorage.removeItem('bbb_current_match');
      }
    } catch {}
    // cleanup on unmount
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [match]);

  // Process a ball (runs scored)
  const processBall = async (runs: number, isExtra = false, extraType?: string) => {
    if (!match) return;

    const options: any = { runs, isExtra, extraType };
    if (extraType === 'noball') {
      options.batRunsOnNoBall = runs; // treat provided runs as bat runs on no-ball
      options.runs = 0; // runs field unused for nb
    }
    const updatedMatch = processBallGeneric(match, options);

    // Persist event best-effort
    // Fire-and-forget: do not await to avoid UI lag
    if (matchId) {
      const send = async () => {
        try {
          if (extraType === 'noball') await appendEvent(matchId, 'noball', { batRuns: runs });
          else if (extraType === 'wide') await appendEvent(matchId, 'wide', { runs });
          else if (extraType === 'bye') await appendEvent(matchId, 'bye', { runs });
          else if (extraType === 'legbye') await appendEvent(matchId, 'legbye', { runs });
          else await appendEvent(matchId, runs === 4 ? 'boundary' : runs === 6 ? 'six' : 'run', { runs });
        } catch {}
      };
      send();
    }

    // If over completed by a counted ball, prompt next bowler
    const ballCounted = updatedMatch.totalBalls !== match.totalBalls;
    if (ballCounted && updatedMatch.totalBalls % 6 === 0 && updatedMatch.totalBalls < updatedMatch.overs * 6) {
      // before prompting, check innings/match end
      if (!handleInningsAndMatchEnd(updatedMatch)) {
      setMatch(updatedMatch);
      setShowNextBowlerDialog(true);
      }
      return;
    }

    if (handleInningsAndMatchEnd(updatedMatch)) return;
    setMatch(updatedMatch);
  };

  // Process wicket
  const processWicket = async () => {
    if (!match || !match.strikerId) return;

    const updatedMatch = processWicketGeneric(match);

    // Fire-and-forget
    if (matchId) { (async () => { try { await appendEvent(matchId, 'wicket', {}); } catch {} })(); }

    // Find next batsman - show dialog if more than one available
    const battingTeamLocal = updatedMatch.battingTeam === updatedMatch.teamA.name ? updatedMatch.teamA : updatedMatch.teamB;
    const availableBatsmen = battingTeamLocal.players.filter(p => !p.isOut && p.id !== updatedMatch.nonStrikerId);
    if (availableBatsmen.length > 1) {
      setMatch(updatedMatch);
      setShowNextBatsmanDialog(true);
      return;
    } else if (availableBatsmen.length === 1) {
      updatedMatch.strikerId = availableBatsmen[0].id;
    }

    if (handleInningsAndMatchEnd(updatedMatch)) return;
    if (updatedMatch.totalBalls % 6 === 0 && updatedMatch.totalBalls < updatedMatch.overs * 6) {
      setMatch(updatedMatch);
      setShowNextBowlerDialog(true);
      return;
    }

    setMatch(updatedMatch);
  };

  // Handle innings transition and match completion
  const handleInningsAndMatchEnd = (candidate: Match) => {
    // End of first innings: overs finished or all out
    if (candidate.innings === 1 && (candidate.totalBalls >= candidate.overs * 6 || candidate.wickets >= 10)) {
      const target = candidate.score + 1;
      const nextBatting = candidate.battingTeam === candidate.teamA.name ? candidate.teamB.name : candidate.teamA.name;
      const nextBowling = candidate.battingTeam;
      // Reset player stats for new innings
      const resetBatting = (team: Match['teamA']) => ({
        ...team,
        players: team.players.map(p => ({
          ...p,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissalType: undefined,
          dismissedBy: undefined,
        }))
      });
      const resetBowling = (team: Match['teamA']) => ({
        ...team,
        players: team.players.map(p => ({
          ...p,
          bowlRuns: 0,
          bowlBalls: 0,
          bowlWickets: 0,
        }))
      });

      const nextTeamA = nextBatting === candidate.teamA.name ? resetBatting(candidate.teamA) : resetBowling(candidate.teamA);
      const nextTeamB = nextBatting === candidate.teamB.name ? resetBatting(candidate.teamB) : resetBowling(candidate.teamB);

      const next: Match = {
        ...candidate,
        teamA: nextTeamA,
        teamB: nextTeamB,
        innings: 2,
        target,
        battingTeam: nextBatting,
        bowlingTeam: nextBowling,
        score: 0,
        wickets: 0,
        totalBalls: 0,
        currentOverBalls: [],
        strikerId: undefined,
        nonStrikerId: undefined,
        bowlerId: undefined,
      };
      setMatch(next);
      // Open openers+bowler selection dialog in scoring screen
      setInningsStriker('');
      setInningsNonStriker('');
      setInningsBowler('');
      setShowInningsOpenersDialog(true);
      setShowNextBowlerDialog(false);
      return true;
    }

    // End of match in second innings
    if (candidate.innings === 2) {
      const chaseAchieved = candidate.target > 0 && candidate.score >= candidate.target;
      const inningsOver = candidate.totalBalls >= candidate.overs * 6 || candidate.wickets >= 10;
      if (chaseAchieved || inningsOver) {
        const battingWins = chaseAchieved;
        let result: string;
        if (battingWins) {
          const wicketsRemain = Math.max(0, 10 - candidate.wickets);
          const ballsLeft = Math.max(0, candidate.overs * 6 - candidate.totalBalls);
          result = `${candidate.battingTeam} won by ${wicketsRemain} wicket(s) with ${ballsLeft} ball(s) left`;
        } else {
          const runsMargin = Math.max(0, candidate.target - 1 - candidate.score);
          if (runsMargin === 0) {
            result = 'Match tied';
          } else {
            result = `${candidate.bowlingTeam} won by ${runsMargin} run(s)`;
          }
        }
        const finished: Match = { ...candidate, status: 'finished', result };
        setMatch(finished);
        setCurrentScreen('scorecard');
        setShowNextBowlerDialog(false);
        return true;
      }
    }
    return false;
  };

  // Process retirement (no ball count, no bowler stats affected)
  const processRetirement = () => {
    if (!match || !match.strikerId) return;

    const newHistory = [...match.history, JSON.parse(JSON.stringify(match))];
    const updatedMatch = { ...match };
    updatedMatch.history = newHistory;

    // Mark striker as out (retired)
    const battingTeam = match.battingTeam === match.teamA.name ? updatedMatch.teamA : updatedMatch.teamB;
    const striker = battingTeam.players.find(p => p.id === match.strikerId);
    if (striker) {
      striker.isOut = true;
      striker.dismissalType = 'retired';
    }

    // Find next batsman - show dialog if more than one available
    const availableBatsmen = battingTeam.players.filter(p => !p.isOut && p.id !== match.nonStrikerId);
    if (availableBatsmen.length > 1) {
      setMatch(updatedMatch);
      setShowNextBatsmanDialog(true);
      return;
    } else if (availableBatsmen.length === 1) {
      updatedMatch.strikerId = availableBatsmen[0].id;
    }

    setMatch(updatedMatch);
  };

  const getCurrentBattingTeam = () => {
    if (!match) return null;
    return match.battingTeam === match.teamA.name ? match.teamA : match.teamB;
  };

  const getCurrentBowlingTeam = () => {
    if (!match) return null;
    return match.bowlingTeam === match.teamA.name ? match.teamA : match.teamB;
  };

  const getPlayer = (playerId?: string) => {
    if (!match || !playerId) return null;
    const allPlayers = [...match.teamA.players, ...match.teamB.players];
    return allPlayers.find(p => p.id === playerId);
  };

  const getCurrentOver = () => {
    if (!match) return '0.0';
    const overs = Math.floor(match.totalBalls / 6);
    const balls = match.totalBalls % 6;
    return `${overs}.${balls}`;
  };

  const getCurrentRunRate = () => {
    if (!match || match.totalBalls === 0) return '0.00';
    return ((match.score / match.totalBalls) * 6).toFixed(2);
  };

  const getRequiredRunRate = () => {
    if (!match || match.innings === 1 || match.target === 0) return '0.00';
    const remaining = match.target - match.score;
    const ballsLeft = (match.overs * 6) - match.totalBalls;
    if (ballsLeft <= 0) return '0.00';
    return ((remaining / ballsLeft) * 6).toFixed(2);
  };

  // Build per-ball timeline from history snapshots + current
  const buildBallTimeline = () => {
    if (!match) return [] as Array<{ before: Match; after: Match }>;
    const timeline: Array<{ before: Match; after: Match }> = [];
    for (let i = 0; i < match.history.length; i++) {
      const before = match.history[i];
      const after = i + 1 < match.history.length ? match.history[i + 1] : match;
      timeline.push({ before, after });
    }
    return timeline;
  };

  const computeFallOfWickets = () => {
    if (!match) return [] as Array<{ score: number; wicketNum: number; batter?: string }>;
    const battingName = getCurrentBattingTeam()?.name;
    const fow: Array<{ score: number; wicketNum: number; batter?: string }> = [];
    const timeline = buildBallTimeline();
    timeline.forEach(({ before, after }) => {
      if (after.wickets > before.wickets) {
        const wicketNum = after.wickets;
        const scoreAt = after.score;
        let dismissed: string | undefined;
        const beforeTeam = before.battingTeam === before.teamA.name ? before.teamA : before.teamB;
        const afterTeam = after.battingTeam === after.teamA.name ? after.teamA : after.teamB;
        if (beforeTeam.name === battingName && afterTeam.name === battingName) {
          const beforeOut = new Set(beforeTeam.players.filter(p => p.isOut).map(p => p.id));
          const afterOut = new Set(afterTeam.players.filter(p => p.isOut).map(p => p.id));
          for (const p of afterOut) {
            if (!beforeOut.has(p)) {
              const player = afterTeam.players.find(pl => pl.id === p);
              dismissed = player?.name;
              break;
            }
          }
        }
        fow.push({ score: scoreAt, wicketNum, batter: dismissed });
      }
    });
    return fow;
  };

  const computeOverSummaries = () => {
    if (!match) return [] as Array<{ over: number; runs: number; wickets: number; bowlerName?: string }>;
    const timeline = buildBallTimeline();
    const overs: Array<{ over: number; runs: number; wickets: number; bowlerName?: string }> = [];
    let overIndex = 0;
    let runs = 0;
    let wickets = 0;
    let ballsInOver = 0;
    let currentBalls = 0;
    let currentBowlerName: string | undefined = undefined;
    timeline.forEach(({ before, after }) => {
      const deltaRuns = after.score - before.score;
      const legal = after.totalBalls > before.totalBalls;
      runs += deltaRuns;
      if (after.wickets > before.wickets && legal) wickets += after.wickets - before.wickets;
      if (legal) {
        if (ballsInOver === 0) {
          // first legal ball of the over: capture bowler name from 'after'
          const bowlingTeam = after.bowlingTeam === after.teamA.name ? after.teamA : after.teamB;
          const bowler = bowlingTeam.players.find(p => p.id === after.bowlerId);
          currentBowlerName = bowler?.name;
        }
        ballsInOver += 1;
        currentBalls += 1;
        if (ballsInOver === 6) {
          overs.push({ over: overIndex + 1, runs, wickets, bowlerName: currentBowlerName });
          overIndex += 1;
          runs = 0; wickets = 0; ballsInOver = 0; currentBowlerName = undefined;
        }
      }
    });
    // Do not push incomplete over summary
    return overs;
  };

  const exportMatchSummary = () => {
    if (!match) return;
    const summary = {
      id: match.id,
      status: match.status,
      result: match.result,
      innings: match.innings,
      target: match.target,
      oversLimit: match.overs,
      battingTeam: match.battingTeam,
      bowlingTeam: match.bowlingTeam,
      score: match.score,
      wickets: match.wickets,
      overs: getCurrentOver(),
      teamA: { name: match.teamA.name, players: match.teamA.players.map(p => ({ name: p.name, runs: p.runs, balls: p.balls, fours: p.fours, sixes: p.sixes })) },
      teamB: { name: match.teamB.name, players: match.teamB.players.map(p => ({ name: p.name, runs: p.runs, balls: p.balls, fours: p.fours, sixes: p.sixes })) },
      fallOfWickets: computeFallOfWickets(),
      overSummaries: computeOverSummaries(),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${match.id}_summary.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!match) return;
    const battingTeam = getCurrentBattingTeam();
    const bowlingTeam = match.battingTeam === match.teamA.name ? match.teamB : match.teamA;

    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    const battingRows = [
      ['Batsman','R','B','4s','6s','SR'],
      ...(battingTeam?.players || []).filter(p => p.balls > 0 || p.isOut).map(p => [
        p.name,
        p.runs,
        p.balls,
        p.fours,
        p.sixes,
        p.balls > 0 ? (((p.runs / p.balls) * 100).toFixed(2)) : '0.00'
      ])
    ].map(r => r.map(esc).join(',')).join('\n');

    const bowlingRows = [
      ['Bowler','O','R','W','ECO'],
      ...(bowlingTeam.players || []).filter(p => (p.balls || 0) > 0).map(p => {
        const oversWhole = Math.floor((p.balls || 0) / 6);
        const ballsRem = (p.balls || 0) % 6;
        const oversForEcon = (p.balls || 0) / 6;
        const econ = oversForEcon > 0 ? ((p.runs || 0) / oversForEcon).toFixed(2) : '0.00';
        return [p.name, `${oversWhole}.${ballsRem}`, p.runs || 0, p.wickets || 0, econ];
      })
    ].map(r => r.map(esc).join(',')).join('\n');

    const csv = `Batting\n${battingRows}\n\nBowling\n${bowlingRows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${match.id}_scorecard.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    const code = matchId || match?.id;
    if (!code) return;
    const url = `${window.location.origin}`;
    const shareText = `Join this match in the app with code ${code}`;
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {}
  };

  const leaveMatch = () => {
    // Clear match state and return to home
    try { localStorage.removeItem('bbb_current_match'); } catch {}
    setMatch(null);
    setMatchId('');
    setShowNextBowlerDialog(false);
    setShowNextBatsmanDialog(false);
    setShowBowlerDialog(false);
    setShowStrikerDialog(false);
    setCurrentScreen('home');
  };

  const startFreshMatch = () => {
    // Clear current and go to setup
    try { localStorage.removeItem('bbb_current_match'); } catch {}
    setMatch(null);
    setMatchId('');
    setShowNextBowlerDialog(false);
    setShowNextBatsmanDialog(false);
    setShowBowlerDialog(false);
    setShowStrikerDialog(false);
    setCurrentScreen('setup');
  };

  // Undo last ball
  const undoLastBall = async () => {
    if (!match || match.history.length === 0) return;
    const previousState = match.history[match.history.length - 1];
    // pop the history by cloning previous and trimming
    const trimmed = JSON.parse(JSON.stringify(previousState)) as Match;
    trimmed.history = previousState.history.slice(0, -1);
    setMatch(trimmed);
    // Fire-and-forget
    if (matchId) { (async () => { try { await undoEvent(matchId); } catch {} })(); }
  };

  // Handle next bowler selection
  const handleNextBowlerSelection = () => {
    if (!selectedNextBowler || !match) return;
    
    const updatedMatch = { ...match };
    updatedMatch.bowlerId = selectedNextBowler;
    
    setMatch(updatedMatch);
    setShowNextBowlerDialog(false);
    setSelectedNextBowler('');
  };

  // Handle next batsman selection
  const handleNextBatsmanSelection = () => {
    if (!selectedNextBatsman || !match) return;
    
    const updatedMatch = { ...match };
    updatedMatch.strikerId = selectedNextBatsman;
    
    setMatch(updatedMatch);
    setShowNextBatsmanDialog(false);
    setSelectedNextBatsman('');
  };

  const renderHomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,hsl(var(--primary)/0.02)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8 fade-in-up">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary-glow to-primary rounded-3xl flex items-center justify-center shadow-2xl pulse-glow">
                  <Trophy className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-900">⚡</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent mb-3">
              Cricket Scorer
            </h1>
            <p className="text-muted-foreground text-lg">
              Professional cricket match scoring made simple
            </p>
          </div>

          {/* Main Card */}
          <div className="modern-card slide-in">
            <div className="relative">
          <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
          </div>

            <div className="space-y-6">
              {/* Primary Action */}
          <Button 
            variant="hero" 
                size="xl"
                className="w-full action-button"
            onClick={() => setCurrentScreen('setup')}
          >
                <Trophy className="h-6 w-6 mr-3" />
            Start New Match
          </Button>
              
              {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
            </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground font-medium">
                    Or continue existing match
                  </span>
            </div>
          </div>

              {/* Match ID Input */}
              <div className="space-y-4">
                <div className="flex gap-3">
            <Input
              placeholder="Enter Match ID"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                    className="flex-1 h-12 text-center font-mono text-lg border-border/50 focus:border-primary/50 transition-colors"
            />
            <Button 
              variant="outline" 
                    size="lg"
                    onClick={async () => {
                      try {
                        const remote = await getMatchByCode(matchId);
                        // naive transform: reconstruct local Match fields from backend snapshot
                        const local: Match = {
                          id: remote.code || matchId,
                          teamA: { name: remote.teamA.name, players: remote.teamA.players.map((p: any) => ({ id: p._id, name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false })) },
                          teamB: { name: remote.teamB.name, players: remote.teamB.players.map((p: any) => ({ id: p._id, name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false })) },
                          overs: remote.innings?.[remote.inningsIndex || 0]?.oversLimit || setupData.overs,
                          toss: remote.toss,
                          battingTeam: remote.innings?.[remote.inningsIndex || 0]?.battingTeam || remote.teamA.name,
                          bowlingTeam: remote.innings?.[remote.inningsIndex || 0]?.bowlingTeam || remote.teamB.name,
                          innings: (remote.inningsIndex || 0) + 1 as 1 | 2,
                          status: remote.status || 'live',
                          score: remote.innings?.[remote.inningsIndex || 0]?.score || 0,
                          wickets: remote.innings?.[remote.inningsIndex || 0]?.wickets || 0,
                          totalBalls: remote.innings?.[remote.inningsIndex || 0]?.balls || 0,
                          currentOverBalls: [],
                          strikerId: remote.innings?.[remote.inningsIndex || 0]?.strikerId,
                          nonStrikerId: remote.innings?.[remote.inningsIndex || 0]?.nonStrikerId,
                          bowlerId: remote.innings?.[remote.inningsIndex || 0]?.bowlerId,
                          history: [],
                          target: remote.innings?.[1]?.target || 0,
                          createdAt: Date.now()
                        };
                        setMatch(local);
                        setCurrentScreen('scoring');
                      } catch (e) {
                        console.warn('Failed to join match', e);
                      }
                    }}
                    disabled={!matchId.trim()}
                    className="action-button"
                  >
                    <Eye className="h-5 w-5" />
            </Button>
          </div>
                <p className="text-sm text-muted-foreground text-center">
                  Enter the 6-character match code to continue scoring
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 fade-in-up">
            <div className="text-center p-4 rounded-xl bg-card/30 border border-border/30">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Real-time Scoring</h3>
              <p className="text-xs text-muted-foreground">Live updates</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/30 border border-border/30">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Team Management</h3>
              <p className="text-xs text-muted-foreground">Full squad support</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/30 border border-border/30">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Match History</h3>
              <p className="text-xs text-muted-foreground">Complete records</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSetupScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.1),transparent_50%)]"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8 fade-in-up">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary via-primary-glow to-primary rounded-2xl flex items-center justify-center shadow-xl">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent mb-2">
              Match Setup
            </h1>
            <p className="text-muted-foreground">
              Configure your cricket match details
            </p>
          </div>

          {/* Main Setup Card */}
          <div className="modern-card slide-in">
            <div className="space-y-6">
              {/* Team Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-primary flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Team A Name
                  </label>
            <Input
              value={setupData.teamA}
              onChange={(e) => setSetupData(prev => ({ ...prev, teamA: e.target.value }))}
              placeholder="Enter team name"
                    className="h-12 text-lg border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-primary flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Team B Name
                  </label>
            <Input
              value={setupData.teamB}
              onChange={(e) => setSetupData(prev => ({ ...prev, teamB: e.target.value }))}
              placeholder="Enter team name"
                    className="h-12 text-lg border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
              </div>

              {/* Match Format */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Total Overs
                </label>
                <div className="relative">
            <Input
              type="number"
              value={setupData.overs}
              onChange={(e) => setSetupData(prev => ({ ...prev, overs: parseInt(e.target.value) || 1 }))}
              min="1"
              max="50"
                    className="h-12 text-lg border-border/50 focus:border-primary/50 transition-colors pr-16"
            />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    overs
          </div>
                </div>
              </div>

              {/* Toss Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-primary flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Toss won by
                  </label>
            <Select
              value={setupData.tossWinner}
              onValueChange={(value) => setSetupData(prev => ({ ...prev, tossWinner: value }))}
            >
                    <SelectTrigger className="h-12 text-lg border-border/50 focus:border-primary/50">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {setupData.teamA && <SelectItem value={setupData.teamA}>{setupData.teamA}</SelectItem>}
                {setupData.teamB && <SelectItem value={setupData.teamB}>{setupData.teamB}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-primary flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Opted to
                  </label>
            <Select
              value={setupData.tossDecision}
              onValueChange={(value: 'bat' | 'bowl') => setSetupData(prev => ({ ...prev, tossDecision: value }))}
            >
                    <SelectTrigger className="h-12 text-lg border-border/50 focus:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                      <SelectItem value="bat">🏏 Bat</SelectItem>
                      <SelectItem value="bowl">🎯 Bowl</SelectItem>
              </SelectContent>
            </Select>
          </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentScreen('home')} 
                  className="flex-1 h-12 action-button"
                >
                  ← Back
            </Button>
            <Button 
              variant="hero" 
              onClick={() => setCurrentScreen('players')}
              disabled={!setupData.teamA || !setupData.teamB || !setupData.tossWinner}
                  className="flex-1 h-12 action-button"
            >
                  Next: Add Players →
            </Button>
          </div>
            </div>
          </div>

          {/* Match Preview */}
          {(setupData.teamA || setupData.teamB) && (
            <div className="mt-6 modern-card fade-in-up">
              <h3 className="text-lg font-semibold mb-4 text-center">Match Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">Team A</h4>
                  <p className="text-lg">{setupData.teamA || 'Not set'}</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">Team B</h4>
                  <p className="text-lg">{setupData.teamB || 'Not set'}</p>
                </div>
              </div>
              {setupData.tossWinner && (
                <div className="mt-4 text-center p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-sm text-muted-foreground">Toss</p>
                  <p className="font-semibold">
                    {setupData.tossWinner} won the toss and chose to {setupData.tossDecision}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPlayersScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Add Team Players</CardTitle>
            <p className="text-center text-muted-foreground">Enter player names for both teams</p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team A Players */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center">{setupData.teamA}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamAPlayers.map((player, index) => (
                <div key={index} className="space-y-1">
                  <label className="text-sm font-medium">Player {index + 1}</label>
                  <Input
                    value={player}
                    onChange={(e) => {
                      const newPlayers = [...teamAPlayers];
                      newPlayers[index] = e.target.value;
                      setTeamAPlayers(newPlayers);
                    }}
                    placeholder={`${setupData.teamA} Player ${index + 1}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Team B Players */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center">{setupData.teamB}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamBPlayers.map((player, index) => (
                <div key={index} className="space-y-1">
                  <label className="text-sm font-medium">Player {index + 1}</label>
                  <Input
                    value={player}
                    onChange={(e) => {
                      const newPlayers = [...teamBPlayers];
                      newPlayers[index] = e.target.value;
                      setTeamBPlayers(newPlayers);
                    }}
                    placeholder={`${setupData.teamB} Player ${index + 1}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setCurrentScreen('setup')} className="flex-1">
                Back to Setup
              </Button>
              <Button 
                variant="hero" 
                onClick={startNewMatch} 
                disabled={!areMinimumPlayersFilled()}
                className="flex-1"
              >
                {areMinimumPlayersFilled() ? 'Select Opening Batsmen' : 'Add At Least One Player Per Team'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Striker Selection Dialog */}
        <Dialog open={showStrikerDialog} onOpenChange={(open) => {
          setShowStrikerDialog(open);
          if (!open && !showBowlerDialog) {
            setSelectedStriker('');
            setSelectedNonStriker('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Select Opening Batsmen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Choose the striker and non-striker for {setupData.tossWinner === setupData.teamA 
                  ? (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB)
                  : (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA)}
              </p>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Striker (faces first ball)
                  </label>
                  <Select value={selectedStriker} onValueChange={setSelectedStriker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {(setupData.tossWinner === setupData.teamA 
                        ? (setupData.tossDecision === 'bat' ? teamAPlayers : teamBPlayers)
                        : (setupData.tossDecision === 'bat' ? teamBPlayers : teamAPlayers)
                      ).map((player, index) => {
                        if (!player.trim()) return null;
                        const playerId = `${(setupData.tossWinner === setupData.teamA 
                          ? (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB)
                          : (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA)
                        ).toLowerCase()}_p${index + 1}`;
                        return (
                          <SelectItem key={playerId} value={playerId}>
                            {player}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Non-Striker</label>
                  <Select value={selectedNonStriker} onValueChange={setSelectedNonStriker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select non-striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {(setupData.tossWinner === setupData.teamA 
                        ? (setupData.tossDecision === 'bat' ? teamAPlayers : teamBPlayers)
                        : (setupData.tossDecision === 'bat' ? teamBPlayers : teamAPlayers)
                      ).map((player, index) => {
                        if (!player.trim()) return null;
                        const playerId = `${(setupData.tossWinner === setupData.teamA 
                          ? (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB)
                          : (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA)
                        ).toLowerCase()}_p${index + 1}`;
                        
                        // Don't show the same player as striker
                        if (playerId === selectedStriker) return null;
                        
                        return (
                          <SelectItem key={playerId} value={playerId}>
                            {player}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowStrikerDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleStrikerSelection}
                  disabled={!selectedStriker || !selectedNonStriker}
                  className="flex-1"
                >
                  Next: Select Bowler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bowler Selection Dialog */}
        <Dialog open={showBowlerDialog} onOpenChange={(open) => {
          setShowBowlerDialog(open);
          if (!open) {
            setSelectedBowler('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Select Opening Bowler</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Choose the opening bowler for {setupData.tossWinner === setupData.teamA 
                  ? (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA)
                  : (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB)}
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Opening Bowler
                </label>
                <Select value={selectedBowler} onValueChange={setSelectedBowler}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {(setupData.tossWinner === setupData.teamA 
                      ? (setupData.tossDecision === 'bat' ? teamBPlayers : teamAPlayers)
                      : (setupData.tossDecision === 'bat' ? teamAPlayers : teamBPlayers)
                    ).map((player, index) => {
                      if (!player.trim()) return null;
                      const playerId = `${(setupData.tossWinner === setupData.teamA 
                        ? (setupData.tossDecision === 'bat' ? setupData.teamB : setupData.teamA)
                        : (setupData.tossDecision === 'bat' ? setupData.teamA : setupData.teamB)
                      ).toLowerCase()}_p${index + 1}`;
                      return (
                        <SelectItem key={playerId} value={playerId}>
                          {player}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBowlerDialog(false);
                    setShowStrikerDialog(true);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleBowlerSelection}
                  disabled={!selectedBowler}
                  className="flex-1"
                >
                  Start Match
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );

  const renderScoringScreen = () => {
    if (!match) return null;

    const battingTeam = getCurrentBattingTeam();
    const bowlingTeam = getCurrentBowlingTeam();
    const striker = getPlayer(match.strikerId);
    const nonStriker = getPlayer(match.nonStrikerId);
    const bowler = getPlayer(match.bowlerId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,hsl(var(--accent)/0.05),transparent_50%)]"></div>
        
        <div className="relative z-10 p-4">
          <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
            <div className="modern-card">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      {battingTeam?.name} {match.innings === 2 ? '(2nd Innings)' : ''}
                    </h2>
                </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono">Match ID: {match.id}</span>
                    <span className="status-indicator live">LIVE</span>
                </div>
              </div>
                <div className="score-display">
                  <div className="text-4xl font-bold text-center mb-1">
                    {match.score}-{match.wickets}
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    ({getCurrentOver()}) • CRR: {getCurrentRunRate()}
                  </div>
                </div>
              </div>
            </div>

          {/* Target Info (2nd innings only) */}
          {match.innings === 2 && match.target > 0 && (
              <div className="modern-card bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Target</div>
                    <div className="text-lg font-bold text-accent-foreground">{match.target}</div>
                </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Need</div>
                    <div className="text-lg font-bold text-accent-foreground">{match.target - match.score}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Balls Left</div>
                    <div className="text-lg font-bold text-accent-foreground">{(match.overs * 6) - match.totalBalls}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">RRR</div>
                    <div className="text-lg font-bold text-accent-foreground">{getRequiredRunRate()}</div>
                  </div>
                </div>
              </div>
            )}
            {match.innings === 2 && match.totalBalls === 0 && (
              <div className="modern-card text-center pulse-glow">
                <div className="text-primary font-semibold animate-pulse">
                  🏏 Second innings started
                </div>
              </div>
            )}

            {/* Second Innings Player Selection */}
            {match.innings === 2 && (!match.strikerId || !match.nonStrikerId || !match.bowlerId) && (
              <div className="modern-card bg-gradient-to-r from-muted/40 to-muted/20 border-muted/50">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Select Second Innings Players</h3>
                    <p className="text-sm text-muted-foreground">Choose openers and opening bowler to continue</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-primary">Striker</label>
                      <Select value={match.strikerId || ''} onValueChange={(v) => setMatch({ ...(match as Match), strikerId: v })}>
                        <SelectTrigger className="h-12 border-border/50 focus:border-primary/50">
                          <SelectValue placeholder="Select striker" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCurrentBattingTeam()?.players.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-primary">Non-Striker</label>
                      <Select value={match.nonStrikerId || ''} onValueChange={(v) => setMatch({ ...(match as Match), nonStrikerId: v })}>
                        <SelectTrigger className="h-12 border-border/50 focus:border-primary/50">
                          <SelectValue placeholder="Select non-striker" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCurrentBattingTeam()?.players
                            .filter(p => p.id !== match.strikerId)
                            .map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-primary">Opening Bowler</label>
                      <Select value={match.bowlerId || ''} onValueChange={(v) => setMatch({ ...(match as Match), bowlerId: v })}>
                        <SelectTrigger className="h-12 border-border/50 focus:border-primary/50">
                          <SelectValue placeholder="Select bowler" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCurrentBowlingTeam()?.players.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Player Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Batsmen */}
              <div className="modern-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Batsmen</h3>
                </div>
                <div className="space-y-3">
                  <div className={`player-card ${match.strikerId === striker?.id ? 'active' : ''}`}>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{striker?.name}</span>
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">*</span>
                  </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-bold">{striker?.runs}</div>
                        <div className="text-xs text-muted-foreground">({striker?.balls} balls)</div>
                </div>
                    </div>
                  </div>
                  <div className="player-card">
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{nonStriker?.name}</span>
                  </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-bold">{nonStriker?.runs}</div>
                        <div className="text-xs text-muted-foreground">({nonStriker?.balls} balls)</div>
                </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full action-button" 
                    onClick={() => {
                      if (!match) return;
                      const prev = JSON.parse(JSON.stringify(match)) as Match;
                      prev.history = [...prev.history, JSON.parse(JSON.stringify(match))];
                      const tmp = prev.strikerId;
                      prev.strikerId = prev.nonStrikerId;
                      prev.nonStrikerId = tmp;
                      setMatch(prev);
                    }}
                  >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Swap Batsmen
                </Button>
                </div>
              </div>

              {/* Bowler */}
              <div className="modern-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Bowler</h3>
                </div>
                <div className="player-card">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{bowler?.name}</span>
                  </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold">
                        {(bowler as any)?.bowlWickets || 0}-{(bowler as any)?.bowlRuns || 0}
                </div>
                      <div className="text-xs text-muted-foreground">
                        ({Math.floor((((bowler as any)?.bowlBalls || 0) / 6))}.{(((bowler as any)?.bowlBalls || 0) % 6)})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>

          {/* This Over */}
            <div className="modern-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">This Over</h3>
              </div>
              <div className="flex gap-3 flex-wrap">
                {match.currentOverBalls.map((ball, idx) => (
                  <div
                    key={idx}
                    className={`h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200 hover:scale-110 ${
                      ball.isWicket 
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' 
                        : ball.run === 6 
                        ? 'bg-gradient-to-br from-cricket-six to-cricket-six/80 text-white' 
                        : ball.run === 4 
                        ? 'bg-gradient-to-br from-cricket-boundary to-cricket-boundary/80 text-white'
                        : 'bg-gradient-to-br from-card to-card/80 text-card-foreground border border-border/50'
                    }`}
                  >
                    {ball.display}
                  </div>
                ))}
                {Array.from({ length: 6 - match.currentOverBalls.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="h-12 w-12 rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center"
                  >
                    <span className="text-xs text-muted-foreground">•</span>
              </div>
                ))}
              </div>
            </div>

          {/* Scoring Controls */}
            <div className="modern-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Scoring</h3>
              </div>
              
              <div className="scoring-grid">
                {/* Basic Runs */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground text-center">Basic Runs</h4>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(run => (
                  <Button
                    key={run}
                    variant="score"
                    size="touch"
                    onClick={() => processBall(run)}
                        className="action-button"
                  >
                    {run}
                  </Button>
                ))}
              </div>
                </div>

                {/* Boundaries & Wickets */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground text-center">Boundaries & Wickets</h4>
                  <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="boundary"
                  size="touch"
                  onClick={() => processBall(4)}
                      className="action-button"
                >
                  4
                </Button>
                <Button
                  variant="six"
                  size="touch"
                  onClick={() => processBall(6)}
                      className="action-button"
                >
                  6
                </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="wicket"
                  size="touch"
                  onClick={processWicket}
                      className="action-button"
                >
                  OUT
                </Button>
                <Button
                  variant="retire"
                  size="touch"
                  onClick={processRetirement}
                      className="action-button"
                >
                  RETIRE
                </Button>
              </div>
                </div>

                {/* Extras */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground text-center">Extras</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="extra" 
                      size="sm" 
                      onClick={() => { setExtrasType('wide'); setExtrasRuns(1); setShowExtrasDialog(true); }}
                      className="action-button"
                    >
                  Wide
                </Button>
                    <Button 
                      variant="extra" 
                      size="sm" 
                      onClick={() => { setExtrasType('noball'); setNoBallBatRuns(0); setShowExtrasDialog(true); }}
                      className="action-button"
                    >
                  No Ball
                </Button>
                    <Button 
                      variant="extra" 
                      size="sm" 
                      onClick={() => { setExtrasType('bye'); setExtrasRuns(1); setShowExtrasDialog(true); }}
                      className="action-button"
                    >
                      Bye/Leg Bye
                </Button>
              </div>
                </div>
              </div>
            </div>

          {/* Action Buttons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="modern-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <RotateCcw className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
                <div className="space-y-3">
            <Button 
              variant="outline" 
                    className="w-full h-12 action-button"
              onClick={undoLastBall}
              disabled={!match || match.history.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Undo Last Ball
            </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 action-button" 
                    onClick={() => setCurrentScreen('scorecard')}
                  >
              <Eye className="h-4 w-4 mr-2" />
              View Scorecard
            </Button>
                </div>
              </div>

              {/* Match Controls */}
              <div className="modern-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Match Controls</h3>
                </div>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full action-button" 
                    onClick={leaveMatch}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Match
                  </Button>
                  <Button 
                    variant="hero" 
                    className="w-full action-button" 
                    onClick={startFreshMatch}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Start New Match
                  </Button>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="modern-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Export & Share</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="action-button" 
                  onClick={exportMatchSummary}
                >
                  Export JSON
                </Button>
                <Button 
                  variant="outline" 
                  className="action-button" 
                  onClick={exportCsv}
                >
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="action-button" 
                  onClick={copyShareLink}
                >
                  Share Match
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Next Bowler Selection Dialog */}
        <Dialog open={showNextBowlerDialog} onOpenChange={(open) => {
          setShowNextBowlerDialog(open);
          if (!open) {
            setSelectedNextBowler('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Select Next Bowler</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Over completed! Choose the bowler for the next over.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Next Bowler
                </label>
                <Select value={selectedNextBowler} onValueChange={setSelectedNextBowler}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentBowlingTeam()?.players
                      .filter((player) => player.id !== match.bowlerId)
                      .map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="hero" 
                  onClick={handleNextBowlerSelection}
                  disabled={!selectedNextBowler}
                  className="w-full"
                >
                  Continue Match
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Next Batsman Selection Dialog */}
        <Dialog open={showNextBatsmanDialog} onOpenChange={(open) => {
          setShowNextBatsmanDialog(open);
          if (!open) {
            setSelectedNextBatsman('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Select Next Batsman</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                A batsman is out! Choose the next batsman to come in.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Next Batsman
                </label>
                <Select value={selectedNextBatsman} onValueChange={setSelectedNextBatsman}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batsman" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentBattingTeam()?.players
                      .filter(p => !p.isOut && p.id !== match.nonStrikerId)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="hero" 
                  onClick={handleNextBatsmanSelection}
                  disabled={!selectedNextBatsman}
                  className="w-full"
                >
                  Continue Match
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Extras Selection Dialog */}
        <Dialog open={showExtrasDialog} onOpenChange={(open) => {
          setShowExtrasDialog(open);
          if (!open) { setExtrasType(null); setExtrasRuns(1); setNoBallBatRuns(0); }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">{extrasType === 'wide' ? 'Wide' : extrasType === 'noball' ? 'No Ball' : 'Bye / Leg Bye'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {extrasType === 'noball' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[0,1,2,3,4].map(r => (
                      <Button key={r} variant="extra" onClick={() => setNoBallBatRuns(r)}>Bat Runs {r}</Button>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1" variant="hero" onClick={() => {
                      processBall(noBallBatRuns, true, 'noball');
                      setShowExtrasDialog(false);
                    }}>Add No Ball</Button>
                  </div>
                </>
              ) : extrasType === 'wide' ? (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {[1,2,3,4,5].map(r => (
                      <Button key={r} variant="extra" onClick={() => setExtrasRuns(r)}>+{r}</Button>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1" variant="hero" onClick={() => {
                      processBall(extrasRuns, true, 'wide');
                      setShowExtrasDialog(false);
                    }}>Add Wide</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {[1,2,3,4].map(r => (
                      <Button key={r} variant="extra" onClick={() => setExtrasRuns(r)}>{r}</Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => { processBall(extrasRuns, true, 'bye'); setShowExtrasDialog(false); }}>Bye</Button>
                    <Button variant="outline" onClick={() => { processBall(extrasRuns, true, 'legbye'); setShowExtrasDialog(false); }}>Leg Bye</Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderScorecardScreen = () => {
    if (!match) return null;

    const battingTeam = getCurrentBattingTeam();
    const bowlingTeam = match.battingTeam === match.teamA.name ? match.teamB : match.teamA;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--primary)/0.02)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
        
        <div className="relative z-10 p-4">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Match Result */}
            {match.status === 'finished' && (
              <div className="modern-card bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Trophy className="h-6 w-6 text-green-400" />
                  <h2 className="text-2xl font-bold text-green-400">Match Result</h2>
                </div>
                <p className="text-lg font-semibold">{match.result || 'Match finished'}</p>
              </div>
            )}

            {/* Header */}
            <div className="modern-card text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Match Scorecard
                </h1>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">Match ID: {match.id}</span>
                <span className="status-indicator finished">COMPLETED</span>
              </div>
            </div>

            {/* Team A Batting */}
            <div className="modern-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{match.teamA.name} Batting</h3>
              </div>
              {(() => {
                const runs = match.teamA.players.reduce((a, p) => a + (p.runs || 0), 0);
                const wickets = Math.min(10, match.teamA.players.filter(p => p.isOut).length);
                const oppBalls = (match.teamB.players as any[]).reduce((a, p: any) => a + (p.bowlBalls || 0), 0);
                const oversWhole = Math.floor(oppBalls / 6);
                const ballsRem = oppBalls % 6;
                return (
                  <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{runs}/{wickets}</div>
                      <div className="text-sm text-muted-foreground">({oversWhole}.{ballsRem} overs)</div>
                    </div>
                  </div>
                );
              })()}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Batsman</th>
                      <th className="text-center p-3 font-semibold text-sm text-muted-foreground">R</th>
                      <th className="text-center p-3 font-semibold text-sm text-muted-foreground">B</th>
                      <th className="text-center p-3 font-semibold text-sm text-muted-foreground">4s</th>
                      <th className="text-center p-3 font-semibold text-sm text-muted-foreground">6s</th>
                      <th className="text-center p-3 font-semibold text-sm text-muted-foreground">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.teamA.players.filter(p => p.balls > 0 || p.isOut).map(player => (
                      <tr key={player.id} className="border-b border-border/30 hover:bg-card/50 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{player.name}</span>
                            {player.isOut && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                                {player.dismissalType === 'retired' ? 'retired' : 'out'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-3 font-mono font-semibold">{player.runs}</td>
                        <td className="text-center p-3 font-mono">{player.balls}</td>
                        <td className="text-center p-3 font-mono">{player.fours}</td>
                        <td className="text-center p-3 font-mono">{player.sixes}</td>
                        <td className="text-center p-3 font-mono">
                          {player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

                <div>
                  <h3 className="text-lg font-semibold mb-1">{match.teamB.name} Batting</h3>
                  {(() => {
                    const runs = match.teamB.players.reduce((a, p) => a + (p.runs || 0), 0);
                    const wickets = Math.min(10, match.teamB.players.filter(p => p.isOut).length);
                    const oppBalls = (match.teamA.players as any[]).reduce((a, p: any) => a + (p.bowlBalls || 0), 0);
                    const oversWhole = Math.floor(oppBalls / 6);
                    const ballsRem = oppBalls % 6;
                    return (
                      <div className="mb-2 text-sm text-muted-foreground">Total: {runs}/{wickets} ({oversWhole}.{ballsRem} ov)</div>
                    );
                  })()}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-semibold">Batsman</th>
                          <th className="text-center p-2 font-semibold">R</th>
                          <th className="text-center p-2 font-semibold">B</th>
                          <th className="text-center p-2 font-semibold">4s</th>
                          <th className="text-center p-2 font-semibold">6s</th>
                          <th className="text-center p-2 font-semibold">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.teamB.players.filter(p => p.balls > 0 || p.isOut).map(player => (
                          <tr key={player.id} className="border-b border-border/50">
                            <td className="p-2 font-medium">
                              {player.name} {player.isOut ? (player.dismissalType === 'retired' ? '(retired)' : '(out)') : ''}
                            </td>
                            <td className="text-center p-2 font-mono">{player.runs}</td>
                            <td className="text-center p-2 font-mono">{player.balls}</td>
                            <td className="text-center p-2 font-mono">{player.fours}</td>
                            <td className="text-center p-2 font-mono">{player.sixes}</td>
                            <td className="text-center p-2 font-mono">
                              {player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Partnerships Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Partnerships</h3>
                  <div className="space-y-2">
                    {(() => {
                      const partnerships = [];
                      let currentPartnership = { runs: 0, balls: 0, batsmen: [] as string[] };
                      
                      // Calculate current partnership between striker and non-striker
                      if (match.strikerId && match.nonStrikerId && !battingTeam?.players.find(p => p.id === match.strikerId)?.isOut && !battingTeam?.players.find(p => p.id === match.nonStrikerId)?.isOut) {
                        const striker = battingTeam?.players.find(p => p.id === match.strikerId);
                        const nonStriker = battingTeam?.players.find(p => p.id === match.nonStrikerId);
                        if (striker && nonStriker) {
                          partnerships.push({
                            batsmen: [striker.name, nonStriker.name],
                            runs: striker.runs + nonStriker.runs,
                            balls: striker.balls + nonStriker.balls,
                            ongoing: true
                          });
                        }
                      }
                      
                      return partnerships.length > 0 ? partnerships.map((partnership, index) => (
                        <div key={index} className="flex justify-between items-center p-2 rounded border border-border">
                          <span className="font-medium">
                            {partnership.batsmen.join(' & ')} {partnership.ongoing ? '(ongoing)' : ''}
                          </span>
                          <span className="font-mono">{partnership.runs} runs ({partnership.balls} balls)</span>
                        </div>
                      )) : (
                        <div className="p-2 text-muted-foreground text-center">No partnerships yet</div>
                      );
                    })()}
                  </div>
                </div>

                {/* Fall of Wickets */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Fall of wickets</h3>
                  <div className="space-y-2">
                    {(() => {
                      const fow = computeFallOfWickets();
                      return fow.length ? (
                        <div className="flex flex-wrap gap-2">
                          {fow.map((w, i) => (
                            <span key={i} className="px-2 py-1 rounded border border-border text-sm">
                              {w.score}/{w.wicketNum}{w.batter ? ` (${w.batter})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 text-muted-foreground text-center">No wickets yet</div>
                      );
                    })()}
                  </div>
                </div>

                {/* Over by Over */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Over by over</h3>
                  <div className="space-y-2">
                    {(() => {
                      const overs = computeOverSummaries();
                      return overs.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {overs.map((o) => (
                            <div key={o.over} className="flex justify-between items-center p-2 rounded border border-border">
                              <span>Over {o.over}{o.bowlerName ? ` (${o.bowlerName})` : ''}</span>
                              <span className="font-mono">{o.runs} runs, {o.wickets} wicket(s)</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 text-muted-foreground text-center">No completed overs yet</div>
                      );
                    })()}
                  </div>
                </div>

                {/* Extras Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Extras</h3>
                  <div className="space-y-2">
                    {(() => {
                      const extras = {
                        wides: match.currentOverBalls.filter(ball => ball.isWide).length + 
                               (match.history || []).reduce((acc, prevMatch) => 
                                 acc + prevMatch.currentOverBalls.filter(ball => ball.isWide).length, 0),
                        noballs: match.currentOverBalls.filter(ball => ball.isNoball).length + 
                                (match.history || []).reduce((acc, prevMatch) => 
                                  acc + prevMatch.currentOverBalls.filter(ball => ball.isNoball).length, 0),
                        byes: match.currentOverBalls.filter(ball => ball.isBye).length + 
                              (match.history || []).reduce((acc, prevMatch) => 
                                acc + prevMatch.currentOverBalls.filter(ball => ball.isBye).length, 0),
                        legByes: match.currentOverBalls.filter(ball => ball.isLegBye).length + 
                                (match.history || []).reduce((acc, prevMatch) => 
                                  acc + prevMatch.currentOverBalls.filter(ball => ball.isLegBye).length, 0)
                      };
                      const totalExtras = extras.wides + extras.noballs + extras.byes + extras.legByes;
                      
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex justify-between p-2 rounded border border-border">
                            <span>Wides:</span>
                            <span className="font-mono">{extras.wides}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded border border-border">
                            <span>No Balls:</span>
                            <span className="font-mono">{extras.noballs}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded border border-border">
                            <span>Byes:</span>
                            <span className="font-mono">{extras.byes}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded border border-border">
                            <span>Leg Byes:</span>
                            <span className="font-mono">{extras.legByes}</span>
                          </div>
                          <div className="col-span-2 flex justify-between p-2 rounded border border-border bg-muted/50 font-semibold">
                            <span>Total Extras:</span>
                            <span className="font-mono">{totalExtras}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{match.score}/{match.wickets}</div>
                  <div className="text-muted-foreground">({getCurrentOver()} overs)</div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">{match.teamA.name} Bowling</h3>
                  <div className="space-y-2">
                    {match.teamA.players.filter((p: any) => (p.bowlBalls || 0) > 0).map((player: any) => {
                      const oversBowledWhole = Math.floor((player.bowlBalls || 0) / 6);
                      const ballsRemainder = (player.bowlBalls || 0) % 6;
                      const oversForEconomy = (player.bowlBalls || 0) > 0 ? (player.bowlBalls || 0) / 6 : 0;
                      const econ = oversForEconomy > 0 ? ((player.bowlRuns || 0) / oversForEconomy).toFixed(2) : '0.00';
                      return (
                      <div key={player.id} className="flex justify-between items-center p-2 rounded border border-border">
                        <span className="font-medium">{player.name}</span>
                          <span className="font-mono">{player.bowlWickets || 0}-{player.bowlRuns || 0} ({oversBowledWhole}.{ballsRemainder}) • ECO {econ}</span>
                      </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">{match.teamB.name} Bowling</h3>
                  <div className="space-y-2">
                    {match.teamB.players.filter((p: any) => (p.bowlBalls || 0) > 0).map((player: any) => {
                      const oversBowledWhole = Math.floor((player.bowlBalls || 0) / 6);
                      const ballsRemainder = (player.bowlBalls || 0) % 6;
                      const oversForEconomy = (player.bowlBalls || 0) > 0 ? (player.bowlBalls || 0) / 6 : 0;
                      const econ = oversForEconomy > 0 ? ((player.bowlRuns || 0) / oversForEconomy).toFixed(2) : '0.00';
                      return (
                        <div key={player.id} className="flex justify-between items-center p-2 rounded border border-border">
                          <span className="font-medium">{player.name}</span>
                          <span className="font-mono">{player.bowlWickets || 0}-{player.bowlRuns || 0} ({oversBowledWhole}.{ballsRemainder}) • ECO {econ}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button 
            variant="outline" 
            onClick={() => setCurrentScreen('scoring')}
            className="w-full h-12"
          >
            Back to Scoring
          </Button>
        </div>
      </div>
    );
  };

  // Render current screen
  switch (currentScreen) {
    case 'home':
      return renderHomeScreen();
    case 'setup':
      return renderSetupScreen();
    case 'players':
      return renderPlayersScreen();
    case 'scoring':
      return renderScoringScreen();
    case 'scorecard':
      return renderScorecardScreen();
    default:
      return renderHomeScreen();
  }
};

export default CricketScorer;