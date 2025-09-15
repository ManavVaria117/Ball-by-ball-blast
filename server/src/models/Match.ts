import mongoose, { Schema, InferSchemaType, Types } from 'mongoose';

// Event-sourced approach: store each scoring event
// Types include: run, boundary, six, wide, noball, bye, legbye, wicket, retire, overEnd, inningsEnd, matchEnd
const EventSchema = new Schema({
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  atBallIndex: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const PlayerSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const TeamSchema = new Schema({
  name: { type: String, required: true },
  players: { type: [PlayerSchema], default: [] }
}, { _id: false });

const InningsSchema = new Schema({
  battingTeam: { type: String, required: true },
  bowlingTeam: { type: String, required: true },
  oversLimit: { type: Number, required: true },
  target: { type: Number, default: 0 },
  strikerId: { type: String },
  nonStrikerId: { type: String },
  bowlerId: { type: String },
  events: { type: [EventSchema], default: [] },
  score: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  balls: { type: Number, default: 0 }
}, { _id: false });

const MatchSchema = new Schema({
  code: { type: String, index: true },
  teamA: TeamSchema,
  teamB: TeamSchema,
  toss: {
    winner: { type: String, required: true },
    decision: { type: String, enum: ['bat', 'bowl'], required: true }
  },
  status: { type: String, enum: ['pre-match', 'live', 'break', 'finished'], default: 'pre-match' },
  inningsIndex: { type: Number, default: 0 },
  innings: { type: [InningsSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

MatchSchema.pre('save', function(next) {
  this.set('updatedAt', new Date());
  next();
});

export type MatchDocument = InferSchemaType<typeof MatchSchema> & { _id: Types.ObjectId };

export const MatchModel = mongoose.models.Match || mongoose.model('Match', MatchSchema);


