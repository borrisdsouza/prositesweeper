const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5173;
const DATA_FILE = path.join(__dirname, "scores.txt");

app.use(express.json());
app.use(express.static(__dirname));

ensureDataFile();

app.get("/scores", (req, res) => {
  try {
    const scores = readScores().sort((a, b) => (a.durationMs || Infinity) - (b.durationMs || Infinity));
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: "Unable to read leaderboard." });
  }
});

app.post("/scores", (req, res) => {
  const { name, email, difficulty, difficultyLabel, durationMs, outcome, finishedAt, won } = req.body || {};
  if (!name || !email || !difficulty || !Number.isFinite(durationMs)) {
    return res.status(400).json({ error: "Missing required score data." });
  }

  const entry = {
    id: Date.now(),
    name: String(name).trim(),
    email: String(email).trim(),
    difficulty,
    difficultyLabel: difficultyLabel || difficulty,
    outcome: outcome || (won ? "Completed map" : "Hazard"),
    won: Boolean(won),
    durationMs,
    prettyDuration: formatDuration(durationMs),
    finishedAt: finishedAt || new Date().toISOString(),
  };

  try {
    const scores = readScores();
    scores.push(entry);
    writeScores(scores);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: "Unable to save score." });
  }
});

app.listen(PORT, () => {
  console.log(`Site Sweeper server running on http://localhost:${PORT}`);
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readScores() {
  ensureDataFile();
  const data = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(data);
}

function writeScores(scores) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2), "utf8");
}

function formatDuration(ms = 0) {
  if (!Number.isFinite(ms)) return "—";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
