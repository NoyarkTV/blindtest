require("dotenv").config();
const express = require("express");
const axios = require("axios");
const open = (...args) => import('open').then(mod => mod.default(...args));
let storedAccessToken = null;
let storedRefreshToken = null;
let ready = false;
let playerProfiles = {};
const adjectives = [
  "Groovy", "Sneaky", "Witty", "Epic", "Cheesy", "Cosmic", "Rebel", "Jazzy", "Funky", "Classy",
  "Legendary", "Wild", "Bizarre", "Electric", "Savage", "Majestic", "Spooky", "Shiny", "Vibrant", "Zany",
  "Grumpy", "Lucky", "Chill", "Psychedelic", "Melodic", "Sassy", "Retro", "Flashy", "Crazy", "Trendy",
  "Smooth", "Loyal", "Furious", "Bold", "Charming", "Nostalgic", "Offbeat", "Dreamy", "Loud", "Magnetic"
];

const nouns = [
  "Vader", "Leia", "Yoda", "Luke", "Han", "Chewbacca", "Kylo", "Rey", "Palpatine", "ObiWan",
  "Gandalf", "Frodo", "Aragorn", "Legolas", "Gollum", "Bilbo", "Galadriel", "Thorin", "Sauron", "Elrond",
  "Harry", "Hermione", "Ron", "Dumbledore", "Snape", "Voldemort", "Draco", "Neville", "Sirius", "Luna",
  "Neo", "Trinity", "Morpheus", "Smith", "Oracle",
  "Ironman", "Thor", "Hulk", "Spiderman", "BlackWidow", "DoctorStrange", "Loki", "ScarletWitch", "Vision", "AntMan",
  "Batman", "Joker", "Harley", "Superman", "Flash", "WonderWoman", "Aquaman", "GreenLantern", "Catwoman", "Riddler",
  "Indiana", "Bond", "Ripley", "SarahConnor", "Forrest", "Rocky", "Drago", "Maximus", "Marty", "Doc",
  "Ferris", "Jules", "Vincent", "TonyMontana", "Tyler", "TheDude", "Clarice", "Hannibal", "Shrek", "Donkey",
  "Po", "Tigress", "Hiccup", "Toothless", "JackSparrow", "WillTurner", "Elizabeth", "DavyJones", "Beetlejuice", "Edward",
  "Arya", "Jon", "Tyrion", "Daenerys", "Cersei", "Brienne", "Jaime", "Hodor", "Littlefinger", "Varys",
  "Walter", "Jesse", "Saul", "Gus", "Hank", "Skyler", "Mike", "Jane", "Tuco", "Badger",
  "Eleven", "Mike", "Dustin", "Lucas", "Will", "Max", "Hopper", "Joyce", "Steve", "Robin",
  "Dexter", "Debra", "Doakes", "Masuka", "TrinityKiller",
  "Sheldon", "Leonard", "Penny", "Howard", "Raj",
  "Barney", "Ted", "Marshall", "Robin", "Lily",
  "Rick", "Morty", "Summer", "Jerry", "Beth",
  "Mario", "Luigi", "Link", "Zelda", "Ganondorf", "Kratos", "Lara", "MasterChief", "Samus", "Geralt",
  "Cloud", "Tifa", "Sephiroth", "Sonic", "Knuckles", "Tails", "DonkeyKong", "Kirby", "FoxMcCloud", "Falco",
  "Pikachu", "Charizard", "Mewtwo", "Eevee", "Ash", "Red", "ChunLi", "Ryu", "Ken", "Blanka",
  "PacMan", "MegaMan", "Bomberman", "SimonBelmont", "Alucard", "Doomguy", "Arthur", "DukeNukem", "Scorpion", "SubZero",
  "Simba", "Nala", "Mufasa", "Scar", "Aladdin", "Jasmine", "Genie", "Jafar", "Belle", "Beast",
  "Ariel", "Ursula", "Eric", "Hercules", "Megara", "Hades", "Tarzan", "Jane", "Mulan", "ShanYu",
  "Elsa", "Anna", "Olaf", "Kristoff", "Buzz", "Woody", "Jessie", "Lotso", "Remy", "Linguini",
  "WallE", "EVE", "Lightning", "Mater", "Sully", "Mike", "Boo", "MrIncredible", "Elastigirl", "JackJack",
  "Godzilla", "KingKong", "GLaDOS", "Wheatley", "MasterRoshi", "Goku", "Vegeta", "Piccolo", "Naruto", "Sasuke",
  "Luffy", "Zoro", "Nami", "Sanji", "Chopper", "Dio", "Jotaro", "Spike", "Faye", "Ed"
];

