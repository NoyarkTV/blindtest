const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, 'utf8');
}

function replaceOnce(text, from, to, label) {
  const idx = text.indexOf(from);
  if (idx === -1) throw new Error(`Pattern introuvable: ${label}`);
  if (text.indexOf(from, idx + from.length) !== -1) throw new Error(`Pattern non unique: ${label}`);
  return text.slice(0, idx) + to + text.slice(idx + from.length);
}

function replaceAllChecked(text, from, to, label, min = 1) {
  const count = text.split(from).length - 1;
  if (count < min) throw new Error(`Pattern introuvable: ${label}`);
  return text.split(from).join(to);
}

function replaceBetween(text, start, end, replacement, label) {
  const a = text.indexOf(start);
  if (a === -1) throw new Error(`Début introuvable: ${label}`);
  const b = text.indexOf(end, a + start.length);
  if (b === -1) throw new Error(`Fin introuvable: ${label}`);
  return text.slice(0, a) + replacement + text.slice(b);
}

function patchServer() {
  let s = read('server/index.js');

  s = replaceOnce(
    s,
    'const alreadyPlayedUris = new Set();',
    'const alreadyPlayedUris = new Set();\nconst disconnectTimers = new Map();',
    'disconnect timers'
  );

  s = replaceOnce(
    s,
    'function getRoundPlayers(game) {\n  const players = Array.isArray(game?.players) ? game.players : [];\n  if (game?.config?.modeDiffusion) {\n    return players.filter(player => player.name !== game.admin);\n  }\n  return players;\n}',
    'function getRoundPlayers(game) {\n  const players = (Array.isArray(game?.players) ? game.players : []).filter(player => player.connected !== false);\n  if (game?.config?.modeDiffusion) {\n    return players.filter(player => player.name !== game.admin);\n  }\n  return players;\n}',
    'active round players'
  );

  s = replaceOnce(
    s,
    'games[id] = { id, admin, players, playersReady: [], currentBuzz: null, scores: players.map(player => ({ name: player.name, score: 0, photo: player.photo || "" })), roundResults: {} };',
    'games[id] = { id, admin, players: players.map(player => ({ ...player, connected: true })), playersReady: [], currentBuzz: null, scores: players.map(player => ({ name: player.name, score: 0, photo: player.photo || "" })), roundResults: {}, started: false };',
    'create game presence'
  );

  s = replaceOnce(
    s,
    '    currentBuzz: null,\n    roundResults: {}\n  };',
    '    currentBuzz: null,\n    roundResults: {},\n    started: true\n  };',
    'start game started flag'
  );

  const oldCategory = '    const matchCategorie = categories.some(cat =>\n      (track.categorie || "").split(",").map(c => c.trim()).includes(cat)\n    );';
  const newCategory = '    const matchCategorie = categories.length === 0 || categories.some(cat =>\n      (track.categorie || "").split(",").map(c => c.trim()).includes(cat)\n    );';
  s = replaceAllChecked(s, oldCategory, newCategory, 'empty categories = all', 2);

  s = replaceOnce(
    s,
    '  // 2. Exclusion des déjà jouées\n  let notPlayed = tracks.filter(t => !alreadyPlayedUris.has(t.uri));',
    '  if (tracks.length < nbRounds) {\n    return res.status(400).send({\n      error: `Seulement ${tracks.length} morceau(x) disponible(s) avec ces filtres pour ${nbRounds} round(s).`\n    });\n  }\n\n  // 2. Exclusion des déjà jouées\n  let notPlayed = tracks.filter(t => !alreadyPlayedUris.has(t.uri));',
    'reject oversized filtered playlist'
  );

  s = replaceOnce(
    s,
    '    const remaining = fisherYatesShuffle(allTracks).filter(t =>',
    '    const remaining = fisherYatesShuffle(tracks).filter(t =>',
    'completion stays in filters'
  );

  s = replaceOnce(
    s,
    '  console.log(`✅ Playlist générée (${enrichedTracks.length}/${nbRounds})`);\n  res.send({ playlist: enrichedTracks });',
    '  if (enrichedTracks.length < nbRounds) {\n    return res.status(400).send({\n      error: `Impossible de générer ${nbRounds} round(s) sans sortir des filtres sélectionnés.`\n    });\n  }\n\n  console.log(`✅ Playlist générée (${enrichedTracks.length}/${nbRounds})`);\n  res.send({ playlist: enrichedTracks });',
    'final filtered playlist guard'
  );

  s = replaceBetween(
    s,
    'app.get("/game/:id",',
    '\n\napp.post("/submit-score",',
    `app.get("/game/:id", (req, res) => {\n  const { id } = req.params;\n  const game = games[id];\n\n  if (!game) {\n    return res.status(404).json({ error: "Partie introuvable" });\n  }\n\n  const activePlayers = getRoundPlayers(game);\n  const activeNames = new Set(activePlayers.map(player => player.name));\n  const activeReady = (Array.isArray(game.playersReady) ? game.playersReady : []).filter(name => activeNames.has(name));\n\n  res.json({\n    players: game.players || [],\n    scores: syncGameScores(game),\n    playersReady: activeReady,\n    roundResults: game.roundResults || {},\n    activePlayerCount: activePlayers.length,\n    started: Boolean(game.started)\n  });\n});`,
    'game state for reconnect'
  );

  s = replaceBetween(
    s,
    'app.post("/join-game",',
    '\n\napp.post("/leave-game",',
    `app.post("/join-game", (req, res) => {\n  const { id, player } = req.body;\n  const game = games[id];\n  if (!game) return res.status(404).send({ error: "Partie introuvable" });\n  if (!player?.name) return res.status(400).send({ error: "Joueur invalide" });\n\n  const existingPlayer = game.players.find(p => p.name === player.name);\n\n  if (game.started && !existingPlayer) {\n    return res.status(409).send({ error: "La partie a déjà commencé" });\n  }\n\n  if (!existingPlayer) {\n    game.players.push({ ...player, connected: true });\n    io.to(id).emit("player-joined", game.players);\n  } else {\n    existingPlayer.connected = true;\n    if (player.photo) existingPlayer.photo = player.photo;\n  }\n\n  const fullScores = syncGameScores(game);\n  io.to(id).emit("score-update", fullScores);\n  emitReadyState(id);\n  res.send({ success: true, rejoined: Boolean(existingPlayer) });\n});`,
    'late join protection'
  );

  s = replaceOnce(
    s,
    '  game.playersReady = (Array.isArray(game.playersReady) ? game.playersReady : []).filter(name => activeNames.has(name));\n\n  const scoreMap = new Map(syncGameScores(game).map(entry => [entry.name, entry]));\n  const roundResults = game.roundResults || {};\n  const readyDetails = game.playersReady.map(name => {',
    '  const activeReadyNames = (Array.isArray(game.playersReady) ? game.playersReady : []).filter(name => activeNames.has(name));\n\n  const scoreMap = new Map(syncGameScores(game).map(entry => [entry.name, entry]));\n  const roundResults = game.roundResults || {};\n  const readyDetails = activeReadyNames.map(name => {',
    'ready active details'
  );

  s = replaceOnce(
    s,
    '    ready: game.playersReady.length,\n    total: activePlayers.length,',
    '    ready: activeReadyNames.length,\n    total: activePlayers.length,',
    'ready active count'
  );

  s = replaceOnce(
    s,
    '  const activePlayers = getRoundPlayers(game);\n  const readyCount = Array.isArray(game.playersReady) ? game.playersReady.length : 0;\n  if (readyCount < activePlayers.length) {',
    '  const activePlayers = getRoundPlayers(game);\n  const activeNames = new Set(activePlayers.map(player => player.name));\n  const readyCount = (Array.isArray(game.playersReady) ? game.playersReady : []).filter(name => activeNames.has(name)).length;\n  if (readyCount < activePlayers.length) {',
    'next round active ready count'
  );

  s = replaceOnce(
    s,
    '  if (game.playersReady.length === activePlayers.length) {\n    io.to(roomId).emit("all-ready");\n  }',
    '  const activeNames = new Set(activePlayers.map(player => player.name));\n  const activeReadyCount = game.playersReady.filter(name => activeNames.has(name)).length;\n  if (activeReadyCount === activePlayers.length) {\n    io.to(roomId).emit("all-ready");\n  }',
    'player ready active count'
  );

  s = replaceOnce(
    s,
    '    socket.join(roomId);\n    console.log(`🧩 Socket ${socket.id} a rejoint la room ${roomId}`);',
    `    socket.join(roomId);\n    socket.data.roomId = roomId;\n    socket.data.playerName = playerName || null;\n\n    if (playerName && games[roomId]) {\n      const key = \`${'${roomId}'}::${'${playerName}'}\`;\n      const pending = disconnectTimers.get(key);\n      if (pending) {\n        clearTimeout(pending);\n        disconnectTimers.delete(key);\n      }\n\n      const player = games[roomId].players?.find(p => p.name === playerName);\n      if (player) {\n        player.connected = true;\n        emitReadyState(roomId);\n      }\n    }\n\n    console.log(\`🧩 Socket ${'${socket.id}'} a rejoint la room ${'${roomId}'}\`);`,
    'socket presence join'
  );

  s = replaceOnce(
    s,
    '  socket.on("timer-ended", ({ roomId }) => {\n    if (!roomId) return;\n    console.log(`⏱️ Timer écoulé pour room ${roomId}`);\n    io.to(roomId).emit("round-ended");\n  });\n});',
    `  socket.on("timer-ended", ({ roomId }) => {\n    if (!roomId) return;\n    console.log(\`⏱️ Timer écoulé pour room ${'${roomId}'}\`);\n    io.to(roomId).emit("round-ended");\n  });\n\n  socket.on("disconnect", () => {\n    const roomId = socket.data.roomId;\n    const playerName = socket.data.playerName;\n    if (!roomId || !playerName || !games[roomId]) return;\n\n    const key = \`${'${roomId}'}::${'${playerName}'}\`;\n    const previous = disconnectTimers.get(key);\n    if (previous) clearTimeout(previous);\n\n    const timer = setTimeout(() => {\n      const game = games[roomId];\n      if (!game) return;\n      const player = game.players?.find(p => p.name === playerName);\n      if (!player) return;\n\n      player.connected = false;\n      disconnectTimers.delete(key);\n      console.log(\`👋 ${'${playerName}'} considéré déconnecté de ${'${roomId}'}\`);\n      emitReadyState(roomId);\n    }, 10000);\n\n    disconnectTimers.set(key, timer);\n  });\n});`,
    'disconnect grace period'
  );

  s = replaceOnce(
    s,
    '    bestResponseTime,\n    totalScore\n  } = req.body;',
    '    bestResponseTime,\n    totalScore,\n    responseCount\n  } = req.body;',
    'stats response count destructure'
  );

  s = replaceOnce(
    s,
    '      cumulativeResponseTime: 0,\n      bestResponseTime: null,\n      totalScore: 0',
    '      cumulativeResponseTime: 0,\n      timedResponses: 0,\n      bestResponseTime: null,\n      totalScore: 0',
    'stats timed response field'
  );

  s = replaceOnce(
    s,
    '  profile.gamesPlayed += 1;\n  profile.totalRoundsPlayed += roundsPlayed;\n  profile.totalRoundsWon += roundsWon;\n  profile.cumulativeResponseTime += averageResponseTime * roundsPlayed;\n  profile.totalScore += totalScore;\n\n  if (profile.bestResponseTime === null || bestResponseTime < profile.bestResponseTime) {\n    profile.bestResponseTime = bestResponseTime;\n  }',
    `  profile.gamesPlayed += 1;\n  profile.totalRoundsPlayed += Number(roundsPlayed) || 0;\n  profile.totalRoundsWon += Number(roundsWon) || 0;\n  profile.totalScore += Number(totalScore) || 0;\n\n  if (!Number.isFinite(profile.timedResponses)) profile.timedResponses = 0;\n  const safeResponseCount = Math.max(0, Number(responseCount) || 0);\n  const safeAverage = Number(averageResponseTime);\n  if (safeResponseCount > 0 && Number.isFinite(safeAverage)) {\n    profile.cumulativeResponseTime += safeAverage * safeResponseCount;\n    profile.timedResponses += safeResponseCount;\n  }\n\n  const safeBest = Number(bestResponseTime);\n  if (Number.isFinite(safeBest) && safeBest >= 0 && (profile.bestResponseTime === null || safeBest < profile.bestResponseTime)) {\n    profile.bestResponseTime = safeBest;\n  }`,
    'safe stats aggregation'
  );

  write('server/index.js', s);
}

