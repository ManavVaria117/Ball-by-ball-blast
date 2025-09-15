import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import matchesRouter from './routes/matches.js';

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin === '*' ? undefined : [allowedOrigin, 'http://localhost:5173'], credentials: false }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/matches', matchesRouter);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI not set. Server will run without DB connection.');
}

async function start() {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    }
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();


