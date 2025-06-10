require("dotenv").config();
const express = require("express");
const axios = require("axios");
const open = (...args) => import('open').then(mod => mod.default(...args));
let storedAccessToken = null;
let storedRefreshToken = null;
let ready = false;
const playerProfiles = {};
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



  function generateRandomName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

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
  games[id] = { id, admin, players, playersReady: [] };

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
    nbRounds: playlist.length,
    playersReady: []
  };

  io.to(id).emit("game-started", {
    playlist: playlist.map((track, i) => ({ index: i + 1, ...track })),
    nbRounds: playlist.length,
    config: params
  });

  console.log(`🎬 Partie ${id} lancée avec ${playlist.length} morceaux`);
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

app.get("/game/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({ error: "Partie introuvable" });
  }

  res.json({
    players: game.players || [],
    scores: game.scores || []
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

app.get("/profile", (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (token) {
    return fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Invalid Spotify token");
        return r.json();
      })
      .then(data => {
        const displayName = data.display_name;
        if (displayName && displayName.trim()) {
          res.send({
            playerName: displayName,
            spotifyUser: true,
            stats: playerProfiles[displayName] || null
          });
        } else {
          // Cas rare : token valide mais pas de display_name → on met un randomName
          const randomName = generateRandomName();
          res.send({
            playerName: randomName,
            spotifyUser: false
          });
        }
      })
      .catch(err => {
        console.error("Erreur profil Spotify :", err);
        // Token invalide → on renvoie un randomName
        const randomName = generateRandomName();
        res.send({
          playerName: randomName,
          spotifyUser: false
        });
      });
  } else {
    const randomName = generateRandomName();
    res.send({
      playerName: randomName,
      spotifyUser: false
    });
  }
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

  res.send({ success: true, profile });
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

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`🧩 Socket ${socket.id} a rejoint la room ${roomId}`);
    console.log("🌐 Rooms actuelles :", Array.from(socket.rooms));
  });
socket.on("next-round", ({ roomId }) => {
  console.log(`📨 Reçu 'next-round' pour room ${roomId}`);

  const game = games[roomId];
  if (!game) {
    console.warn("❌ Partie non trouvée :", roomId);
    return;
  }

  console.log(`➡️ Round actuel : ${game.currentRound} / ${game.playlist?.length}`);

  if (game.currentRound < game.playlist.length) {
    game.currentRound++;
    game.playersReady = [];
    console.log(`🆙 Nouveau round : ${game.currentRound}`);
    io.to(roomId).emit("round-updated", { newRound: game.currentRound });
  } else {
    console.log("🏁 Fin de la partie");
    io.to(roomId).emit("game-over", games[roomId]?.scores || []);
  }
});
socket.on("player-ready", ({ roomId, playerName }) => {
  const game = games[roomId];
  if (!game) {
    console.warn("❌ Partie non trouvée pour player-ready :", roomId);
    return;
  }

  if (!game.playersReady.includes(playerName)) {
    game.playersReady.push(playerName);
    console.log(`✅ Player ready: ${playerName} (${game.playersReady.length} / ${game.players.length})`);

    io.to(roomId).emit("players-ready-update", {
      ready: game.playersReady.length,
      total: game.players.length
    });
  }
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
const GSheetSW = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1674078581&single=true&output=csv";
const GSheetHP = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1465853254&single=true&output=csv";
const GSheetHG = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=867242062&single=true&output=csv";
const GSheetPoc = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=2048974181&single=true&output=csv";
const GSheetAvg = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1063471584&single=true&output=csv";
const GSheetAvt= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=171097940&single=true&output=csv";
const GSheetDn= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=2128064135&single=true&output=csv";
const GSheetHTTYD= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1731030068&single=true&output=csv";
const GSheetJB= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=2002558209&single=true&output=csv";
const GSheetLoTR= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=446981821&single=true&output=csv";
const GSheetGotG= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=95989887&single=true&output=csv";
const GSheetDpl= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1732790998&single=true&output=csv";
const GSheetEnct= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=74581739&single=true&output=csv";
const GSheetRL= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=10287656&single=true&output=csv";
const GSheetTGS= "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaLPUFlOgMH_M77kx1a_WE1YLo1IhoKeKX3IT5d70yEgej66reOZTayABJH3ODRUyMCiP2sH3fqBDI/pub?gid=1521858933&single=true&output=csv";
const sagaTracks = []; 
const sagaSheets = {
  "Star Wars": GSheetSW,
  "Harry Potter": GSheetHP,
  "Hunger Games": GSheetHG,
  "Pirates des Caraïbes": GSheetPoc,
  "Avengers": GSheetAvg,
  "Avatar": GSheetAvt,
  "Dune": GSheetDn,
  "Dragons": GSheetHTTYD,
  "James Bond": GSheetJB,
  "Le Seigneur des Anneaux": GSheetLoTR,
  "Gardiens de la Galaxie": GSheetGotG,
  "Deadpool": GSheetDpl,
  "Encanto": GSheetEnct,
  "Roi Lion": GSheetRL,
  "The Greatest Showman": GSheetTGS
};

for (const [sagaName, url] of Object.entries(sagaSheets)) {
  fetch(url)
    .then(async res => {
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
        const theme = row["Titre"] || sagaName; // 🟢 "Titre" est ici le nom affiché de la chanson
        const annee = parseInt(row["Année"]) || 0;
        const answers = [titre, ...reponses].filter(Boolean);

        const track = {
          uri,
          titre,
          theme,
          compositeur,
          annee,
          answers,
          saga: sagaName
        };

        sagaTracks.push(track);
      }

      console.log(`🎬 ${sagaName} : ${rows.length} morceaux saga chargés`);
    })
    .catch(err => {
      console.error(`Erreur de chargement saga ${sagaName} :`, err);
    });
}

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