function patchConfig() {
  let s = read('src/ConfigPage.js');

  s = replaceOnce(
    s,
    'const validerPartie = () => {\n  const params = {',
    `const validerPartie = () => {\n  if (filteredCount === 0 || nbRounds < 1 || nbRounds > filteredCount) {\n    alert(\`Impossible de lancer ${'${nbRounds}'} round(s) : ${'${filteredCount}'} morceau(x) disponible(s) avec ces filtres.\`);\n    return;\n  }\n\n  const params = {`,
    'config launch guard'
  );

  s = replaceOnce(
    s,
    '  fetch("https://blindtest-69h7.onrender.com/generate-playlist", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ filters, nbRounds })\n  })\n    .then(res => res.json())',
    `  fetch("https://blindtest-69h7.onrender.com/generate-playlist", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ filters, nbRounds })\n  })\n    .then(async res => {\n      const data = await res.json();\n      if (!res.ok) throw new Error(data.error || "Impossible de générer la playlist");\n      return data;\n    })`,
    'config playlist server error'
  );

  s = replaceOnce(
    s,
    '              onChange={e => setNbRounds(+e.target.value)}',
    '              onChange={e => setNbRounds(Math.max(1, Math.min(+e.target.value || 1, Math.max(filteredCount, 1))))}',
    'round count clamp'
  );

  s = replaceOnce(
    s,
    '<button className="btn btn-confirm" style={{ flex: 1 }} onClick={validerPartie}>Lancer la partie</button>',
    '<button className="btn btn-confirm" style={{ flex: 1 }} onClick={validerPartie} disabled={filteredCount === 0 || nbRounds < 1 || nbRounds > filteredCount}>Lancer la partie</button>',
    'disable invalid launch'
  );

  write('src/ConfigPage.js', s);
}

