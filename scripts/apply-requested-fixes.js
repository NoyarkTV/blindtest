const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, "utf8");
}

function replaceOnce(text, from, to, label) {
  const index = text.indexOf(from);
  if (index === -1) throw new Error(`Pattern introuvable: ${label}`);
  if (text.indexOf(from, index + from.length) !== -1) {
    throw new Error(`Pattern non unique: ${label}`);
  }
  return text.slice(0, index) + to + text.slice(index + from.length);
}

function replaceAllChecked(text, from, to, label, minCount = 1) {
  const count = text.split(from).length - 1;
  if (count < minCount) throw new Error(`Pattern introuvable: ${label}`);
  return text.split(from).join(to);
}

function replaceBetween(text, start, end, replacement, label) {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) throw new Error(`Début introuvable: ${label}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw new Error(`Fin introuvable: ${label}`);
  return text.slice(0, startIndex) + replacement + text.slice(endIndex);
}

function patchServer() {
  let s = read("server/index.js");

  s = replaceOnce(
    s,
    "const alreadyPlayedUris = new Set();",
    `const alreadyPlayedUris = new Set();\n\nfunction buildScoreboard(game) {\n  if (!game) return [];\n  const scoreMap = new Map(\n    (Array.isArray(game.scores) ? game.scores : []).map(entry => [entry.name, entry])\n  );\n\n  return (Array.isArray(game.players) ? game.players : []).map(player => {\n    const stored = scoreMap.get(player.name);\n    return {\n      name: player.name,\n      score: Number(stored?.score) || 0,\n      photo: player.photo || stored?.photo || \"\"\n    };\n  });\n}\n\nfunction syncGameScores(game) {\n  if (!game) return [];\n  game.scores = buildScoreboard(game);\n  return game.scores;\n}\n\nfunction getRoundPlayers(game) {\n  const players = Array.isArray(game?.players) ? game.players : [];\n  if (game?.config?.modeDiffusion) {\n    return players.filter(player => player.name !== game.admin);\n  }\n  return players;\n}`,
    "server scoreboard helpers"
  );

  s = replaceOnce(
    s,
    "games[id] = { id, admin, players, playersReady: [], currentBuzz: null };",
    "games[id] = { id, admin, players, playersReady: [], currentBuzz: null, scores: players.map(player => ({ name: player.name, score: 0, photo: player.photo || \"\" })), roundResults: {} };",
    "create-game initialise scores"
  );

  s = replaceOnce(
    s,
    "    currentBuzz: null\n  };\n\n  io.to(id).emit(\"game-started\"",
    "    currentBuzz: null,\n    roundResults: {}\n  };\n  syncGameScores(games[id]);\n\n  io.to(id).emit(\"game-started\"",
    "start-game sync scores"
  );

  s = replaceOnce(
    s,
    "    scores: game.scores || []",
    "    scores: syncGameScores(game)",
    "game endpoint full scores"
  );

  s = replaceBetween(
    s,
    'app.post("/submit-score",',
    'app.post("/join-game",',
    `app.post("/submit-score", (req, res) => {\n  const { id, player, score } = req.body;\n  const game = games[id];\n  if (!game) return res.status(404).send({ error: "Partie introuvable" });\n\n  if (!Array.isArray(game.scores)) game.scores = [];\n\n  const playerInfo = (game.players || []).find(p => p.name === player);\n  let existing = game.scores.find(s => s.name === player);\n  if (!existing) {\n    existing = { name: player, score: 0, photo: playerInfo?.photo || "" };\n    game.scores.push(existing);\n  }\n\n  existing.score = Number(score) || 0;\n  if (playerInfo?.photo) existing.photo = playerInfo.photo;\n\n  const fullScores = syncGameScores(game);\n  io.to(id).emit("score-update", fullScores);\n\n  if (Array.isArray(game.playersReady) && game.playersReady.includes(player)) {\n    emitReadyState(id);\n  }\n\n  res.send({ success: true, scores: fullScores });\n});\n\n`,
    "submit-score route"
  );

  s = replaceBetween(
    s,
    'app.post("/join-game",',
    'app.post("/leave-game",',
    `app.post("/join-game", (req, res) => {\n  const { id, player } = req.body;\n  const game = games[id];\n  if (!game) return res.status(404).send({ error: "Partie introuvable" });\n\n  const existingPlayer = game.players.find(p => p.name === player.name);\n  if (!existingPlayer) {\n    game.players.push(player);\n    io.to(id).emit("player-joined", game.players);\n  } else if (player.photo) {\n    existingPlayer.photo = player.photo;\n  }\n\n  const fullScores = syncGameScores(game);\n  io.to(id).emit("score-update", fullScores);\n  res.send({ success: true });\n});\n\n`,
    "join-game route"
  );

  s = replaceBetween(
    s,
    'app.post("/leave-game",',
    'app.get("/scores/:id",',
    `app.post("/leave-game", (req, res) => {\n  const { id, playerName } = req.body;\n  const game = games[id];\n  if (!game) return res.status(404).send({ error: "Partie introuvable" });\n\n  const before = game.players.length;\n  game.players = game.players.filter(p => p.name !== playerName);\n  if (Array.isArray(game.playersReady)) {\n    game.playersReady = game.playersReady.filter(n => n !== playerName);\n  }\n  if (game.roundResults) delete game.roundResults[playerName];\n\n  if (game.players.length !== before) {\n    io.to(id).emit("player-left", game.players);\n    io.to(id).emit("score-update", syncGameScores(game));\n    emitReadyState(id);\n  }\n\n  res.send({ success: true });\n});\n\n`,
    "leave-game route"
  );

  s = replaceBetween(
    s,
    'app.get("/scores/:id",',
    'app.get("/profile",',
    `app.get("/scores/:id", (req, res) => {\n  const { id } = req.params;\n  const game = games[id];\n\n  if (!game) {\n    return res.status(404).send({ error: "Partie introuvable" });\n  }\n\n  res.send(syncGameScores(game));\n});\n\n`,
    "scores route"
  );

  s = replaceOnce(
    s,
    `const io = new Server(server, {\n  cors: { origin: "*" } // autoriser tous les domaines (à restreindre plus tard)\n});\n\nserver.listen(PORT, () => {`,
    `const io = new Server(server, {\n  cors: { origin: "*" } // autoriser tous les domaines (à restreindre plus tard)\n});\n\nfunction emitReadyState(roomId) {\n  const game = games[roomId];\n  if (!game) return;\n\n  const activePlayers = getRoundPlayers(game);\n  const activeNames = new Set(activePlayers.map(player => player.name));\n  game.playersReady = (Array.isArray(game.playersReady) ? game.playersReady : []).filter(name => activeNames.has(name));\n\n  const scoreMap = new Map(syncGameScores(game).map(entry => [entry.name, entry]));\n  const roundResults = game.roundResults || {};\n  const readyDetails = game.playersReady.map(name => {\n    const result = roundResults[name] || {};\n    const currentScore = Number(scoreMap.get(name)?.score) || 0;\n    const previousScore = Number(result.previousScore) || 0;\n    return {\n      name,\n      previousScore,\n      pointsGained: Math.max(0, currentScore - previousScore),\n      responseTime: result.responseTime ?? null\n    };\n  });\n\n  io.to(roomId).emit("players-ready-update", {\n    ready: game.playersReady.length,\n    total: activePlayers.length,\n    players: readyDetails\n  });\n}\n\nserver.listen(PORT, () => {`,
    "emitReadyState helper"
  );

  s = replaceBetween(
    s,
    'socket.on("next-round",',
    'socket.on("player-ready",',
    `socket.on("next-round", ({ roomId }) => {\n  console.log(\`📨 Reçu 'next-round' pour room \${roomId}\`);\n\n  const game = games[roomId];\n  if (!game) {\n    console.warn("❌ Partie non trouvée :", roomId);\n    return;\n  }\n\n  const activePlayers = getRoundPlayers(game);\n  const readyCount = Array.isArray(game.playersReady) ? game.playersReady.length : 0;\n  if (readyCount < activePlayers.length) {\n    console.warn(\`⏳ Round non terminé : \${readyCount}/\${activePlayers.length} joueurs prêts\`);\n    emitReadyState(roomId);\n    return;\n  }\n\n  console.log(\`➡️ Round actuel : \${game.currentRound} / \${game.playlist?.length}\`);\n\n  if (game.currentRound < game.playlist.length) {\n    game.currentRound++;\n    game.playersReady = [];\n    game.roundResults = {};\n    console.log(\`🆙 Nouveau round : \${game.currentRound}\`);\n    io.to(roomId).emit("round-updated", { newRound: game.currentRound });\n    emitReadyState(roomId);\n  } else {\n    console.log("🏁 Fin de la partie");\n    io.to(roomId).emit("game-over", syncGameScores(game));\n  }\n});\n`,
    "next-round socket"
  );

  s = replaceBetween(
    s,
    'socket.on("player-ready",',
    '  // Lorsqu\'un joueur buzz',
    `socket.on("player-ready", ({ roomId, playerName, previousScore, responseTime }) => {\n  const game = games[roomId];\n  if (!game) {\n    console.warn("❌ Partie non trouvée pour player-ready :", roomId);\n    return;\n  }\n\n  const activePlayers = getRoundPlayers(game);\n  if (!activePlayers.some(player => player.name === playerName)) {\n    return;\n  }\n\n  if (!Array.isArray(game.playersReady)) game.playersReady = [];\n  if (!game.roundResults) game.roundResults = {};\n\n  game.roundResults[playerName] = {\n    previousScore: Number(previousScore) || 0,\n    responseTime: responseTime ?? null\n  };\n\n  if (!game.playersReady.includes(playerName)) {\n    game.playersReady.push(playerName);\n    console.log(\`✅ Player ready: \${playerName} (\${game.playersReady.length} / \${activePlayers.length})\`);\n  }\n\n  emitReadyState(roomId);\n\n  if (game.playersReady.length === activePlayers.length) {\n    io.to(roomId).emit("all-ready");\n  }\n});\n\n`,
    "player-ready socket"
  );

  s = replaceOnce(
    s,
    `  // Reprise de la musique\n  socket.on("resume-track", ({ roomId }) => {`,
    `  socket.on("apply-time-penalty", ({ roomId, timeLeft }) => {\n    if (!roomId) return;\n    const safeTimeLeft = Math.max(0, Number(timeLeft) || 0);\n    console.log(\`⏬ Pénalité de temps appliquée dans \${roomId} : \${safeTimeLeft}s restantes\`);\n    io.to(roomId).emit("buzz-time", { timeLeft: safeTimeLeft });\n  });\n\n  // Reprise de la musique\n  socket.on("resume-track", ({ roomId }) => {`,
    "time penalty socket"
  );

  write("server/index.js", s);
}

function patchRoomPage() {
  let s = read("src/RoomPage.js");
  s = replaceOnce(
    s,
    `  const onGameStarted = (data) => {\n    if (data?.config?.modeDiffusion) {`,
    `  const onGameStarted = (data) => {\n    shouldLeaveRef.current = false;\n    if (data?.config?.modeDiffusion) {`,
    "RoomPage preserve players on navigation"
  );
  write("src/RoomPage.js", s);
}

function patchConfigPage() {
  let s = read("src/ConfigPage.js");
  s = replaceOnce(
    s,
    "  const [anneeMax, setAnneeMax] = useState(2025);",
    "  const [anneeMax, setAnneeMax] = useState(new Date().getFullYear());",
    "dynamic year fallback"
  );
  s = replaceOnce(
    s,
    `    .then(data => {\n      setAllTracks(data);\n      console.log("🎵 Morceaux reçus :", data);\n    })`,
    `    .then(data => {\n      setAllTracks(data);\n      const years = data\n        .map(track => Number(track.annee))\n        .filter(year => Number.isFinite(year) && year > 0);\n      if (years.length > 0) {\n        setAnneeMin(Math.min(...years));\n        setAnneeMax(Math.max(...years));\n      }\n      console.log("🎵 Morceaux reçus :", data);\n    })`,
    "database-driven year bounds"
  );
  write("src/ConfigPage.js", s);
}

function patchScorePresentation(rel) {
  let s = read(rel);
  s = replaceAllChecked(
    s,
    'photo: previous?.photo || "/ppDefault.png",',
    'photo: p.photo || previous?.photo || "/ppDefault.png",',
    `${rel} preserve photos`,
    2
  );
  s = replaceOnce(
    s,
    "  const delta = detail ? currentScore - detail.previousScore : null;",
    "  const delta = detail ? (Number.isFinite(detail.pointsGained) ? detail.pointsGained : currentScore - (detail.previousScore ?? currentScore)) : null;",
    `${rel} round delta`
  );
  write(rel, s);
}

function patchNormalGame() {
  let s = read("src/GamePage.js");
  s = replaceOnce(
    s,
    "    const base = ((rawTimeLeft / timer) * 100 * multiplier) - (wrongAttemptsRef.current * 20);",
    "    const base = (rawTimeLeft / timer) * 100 * multiplier;",
    "normal game points from remaining time"
  );

  const oldWrong = `// 🔴 Cas 3 : Mauvaise réponse\nelse {\n    wrongAttemptsRef.current = (wrongAttemptsRef.current || 0) + 1;\n    console.log("❌ Mauvaise réponse - tentatives :", wrongAttemptsRef.current);\n    basePointsRef.current = Math.max(0, basePointsRef.current - 20);\n\n    setIsWrongAnswer(true);\n    setTimeout(() => {\n    setIsWrongAnswer(false);\n    setAnswer("");\n    setComposerGuess("");\n  }, 600);\n\nhandlePlay();\nsetIsTimerRunning(true);\n}\n};`;

  const newWrong = `// 🔴 Cas 3 : Mauvaise réponse\nelse {\n    wrongAttemptsRef.current = (wrongAttemptsRef.current || 0) + 1;\n    const penaltySeconds = timer * 0.2;\n    const currentRemaining = Number.isFinite(pausedTimeRef.current)\n      ? pausedTimeRef.current\n      : (timeLeftRef.current ?? timer);\n    const penalizedTime = Math.max(0, currentRemaining - penaltySeconds);\n\n    pausedTimeRef.current = penalizedTime;\n    setTimeLeft(penalizedTime);\n    console.log(\`❌ Mauvaise réponse - pénalité \${penaltySeconds.toFixed(1)}s, reste \${penalizedTime.toFixed(1)}s\`);\n\n    setIsWrongAnswer(true);\n    setTimeout(() => {\n      setIsWrongAnswer(false);\n      setAnswer("");\n      setComposerGuess("");\n    }, 600);\n\n    if (penalizedTime <= 0) {\n      setIsBuzzed(false);\n      setIsTimerRunning(false);\n      return;\n    }\n\n    handlePlay();\n    setIsTimerRunning(true);\n}\n};`;

  s = replaceOnce(s, oldWrong, newWrong, "normal game wrong-answer time penalty");
  s = replaceOnce(
    s,
    "disabled={!roundEndedRef.current}",
    "disabled={!roundEndedRef.current || playersReady < players.length}",
    "normal game wait for all players"
  );
  write("src/GamePage.js", s);
}

function patchDiffusionGame() {
  let s = read("src/GamePageDiffusion.js");
  s = replaceOnce(
    s,
    "    const base = ((rawTimeLeft / timer) * 100 * multiplier) - (wrongAttemptsRef.current * 20);",
    "    const base = (rawTimeLeft / timer) * 100 * multiplier;",
    "diffusion points from remaining time"
  );

  const oldWrong = `// 🔴 Cas 3 : Mauvaise réponse\nelse {\n    wrongAttemptsRef.current = (wrongAttemptsRef.current || 0) + 1;\n    console.log("❌ Mauvaise réponse - tentatives :", wrongAttemptsRef.current);\n    basePointsRef.current = Math.max(0, basePointsRef.current - 20);\n\n    setIsWrongAnswer(true);\n    setTimeout(() => {\n    setIsWrongAnswer(false);\n    setAnswer("");\n    setComposerGuess("");\n  }, 600);\n\n    handlePlay();\n  if (isDiffuser) setIsTimerRunning(true);\n  socket.emit("resume-track", { roomId: id });\n}\n};`;

  const newWrong = `// 🔴 Cas 3 : Mauvaise réponse\nelse {\n    wrongAttemptsRef.current = (wrongAttemptsRef.current || 0) + 1;\n    const penaltySeconds = timer * 0.2;\n    const currentRemaining = Number.isFinite(pausedTimeRef.current)\n      ? pausedTimeRef.current\n      : (timeLeftRef.current ?? timer);\n    const penalizedTime = Math.max(0, currentRemaining - penaltySeconds);\n\n    pausedTimeRef.current = penalizedTime;\n    setTimeLeft(penalizedTime);\n    socket.emit("apply-time-penalty", { roomId: id, timeLeft: penalizedTime });\n    console.log(\`❌ Mauvaise réponse - pénalité \${penaltySeconds.toFixed(1)}s, reste \${penalizedTime.toFixed(1)}s\`);\n\n    setIsWrongAnswer(true);\n    setTimeout(() => {\n      setIsWrongAnswer(false);\n      setAnswer("");\n      setComposerGuess("");\n    }, 600);\n\n    if (penalizedTime <= 0) {\n      setIsBuzzed(false);\n      return;\n    }\n\n    socket.emit("resume-track", { roomId: id });\n}\n};`;

  s = replaceOnce(s, oldWrong, newWrong, "diffusion wrong-answer time penalty");
  write("src/GamePageDiffusion.js", s);
}

function patchEclairButton() {
  let s = read("src/GamePageEclair.js");
  s = replaceOnce(
    s,
    "disabled={!roundEndedRef.current}",
    "disabled={!roundEndedRef.current || playersReady < players.length}",
    "eclair wait for all players"
  );
  write("src/GamePageEclair.js", s);
}

function patchGitignoreAndCleanup() {
  const gitignorePath = path.join(root, ".gitignore");
  let g = fs.readFileSync(gitignorePath, "utf8").trimEnd();
  const block = `\n\n# Blindtest local/runtime files\n**/node_modules/\n**/.env\n**/.env.*\n!**/.env.example\n*.pem\nserver/data/\n`;
  if (!g.includes("# Blindtest local/runtime files")) g += block;
  fs.writeFileSync(gitignorePath, g.endsWith("\n") ? g : g + "\n", "utf8");

  const removePaths = [
    "server/.env",
    "server/localhost-key.pem",
    "server/localhost.pem",
    "server/node_modules",
    "start-blindtest.bat"
  ];
  for (const rel of removePaths) {
    const target = path.join(root, rel);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  }
}

patchServer();
patchRoomPage();
patchConfigPage();
for (const file of ["src/GamePage.js", "src/GamePageEclair.js", "src/GamePageDiffusion.js", "src/GamePageDiffuseur.js"]) {
  patchScorePresentation(file);
}
patchNormalGame();
patchDiffusionGame();
patchEclairButton();
patchGitignoreAndCleanup();

// One-shot helper: remove itself and its workflow so only the real fixes remain.
for (const rel of ["scripts/apply-requested-fixes.js", ".github/workflows/apply-requested-fixes.yml"]) {
  const target = path.join(root, rel);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}

console.log("✅ Correctifs Blindtest appliqués avec succès.");