const app = express();
app.use(express.json());


const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const games = {};
const alreadyPlayedUris = new Set();

function buildScoreboard(game) {
  if (!game) return [];
  const scoreMap = new Map(
    (Array.isArray(game.scores) ? game.scores : []).map(entry => [entry.name, entry])
  );

  return (Array.isArray(game.players) ? game.players : []).map(player => {
    const stored = scoreMap.get(player.name);
    return {
      name: player.name,
      score: Number(stored?.score) || 0,
      photo: player.photo || stored?.photo || ""
    };
  });
}

function syncGameScores(game) {
  if (!game) return [];
  game.scores = buildScoreboard(game);
  return game.scores;
}

function getRoundPlayers(game) {
  const players = Array.isArray(game?.players) ? game.players : [];
  if (game?.config?.modeDiffusion) {
    return players.filter(player => player.name !== game.admin);
  }
  return players;
}

const fs = require("fs");
const path = require("path");

const STATS_FOLDER = path.join(__dirname, "data");
const STATS_FILE = path.join(STATS_FOLDER, "profiles.json");

// Crée le dossier s'il n'existe pas
if (!fs.existsSync(STATS_FOLDER)) {
  fs.mkdirSync(STATS_FOLDER);
  console.log("📁 Dossier 'data' créé.");
}

// Crée un fichier vide s'il n'existe pas
if (!fs.existsSync(STATS_FILE)) {
  fs.writeFileSync(STATS_FILE, "{}");
  console.log("📄 Fichier 'profiles.json' créé vide.");
}

// Chargement à l'ouverture
if (fs.existsSync(STATS_FILE)) {
  try {
    playerProfiles = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
    console.log("📂 Profils rechargés depuis le fichier.");
  } catch (err) {
    console.error("❌ Erreur de lecture du fichier de profils :", err);
  }
}

// Fonction de sauvegarde
function saveProfilesToFile() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(playerProfiles, null, 2));
    console.log("💾 Profils sauvegardés.");
  } catch (err) {
    console.error("❌ Erreur lors de la sauvegarde des profils :", err);
  }
}

const cors = require("cors");
app.use(cors({
  origin: "https://blindtest-1.onrender.com"
}));

app.get("/login", (req, res) => {
  const scope = [
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "streaming"
  ].join(" ");

  const authURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

  // ✅ Redirection vers Spotify dans le navigateur de l'utilisateur
  res.redirect(authURL);
});

app.post("/create-game", (req, res) => {
  console.log("🎯 Reçu :", req.body);

  const { id, admin, players } = req.body;

  if (!id || !admin || !Array.isArray(players)) {
    return res.status(400).send({ error: "Champs manquants" });
  }

  // Stockage en mémoire (ou en DB plus tard)
  games[id] = { id, admin, players, playersReady: [], currentBuzz: null, scores: players.map(player => ({ name: player.name, score: 0, photo: player.photo || "" })), roundResults: {} };

  console.log("✅ Partie créée :", games[id]);

  res.status(201).send({ success: true });
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code,
        redirect_uri,
        grant_type: "authorization_code",
        client_id,
        client_secret
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const { access_token, refresh_token } = response.data;

    storedAccessToken = access_token;
    storedRefreshToken = refresh_token;
    res.redirect(`https://blindtest-1.onrender.com/?access_token=${access_token}`);
    console.log("Access token :", access_token);
    console.log("Refresh token :", refresh_token);
  } catch (err) {
    console.error("Erreur callback :", err.response?.data || err);
    res.send("❌ Erreur lors de l'autorisation.");
  }
});