function patchRoom() {
  let s = read('src/RoomPage.js');
  s = replaceOnce(
    s,
    `  fetch("https://blindtest-69h7.onrender.com/join-game", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ id, player })\n  }).then(() => {\n    fetch(\`https://blindtest-69h7.onrender.com/game/${'${id}'}\`)`,
    `  fetch("https://blindtest-69h7.onrender.com/join-game", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ id, player })\n  }).then(async res => {\n    if (res.status === 409) {\n      alert("Cette partie a déjà commencé.");\n      navigate("/");\n      return null;\n    }\n    if (!res.ok) throw new Error("Impossible de rejoindre la partie");\n    return fetch(\`https://blindtest-69h7.onrender.com/game/${'${id}'}\`);\n  }).then(res => {\n    if (!res) return null;\n    return res.json();\n  }).then(data => {\n    if (!data) return;\n    setPlayers(data.players || []);\n    setGame(data);\n  }).catch(err => {\n    console.error("Erreur pour rejoindre la partie :", err);\n    navigate("/");\n  });\n  /* legacy-chain-removed */\n  if (false) {\n    fetch(\`https://blindtest-69h7.onrender.com/game/${'${id}'}\`)`,
    'room late join handling'
  );

  s = replaceOnce(
    s,
    `      .then(res => res.json())\n      .then(data => {\n        setPlayers(data.players || []);\n        setGame(data);\n      });\n  });\n}, [id, playerName]);`,
    `      .then(res => res.json())\n      .then(data => {\n        setPlayers(data.players || []);\n        setGame(data);\n      });\n  }\n}, [id, playerName, navigate]);`,
    'remove old room chain safely'
  );

  s = s.replace(/\n  \/\* legacy-chain-removed \*\/\n  if \(false\) \{[\s\S]*?\n  \}\n\}, \[id, playerName, navigate\]\);/, '\n}, [id, playerName, navigate]);

  write('src/RoomPage.js', s);
}

