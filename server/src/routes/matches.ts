import { Router } from 'express';
import { z } from 'zod';
import { MatchModel } from '../models/Match.js';

const router = Router();

const Player = z.object({ id: z.string(), name: z.string().min(1) });
const CreateMatchBody = z.object({
  code: z.string().min(3).max(8),
  teamA: z.object({ name: z.string().min(1), players: z.array(Player).min(1) }),
  teamB: z.object({ name: z.string().min(1), players: z.array(Player).min(1) }),
  oversLimit: z.number().int().min(1).max(50),
  toss: z.object({ winner: z.string(), decision: z.enum(['bat', 'bowl']) }),
  strikerId: z.string().optional(),
  nonStrikerId: z.string().optional(),
  bowlerId: z.string().optional()
});

router.post('/', async (req, res) => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { code, teamA, teamB, oversLimit, toss, strikerId, nonStrikerId, bowlerId } = parsed.data;
  try {
    const battingTeam = toss.winner === teamA.name ? (toss.decision === 'bat' ? teamA.name : teamB.name) : (toss.decision === 'bat' ? teamB.name : teamA.name);
    const bowlingTeam = battingTeam === teamA.name ? teamB.name : teamA.name;
    const match = await MatchModel.create({
      code,
      teamA: { name: teamA.name, players: teamA.players.map(p => ({ _id: p.id, name: p.name })) },
      teamB: { name: teamB.name, players: teamB.players.map(p => ({ _id: p.id, name: p.name })) },
      toss,
      status: 'live',
      inningsIndex: 0,
      innings: [{
        battingTeam,
        bowlingTeam,
        oversLimit,
        strikerId,
        nonStrikerId,
        bowlerId,
        events: [],
        score: 0,
        wickets: 0,
        balls: 0
      }]
    });
    res.status(201).json(match);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create match' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Not found' });
    res.json(match);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

router.get('/code/:code', async (req, res) => {
  try {
    const match = await MatchModel.findOne({ code: req.params.code });
    if (!match) return res.status(404).json({ error: 'Not found' });
    res.json(match);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch match by code' });
  }
});

const EventBody = z.object({
  type: z.enum(['run','boundary','six','wide','noball','bye','legbye','wicket','retire','overEnd','inningsEnd','matchEnd']),
  payload: z.record(z.any()),
});

router.post('/:id/events', async (req, res) => {
  const parsed = EventBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Not found' });
    const inn = match.innings[match.inningsIndex];
    const atBallIndex = inn.balls;
    inn.events.push({ type: parsed.data.type, payload: parsed.data.payload, atBallIndex });
    // Basic state increments; full correctness will be handled in scoring lib later
    if (parsed.data.type === 'run') {
      const runs = Number(parsed.data.payload?.runs || 0);
      inn.score += runs;
      inn.balls += 1;
    } else if (parsed.data.type === 'boundary') {
      inn.score += 4; inn.balls += 1;
    } else if (parsed.data.type === 'six') {
      inn.score += 6; inn.balls += 1;
    } else if (parsed.data.type === 'wide') {
      const runs = Number(parsed.data.payload?.runs || 1);
      inn.score += runs; // ball not counted
    } else if (parsed.data.type === 'noball') {
      const extra = Number(parsed.data.payload?.extra || 1);
      const batRuns = Number(parsed.data.payload?.batRuns || 0);
      inn.score += extra + batRuns; // ball not counted
    } else if (parsed.data.type === 'bye' || parsed.data.type === 'legbye') {
      const runs = Number(parsed.data.payload?.runs || 0);
      inn.score += runs; inn.balls += 1;
    } else if (parsed.data.type === 'wicket') {
      inn.wickets += 1; inn.balls += 1;
    } else if (parsed.data.type === 'overEnd') {
      // no-op; marker
    }
    await match.save();
    res.status(201).json(match);
  } catch (e) {
    res.status(500).json({ error: 'Failed to append event' });
  }
});

router.post('/:id/undo', async (req, res) => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Not found' });
    const inn = match.innings[match.inningsIndex];
    const last = inn.events.pop();
    if (!last) return res.status(400).json({ error: 'No events to undo' });
    // naive reverse; will be replaced by reducer-based recompute
    // Recompute score/balls from scratch for this innings
    inn.score = 0; inn.balls = 0; inn.wickets = 0;
    for (const ev of inn.events) {
      if (ev.type === 'run') { inn.score += Number(ev.payload?.runs || 0); inn.balls += 1; }
      else if (ev.type === 'boundary') { inn.score += 4; inn.balls += 1; }
      else if (ev.type === 'six') { inn.score += 6; inn.balls += 1; }
      else if (ev.type === 'wide') { inn.score += Number(ev.payload?.runs || 1); }
      else if (ev.type === 'noball') { inn.score += Number(ev.payload?.extra || 1) + Number(ev.payload?.batRuns || 0); }
      else if (ev.type === 'bye' || ev.type === 'legbye') { inn.score += Number(ev.payload?.runs || 0); inn.balls += 1; }
      else if (ev.type === 'wicket') { inn.wickets += 1; inn.balls += 1; }
    }
    await match.save();
    res.json(match);
  } catch (e) {
    res.status(500).json({ error: 'Failed to undo' });
  }
});

export default router;


