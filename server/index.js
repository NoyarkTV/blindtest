require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const open = (...args) => import('open').then(mod => mod.default(...args));
let storedAccessToken = null;
let storedRefreshToken = null;
let ready = false;

const app = express();
app.use(cors());
app.use(express.json());


const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

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

  open(authURL);
  res.send("Redirection vers Spotify...");
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
    res.redirect("https://blindtest-1.onrender.com/config");
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



const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(`🚀 Serveur HTTP sur http://localhost:${PORT}`);
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