function patchGameFile(rel, isEclair) {
  let s = read(rel);

  s = replaceOnce(
    s,
    '  const [playersReady, setPlayersReady] = useState(0);',
    '  const [playersReady, setPlayersReady] = useState(0);\n  const [playersTotal, setPlayersTotal] = useState(0);',
    `${rel} player total state`
  );

  s = replaceOnce(
    s,
    '        setPlayers(rawPlayers);',
    '        setPlayers(rawPlayers);\n        setPlayersTotal(data.activePlayerCount ?? rawPlayers.length);',
    `${rel} initial player total`
  );

  s = replaceOnce(
    s,
    '              console.log("✅ Scoreboard final fusionné :", updatedScoreboard);\n              setScoreboard(updatedScoreboard);',
    `              console.log("✅ Scoreboard final fusionné :", updatedScoreboard);\n              setScoreboard(updatedScoreboard);\n\n              const ownScore = scores.find(p => p.name === localPlayer);\n              if (ownScore) setScore(Number(ownScore.score) || 0);\n\n              const readyNames = Array.isArray(data.playersReady) ? data.playersReady : [];\n              setPlayersReady(readyNames.length);\n              setPlayersTotal(data.activePlayerCount ?? rawPlayers.length);\n              if (readyNames.includes(localPlayer)) {\n                roundEndedRef.current = true;\n                setIsTimerRunning(false);\n                const detail = data.roundResults?.[localPlayer];\n                const previousScore = Number(detail?.previousScore) || 0;\n                const gained = Math.max(0, (Number(ownScore?.score) || 0) - previousScore);\n                setPopupInfo({\n                  title: "Réponse déjà enregistrée",\n                  points: \`+${'${gained}'} point${'${gained > 1 ? "s" : ""}'}\`,\n                  responseTime: detail?.responseTime && detail.responseTime !== "-" ? \`${'${detail.responseTime}'} sec\` : null,\n                  theme: "", titre: "", annee: "", compositeur: "", image: null\n                });\n                setShowPopup(true);\n              }`,
    `${rel} restore score and round state`
  );

  s = replaceOnce(
    s,
    '  socket.on("players-ready-update", ({ ready, total, players }) => {\n    setPlayersReady(ready);',
    '  socket.on("players-ready-update", ({ ready, total, players }) => {\n    setPlayersReady(ready);\n    setPlayersTotal(total);',
    `${rel} ready total updates`
  );

  s = replaceAllChecked(
    s,
    'playersReady < players.length',
    'playersReady < (playersTotal || players.length)',
    `${rel} wait active players`,
    1
  );

  s = replaceAllChecked(
    s,
    '{playersReady} / {players.length}',
    '{playersReady} / {playersTotal || players.length}',
    `${rel} active denominator`,
    1
  );

  s = replaceOnce(
    s,
    'const handleValidate = () => {',
    'const handleValidate = () => {\n  if (roundEndedRef.current) return;',
    `${rel} no double answer after reconnect`
  );

  if (!isEclair) {
    s = replaceOnce(
      s,
      'const handleBuzz = () => {\n    pausedTimeRef.current = timeLeftRef.current;',
      'const handleBuzz = () => {\n    if (roundEndedRef.current) return;\n    pausedTimeRef.current = timeLeftRef.current;',
      'normal game no buzz after answered'
    );
  }

  s = replaceOnce(
    s,
    '        totalScore: scoreRef.current\n      })',
    '        totalScore: scoreRef.current,\n        responseCount: responseTimesRef.current.length\n      })',
    `${rel} stats response count`
  );

  if (isEclair) {
    s = replaceOnce(
      s,
      '  roundEndedRef.current = true;\n  setShowPopup(true);',
      '  roundEndedRef.current = true;\n  if (isCorrect) setRoundsWon(prev => prev + 1);\n  setShowPopup(true);',
      'eclair rounds won'
    );
  }

  write(rel, s);
}

