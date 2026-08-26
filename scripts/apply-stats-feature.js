const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const write = (rel, content) => fs.writeFileSync(path.join(root, rel), content, "utf8");

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Pattern introuvable: ${label}`);
  const second = text.indexOf(from, first + from.length);
  if (second >= 0) throw new Error(`Pattern non unique: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function replaceFirst(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Pattern introuvable: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function patchServer() {
  let s = read("server/index.js");

  s = replaceOnce(
    s,
    'const disconnectTimers = new Map();',
    `const disconnectTimers = new Map();\nconst { recordRound, recordGame, getPlayerStats, searchPlayers, comparePlayers, getGlobalStats } = require("./statsStore");\nconst { buildGameSummary } = require("./gameSummary");`,
    "server stats imports"
  );

  s = replaceOnce(
    s,
    'games[id] = { id, admin, players: players.map(player => ({ ...player, connected: true })), playersReady: [], currentBuzz: null, scores: players.map(player => ({ name: player.name, score: 0, photo: player.photo || "" })), roundResults: {}, started: false };',
    'games[id] = { id, admin, players: players.map(player => ({ ...player, connected: true })), playersReady: [], currentBuzz: null, scores: players.map(player => ({ name: player.name, score: 0, photo: player.photo || "" })), roundResults: {}, statsHistory: [], statsFinalized: false, started: false };',
    "create game stats state"
  );

  s = replaceOnce(
    s,
    '    currentBuzz: null,\n    roundResults: {},\n    started: true',
    '    currentBuzz: null,\n    roundResults: {},\n    statsHistory: [],\n    statsFinalized: false,\n    finished: false,\n    started: true',
    "start game stats state"
  );

  const scoresRouteEnd = `app.get("/scores/:id", (req, res) => {\n  const { id } = req.params;\n  const game = games[id];\n\n  if (!game) {\n    return res.status(404).send({ error: "Partie introuvable" });\n  }\n\n  res.send(syncGameScores(game));\n});`;

  const statsRoutes = `${scoresRouteEnd}\n\napp.get("/game-summary/:id", (req, res) => {\n  const game = games[req.params.id];\n  if (!game) return res.status(404).send({ error: "Partie introuvable" });\n  res.send(buildGameSummary(game));\n});\n\napp.get("/stats/player/:playerName", async (req, res) => {\n  try {\n    res.send(await getPlayerStats(req.params.playerName));\n  } catch (err) {\n    console.error("❌ Stats joueur :", err);\n    res.status(500).send({ error: "Impossible de charger les statistiques" });\n  }\n});\n\napp.get("/stats/players", async (req, res) => {\n  try {\n    res.send({ players: await searchPlayers(req.query.q || "") });\n  } catch (err) {\n    console.error("❌ Recherche joueurs :", err);\n    res.status(500).send({ error: "Impossible de rechercher les joueurs" });\n  }\n});\n\napp.get("/stats/compare", async (req, res) => {\n  const { playerA, playerB } = req.query;\n  if (!playerA || !playerB) return res.status(400).send({ error: "Deux joueurs sont requis" });\n  try {\n    res.send(await comparePlayers(playerA, playerB));\n  } catch (err) {\n    console.error("❌ Comparaison joueurs :", err);\n    res.status(500).send({ error: "Impossible de comparer les joueurs" });\n  }\n});\n\napp.get("/stats/global", async (req, res) => {\n  try {\n    res.send(await getGlobalStats());\n  } catch (err) {\n    console.error("❌ Stats globales :", err);\n    res.status(500).send({ error: "Impossible de charger les statistiques globales" });\n  }\n});`;
  s = replaceOnce(s, scoresRouteEnd, statsRoutes, "stats API routes");

  const oldGameOver = `  } else {\n    console.log("🏁 Fin de la partie");\n    io.to(roomId).emit("game-over", syncGameScores(game));\n  }`;
  const newGameOver = `  } else {\n    console.log("🏁 Fin de la partie");\n    const finalScoreboard = syncGameScores(game);\n\n    if (!game.finished) {\n      game.finished = true;\n      if (!game.config?.modeDiffusion && !game.statsFinalized) {\n        game.statsFinalized = true;\n        const ranked = [...finalScoreboard].sort((a, b) => Number(b.score) - Number(a.score));\n        recordGame({\n          gameId: roomId,\n          mode: game.config?.modeEclair ? "eclair" : "normal",\n          roundsTotal: game.playlist?.length || 0,\n          players: ranked.map((player, index) => ({\n            name: player.name,\n            score: Number(player.score) || 0,\n            rank: index + 1,\n            winner: index === 0,\n            photo: player.photo || ""\n          }))\n        }).catch(err => {\n          game.statsFinalized = false;\n          console.error("❌ Enregistrement fin de partie :", err);\n        });\n      }\n    }\n\n    io.to(roomId).emit("game-over", finalScoreboard);\n  }`;
  s = replaceOnce(s, oldGameOver, newGameOver, "finalize persistent game stats");

  const oldReadyHeader = 'socket.on("player-ready", ({ roomId, playerName, previousScore, responseTime }) => {';
  const newReadyHeader = 'socket.on("player-ready", ({ roomId, playerName, previousScore, responseTime, pointsGained, correctTitle, correctComposer, wrongAttempts, mediaHint, yearHint }) => {';
  s = replaceOnce(s, oldReadyHeader, newReadyHeader, "player ready metadata");

  const oldRoundResult = `  game.roundResults[playerName] = {\n    previousScore: Number(previousScore) || 0,\n    responseTime: responseTime ?? null\n  };`;
  const newRoundResult = `  game.roundResults[playerName] = {\n    previousScore: Number(previousScore) || 0,\n    responseTime: responseTime ?? null,\n    pointsGained: Number(pointsGained) || 0,\n    correctTitle: Boolean(correctTitle),\n    correctComposer: Boolean(correctComposer)\n  };\n\n  if (!game.config?.modeDiffusion) {\n    if (!Array.isArray(game.statsHistory)) game.statsHistory = [];\n    const track = game.playlist?.[(game.currentRound || 1) - 1] || {};\n    const statRow = {\n      gameId: roomId,\n      roundNumber: game.currentRound || 1,\n      playerName,\n      trackUri: track.uri || "",\n      trackTitle: track.oeuvre || track.titre || track.theme || "Morceau inconnu",\n      media: track.media || "",\n      category: track.categorie || "",\n      year: Number(track.annee) || 0,\n      mode: game.config?.modeEclair ? "eclair" : "normal",\n      correctTitle: Boolean(correctTitle),\n      correctComposer: Boolean(correctComposer),\n      responseTime: responseTime === "-" ? null : responseTime,\n      points: Number(pointsGained) || 0,\n      wrongAttempts: Number(wrongAttempts) || 0,\n      mediaHint: Boolean(mediaHint),\n      yearHint: Boolean(yearHint),\n      timerSeconds: Number(game.config?.time) || null\n    };\n\n    const existingStat = game.statsHistory.findIndex(row =>\n      row.roundNumber === statRow.roundNumber && row.playerName === statRow.playerName\n    );\n    if (existingStat >= 0) game.statsHistory[existingStat] = statRow;\n    else game.statsHistory.push(statRow);\n\n    recordRound(statRow).catch(err => console.error("❌ Enregistrement de manche :", err));\n  }`;
  s = replaceOnce(s, oldRoundResult, newRoundResult, "record round stats");

  write("server/index.js", s);
}

function patchLanding() {
  let s = read("src/LandingPage.js");

  const oldBlock = `  {spotifyToken && (\n    <div className="info-icon-container">\n      <div className="info-icon">\n        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ff7c2c" viewBox="0 0 16 16">\n          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />\n          <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />\n        </svg>\n        <div className="profile-tooltip">\n          <div>Temps moyen : {(playerStats?.timedResponses ?? playerStats?.totalRoundsPlayed ?? 0) > 0 ? (playerStats.cumulativeResponseTime / (playerStats.timedResponses ?? playerStats.totalRoundsPlayed)).toFixed(2) : "--"} sec</div>\n          <div>Rounds joués : {playerStats?.totalRoundsPlayed ?? "--"}</div>\n          <div>Rounds gagnés : {playerStats?.totalRoundsWon ?? "--"}</div>\n          <div>Réussite : {playerStats?.totalRoundsPlayed > 0 ? Math.round((playerStats.totalRoundsWon / playerStats.totalRoundsPlayed) * 100) : "--"}%</div>\n          <div>Parties jouées : {playerStats?.gamesPlayed ?? "--"}</div>\n          <div>Meilleur temps : {playerStats?.bestResponseTime?.toFixed(2) ?? "--"} sec</div>\n          <div>Score cumulé : {playerStats?.totalScore ?? "--"}</div>\n        </div>\n      </div>\n    </div>\n  )}`;
  const newBlock = `  {playerName && (\n    <button className="stats-shortcut" onClick={() => navigate("/stats")} title="Mes statistiques" aria-label="Mes statistiques">\n      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16" fill="currentColor">\n        <path d="M0 0h1v15h15v1H0V0zm3 12V7h2v5H3zm4 0V3h2v9H7zm4 0V5h2v7h-2z" />\n      </svg>\n    </button>\n  )}`;
  s = replaceOnce(s, oldBlock, newBlock, "replace info icon with stats shortcut");

  s = s.replace('  const [playerStats, setPlayerStats] = useState(null);\n', '');
  s = s.replace(/\n\s*setPlayerStats\([^\n]*\);/g, '');

  write("src/LandingPage.js", s);
}

function patchGameFile(rel, eclair) {
  let s = read(rel);

  s = replaceOnce(
    s,
    'import socket from "./socket";',
    'import socket from "./socket";\nimport { isAcceptedTitle } from "./answerUtils";',
    `${rel} answer utility import`
  );

  s = replaceOnce(
    s,
    '  const [showEndPopup, setShowEndPopup] = useState(false);',
    '  const [showEndPopup, setShowEndPopup] = useState(false);\n  const [endInsights, setEndInsights] = useState([]);',
    `${rel} end insights state`
  );

  const oldValidation = `  const normalizedAnswer = normalize(answer);\n  const validAnswers = (currentTrack.answers || []).map(a => normalize(a));\n  const isCorrect = validAnswers.some(valid =>\n    valid === normalizedAnswer || levenshtein(valid, normalizedAnswer) <= 2\n  );`;
  const newValidation = `  const acceptedTitles = [\n    ...(currentTrack.answers || []),\n    currentTrack.oeuvre,\n    currentTrack.titre\n  ].filter(Boolean);\n  const isCorrect = isAcceptedTitle(answer, acceptedTitles);`;
  s = replaceOnce(s, oldValidation, newValidation, `${rel} adaptive title validation`);

  if (!eclair) {
    const correctEmit = `    socket.emit("player-ready", {\n      roomId: id,\n      playerName,\n      previousScore: score, // score AVANT ajout\n      responseTime: responseTime.toFixed(1)\n    });`;
    const correctEmitNew = `    socket.emit("player-ready", {\n      roomId: id,\n      playerName,\n      previousScore: score, // score AVANT ajout\n      responseTime: responseTime.toFixed(1),\n      pointsGained: totalPoints,\n      correctTitle: true,\n      correctComposer: isComposerMatch,\n      wrongAttempts: wrongAttemptsRef.current,\n      mediaHint: showIndiceMedia,\n      yearHint: showIndiceAnnee\n    });`;
    s = replaceOnce(s, correctEmit, correctEmitNew, "normal correct stats emit");

    const composerEmit = `    socket.emit("player-ready", {\n      roomId: id,\n      playerName,\n      previousScore: score,\n      responseTime: "-"\n    });`;
    const composerEmitNew = `    socket.emit("player-ready", {\n      roomId: id,\n      playerName,\n      previousScore: score,\n      responseTime: "-",\n      pointsGained: bonus,\n      correctTitle: false,\n      correctComposer: true,\n      wrongAttempts: wrongAttemptsRef.current,\n      mediaHint: showIndiceMedia,\n      yearHint: showIndiceAnnee\n    });`;
    s = replaceOnce(s, composerEmit, composerEmitNew, "normal composer stats emit");

    const timeoutEmit = `    socket.emit("player-ready", {\n      roomId: id,\n      playerName,\n      previousScore: score,\n      responseTime: "-"\n    });`;
    const timeoutEmitNew = `    socket.emit("player-ready", {\n      roomId: id,\n      playerName,\n      previousScore: score,\n      responseTime: "-",\n      pointsGained: 0,\n      correctTitle: false,\n      correctComposer: false,\n      wrongAttempts: wrongAttemptsRef.current,\n      mediaHint: showIndiceMedia,\n      yearHint: showIndiceAnnee\n    });`;
    s = replaceOnce(s, timeoutEmit, timeoutEmitNew, "normal timeout stats emit");
  } else {
    s = replaceOnce(
      s,
      '  socket.emit("player-ready", { roomId: id, playerName, previousScore: score, responseTime: "-" });',
      '  socket.emit("player-ready", { roomId: id, playerName, previousScore: score, responseTime: "-", pointsGained: points, correctTitle: isCorrect, correctComposer: composerMatch, wrongAttempts: 0, mediaHint: showIndiceMedia, yearHint: showIndiceAnnee });',
      "eclair validation stats emit"
    );
    s = replaceOnce(
      s,
      '  socket.emit("player-ready", { roomId: id, playerName, previousScore: score, responseTime: "-" });',
      '  socket.emit("player-ready", { roomId: id, playerName, previousScore: score, responseTime: "-", pointsGained: 0, correctTitle: false, correctComposer: false, wrongAttempts: 0, mediaHint: showIndiceMedia, yearHint: showIndiceAnnee });',
      "eclair abandon stats emit"
    );
  }

  const showEnd = `    setShowPopup(false);\n    setShowEndPopup(true);`;
  const showEndWithFetch = `    setShowPopup(false);\n    setShowEndPopup(true);\n\n    fetch(\`https://blindtest-69h7.onrender.com/game-summary/${'${id}'}\`)\n      .then(res => res.ok ? res.json() : { insights: [] })\n      .then(data => setEndInsights(Array.isArray(data.insights) ? data.insights : []))\n      .catch(() => setEndInsights([]));`;
  s = replaceFirst(s, showEnd, showEndWithFetch, `${rel} game summary fetch`);

  const averageParagraph = `      <p style={{ marginTop: 12, fontSize: 16, color: "#ccc" }}>\n        Votre temps de réponse moyen est de {averageTime} sec\n      </p>`;
  const insightsBlock = `      {endInsights.length > 0 && (\n        <div className="end-game-insights">\n          {endInsights.map((insight, index) => (\n            <div className="end-game-insight" key={\`${'${insight.type || "insight"}'}-${'${index}'}\`}>\n              <span className="end-game-insight-dot" />\n              <p>{insight.text}</p>\n            </div>\n          ))}\n        </div>\n      )}`;
  s = replaceOnce(s, averageParagraph, insightsBlock, `${rel} compact end insights`);

  write(rel, s);
}

function patchCss() {
  let s = read("src/App.css");
  if (s.includes("/* STATS PAGE */")) return;
  s += `\n\n/* STATS PAGE */\n.stats-shortcut {\n  position: absolute;\n  top: 14px;\n  right: 14px;\n  width: 38px;\n  height: 38px;\n  border: 0;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(255,255,255,0.08);\n  color: #ff7c2c;\n  cursor: pointer;\n  transition: transform .2s ease, background .2s ease;\n}\n.stats-shortcut:hover { transform: translateY(-2px); background: rgba(255,255,255,0.14); }\n.stats-page { align-items: stretch; min-height: 100vh; }\n.stats-header { position: sticky; top: 0; z-index: 30; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; background: rgba(20,16,61,.92); backdrop-filter: blur(14px); box-sizing: border-box; }\n.stats-header img { height: 38px; cursor: pointer; }\n.stats-header .btn { padding: 10px 22px; font-size: .95rem; }\n.stats-shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 46px 0 80px; display: block; }\n.stats-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }\n.stats-profile-title { display: flex; align-items: center; gap: 18px; }\n.stats-profile-title > img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-secondary); }\n.stats-profile-title span, .stats-section-heading span, .stats-modal-header span { color: #b494f8; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }\n.stats-profile-title h1 { margin: 3px 0 0; font-size: clamp(2rem, 5vw, 3rem); }\n.stats-storage-warning { background: rgba(255,124,44,.12); border: 1px solid rgba(255,124,44,.35); border-radius: 14px; padding: 14px 18px; margin-bottom: 22px; color: #f4e8df; line-height: 1.5; }\n.stats-storage-warning code { color: #fff; }\n.stats-metric-grid, .stats-global-summary { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 12px; }\n.stats-global-summary { grid-template-columns: repeat(4, minmax(0,1fr)); }\n.stats-metric-card { background: #1f1a48; border-radius: 16px; padding: 18px; min-width: 0; }\n.stats-metric-card span { color: #aaa; font-size: .78rem; display: block; margin-bottom: 8px; }\n.stats-metric-card strong { display: block; font-size: 1.55rem; color: #fff; overflow-wrap: anywhere; }\n.stats-metric-card small { display: block; color: #b8b5c8; margin-top: 6px; line-height: 1.3; }\n.stats-section { margin-top: 42px; }\n.stats-section-heading h2 { margin: 4px 0 18px; font-size: 1.6rem; }\n.stats-feature-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }\n.stats-feature-card { border-radius: 18px; padding: 22px; background: linear-gradient(135deg, rgba(194,47,164,.16), rgba(123,29,175,.10)), #1f1a48; }\n.stats-feature-card > span { color: #aaa; font-size: .82rem; display: block; }\n.stats-feature-card > strong { display: block; margin: 7px 0; font-size: 1.35rem; }\n.stats-feature-card small { color: #beb9d1; }\n.stats-two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n.stats-table-card, .stats-list-card { background: #1f1a48; border-radius: 18px; padding: 18px; min-width: 0; }\n.stats-table-card h3, .stats-list-card h3 { margin: 0 0 14px; color: #fff; font-size: 1rem; }\n.stats-performance-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 2px 16px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.06); }\n.stats-performance-row span { font-weight: 600; }\n.stats-performance-row strong { color: #b494f8; }\n.stats-performance-row small { grid-column: 1 / -1; color: #999; }\n.stats-list-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }\n.stats-global-lists { grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 14px; }\n.stats-list-row { display: flex; justify-content: space-between; gap: 14px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.06); }\n.stats-list-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #ddd; }\n.stats-list-row strong { flex-shrink: 0; color: #b494f8; font-size: .84rem; }\n.stats-empty, .stats-empty-state { color: #999; line-height: 1.5; }\n.stats-empty-state { background: #1f1a48; border-radius: 18px; padding: 24px; }\n.stats-loading { margin: auto; padding: 80px 20px; color: #aaa; }\n.stats-loading-small { padding: 26px 0; }\n.stats-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(7,5,28,.78); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }\n.stats-modal { width: min(820px,100%); max-height: min(780px,92vh); overflow-y: auto; background: #1f1a48; border-radius: 22px; padding: 24px; box-sizing: border-box; box-shadow: 0 20px 80px rgba(0,0,0,.45); }\n.stats-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }\n.stats-modal-header h2 { margin: 5px 0 18px; }\n.stats-close { border: 0; background: transparent; color: #fff; font-size: 30px; cursor: pointer; line-height: 1; }\n.stats-search-input { box-sizing: border-box; }\n.stats-player-results { display: grid; gap: 7px; margin-top: 12px; }\n.stats-player-results button, .stats-change-player { border: 0; border-radius: 10px; padding: 11px 14px; text-align: left; cursor: pointer; background: #292352; color: #fff; font-weight: 600; }\n.stats-change-player { margin: 12px 0; color: #b494f8; }\n.compare-heads { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 18px; margin: 22px 0; }\n.compare-heads > div { display: flex; align-items: center; gap: 10px; }\n.compare-heads > div:last-child { flex-direction: row-reverse; text-align: right; }\n.compare-heads img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }\n.compare-heads > span { color: #777; font-weight: 800; }\n.compare-metrics { background: #171335; border-radius: 16px; padding: 6px 16px; }\n.compare-metric-row { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 12px; text-align: center; padding: 11px 0; border-top: 1px solid rgba(255,255,255,.06); }\n.compare-metric-row:first-child { border-top: 0; }\n.compare-metric-row span { color: #aaa; font-size: .85rem; }\n.compare-best { color: #ff8e48; }\n.compare-terrain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }\n.compare-terrain-card { background: #292352; border-radius: 14px; padding: 15px; }\n.compare-terrain-card > span { color: #999; display: block; font-size: .78rem; }\n.compare-terrain-card > strong { display: block; font-size: 1.12rem; margin: 5px 0 10px; }\n.compare-terrain-card small { display: block; color: #ccc; margin-top: 4px; }\n.end-game-insights { width: 100%; display: grid; gap: 8px; margin: 2px 0 18px; }\n.end-game-insight { display: flex; align-items: flex-start; gap: 10px; background: #1e1a3a; border-radius: 10px; padding: 10px 12px; text-align: left; }\n.end-game-insight p { margin: 0; color: #ddd; font-size: .9rem; line-height: 1.35; }\n.end-game-insight-dot { width: 7px; height: 7px; border-radius: 50%; background: #b494f8; flex: 0 0 auto; margin-top: 5px; }\n@media (max-width: 950px) { .stats-metric-grid { grid-template-columns: repeat(3,1fr); } .stats-list-grid, .stats-global-lists { grid-template-columns: repeat(2,1fr); } }\n@media (max-width: 650px) { .stats-shell { width: min(100% - 24px,1180px); padding-top: 26px; } .stats-header { padding: 0 14px; } .stats-metric-grid, .stats-global-summary, .stats-feature-grid, .stats-two-columns, .stats-list-grid, .stats-global-lists, .compare-terrain-grid { grid-template-columns: 1fr; } .stats-profile-title > img { width: 58px; height: 58px; } .stats-modal { padding: 18px; } .compare-metric-row { grid-template-columns: .8fr 1.4fr .8fr; font-size: .9rem; } }\n`;
  write("src/App.css", s);
}

patchServer();
patchLanding();
patchGameFile("src/GamePage.js", false);
patchGameFile("src/GamePageEclair.js", true);
patchCss();
console.log("✅ Intégration stats et validation des réponses appliquée.");
