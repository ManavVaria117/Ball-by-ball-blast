import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeftRight, Trophy, Users, RotateCcw, Eye, Target, Clock } from 'lucide-react';
import { Match, Screen, Player, Ball } from '@/types/cricket';

const CricketScorer = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [match, setMatch] = useState<Match | null>(null);
  const [matchId, setMatchId] = useState('');
  const [setupData, setSetupData] = useState({
    teamA: '',
    teamB: '',
    overs: 10,
    tossWinner: '',
    tossDecision: 'bat' as 'bat' | 'bowl'
  });
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>(Array(11).fill(''));
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>(Array(11).fill(''));
  const [showStrikerDialog, setShowStrikerDialog] = useState(false);
  const [selectedStriker, setSelectedStriker] = useState('');
  const [selectedNonStriker, setSelectedNonStriker] = useState('');

  // Generate sample players for a team
  const generatePlayers = (teamName: string, playerNames: string[]): Player[] => {
    return Array.from({ length: 11 }, (_, i) => ({
      id: `${teamName.toLowerCase()}_p${i + 1}`,
      name: playerNames[i] || `${teamName} Player ${i + 1}`,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false
    }));
  };

  // Check if all players are filled
  const areAllPlayersFilled = () => {
    return teamAPlayers.every(player => player.trim() !== '') && 
           teamBPlayers.every(player => player.trim() !== '');
  };

  // Handle striker selection and start match
  const handleStrikerSelection = () => {
    if (!selectedStriker || !selectedNonStriker) return;
    
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
      bowlerId: setupData.tossWinner === setupData.teamA 
        ? (setupData.tossDecision === 'bat' ? setupData.teamB.toLowerCase() + '_p1' : setupData.teamA.toLowerCase() + '_p1')
        : (setupData.tossDecision === 'bat' ? setupData.teamA.toLowerCase() + '_p1' : setupData.teamB.toLowerCase() + '_p1'),
      history: [],
      target: 0,
      createdAt: Date.now()
    };
    
    setMatch(newMatch);
    setMatchId(newMatchId);
    setShowStrikerDialog(false);
    setCurrentScreen('scoring');
  };

  // Initialize a new match (legacy function - will be replaced by striker selection)
  const startNewMatch = () => {
    if (areAllPlayersFilled()) {
      setShowStrikerDialog(true);
    }
  };

  // Process a ball (runs scored)
  const processBall = (runs: number, isExtra = false, extraType?: string) => {
    if (!match) return;

    // Save current state for undo
    const newHistory = [...match.history, { ...match }];

    const ball: Ball = {
      run: runs,
      display: runs.toString(),
      isWide: extraType === 'wide',
      isNoball: extraType === 'noball',
      isBye: extraType === 'bye',
      isLegBye: extraType === 'legbye'
    };

    const updatedMatch = { ...match };
    updatedMatch.history = newHistory;
    updatedMatch.score += runs;
    updatedMatch.currentOverBalls = [...match.currentOverBalls, ball];

    // Update striker stats (if not bye/leg bye)
    if (!ball.isBye && !ball.isLegBye && match.strikerId) {
      const battingTeam = match.battingTeam === match.teamA.name ? updatedMatch.teamA : updatedMatch.teamB;
      const striker = battingTeam.players.find(p => p.id === match.strikerId);
      if (striker) {
        striker.runs += runs;
        striker.balls += isExtra ? 0 : 1;
        if (runs === 4) striker.fours++;
        if (runs === 6) striker.sixes++;
      }
    }

    // Update bowler stats
    if (match.bowlerId) {
      const bowlingTeam = match.bowlingTeam === match.teamA.name ? updatedMatch.teamA : updatedMatch.teamB;
      const bowler = bowlingTeam.players.find(p => p.id === match.bowlerId);
      if (bowler) {
        bowler.runs += runs;
        if (!isExtra) bowler.balls++;
      }
    }

    // Increment total balls if not an extra
    if (!isExtra) {
      updatedMatch.totalBalls++;
    }

    // Rotate strike on odd runs or end of over
    if (runs % 2 === 1 || updatedMatch.totalBalls % 6 === 0) {
      const temp = updatedMatch.strikerId;
      updatedMatch.strikerId = updatedMatch.nonStrikerId;
      updatedMatch.nonStrikerId = temp;
    }

    // End of over
    if (updatedMatch.totalBalls % 6 === 0) {
      updatedMatch.currentOverBalls = [];
    }

    setMatch(updatedMatch);
  };

  // Process wicket
  const processWicket = () => {
    if (!match || !match.strikerId) return;

    const newHistory = [...match.history, { ...match }];
    const updatedMatch = { ...match };
    updatedMatch.history = newHistory;
    updatedMatch.wickets++;
    updatedMatch.totalBalls++;

    // Mark striker as out
    const battingTeam = match.battingTeam === match.teamA.name ? updatedMatch.teamA : updatedMatch.teamB;
    const striker = battingTeam.players.find(p => p.id === match.strikerId);
    if (striker) {
      striker.isOut = true;
      striker.balls++;
    }

    // Update bowler wickets
    if (match.bowlerId) {
      const bowlingTeam = match.bowlingTeam === match.teamA.name ? updatedMatch.teamA : updatedMatch.teamB;
      const bowler = bowlingTeam.players.find(p => p.id === match.bowlerId);
      if (bowler) {
        bowler.balls++;
      }
    }

    const ball: Ball = {
      run: 0,
      display: 'W',
      isWicket: true
    };
    updatedMatch.currentOverBalls = [...match.currentOverBalls, ball];

    // Find next batsman
    const nextBatsman = battingTeam.players.find(p => !p.isOut && p.id !== match.nonStrikerId);
    if (nextBatsman) {
      updatedMatch.strikerId = nextBatsman.id;
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

  // Undo last ball
  const undoLastBall = () => {
    if (!match || match.history.length === 0) return;
    
    const previousState = match.history[match.history.length - 1];
    setMatch(previousState);
  };

  const renderHomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Cricket Scorer
            </CardTitle>
          </div>
          <p className="text-muted-foreground">Real-time cricket scoring made simple</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="hero" 
            size="wide" 
            className="w-full"
            onClick={() => setCurrentScreen('setup')}
          >
            Start New Match
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Enter Match ID"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value.toUpperCase())}
              className="text-center font-mono"
            />
            <Button 
              variant="outline" 
              size="wide" 
              className="w-full"
              disabled={!matchId}
            >
              Join Match
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSetupScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Match Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team A Name</label>
            <Input
              value={setupData.teamA}
              onChange={(e) => setSetupData(prev => ({ ...prev, teamA: e.target.value }))}
              placeholder="Enter team name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Team B Name</label>
            <Input
              value={setupData.teamB}
              onChange={(e) => setSetupData(prev => ({ ...prev, teamB: e.target.value }))}
              placeholder="Enter team name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Total Overs</label>
            <Input
              type="number"
              value={setupData.overs}
              onChange={(e) => setSetupData(prev => ({ ...prev, overs: parseInt(e.target.value) || 10 }))}
              min="1"
              max="50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Toss won by</label>
            <Select
              value={setupData.tossWinner}
              onValueChange={(value) => setSetupData(prev => ({ ...prev, tossWinner: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {setupData.teamA && <SelectItem value={setupData.teamA}>{setupData.teamA}</SelectItem>}
                {setupData.teamB && <SelectItem value={setupData.teamB}>{setupData.teamB}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Opted to</label>
            <Select
              value={setupData.tossDecision}
              onValueChange={(value: 'bat' | 'bowl') => setSetupData(prev => ({ ...prev, tossDecision: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bat">Bat</SelectItem>
                <SelectItem value="bowl">Bowl</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setCurrentScreen('home')} className="flex-1">
              Back
            </Button>
            <Button 
              variant="hero" 
              onClick={() => setCurrentScreen('players')}
              disabled={!setupData.teamA || !setupData.teamB || !setupData.tossWinner}
              className="flex-1"
            >
              Next: Add Players
            </Button>
          </div>
        </CardContent>
      </Card>
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
                disabled={!areAllPlayersFilled()}
                className="flex-1"
              >
                {areAllPlayersFilled() ? 'Select Opening Batsmen' : 'Fill All Player Names'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Striker Selection Dialog */}
        <Dialog open={showStrikerDialog} onOpenChange={(open) => {
          setShowStrikerDialog(open);
          if (!open) {
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
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{battingTeam?.name}</h2>
                  <p className="text-sm text-muted-foreground font-mono">Match ID: {match.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{match.score}-{match.wickets}</div>
                  <div className="text-sm text-muted-foreground">({getCurrentOver()}) CRR: {getCurrentRunRate()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Info (2nd innings only) */}
          {match.innings === 2 && match.target > 0 && (
            <Card className="shadow-card bg-accent/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Target: {match.target}</span>
                  <span>Need: {match.target - match.score} runs</span>
                  <span>Balls: {(match.overs * 6) - match.totalBalls}</span>
                  <span>RRR: {getRequiredRunRate()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Player Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Batsmen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`p-3 rounded-lg border-2 ${match.strikerId === striker?.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{striker?.name}*</span>
                    <span className="font-mono">{striker?.runs} ({striker?.balls})</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{nonStriker?.name}</span>
                    <span className="font-mono">{nonStriker?.runs} ({nonStriker?.balls})</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Swap Batsmen
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Bowler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{bowler?.name}</span>
                    <span className="font-mono">0-{bowler?.runs} ({Math.floor((bowler?.balls || 0) / 6)}.{(bowler?.balls || 0) % 6})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* This Over */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">This Over</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {match.currentOverBalls.map((ball, idx) => (
                  <Badge
                    key={idx}
                    variant={ball.isWicket ? "destructive" : ball.run >= 4 ? "default" : "secondary"}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      ball.run === 6 ? 'bg-cricket-six' : ball.run === 4 ? 'bg-cricket-boundary' : ''
                    }`}
                  >
                    {ball.display}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scoring Controls */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(run => (
                  <Button
                    key={run}
                    variant="score"
                    size="touch"
                    onClick={() => processBall(run)}
                  >
                    {run}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="boundary"
                  size="touch"
                  onClick={() => processBall(4)}
                >
                  4
                </Button>
                <Button
                  variant="six"
                  size="touch"
                  onClick={() => processBall(6)}
                >
                  6
                </Button>
                <Button
                  variant="wicket"
                  size="touch"
                  onClick={processWicket}
                >
                  OUT
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="extra" size="sm" onClick={() => processBall(1, true, 'wide')}>
                  Wide
                </Button>
                <Button variant="extra" size="sm" onClick={() => processBall(1, true, 'noball')}>
                  No Ball
                </Button>
                <Button variant="extra" size="sm" onClick={() => processBall(0, true, 'bye')}>
                  Bye
                </Button>
                <Button variant="extra" size="sm" onClick={() => processBall(0, true, 'legbye')}>
                  Leg Bye
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12"
              onClick={undoLastBall}
              disabled={!match || match.history.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Undo Last Ball
            </Button>
            <Button variant="outline" className="h-12" onClick={() => setCurrentScreen('scorecard')}>
              <Eye className="h-4 w-4 mr-2" />
              View Scorecard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderScorecardScreen = () => {
    if (!match) return null;

    const battingTeam = getCurrentBattingTeam();

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">{battingTeam?.name} Batting</h3>
                  <div className="space-y-2">
                    {battingTeam?.players.filter(p => p.balls > 0 || p.isOut).map(player => (
                      <div key={player.id} className="flex justify-between items-center p-2 rounded border border-border">
                        <span className="font-medium">{player.name} {player.isOut ? '(out)' : ''}</span>
                        <span className="font-mono">{player.runs} ({player.balls}) [{player.fours}x4, {player.sixes}x6]</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{match.score}/{match.wickets}</div>
                  <div className="text-muted-foreground">({getCurrentOver()} overs)</div>
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