app.get("/get-token", async (req, res) => {
  if (!storedAccessToken && storedRefreshToken) {
    // Essaye de rafraîchir le token automatiquement
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: storedRefreshToken,
          client_id,
          client_secret
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      storedAccessToken = response.data.access_token;
      console.log("🔁 Token Spotify rafraîchi automatiquement.");
    } catch (err) {
      console.error("❌ Échec du refresh token :", err.response?.data || err);
      return res.status(401).json({ error: "Échec du rafraîchissement du token" });
    }
  }

  if (!storedAccessToken) {
    return res.status(401).json({ error: "Non connecté à Spotify" });
  }

  res.json({ access_token: storedAccessToken });
});


app.get("/random-track", async (req, res) => {
  if (!ready) return res.status(503).send("Serveur pas encore prêt");
  if (!filteredTracks.length) return res.status(500).send("Aucune piste filtrée");

  const track = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
  const image = await fetchSpotifyImage(track.uri, storedAccessToken);

  res.json({ ...track, image });
});


app.post("/set-filters", (req, res) => {
  const {
    media, categories, difficulte, pays,
    anneeMin, anneeMax
  } = req.body;

  filteredTracks = allTracks.filter(track => {
    const matchMedia = media.includes(track.media);
    const matchDifficulte = difficulte.includes(track.difficulte);
    const matchPays = pays.includes(track.pays);
    const matchAnnee = track.annee >= anneeMin && track.annee <= anneeMax;
    const matchCategorie = categories.some(cat =>
      (track.categorie || "").split(",").map(c => c.trim()).includes(cat)
    );

    return matchMedia && matchDifficulte && matchPays && matchAnnee && matchCategorie;
  });

  ready = true; // ✅ Le serveur peut maintenant répondre à /random-track

  console.log(`✅ ${filteredTracks.length} musiques sélectionnées avec filtres.`);
  res.json({ ok: true });
});

app.post("/start-game", (req, res) => {
  const { id, params, playlist, admin } = req.body;

  if (!id || !Array.isArray(playlist)) {
    return res.status(400).send({ error: "Requête invalide" });
  }

  games[id] = {
    ...(games[id] || {}),
    config: params,
    playlist: playlist,
    currentRound: 1,
    nbRounds: playlist.length,
    playersReady: [],
    admin,
    currentBuzz: null,
    roundResults: {}
  };
  syncGameScores(games[id]);

  io.to(id).emit("game-started", {
    playlist: playlist.map((track, i) => ({ index: i + 1, ...track })),
    nbRounds: playlist.length,
    config: params
  });

  console.log(`🎬 Partie ${id} lancée avec ${playlist.length} morceaux (exclusion active)`);
  console.log("📦 Paramètres de la partie :", params);

  res.status(200).send({ success: true });
});

app.get("/game-info/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json({
    params: {
      ...game.config,
      admin: game.admin // 🔁 on ajoute l'admin dans params
    },
    playlist: game.playlist,
    currentRound: game.currentRound || 1,
    nbRounds: game.nbRounds || (game.playlist?.length ?? 0)
  });
});

function fisherYatesShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomSagaTrack(sagaName) {
  const sagaOptions = sagaTracks.filter(t => t.saga === sagaName);
  if (sagaOptions.length === 0) return null;
  const picked = sagaOptions[Math.floor(Math.random() * sagaOptions.length)];
  console.log(`🎬 Saga "${sagaName}" → ${picked.titre}`);
  return picked;
}

