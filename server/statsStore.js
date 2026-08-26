const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";
const FALLBACK_DIR = path.join(__dirname, "data");
const FALLBACK_FILE = path.join(FALLBACK_DIR, "stats-v2.json");

let dbAvailable = false;
let fallbackState = { rounds: [], games: [] };

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : undefined
    })
  : null;

function ensureFallbackFile() {
  if (!fs.existsSync(FALLBACK_DIR)) fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  if (!fs.existsSync(FALLBACK_FILE)) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackState, null, 2));
    return;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(FALLBACK_FILE, "utf8"));
    fallbackState = {
      rounds: Array.isArray(parsed?.rounds) ? parsed.rounds : [],
      games: Array.isArray(parsed?.games) ? parsed.games : []
    };
  } catch (err) {
    console.error("❌ Lecture stats-v2.json impossible :", err);
  }
}

function saveFallback() {
  try {
    ensureFallbackFile();
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackState, null, 2));
  } catch (err) {
    console.error("❌ Sauvegarde stats-v2.json impossible :", err);
  }
}

async function initDatabase() {
  if (!pool) {
    ensureFallbackFile();
    console.log("ℹ️ Stats v2 : stockage fichier local (temporaire sur Render sans disque persistant).");
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blindtest_round_results (
        game_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        track_uri TEXT NOT NULL,
        track_title TEXT,
        media TEXT,
        track_category TEXT,
        track_year INTEGER,
        mode TEXT,
        correct_title BOOLEAN NOT NULL DEFAULT FALSE,
        correct_composer BOOLEAN NOT NULL DEFAULT FALSE,
        response_time DOUBLE PRECISION,
        points INTEGER NOT NULL DEFAULT 0,
        wrong_attempts INTEGER NOT NULL DEFAULT 0,
        media_hint BOOLEAN NOT NULL DEFAULT FALSE,
        year_hint BOOLEAN NOT NULL DEFAULT FALSE,
        timer_seconds DOUBLE PRECISION,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (game_id, round_number, player_name)
      );

      CREATE TABLE IF NOT EXISTS blindtest_game_results (
        game_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        final_score INTEGER NOT NULL DEFAULT 0,
        final_rank INTEGER NOT NULL DEFAULT 0,
        winner BOOLEAN NOT NULL DEFAULT FALSE,
        mode TEXT,
        rounds_total INTEGER NOT NULL DEFAULT 0,
        photo TEXT,
        played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (game_id, player_name)
      );

      CREATE INDEX IF NOT EXISTS idx_blindtest_round_player
        ON blindtest_round_results (player_name);
      CREATE INDEX IF NOT EXISTS idx_blindtest_round_track
        ON blindtest_round_results (track_uri);
      CREATE INDEX IF NOT EXISTS idx_blindtest_game_player
        ON blindtest_game_results (player_name);
    `);
    dbAvailable = true;
    console.log("✅ Stats v2 : Render Postgres connecté.");
  } catch (err) {
    dbAvailable = false;
    ensureFallbackFile();
    console.error("❌ Connexion Postgres impossible, fallback local utilisé :", err.message);
  }
}

const initPromise = initDatabase();

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeNullableNumber(value) {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRound(row) {
  return {
    gameId: String(row.gameId || row.game_id || ""),
    roundNumber: safeNumber(row.roundNumber ?? row.round_number),
    playerName: String(row.playerName || row.player_name || ""),
    trackUri: String(row.trackUri || row.track_uri || ""),
    trackTitle: String(row.trackTitle || row.track_title || ""),
    media: String(row.media || ""),
    category: String(row.category || row.track_category || ""),
    year: safeNumber(row.year ?? row.track_year),
    mode: String(row.mode || "normal"),
    correctTitle: Boolean(row.correctTitle ?? row.correct_title),
    correctComposer: Boolean(row.correctComposer ?? row.correct_composer),
    responseTime: safeNullableNumber(row.responseTime ?? row.response_time),
    points: safeNumber(row.points),
    wrongAttempts: safeNumber(row.wrongAttempts ?? row.wrong_attempts),
    mediaHint: Boolean(row.mediaHint ?? row.media_hint),
    yearHint: Boolean(row.yearHint ?? row.year_hint),
    timerSeconds: safeNullableNumber(row.timerSeconds ?? row.timer_seconds),
    createdAt: row.createdAt || row.created_at || new Date().toISOString()
  };
}

function normalizeGame(row) {
  return {
    gameId: String(row.gameId || row.game_id || ""),
    playerName: String(row.playerName || row.player_name || ""),
    finalScore: safeNumber(row.finalScore ?? row.final_score),
    finalRank: safeNumber(row.finalRank ?? row.final_rank),
    winner: Boolean(row.winner),
    mode: String(row.mode || "normal"),
    roundsTotal: safeNumber(row.roundsTotal ?? row.rounds_total),
    photo: String(row.photo || ""),
    playedAt: row.playedAt || row.played_at || new Date().toISOString()
  };
}

async function recordRound(rawRound) {
  await initPromise;
  const round = normalizeRound(rawRound);
  if (!round.gameId || !round.playerName || !round.roundNumber) return;
  if (!round.trackUri) round.trackUri = `${round.gameId}:${round.roundNumber}:${round.trackTitle || "track"}`;

  if (dbAvailable) {
    await pool.query(
      `INSERT INTO blindtest_round_results (
        game_id, round_number, player_name, track_uri, track_title, media, track_category,
        track_year, mode, correct_title, correct_composer, response_time, points,
        wrong_attempts, media_hint, year_hint, timer_seconds
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (game_id, round_number, player_name) DO UPDATE SET
        track_uri = EXCLUDED.track_uri,
        track_title = EXCLUDED.track_title,
        media = EXCLUDED.media,
        track_category = EXCLUDED.track_category,
        track_year = EXCLUDED.track_year,
        mode = EXCLUDED.mode,
        correct_title = EXCLUDED.correct_title,
        correct_composer = EXCLUDED.correct_composer,
        response_time = EXCLUDED.response_time,
        points = EXCLUDED.points,
        wrong_attempts = EXCLUDED.wrong_attempts,
        media_hint = EXCLUDED.media_hint,
        year_hint = EXCLUDED.year_hint,
        timer_seconds = EXCLUDED.timer_seconds`,
      [
        round.gameId, round.roundNumber, round.playerName, round.trackUri, round.trackTitle,
        round.media, round.category, round.year || null, round.mode, round.correctTitle,
        round.correctComposer, round.responseTime, round.points, round.wrongAttempts,
        round.mediaHint, round.yearHint, round.timerSeconds
      ]
    );
    return;
  }

  const index = fallbackState.rounds.findIndex(r =>
    r.gameId === round.gameId && r.roundNumber === round.roundNumber && r.playerName === round.playerName
  );
  if (index >= 0) fallbackState.rounds[index] = round;
  else fallbackState.rounds.push(round);
  saveFallback();
}

async function recordGame({ gameId, mode = "normal", roundsTotal = 0, players = [] }) {
  await initPromise;
  if (!gameId || !Array.isArray(players)) return;
  const playedAt = new Date().toISOString();

  if (dbAvailable) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const player of players) {
        await client.query(
          `INSERT INTO blindtest_game_results (
            game_id, player_name, final_score, final_rank, winner, mode, rounds_total, photo, played_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (game_id, player_name) DO NOTHING`,
          [
            String(gameId), String(player.name || ""), safeNumber(player.score), safeNumber(player.rank),
            Boolean(player.winner), String(mode || "normal"), safeNumber(roundsTotal), String(player.photo || ""), playedAt
          ]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  for (const player of players) {
    const gameRow = normalizeGame({
      gameId,
      playerName: player.name,
      finalScore: player.score,
      finalRank: player.rank,
      winner: player.winner,
      mode,
      roundsTotal,
      photo: player.photo,
      playedAt
    });
    const index = fallbackState.games.findIndex(g => g.gameId === gameRow.gameId && g.playerName === gameRow.playerName);
    if (index < 0) fallbackState.games.push(gameRow);
  }
  saveFallback();
}

async function snapshot() {
  await initPromise;
  if (!dbAvailable) {
    return {
      rounds: fallbackState.rounds.map(normalizeRound),
      games: fallbackState.games.map(normalizeGame),
      storage: "local"
    };
  }

  const [roundsResult, gamesResult] = await Promise.all([
    pool.query("SELECT * FROM blindtest_round_results ORDER BY created_at ASC"),
    pool.query("SELECT * FROM blindtest_game_results ORDER BY played_at ASC")
  ]);

  return {
    rounds: roundsResult.rows.map(normalizeRound),
    games: gamesResult.rows.map(normalizeGame),
    storage: "postgres"
  };
}

function splitCategories(value) {
  return String(value || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function percent(correct, attempts) {
  return attempts > 0 ? (correct / attempts) * 100 : 0;
}

function summarizeBucket(name, rows) {
  const correctRows = rows.filter(row => row.correctTitle);
  const times = correctRows.map(row => row.responseTime).filter(Number.isFinite);
  return {
    name: String(name),
    attempts: rows.length,
    correct: correctRows.length,
    accuracy: percent(correctRows.length, rows.length),
    averageTime: average(times)
  };
}

function buildCategoryStats(rounds) {
  const buckets = new Map();
  rounds.forEach(round => {
    splitCategories(round.category).forEach(category => {
      if (!buckets.has(category)) buckets.set(category, []);
      buckets.get(category).push(round);
    });
  });
  return [...buckets.entries()].map(([name, rows]) => summarizeBucket(name, rows));
}

function buildYearStats(rounds) {
  const buckets = new Map();
  rounds.forEach(round => {
    if (!round.year) return;
    const key = String(round.year);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(round);
  });
  return [...buckets.entries()].map(([name, rows]) => summarizeBucket(name, rows));
}

function chooseBestDimension(stats, minimumAttempts) {
  if (!stats.length) return null;
  let eligible = stats.filter(item => item.attempts >= minimumAttempts);
  if (!eligible.length) eligible = stats.filter(item => item.attempts >= 2);
  if (!eligible.length) eligible = stats;

  return [...eligible].sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    const aTime = Number.isFinite(a.averageTime) ? a.averageTime : Infinity;
    const bTime = Number.isFinite(b.averageTime) ? b.averageTime : Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return b.attempts - a.attempts;
  })[0];
}

function buildTrackStats(rounds) {
  const map = new Map();
  rounds.forEach(round => {
    const key = round.trackUri || round.trackTitle;
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        trackUri: round.trackUri,
        title: round.trackTitle || "Morceau inconnu",
        attempts: 0,
        correct: 0,
        times: []
      });
    }
    const item = map.get(key);
    item.attempts += 1;
    if (round.correctTitle) {
      item.correct += 1;
      if (Number.isFinite(round.responseTime)) item.times.push(round.responseTime);
    }
  });

  return [...map.values()].map(item => ({
    trackUri: item.trackUri,
    title: item.title,
    attempts: item.attempts,
    correct: item.correct,
    accuracy: percent(item.correct, item.attempts),
    averageTime: average(item.times)
  }));
}

function sortDimensionForDisplay(stats) {
  return [...stats]
    .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy)
    .slice(0, 10);
}

function buildPersonalStats(playerName, data, includeTrackComparisons = true) {
  const playerRounds = data.rounds.filter(row => row.playerName === playerName);
  const playerGames = data.games.filter(row => row.playerName === playerName);
  const correctRounds = playerRounds.filter(row => row.correctTitle);
  const responseTimes = correctRounds.map(row => row.responseTime).filter(Number.isFinite);
  const categoryStats = buildCategoryStats(playerRounds);
  const yearStats = buildYearStats(playerRounds);
  const trackStats = buildTrackStats(playerRounds);
  const latestGame = [...playerGames].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))[0];

  const summary = {
    gamesPlayed: playerGames.length,
    gamesWon: playerGames.filter(game => game.winner).length,
    totalScore: playerGames.reduce((sum, game) => sum + game.finalScore, 0),
    roundsPlayed: playerRounds.length,
    roundsWon: correctRounds.length,
    accuracy: percent(correctRounds.length, playerRounds.length),
    averageResponseTime: average(responseTimes),
    bestResponseTime: responseTimes.length ? Math.min(...responseTimes) : null,
    averagePointsPerRound: playerRounds.length
      ? playerRounds.reduce((sum, row) => sum + row.points, 0) / playerRounds.length
      : 0,
    wrongAttempts: playerRounds.reduce((sum, row) => sum + row.wrongAttempts, 0),
    hintsUsed: playerRounds.reduce((sum, row) => sum + Number(row.mediaHint) + Number(row.yearHint), 0)
  };

  const reliableTracks = [...trackStats]
    .filter(track => track.attempts >= 3)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, 5);
  const nemesisTracks = [...trackStats]
    .filter(track => track.attempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);
  const fastestTracks = [...trackStats]
    .filter(track => track.correct >= 2 && Number.isFinite(track.averageTime))
    .sort((a, b) => a.averageTime - b.averageTime)
    .slice(0, 5);
  const lateTracks = [...trackStats]
    .filter(track => track.correct >= 2 && track.accuracy >= 50 && Number.isFinite(track.averageTime))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 5);

  const comparisonTracks = { signature: [], blindSpots: [] };
  if (includeTrackComparisons && playerRounds.length) {
    const otherTrackStats = new Map(buildTrackStats(data.rounds.filter(row => row.playerName !== playerName)).map(item => [item.trackUri, item]));
    const comparable = trackStats
      .filter(item => item.attempts >= 2)
      .map(item => ({ self: item, others: otherTrackStats.get(item.trackUri) }))
      .filter(item => item.others && item.others.attempts >= 3)
      .map(item => ({
        title: item.self.title,
        trackUri: item.self.trackUri,
        playerAccuracy: item.self.accuracy,
        othersAccuracy: item.others.accuracy,
        difference: item.self.accuracy - item.others.accuracy,
        playerAttempts: item.self.attempts,
        othersAttempts: item.others.attempts
      }));

    comparisonTracks.signature = comparable
      .filter(item => item.difference >= 25)
      .sort((a, b) => b.difference - a.difference)
      .slice(0, 5);
    comparisonTracks.blindSpots = comparable
      .filter(item => item.difference <= -25)
      .sort((a, b) => a.difference - b.difference)
      .slice(0, 5);
  }

  return {
    playerName,
    photo: latestGame?.photo || "",
    summary,
    bestCategory: chooseBestDimension(categoryStats, 5),
    bestYear: chooseBestDimension(yearStats, 3),
    categories: sortDimensionForDisplay(categoryStats),
    years: sortDimensionForDisplay(yearStats),
    tracks: {
      reliable: reliableTracks,
      nemesis: nemesisTracks,
      fastest: fastestTracks,
      late: lateTracks,
      signature: comparisonTracks.signature,
      blindSpots: comparisonTracks.blindSpots
    }
  };
}

function performanceInCategory(playerName, category, data) {
  if (!category) return null;
  const rows = data.rounds.filter(row => row.playerName === playerName && splitCategories(row.category).includes(category));
  return rows.length ? summarizeBucket(category, rows) : null;
}

function performanceInYear(playerName, year, data) {
  if (!year) return null;
  const rows = data.rounds.filter(row => row.playerName === playerName && String(row.year) === String(year));
  return rows.length ? summarizeBucket(String(year), rows) : null;
}

async function getPlayerStats(playerName) {
  const data = await snapshot();
  return { ...buildPersonalStats(playerName, data, true), storage: data.storage };
}

async function searchPlayers(query = "") {
  const data = await snapshot();
  const q = String(query || "").trim().toLowerCase();
  const names = new Set([
    ...data.games.map(game => game.playerName),
    ...data.rounds.map(round => round.playerName)
  ].filter(Boolean));

  return [...names]
    .filter(name => !q || name.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b, "fr"))
    .slice(0, 20);
}

async function comparePlayers(playerA, playerB) {
  const data = await snapshot();
  const a = buildPersonalStats(playerA, data, false);
  const b = buildPersonalStats(playerB, data, false);

  return {
    storage: data.storage,
    players: { a, b },
    categories: {
      aBest: a.bestCategory
        ? {
            category: a.bestCategory.name,
            a: performanceInCategory(playerA, a.bestCategory.name, data),
            b: performanceInCategory(playerB, a.bestCategory.name, data)
          }
        : null,
      bBest: b.bestCategory
        ? {
            category: b.bestCategory.name,
            a: performanceInCategory(playerA, b.bestCategory.name, data),
            b: performanceInCategory(playerB, b.bestCategory.name, data)
          }
        : null
    },
    years: {
      aBest: a.bestYear
        ? {
            year: a.bestYear.name,
            a: performanceInYear(playerA, a.bestYear.name, data),
            b: performanceInYear(playerB, a.bestYear.name, data)
          }
        : null,
      bBest: b.bestYear
        ? {
            year: b.bestYear.name,
            a: performanceInYear(playerA, b.bestYear.name, data),
            b: performanceInYear(playerB, b.bestYear.name, data)
          }
        : null
    }
  };
}

async function getGlobalStats() {
  const data = await snapshot();
  const trackStats = buildTrackStats(data.rounds);
  const minimumAttempts = trackStats.some(track => track.attempts >= 5) ? 5 : 1;
  const eligible = trackStats.filter(track => track.attempts >= minimumAttempts);
  const correctTimesEligible = trackStats.filter(track => track.correct >= (trackStats.some(t => t.correct >= 3) ? 3 : 1));

  return {
    storage: data.storage,
    summary: {
      gamesPlayed: new Set(data.games.map(game => game.gameId)).size,
      players: new Set([...data.games.map(game => game.playerName), ...data.rounds.map(round => round.playerName)]).size,
      answersRecorded: data.rounds.length,
      correctAnswers: data.rounds.filter(round => round.correctTitle).length,
      globalAccuracy: percent(data.rounds.filter(round => round.correctTitle).length, data.rounds.length)
    },
    tracks: {
      mostPlayed: [...trackStats].sort((a, b) => b.attempts - a.attempts).slice(0, 5),
      easiest: [...eligible].sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts).slice(0, 5),
      hardest: [...eligible].sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts).slice(0, 5),
      fastest: [...correctTimesEligible]
        .filter(track => Number.isFinite(track.averageTime))
        .sort((a, b) => a.averageTime - b.averageTime)
        .slice(0, 5)
    }
  };
}

function getStorageMode() {
  return dbAvailable ? "postgres" : "local";
}

module.exports = {
  recordRound,
  recordGame,
  getPlayerStats,
  searchPlayers,
  comparePlayers,
  getGlobalStats,
  getStorageMode
};
