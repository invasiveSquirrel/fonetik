import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import * as fs from 'fs';
import { SpeechClient, protos } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8004;
const DB_PATH = path.join(os.homedir(), '.config/fonetik/db/fonetik.db');

// Clients
let db: sqlite3.Database | null = null;
let ttsClient: TextToSpeechClient | null = null;
let speechClient: SpeechClient | null = null;
let model: any = null;

// Initialization
async function initialize() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  db = new sqlite3.Database(DB_PATH);
  
  // API Keys from Wordhord/Panglossia locations (as per original main.ts)
  const keyPath = path.join(os.homedir(), 'wordhord/wordhord_api.txt');
  if (fs.existsSync(keyPath)) {
    process.env.GOOGLE_API_KEY = fs.readFileSync(keyPath, 'utf8').trim();
  }
  
  const credPath = path.join(os.homedir(), 'panglossia/google-credentials.json');
  if (fs.existsSync(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  }

  ttsClient = new TextToSpeechClient();
  speechClient = new SpeechClient();
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
  model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// REST Endpoints
app.get('/cards/:language', (req, res) => {
  db?.all("SELECT * FROM cards WHERE language = ? LIMIT 1000", [req.params.language], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post('/play-ipa', async (req, res) => {
  const { text, language, speed, isIpa } = req.body;
  try {
    const langCode = "en-US"; // Simplification for MVP, mapping logic from main.ts can be added
    const ssml = isIpa ? 
      `<speak><phoneme alphabet="ipa" ph="${text}">${text}</phoneme></speak>` : 
      `<speak>${text}</speak>`;

    const [response] = await ttsClient!.synthesizeSpeech({
      input: { ssml },
      voice: { languageCode: langCode },
      audioConfig: { audioEncoding: 'MP3', speakingRate: speed || 1.0 },
    });
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/evaluate-audio', async (req, res) => {
  const { audioBlob, language, expectedText } = req.body;
  try {
    const audioBytes = Buffer.from(audioBlob, 'base64');
    const [response] = await speechClient!.recognize({
      audio: { content: audioBytes },
      config: { 
        encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS, 
        sampleRateHertz: 48000, 
        languageCode: 'en-US' 
      },
    });
    const transcription = response.results?.map((r: any) => r.alternatives?.[0].transcript).join('\n') || "[No speech]";
    const prompt = `User practiced "${expectedText}" in ${language}. Recognized: "${transcription}". Give 1-2 sentences of phonetic advice.`;
    const result = await model.generateContent(prompt);
    res.json({ transcription, feedback: result.response.text() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

initialize().then(() => {
  app.listen(PORT, () => console.log(`Fonetik Sidecar running on port ${PORT}`));
});