app.post("/generate-playlist", (req, res) => {
  const { filters, nbRounds } = req.body;

  if (!filters || !nbRounds || !Array.isArray(allTracks)) {
    return res.status(400).send({ error: "Requête invalide ou données manquantes" });
  }

  const {
    media = [],
    categories = [],
    difficulte = [],
    pays = [],
    anneeMin = 0,
    anneeMax = 3000
  } = filters;

  // 1. Filtrage initial
  let tracks = allTracks.filter(track => {
    const matchMedia = media.includes(track.media);
    const matchDifficulte = difficulte.includes(track.difficulte);
    const matchPays = pays.includes(track.pays);
    const matchAnnee = track.annee >= anneeMin && track.annee <= anneeMax;
    const matchCategorie = categories.some(cat =>
      (track.categorie || "").split(",").map(c => c.trim()).includes(cat)
    );
    return matchMedia && matchDifficulte && matchPays && matchAnnee && matchCategorie;
  });

  // 2. Exclusion des déjà jouées
  let notPlayed = tracks.filter(t => !alreadyPlayedUris.has(t.uri));

  // 3. Si trop peu, reset mémoire
  if (notPlayed.length < nbRounds) {
    console.log("🔁 Trop peu de morceaux disponibles, réinitialisation de la mémoire");
    alreadyPlayedUris.clear();
    notPlayed = tracks;
  }

  // 4. Shuffle local
  const shuffled = fisherYatesShuffle(notPlayed);

  // 5. Préparer la playlist avec gestion des sagas et morceaux normaux
  const enrichedTracks = [];

  for (let i = 0; i < shuffled.length && enrichedTracks.length < nbRounds; i++) {
    const track = shuffled[i];

    if (!track.uri?.startsWith("spotify:track:")) {
      const sagaTrack = getRandomSagaTrack(track.uri?.trim());
      if (sagaTrack) {
        enrichedTracks.push({
          ...sagaTrack,
          media: track.media,
          categorie: track.categorie,
          difficulte: track.difficulte,
          pays: track.pays,
          saga: track.uri,
          image: sagaTrack.image || null
        });
        alreadyPlayedUris.add(sagaTrack.uri);
      } else {
        console.warn(`⚠️ Saga introuvable : ${track.uri}`);
      }
    } else {
      // ✅ morceaux normaux ajoutés ici
      enrichedTracks.push({ ...track, image: track.image || null });
      alreadyPlayedUris.add(track.uri);
    }
  }

  // 6. Complétion si nécessaire
  if (enrichedTracks.length < nbRounds) {
    const remaining = fisherYatesShuffle(allTracks).filter(t =>
      !enrichedTracks.some(et => et.uri === t.uri) &&
      t.uri?.startsWith("spotify:track:")
    );
    for (let i = 0; i < remaining.length && enrichedTracks.length < nbRounds; i++) {
      enrichedTracks.push({ ...remaining[i], image: remaining[i].image || null });
      alreadyPlayedUris.add(remaining[i].uri);
    }
  }

  console.log(`✅ Playlist générée (${enrichedTracks.length}/${nbRounds})`);
  res.send({ playlist: enrichedTracks });
});

app.get("/game/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({ error: "Partie introuvable" });
  }

  res.json({
    players: game.players || [],
    scores: syncGameScores(game)
  });
});


app.post("/submit-score", (req, res) => {
  const { id, player, score } = req.body;
  const game = games[id];
  if (!game) return res.status(404).send({ error: "Partie introuvable" });

  if (!Array.isArray(game.scores)) game.scores = [];

  const playerInfo = (game.players || []).find(p => p.name === player);
  let existing = game.scores.find(s => s.name === player);
  if (!existing) {
    existing = { name: player, score: 0, photo: playerInfo?.photo || "" };
    game.scores.push(existing);
  }

  existing.score = Number(score) || 0;
  if (playerInfo?.photo) existing.photo = playerInfo.photo;

  const fullScores = syncGameScores(game);
  io.to(id).emit("score-update", fullScores);

  if (Array.isArray(game.playersReady) && game.playersReady.includes(player)) {
    emitReadyState(id);
  }

  res.send({ success: true, scores: fullScores });
});

app.post("/join-game", (req, res) => {
  const { id, player } = req.body;
  const game = games[id];
  if (!game) return res.status(404).send({ error: "Partie introuvable" });

  const existingPlayer = game.players.find(p => p.name === player.name);
  if (!existingPlayer) {
    game.players.push(player);
    io.to(id).emit("player-joined", game.players);
  } else if (player.photo) {
    existingPlayer.photo = player.photo;
  }

  const fullScores = syncGameScores(game);
  io.to(id).emit("score-update", fullScores);
  res.send({ success: true });
});