function patchLanding() {
  let s = read('src/LandingPage.js');
  s = replaceOnce(
    s,
    'Temps moyen : {playerStats?.totalRoundsPlayed > 0 ? (playerStats.cumulativeResponseTime / playerStats.totalRoundsPlayed).toFixed(2) : "--"} sec',
    'Temps moyen : {(playerStats?.timedResponses ?? playerStats?.totalRoundsPlayed ?? 0) > 0 ? (playerStats.cumulativeResponseTime / (playerStats.timedResponses ?? playerStats.totalRoundsPlayed)).toFixed(2) : "--"} sec',
    'landing timed response average'
  );
  write('src/LandingPage.js', s);
}

function patchSpotifyPlayer() {
  const content = `import { useEffect, useRef } from "react";\n\nfunction SpotifyPlayer({ token, onReady, onError }) {\n  const playerRef = useRef(null);\n\n  useEffect(() => {\n    if (!token) return;\n    let cancelled = false;\n\n    const reportError = (error) => {\n      if (typeof onError === "function") onError(error);\n      else console.error("❌ Spotify Player :", error);\n    };\n\n    const initializePlayer = () => {\n      if (cancelled || !window.Spotify || playerRef.current) return;\n\n      const player = new window.Spotify.Player({\n        name: "Blindtest Player",\n        getOAuthToken: cb => cb(token),\n        volume: 0.5\n      });\n\n      player.addListener("ready", ({ device_id }) => {\n        if (cancelled) return;\n        console.log("✅ SDK prêt avec device_id :", device_id);\n        fetch("https://api.spotify.com/v1/me/player", {\n          method: "PUT",\n          headers: {\n            Authorization: \`Bearer ${'${token}'}\`,\n            "Content-Type": "application/json"\n          },\n          body: JSON.stringify({ device_ids: [device_id], play: false })\n        })\n          .then(() => {\n            console.log("📡 Transfert vers Web Playback effectué");\n            setTimeout(() => {\n              if (!cancelled && typeof onReady === "function") onReady(device_id);\n            }, 1000);\n          })\n          .catch(reportError);\n      });\n\n      player.addListener("initialization_error", ({ message }) => reportError(message));\n      player.addListener("authentication_error", ({ message }) => reportError(message));\n      player.addListener("account_error", ({ message }) => reportError(message));\n      player.addListener("playback_error", ({ message }) => reportError(message));\n\n      player.connect();\n      playerRef.current = player;\n    };\n\n    if (window.Spotify) {\n      initializePlayer();\n    } else {\n      window.onSpotifyWebPlaybackSDKReady = initializePlayer;\n      if (!document.getElementById("spotify-sdk")) {\n        const script = document.createElement("script");\n        script.id = "spotify-sdk";\n        script.src = "https://sdk.scdn.co/spotify-player.js";\n        script.async = true;\n        document.body.appendChild(script);\n      }\n    }\n\n    return () => {\n      cancelled = true;\n      if (window.onSpotifyWebPlaybackSDKReady === initializePlayer) {\n        delete window.onSpotifyWebPlaybackSDKReady;\n      }\n      if (playerRef.current) {\n        playerRef.current.disconnect();\n        playerRef.current = null;\n      }\n    };\n  }, [token, onReady, onError]);\n\n  return null;\n}\n\nexport default SpotifyPlayer;\n`;
  write('src/SpotifyPlayer.js', content);
}

patchServer();
patchConfig();
patchRoom();
patchGameFile('src/GamePage.js', false);
patchGameFile('src/GamePageEclair.js', true);
patchLanding();
patchSpotifyPlayer();

console.log('✅ Correctifs haute priorité appliqués sans modifier la logique de démarrage multiple des pistes ni le calcul des indices.');
