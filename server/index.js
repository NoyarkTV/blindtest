require("dotenv").config();
const express = require("express");
const axios = require("axios");
const open = (...args) => import('open').then(mod => mod.default(...args));
let storedAccessToken = null;
let storedRefreshToken = null;
let ready = false;

const app = express();
app.use(express.json());


const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const games = {};

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
  games[id] = { id, admin, players };

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
  const { id, params, playlist } = req.body;

  if (!id || !Array.isArray(playlist)) {
    return res.status(400).send({ error: "Requête invalide" });
  }

  games[id] = {
    ...(games[id] || {}),
    config: params,
    playlist,
    currentRound: 1,
    nbRounds: playlist.length
  };

  io.to(id).emit("game-started", {
    playlist: playlist.map((track, i) => ({ index: i + 1, ...track })),
    nbRounds: playlist.length,
    config: params
  });

  console.log(`🎬 Partie ${id} lancée avec ${playlist.length} morceaux`);

  res.status(200).send({ success: true });
});

app.get("/game-info/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json({
    params: game.params,
    playlist: game.playlist,
    admin: game.admin
  });
});


app.post("/submit-score", (req, res) => {
  const { id, player, score } = req.body;
  if (!games[id]) return res.status(404).send({ error: "Partie introuvable" });

  // Initialise les scores si absents
  if (!Array.isArray(games[id].scores)) games[id].scores = [];

  const existing = games[id].scores.find(s => s.name === player);

  if (!existing || existing.score !== score) {
    if (existing) {
      existing.score = score;
    } else {
      games[id].scores.push({ name: player, score });
    }

    // Ne fais le emit que si le tableau est valide
    if (Array.isArray(games[id].scores)) {
      io.to(id).emit("score-update", games[id].scores);
    } else {
      console.warn(`⚠️ games[${id}].scores n'est pas un tableau :`, games[id].scores);
    }
  }

  res.send({ success: true });
});

app.get('/game-info/:id', (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({ error: "Partie non trouvée" });
  }

  res.json({
    params: game.params,
    playlist: game.playlist
  });
});

app.post("/join-game", (req, res) => {
  const { id, player } = req.body;
  if (!games[id]) return res.status(404).send({ error: "Partie introuvable" });

  if (!games[id].players.find(p => p.name === player.name)) {
    games[id].players.push(player);
    io.to(id).emit("player-joined", games[id].players); // 🔥 broadcast live
  }

  res.send({ success: true });
});

app.get("/scores/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).send({ error: "Partie introuvable" });
  }

  if (!Array.isArray(game.scores)) {
    return res.status(400).send({ error: "Scores invalides ou manquants" });
  }

  res.send(game.scores);
});


const PORT = process.env.PORT;

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // autoriser tous les domaines (à restreindre plus tard)
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur en ligne avec Socket.IO sur le port ${PORT}`);
});

io.on("connection", (socket) => {
  console.log("📡 Socket connecté :", socket.id);

  socket.on("join-room", (gameId) => {
    socket.join(gameId);
    console.log(`🧩 Socket ${socket.id} a rejoint la room ${gameId}`);
  });
  socket.on("next-round", ({ roomId, player }) => {
  console.log(`📨 Reçu 'next-round' de ${player} pour la room ${roomId}`);

  const game = games[roomId];
  if (!game) {
    console.warn("❌ Partie introuvable pour roomId :", roomId);
    return;
  }

  if (player !== game.admin) {
    console.warn(`🔒 Accès refusé : ${player} n'est pas l'admin (${game.admin})`);
    return;
  }

  if (typeof game.currentRound !== "number") {
    game.currentRound = 1; // 🔧 Initialisation manquante
    console.log("🛠️ Initialisation du round à 1");
  } else {
    game.currentRound += 1;
  }

  const roundNum = game.currentRound;
  const totalRounds = game.config?.nbRounds || 1;

  const isLastRound = roundNum >= totalRounds;
  const track = game.playlist?.[roundNum - 1];

  console.log(`➡️ Round ${roundNum}/${totalRounds} | isLast: ${isLastRound} | Track: ${track?.titre || "Aucun"}`);

  io.to(roomId).emit("round-update", {
    round: roundNum,
    track: isLastRound ? null : track,
    isLast: isLastRound
  });
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
      if (!uri?.startsWith("spotify:track:")) continue;

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
        image : null
      };

      uris.push(uri);
      allTracks.push(track);
    }

    filteredTracks = [...allTracks];
    console.log(`🎵 ${allTracks.length} pistes Spotify chargées avec images.`);
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