app.post("/leave-game", (req, res) => {
  const { id, playerName } = req.body;
  const game = games[id];
  if (!game) return res.status(404).send({ error: "Partie introuvable" });

  const before = game.players.length;
  game.players = game.players.filter(p => p.name !== playerName);
  if (Array.isArray(game.playersReady)) {
    game.playersReady = game.playersReady.filter(n => n !== playerName);
  }
  if (game.roundResults) delete game.roundResults[playerName];

  if (game.players.length !== before) {
    io.to(id).emit("player-left", game.players);
    io.to(id).emit("score-update", syncGameScores(game));
    emitReadyState(id);
  }

  res.send({ success: true });
});

app.get("/scores/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).send({ error: "Partie introuvable" });
  }

  res.send(syncGameScores(game));
});

app.get("/profile", (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).send({ error: "Aucun token fourni" });
  }

  fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => {
      if (!r.ok) throw new Error("Token Spotify invalide");
      return r.json();
    })
    .then(data => {
      const displayName = data.display_name?.trim();
      const photoUrl = data.images && data.images.length > 0 ? data.images[0].url : null;
      if (displayName) {
        res.send({
          playerName: displayName,
          spotifyUser: true,
          stats: playerProfiles[displayName] || null,
          photo: photoUrl
        });
      } else {
        // Token valide mais pas de nom → client doit gérer le fallback
        res.status(400).send({ error: "Nom Spotify vide ou invalide" });
      }
    })
    .catch(err => {
      console.error("❌ Erreur profil Spotify :", err.message);
      res.status(401).send({ error: "Échec d'authentification Spotify" });
    });
});


app.post("/update-profile-stats", (req, res) => {
  const {
    playerName,
    averageResponseTime,
    roundsPlayed,
    roundsWon,
    bestResponseTime,
    totalScore
  } = req.body;

  // Ex de structure simple en mémoire (à remplacer par DB plus tard)
  if (!playerProfiles[playerName]) {
    playerProfiles[playerName] = {
      gamesPlayed: 0,
      totalRoundsPlayed: 0,
      totalRoundsWon: 0,
      cumulativeResponseTime: 0,
      bestResponseTime: null,
      totalScore: 0
    };
  }

  const profile = playerProfiles[playerName];

  profile.gamesPlayed += 1;
  profile.totalRoundsPlayed += roundsPlayed;
  profile.totalRoundsWon += roundsWon;
  profile.cumulativeResponseTime += averageResponseTime * roundsPlayed;
  profile.totalScore += totalScore;

  if (profile.bestResponseTime === null || bestResponseTime < profile.bestResponseTime) {
    profile.bestResponseTime = bestResponseTime;
  }
  saveProfilesToFile();

  res.send({ success: true, profile });
});


const PORT = process.env.PORT;

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // autoriser tous les domaines (à restreindre plus tard)
});

function emitReadyState(roomId) {
  const game = games[roomId];
  if (!game) return;

  const activePlayers = getRoundPlayers(game);
  const activeNames = new Set(activePlayers.map(player => player.name));
  game.playersReady = (Array.isArray(game.playersReady) ? game.playersReady : []).filter(name => activeNames.has(name));

  const scoreMap = new Map(syncGameScores(game).map(entry => [entry.name, entry]));
  const roundResults = game.roundResults || {};
  const readyDetails = game.playersReady.map(name => {
    const result = roundResults[name] || {};
    const currentScore = Number(scoreMap.get(name)?.score) || 0;
    const previousScore = Number(result.previousScore) || 0;
    return {
      name,
      previousScore,
      pointsGained: Math.max(0, currentScore - previousScore),
      responseTime: result.responseTime ?? null
    };
  });

  io.to(roomId).emit("players-ready-update", {
    ready: game.playersReady.length,
    total: activePlayers.length,
    players: readyDetails
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Serveur en ligne avec Socket.IO sur le port ${PORT}`);
});

io.on("connection", (socket) => {
  console.log("📡 Socket connecté :", socket.id);

  socket.on("join-room", (payload) => {
    const roomId = typeof payload === "string" ? payload : payload?.roomId;
    const playerName = payload?.playerName;
    if (!roomId) {
      console.warn("❌ join-room sans roomId reçu", payload);
      return;
    }
    socket.join(roomId);
    console.log(`🧩 Socket ${socket.id} a rejoint la room ${roomId}`);
    if (playerName) console.log(`   en tant que ${playerName}`);
    console.log("🌐 Rooms actuelles :", Array.from(socket.rooms));
  });
socket.on("next-round", ({ roomId }) => {
  console.log(`📨 Reçu 'next-round' pour room ${roomId}`);

  const game = games[roomId];
  if (!game) {
    console.warn("❌ Partie non trouvée :", roomId);
    return;
  }

  const activePlayers = getRoundPlayers(game);
  const readyCount = Array.isArray(game.playersReady) ? game.playersReady.length : 0;
  if (readyCount < activePlayers.length) {
    console.warn(`⏳ Round non terminé : ${readyCount}/${activePlayers.length} joueurs prêts`);
    emitReadyState(roomId);
    return;
  }

  console.log(`➡️ Round actuel : ${game.currentRound} / ${game.playlist?.length}`);

  if (game.currentRound < game.playlist.length) {
    game.currentRound++;
    game.playersReady = [];
    game.roundResults = {};
    console.log(`🆙 Nouveau round : ${game.currentRound}`);
    io.to(roomId).emit("round-updated", { newRound: game.currentRound });
    emitReadyState(roomId);
  } else {
    console.log("🏁 Fin de la partie");
    io.to(roomId).emit("game-over", syncGameScores(game));
  }
});
socket.on("player-ready", ({ roomId, playerName, previousScore, responseTime }) => {
  const game = games[roomId];
  if (!game) {
    console.warn("❌ Partie non trouvée pour player-ready :", roomId);
    return;
  }

  const activePlayers = getRoundPlayers(game);
  if (!activePlayers.some(player => player.name === playerName)) {
    return;
  }

  if (!Array.isArray(game.playersReady)) game.playersReady = [];
  if (!game.roundResults) game.roundResults = {};

  game.roundResults[playerName] = {
    previousScore: Number(previousScore) || 0,
    responseTime: responseTime ?? null
  };

  if (!game.playersReady.includes(playerName)) {
    game.playersReady.push(playerName);
    console.log(`✅ Player ready: ${playerName} (${game.playersReady.length} / ${activePlayers.length})`);
  }

  emitReadyState(roomId);

  if (game.playersReady.length === activePlayers.length) {
    io.to(roomId).emit("all-ready");
  }
});

  // Lorsqu'un joueur buzz, pause pour tous
  socket.on("player-buzz", ({ roomId, playerName }) => {
    console.log(`🔔 Buzz de ${playerName} dans la room ${roomId}`);
    // Envoie l'information du buzzer à tous pour désactiver leurs boutons
    io.to(roomId).emit("player-buzz", { playerName });
    // Puis met la musique en pause pour tout le monde
    io.to(roomId).emit("pause-track");
  });

  socket.on("apply-time-penalty", ({ roomId, timeLeft }) => {
    if (!roomId) return;
    const safeTimeLeft = Math.max(0, Number(timeLeft) || 0);
    console.log(`⏬ Pénalité de temps appliquée dans ${roomId} : ${safeTimeLeft}s restantes`);
    io.to(roomId).emit("buzz-time", { timeLeft: safeTimeLeft });
  });

  // Reprise de la musique
  socket.on("resume-track", ({ roomId }) => {
    console.log(`▶️ Reprise demandée pour la room ${roomId}`);
    io.to(roomId).emit("resume-track");
  });
  
  // Temps restant envoyé par le diffuseur après un buzz
  socket.on("buzz-time", ({ roomId, timeLeft }) => {
    if (!roomId) return;
    console.log(`⏲️ Temps restant reçu du diffuseur pour ${roomId} : ${timeLeft}`);
    io.to(roomId).emit("buzz-time", { timeLeft });
  });

  // Fin automatique du round (timer à 0)
  socket.on("timer-ended", ({ roomId }) => {
    if (!roomId) return;
    console.log(`⏱️ Timer écoulé pour room ${roomId}`);
    io.to(roomId).emit("round-ended");
  });
});


async function fetchSpotifyImage(uri, token) {
  try {
    const id = uri.split(":")[2];
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    return data.album?.images?.[0]?.url || null;
  } catch (err) {
    console.error("Erreur récupération image Spotify :", err);
    return null;
  }
}



const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const csv = require("csv-parser");
const { Readable } = require("stream");

const uris = [];          // utilisé pour l’ancien système
const allTracks = [];     // utilisé pour les filtres
let filteredTracks = [];  // alimenté après POST /set-filters

const GSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=0&single=true&output=csv";
const GSheetSaga = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1674078581&single=true&output=csv";
const sagaTracks = [];

fetch(GSheetSaga)
  .then(async (res) => {
    const csvData = await res.text();
    const rows = [];

    await new Promise((resolve) => {
      Readable.from(csvData)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve);
    });

    for (const row of rows) {
      const uri = row["Code Spotify"];
      if (!uri?.startsWith("spotify:track:")) continue;

      const titre = row["Oeuvre"] || "";
      const reponses = (row["Réponse"] || "").split(",").map(r => r.trim()).filter(Boolean);
      const compositeur = row["Compositeur"] || "";
      const theme = row["Thème"] || "";
      const annee = parseInt(row["Année"]) || 0;
      const saga = row["Saga"] || "";
      const answers = [titre, ...reponses].filter(Boolean);

      sagaTracks.push({
        uri,
        titre,
        theme,
        compositeur,
        annee,
        answers,
        saga
      });
    }

    console.log(`🎬 ${sagaTracks.length} morceaux saga chargés`);
  })
  .catch(err => {
    console.error("Erreur chargement saga :", err);
  });



app.get("/saga-tracks", (req, res) => {
  const minExpected = Object.keys(sagaSheets).length;
  if (sagaTracks.length < minExpected) {
    return res.status(503).json({ error: "Chargement des sagas en cours" });
  }
  res.json(sagaTracks);
});


fetch(GSheetURL)
  .then(async (res) => {
    const csvData = await res.text();
    const rows = [];

    await new Promise((resolve) => {
      Readable.from(csvData)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve);
    });

    for (const row of rows) {
      const uri = row["Code Spotify"];
      if (!uri) continue;

      const isSaga = !uri.startsWith("spotify:track:");
      const titre = row["Oeuvre"] || "";
      const reponses = (row["Réponse"] || "").split(",").map(r => r.trim()).filter(Boolean);
      const compositeur = row["Compositeur"] || "";
      const theme = row["Thème"] || "";
      const media = row["Média"] || "";
      const categorie = row["Catégorie"] || "";
      const difficulte = row["Difficulté"] || "";
      const pays = row["Pays"] || "";
      const annee = parseInt(row["Année"]) || 0;
      const answers = [titre, ...reponses].filter(Boolean);
      const total = allTracks.length;
      const sagas = allTracks.filter(t => !t.uri?.startsWith("spotify:track:")).length;
      const valides = total - sagas;

      const track = {
        uri,
        titre,
        theme,
        compositeur,
        media,
        categorie,
        difficulte,
        pays,
        annee,
        answers,
        image : null,
        isSaga: isSaga
      };

      uris.push(uri);
      allTracks.push(track);
    }

    filteredTracks = [...allTracks];
    console.log(`🎵 ${total} pistes chargées : ${valides} valides Spotify, ${sagas} sagas à remplacer dynamiquement.`);
  })
  .catch(err => {
    console.error("Erreur lors du chargement Google Sheets :", err);
  });

app.get("/all-tracks", (req, res) => {
  if (!allTracks.length) {
    return res.status(503).json({ error: "Morceaux non encore chargés" });
  }
  res.json(allTracks);
});