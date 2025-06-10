import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SpotifyPlayer from "./SpotifyPlayer";
import socket from "./socket";

function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState([]);
  const [params, setParams] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [deviceId, setDeviceId] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("spotify_token"));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isBuzzed, setIsBuzzed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [composer, setComposer] = useState("");
  const [composerGuess, setComposerGuess] = useState("");
  const [score, setScore] = useState(0);
  const answerInputRef = useRef(null);
  const [composerAttempts, setComposerAttempts] = useState(0); // max 2 tentatives
  const roundEndedRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  const pausedTimeRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const basePointsRef = useRef(100);
  const [showIndiceMedia, setShowIndiceMedia] = useState(false);
  const [showIndiceAnnee, setShowIndiceAnnee] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const intervalRef = useRef(null);
  const [allScores, setAllScores] = useState([]);
  const [players, setPlayers] = useState([]);
  const [scoreboard, setScoreboard] = useState([]);
  const [finalScores, setFinalScores] = useState([]);
  const [showEndPopup, setShowEndPopup] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState({});
  const [trackImages, setTrackImages] = useState({});
  const responseTimesRef = useRef([]);
  const [averageTime, setAverageTime] = useState(null);
  const isVerifyingRef = useRef(false);
  const [playersReady, setPlayersReady] = useState(0);
  const [isWrongAnswer, setIsWrongAnswer] = useState(false);
  const [roundsWon, setRoundsWon] = useState(0);

const playCurrentTrack = async (devId) => {
  const track = playlist[currentRound - 1];
  if (!track?.uri) return;

  console.log("▶️ Demande lecture track :", track.uri);

  isVerifyingRef.current = true; // on démarre une nouvelle vérif

  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${devId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris: [track.uri] })
  }).then(() => {
    console.log("▶️ Lecture demandée, vérification en cours...");

    const maxTries = 10;
    let tries = 0;

    const verifyPlayback = async () => {
      if (!isVerifyingRef.current) {
        console.log("⛔ Vérif annulée (ancienne track ?)");
        return;
      }

      tries++;
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const currentUri = data?.item?.uri;
      const isPlaying = data?.is_playing;

      console.log(`🔍 Vérif #${tries} - playing: ${isPlaying} - track: ${currentUri}`);

      // Très important : vérifier qu'on est bien sur la bonne track ET le bon round
      const stillCurrentTrack = (playlist[currentRound - 1]?.uri === track.uri);

      if (isPlaying && currentUri === track.uri && stillCurrentTrack) {
        console.log("✅ Track confirmée en lecture !");
        setIsPlaying(true);
        setIsTimerRunning(true); // On démarre le timer SEULEMENT ICI
        isVerifyingRef.current = false; // terminé
      } else if (tries < maxTries) {
        setTimeout(verifyPlayback, 300); // on attend 300ms et on recheck
      } else {
        console.warn("❌ Impossible de confirmer la lecture après plusieurs tentatives");
        setIsPlaying(false);
        isVerifyingRef.current = false;
      }
    };

    verifyPlayback();
  }).catch(err => {
    console.error("Erreur lecture Spotify :", err);
    isVerifyingRef.current = false;
  });
};

  useEffect(() => {
    const playerName = localStorage.getItem("playerName");
    setPlayerName(playerName);

    fetch(`https://blindtest-69h7.onrender.com/game-info/${id}`)
      .then(res => res.json())
      .then(data => {
        console.log("📥 Données reçues du serveur :", data);
        setPlaylist(data.playlist || []);
        setParams(data.params || {});
        setIsAdmin(data.params?.admin === playerName);
        setCurrentRound(data.currentRound || 1);
        console.log("🧠 Admin attendu :", data.params?.admin, "| Toi :", playerName);
      })
      .catch(err => {
        console.error("Erreur de récupération des infos de la partie :", err);
        navigate("/");
      });
  }, [id, navigate]);

  useEffect(() => {
    if (!playerName || !id) return;
    socket.emit("join-room", { roomId: id, playerName });
    console.log("📡 Socket client : a rejoint la room", id);
  }, [playerName, id]);

useEffect(() => {
  if (!id) return;

  fetch(`https://blindtest-69h7.onrender.com/game/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data.players) {
        const rawPlayers = data.players.map(obj => Object.values(obj)[0]); // ✅ extrait { name: "xxx" } propre
        console.log("👥 Joueurs extraits :", rawPlayers);
        setPlayers(rawPlayers);

        const localPlayer = localStorage.getItem("playerName");
        const initialScoreboard = rawPlayers.map(p => ({
          name: p.name,
          score: 0,
          isMe: p.name === localPlayer
        }));
        setScoreboard(initialScoreboard);

        // 🎯 Ensuite on récupère les scores actuels si dispo
        fetch(`https://blindtest-69h7.onrender.com/scores/${id}`)
          .then(res => res.json())
          .then(scores => {
            if (Array.isArray(scores)) {
              console.log("📥 Scores initiaux récupérés :", scores);
              setScoreboard(scores);
            }
          })
          .catch(err => console.warn("⚠️ Pas de scores initiaux :", err));
      }
    })
    .catch(err => console.error("❌ Erreur lors de la récupération des joueurs :", err));
}, [id]);



useEffect(() => {
  if (players.length === 0 || !playerName) return;

  const board = players.map(name => ({
    name,
    score: name === playerName ? score : 0
  }));

  setScoreboard(board);
}, [players, playerName, score]);

useEffect(() => {
  if (isTimerRunning) {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max((prev - 0.1), 0));
    }, 100);
  }
  return () => clearInterval(intervalRef.current);
}, [isTimerRunning]); 

const extractSpotifyId = (uri) => uri?.split(":")?.[2] || null;

const fetchAllTrackImages = async (uris) => {
  const token = localStorage.getItem("spotify_token");
  if (!token) {
    console.warn("❌ Aucun access token disponible pour Spotify.");
    return {};
  }

  const ids = uris.map(extractSpotifyId).filter(Boolean);
  const imageMap = {};

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${batch.join(",")}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
        console.warn(`⏳ Trop de requêtes. Pause de ${delay} ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        i -= 50; // on recommence la même batch
        continue;
      }

      const data = await res.json();
      for (const track of data.tracks) {
        imageMap[track.uri] = track.album?.images?.[0]?.url || null;
      }
    } catch (err) {
      console.error("❌ Erreur pendant la récupération des images Spotify :", err);
    }
  }

  return imageMap;
};

useEffect(() => {
  if (!playlist.length) return;

  const uris = playlist.map(track => track.uri);
  fetchAllTrackImages(uris).then((images) => {
    if (images) {
      setTrackImages(images);
    }
  });
}, [playlist]);



useEffect(() => {
  if (!deviceId || playlist.length === 0) return;

  if (currentRound > playlist.length) {
    console.log("🏁 Fin de partie détectée côté client");
    const sorted = [...scoreboard].sort((a, b) => b.score - a.score);
    setFinalScores(sorted);
const totalResponseTime = responseTimesRef.current.reduce((sum, t) => sum + parseFloat(t), 0);
const averageResponseTime = responseTimesRef.current.length > 0
  ? (totalResponseTime / responseTimesRef.current.length)
  : 0;

const bestResponseTime = responseTimesRef.current.length > 0
  ? Math.min(...responseTimesRef.current.map(t => parseFloat(t)))
  : null;

if (!params.testMode) { // ✅ tu ajouteras params.testMode plus bas
  fetch("https://blindtest-69h7.onrender.com/update-profile-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerName,
      averageResponseTime,
      roundsPlayed: playlist.length,
      roundsWon,
      bestResponseTime,
      totalScore: score
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("✅ Stats envoyées au serveur :", data);
  })
  .catch(err => {
    console.error("❌ Erreur lors de l'envoi des stats :", err);
  });
}
    setShowPopup(false);
    setShowEndPopup(true);
    handlePause();
    return;
  }

  wrongAttemptsRef.current = 0;
  basePointsRef.current = 100;
  setTimeLeft(params.time);
  setShowIndiceMedia(false);
  setShowIndiceAnnee(false);
  handleNextRoundPopup();
  playCurrentTrack(deviceId);
  roundEndedRef.current = false;

  console.log("🔍 Contenu de scoreboard :", scoreboard);
}, [currentRound]);


useEffect(() => {
  setShowPopup(false);
  setIsBuzzed(false); // facultatif : réinitialiser le buzz
}, [currentRound]);

useEffect(() => {
  if (deviceId && playlist.length > 0 && currentRound === 1) {
    setTimeLeft(params.time);
    setIsTimerRunning(true);
    playCurrentTrack(deviceId);
    handleNextRoundPopup();
  }
}, [deviceId, playlist, params]);

  useEffect(() => {
    if (deviceId && playlist.length > 0) {
      playCurrentTrack(deviceId);
    }
  }, [deviceId]);

useEffect(() => {
  if (deviceId && playlist.length > 0 && !isPlaying && !isBuzzed) {
    playCurrentTrack(deviceId);
  }
}, [deviceId, playlist]);

  useEffect(() => {
    socket.on("round-updated", ({ newRound }) => {
      console.log("🟣 Nouveau round reçu :", newRound);
      setCurrentRound(newRound);
    });
    return () => socket.off("round-updated");
  }, []);

useEffect(() => {
  socket.on("game-over", (scores) => {
    if (!Array.isArray(scores)) {
      console.error("❌ Scores invalides reçus dans 'game-over' :", scores);
      return;
    }

    console.log("🎉 Fin de partie, scores finaux :", scores);

    // Classement du plus haut au plus bas score
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const average =
    responseTimesRef.current.reduce((sum, t) => sum + parseFloat(t), 0) /
    responseTimesRef.current.length;

    setAverageTime(average.toFixed(1));
    setFinalScores(sorted);
    setShowPopup(false); // Ferme le popup de fin de round si ouvert
    setShowEndPopup(true); // Affiche le popup de fin de partie
  });

  return () => socket.off("game-over");
}, []);




useEffect(() => {
  if (timeLeft === 0) {
    setIsTimerRunning(false);
    roundEndedRef.current = true;
    setRoundsWon(prev => prev + 1);

    const currentTrack = playlist[currentRound - 1];

    if (!currentTrack) {
      console.warn("⛔ Aucun morceau trouvé pour le round :", currentRound);
      return;
    }

    setPopupInfo({
      title: "⏱ Temps écoulé",
      points: "+0 point",
      theme: currentTrack.theme || "",
      titre: currentTrack.oeuvre || currentTrack.titre || "",
      annee: currentTrack.annee || "",
      compositeur: currentTrack.compositeur || "",
      image: preloadedImages[currentTrack.id || currentTrack.titre] || currentTrack.image || null
    });
    handlePause();
    setShowPopup(true);
    socket.emit("player-ready", { roomId: id, playerName });
  }
}, [timeLeft]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isBuzzed) handleBuzz();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBuzzed]);

useEffect(() => {
  socket.on("score-update", (updatedScores) => {
    console.log("📊 Scoreboard mis à jour :", updatedScores);
    setScoreboard(updatedScores); // met à jour l'affichage
  });

  return () => socket.off("score-update");
}, []);


    useEffect(() => {
  if (params) {
    console.log("🧪 params reçus :", params);
    console.log("⏱️ Time:", params.time);
    console.log("🎼 BonusCompositeur:", params.bonusCompositeur);
  }
}, [params]);

useEffect(() => {
  if (isBuzzed && answerInputRef.current) {
    answerInputRef.current.focus();
  }
}, [isBuzzed]);

const setVolume = (percent) => {
  if (!deviceId || percent < 0 || percent > 100) return;

  fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${percent}&device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  }).then(() => {
    console.log(`🔊 Volume réglé à ${percent}%`);
  }).catch(err => {
    console.error(`Erreur lors du réglage du volume à ${percent}% :`, err);
  });
};


useEffect(() => {
  if (!deviceId || playlist.length === 0 || currentRound > playlist.length) return;

  if (showPopup) {
    // 🎵 Relance douce musique pendant le popup
    console.log("🎵 Relance douce musique pendant le popup");

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => {
      console.log("🎵 Musique relancée pour popup");
    }).catch(err => console.error("Erreur reprise lecture pendant popup :", err));
  } else {
    // 🎵 On repasse le volume à 100% après le popup
    console.log("🎵 Remise volume à 100% après popup");
  }
}, [showPopup, deviceId, playlist, currentRound, token]);

useEffect(() => {
  socket.on("players-ready-update", ({ ready, total }) => {
    setPlayersReady(ready);
    console.log(`✅ Players ready: ${ready}/${total}`);
  });

  return () => socket.off("players-ready-update");
}, []);


const handleBuzz = async () => {
    pausedTimeRef.current = timeLeft;
    setIsTimerRunning(false);
    setIsBuzzed(true);
    await handlePause();
};

const normalize = str =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .replace(/\s+/g, '');

const levenshtein = (a, b) => {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
};

const handleValidate = () => {
  setIsBuzzed(false);
  const currentTrack = playlist[currentRound - 1];
  const timer = params.time ?? 30;
  const bonusCompositeur = params.bonusCompositeur ?? false;

  const normalizedAnswer = normalize(answer);
  const validAnswers = (currentTrack.answers || []).map(a => normalize(a));
  const isCorrect = validAnswers.some(valid =>
    valid === normalizedAnswer || levenshtein(valid, normalizedAnswer) <= 2
  );

  // 🎼 Bonus compositeur
  let bonus = 0;
  let bonusText = "";
  let isComposerMatch = false;

  if (bonusCompositeur && currentTrack.compositeur) {
    const guessList = composerGuess.toLowerCase().split(",").map(s => s.trim());
    const realComposers = currentTrack.compositeur.toLowerCase().split(",").map(s => s.trim());

    isComposerMatch = guessList.some(g => {
      const gNorm = normalize(g);
      return realComposers.some(r => {
        const rNorm = normalize(r);
        return levenshtein(gNorm, rNorm) <= 2;
      });
    });

    if (isComposerMatch) {
      bonus = 20;
      bonusText = " (+20 bonus compositeur)";
    }
  }

  // 🟢 Cas 1 : Titre correct (comme avant)
  if (isCorrect) {
    const rawTimeLeft = pausedTimeRef.current ?? timeLeft;
    const responseTime = (params.time ?? 30) - rawTimeLeft;
    responseTimesRef.current.push(responseTime.toFixed(1));
    let multiplier = 1;

    if (showIndiceMedia && showIndiceAnnee) {
      multiplier = 0.6;
    } else if (showIndiceMedia || showIndiceAnnee) {
      multiplier = 0.8;
    }

    const base = ((rawTimeLeft / timer) * 100 * multiplier) - (wrongAttemptsRef.current * 20);
    const totalPoints = Math.max(0, Math.ceil(base)) + bonus;

    const updatedScore = score + totalPoints;
    setScore(updatedScore);
    setScoreboard(prev =>
      prev.map(p =>
        p.name === playerName
          ? { ...p, score: updatedScore }
          : p
      )
    );

    fetch("https://blindtest-69h7.onrender.com/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id,
        player: playerName,
        score: updatedScore
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Score soumis au serveur :", data);
      })
      .catch(err => {
        console.error("❌ Erreur lors de l'envoi du score :", err);
      });

    setTimeLeft(null);
    setShowPopup(true);
    socket.emit("player-ready", { roomId: id, playerName });
    setPopupInfo({
      title: "Bonne réponse",
      points: `+${totalPoints} points${bonusText}`,
      responseTime: `${responseTime.toFixed(1)} sec`,
      theme: currentTrack.theme || "",
      titre: currentTrack.oeuvre || currentTrack.titre || "",
      annee: currentTrack.annee || "",
      compositeur: currentTrack.compositeur || "",
      image: preloadedImages[currentTrack.id || currentTrack.titre] || currentTrack.image || null
    });
    roundEndedRef.current = true;
    setRoundsWon(prev => prev + 1);
    setAnswer("");
    setComposerGuess("");
  }

  // 🟢 Cas 2 : Compositeur seul correct
  else if (isComposerMatch) {
    const updatedScore = score + bonus;
    setScore(updatedScore);
    setScoreboard(prev =>
      prev.map(p =>
        p.name === playerName
          ? { ...p, score: updatedScore }
          : p
      )
    );

    fetch("https://blindtest-69h7.onrender.com/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id,
        player: playerName,
        score: updatedScore
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Score soumis au serveur (bonus compositeur seul) :", data);
      })
      .catch(err => {
        console.error("❌ Erreur lors de l'envoi du score (bonus compo seul) :", err);
      });

    setTimeLeft(null);
    setShowPopup(true);
    socket.emit("player-ready", { roomId: id, playerName });
    setPopupInfo({
      title: "Bonne réponse compositeur",
      points: `+${bonus} points (compositeur seul)`,
      responseTime: "-",
      theme: currentTrack.theme || "",
      titre: currentTrack.oeuvre || currentTrack.titre || "",
      annee: currentTrack.annee || "",
      compositeur: currentTrack.compositeur || "",
      image: preloadedImages[currentTrack.id || currentTrack.titre] || currentTrack.image || null
    });
    roundEndedRef.current = true;
    setAnswer("");
    setComposerGuess("");
  }

// 🔴 Cas 3 : Mauvaise réponse
else {
    wrongAttemptsRef.current = (wrongAttemptsRef.current || 0) + 1;
    console.log("❌ Mauvaise réponse - tentatives :", wrongAttemptsRef.current);
    basePointsRef.current = Math.max(0, basePointsRef.current - 20);

    setIsWrongAnswer(true);
    setTimeout(() => {
    setIsWrongAnswer(false);
    setAnswer("");
    setComposerGuess("");
  }, 600);

handlePlay();
setIsTimerRunning(true);
}
};



  const handleReady = (id) => {
    setDeviceId(id);
    playCurrentTrack(id);
  };

  const handleRestartRound = () => {
  console.log("🔄 Relance complète du round", currentRound);

  // Reset timer
  setTimeLeft(params.time);
  setIsTimerRunning(true);

  // Reset essais / points de base
  wrongAttemptsRef.current = 0;
  basePointsRef.current = 100;

  // Reset buzz éventuel
  setIsBuzzed(false);
  setAnswer("");
  setComposerGuess("");

  // Pause d'abord pour forcer une vraie relecture propre
  handlePause().finally(() => {
    // Petite attente pour être sûr que le player est bien à l'arrêt (important)
    setTimeout(() => {
      playCurrentTrack(deviceId);
    }, 500); // 500 ms est une bonne valeur en pratique pour forcer Spotify à réagir
  });
};


  const handlePause = () => {
    return fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => setIsPlaying(false)).catch(err => console.error("Erreur pause :", err));
  };

  const handlePlay = () => {
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => setIsPlaying(true)).catch(err => console.error("Erreur reprise lecture :", err));
  };

const handleNext = () => {
  
    console.log("🟢 ADMIN : Envoi next-round au serveur");
    handlePause().finally(() => {
      socket.emit("next-round", { roomId: id });
    });
  
};

  if (!params || playlist.length === 0 ) {
    return <div>Chargement en cours...</div>;
  }

  const timer = params.time ?? 30;
  const bonusCompositeur = params.bonusCompositeur ?? false;
  const currentTrack = playlist[currentRound - 1];

  const handleNextRoundPopup = () => {
    setShowPopup(false);
    handlePause();
  };

  return (
    <div style={{ padding: 20, color: "#fff", background: "#1c2541", minHeight: "100vh", alignItems: "center" }}>
      <SpotifyPlayer token={token} onReady={handleReady} />
      
<style>
{`
  html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  /* ✅ Ajoute ton animation ici */
  @keyframes shake-pulse {
    0% { transform: translateX(0) scale(1); background-color: #ffe6e6; }
    25% { transform: translateX(-5px) scale(1.05); background-color: #f44336; color: #fff; }
    50% { transform: translateX(5px) scale(1); background-color: #ffe6e6; }
    75% { transform: translateX(-5px) scale(1.05); background-color: #f44336; color: #fff; }
    100% { transform: translateX(0) scale(1); background-color: #ffe6e6; }
  }

  .wrong-answer {
    animation: shake-pulse 0.6s;
    border: 2px solid #f44336 !important;
    background-color: #ffe6e6 !important;
    color: #1c2541 !important;
  }
`}
</style>



{/* ROUND fixé en haut sans débordement */}
<div style={{
  position: "fixed",
  top: 20,
  left: 0,
  width: "100%",
  textAlign: "left",
  paddingLeft: 20, // ✅ petit espace à gauche
  fontFamily: "Luckiest Guy",
  fontSize: 28,
  color: "#f7b733",
  zIndex: 10,
  pointerEvents: "none" // évite tout clic parasite
}}>
  Round {currentRound} / {playlist.length}
</div>

{/* SCOREBOARD */}
{Array.isArray(scoreboard) && scoreboard.every(p => typeof p.name === "string") && (
  <div style={{
    position: "fixed",           // fixé à l'écran
    top: 20,
    right: 20,
    width: 220,                  // largeur contrôlée
    backgroundColor: "#fff",     // ✅ fond blanc visible
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    padding: 12,
    zIndex: 1000
  }}>
    <div style={{
      fontWeight: "bold",
      fontSize: 16,
      marginBottom: 10,
      color: "#1c2541"
    }}>
      🏆 Scoreboard
    </div>

    {scoreboard.map((p, i) => {
      const isMe = p.name === playerName;
      return (
        <div
          key={i}
          style={{
            fontWeight: isMe ? "bold" : "normal",
            backgroundColor: isMe ? "#f7b733" : "transparent",
            color: isMe ? "#1c2541" : "#333",
            padding: "6px 8px",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4
          }}
        >
          <span>{p.name}</span>
          <span>{typeof p.score === "number" ? p.score : 0}</span>
        </div>
      );
    })}
  </div>
)}

{/* CONTENU CENTRAL NON SCROLLABLE */}
<div style={{
  position: "relative",
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#1c2541",
  color: "#fff"
}}>

  {/* TIMER CENTRÉ */}
  <div
    style={{
      width: 140,
      height: 140,
      borderRadius: "50%",
      background: `conic-gradient(#f7b733 ${360 * (timeLeft / timer)}deg, #555 ${360 * (timeLeft / timer)}deg)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 36,
      fontWeight: "bold",
      color: "#1c2541",
      marginBottom: 30,
      boxSizing: "border-box"
    }}
  >
    {Math.ceil(timeLeft ?? 0)}
  </div>

  {/* INDICES */}
  <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 30, flexWrap: "wrap" }}>
    <div style={indiceBoxStyle}>
      <span style={{ marginRight: 8 }}>Média :</span>
      {!showIndiceMedia ? (
        <button onClick={() => setShowIndiceMedia(true)} style={indiceButtonStyle}>👁️</button>
      ) : (
        <span>{playlist[currentRound - 1]?.media || "?"}</span>
      )}
    </div>

    <div style={indiceBoxStyle}>
      <span style={{ marginRight: 8 }}>Année :</span>
      {!showIndiceAnnee ? (
        <button onClick={() => setShowIndiceAnnee(true)} style={indiceButtonStyle}>👁️</button>
      ) : (
        <span>{playlist[currentRound - 1]?.annee || "?"}</span>
      )}
    </div>
  </div>

  {/* BUZZER OU RÉPONSE */}
  <div style={{ marginBottom: 30 }}>
    {!isBuzzed ? (
      <button onClick={handleBuzz} style={buzzButtonStyle}> BUZZ</button>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <input
        key={isWrongAnswer ? "wrong" : "normal"}
          type="text"
          placeholder="Votre réponse"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          ref={answerInputRef}
          style={inputStyle}
          className={isWrongAnswer ? "wrong-answer" : ""}
        />
        {bonusCompositeur && (
          <input
          key={isWrongAnswer ? "wrong-composer-input" : "normal-composer-input"}
            type="text"
            placeholder="Compositeur (facultatif)"
            value={composerGuess}
            onChange={(e) => setComposerGuess(e.target.value)}
            style={inputStyle}
            className={isWrongAnswer ? "wrong-answer" : ""}
          />
        )}
        <div>
          <button
            onClick={handleValidate}
            disabled={!answer && (!bonusCompositeur || !composerGuess)}
            style={validateButtonStyle}
          >
            Valider
          </button>
          <button
            onClick={() => {
              setIsBuzzed(false);
              setAnswer("");
              setComposerGuess("");
              setIsTimerRunning(true);
              handlePlay();
            }}
            style={cancelButtonStyle}
          >
            Annuler
          </button>
        </div>
      </div>
    )}
  </div>

  {/* BOUTONS BAS */}
  <div style={{ display: "flex", gap: 10 }}>
    <button onClick={handleRestartRound} style={buttonStyle}>🔄 Relancer le round</button>
    {isAdmin && <button onClick={handlePause} style={buttonStyle}>⏸ Pause</button>}
    {isAdmin && <button onClick={handleNext} style={buttonStyle}>⏭ Next</button>}
  </div>
</div>

{showPopup && popupInfo && (
  <div style={popupOverlayStyle}>
    <div style={popupStyle}>
      <h2 style={{ fontSize: 26 }}>{popupInfo.title}</h2>
      <h1 style={{ fontSize: 48, color: popupInfo.points === "+0 point" ? "#d32f2f" : "#388e3c" }}>
        {popupInfo.points}
      </h1>
{popupInfo.responseTime && (
  <p style={{ fontSize: 16, color: "#444", marginBottom: 6 }}>
    ⏱️ Réponse en {popupInfo.responseTime}
  </p>
)}
      {trackImages[currentTrack.uri] && (
  <img
    src={trackImages[currentTrack.uri]}
    alt="Pochette album"
    style={{
      width: 160,
      height: 160,
      borderRadius: 12,
      objectFit: "cover",
      marginBottom: 20,
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
    }}
  />
)}

      <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
        {popupInfo.theme ? `${popupInfo.theme} - ` : ""}{popupInfo.titre} {popupInfo.annee ? `(${popupInfo.annee})` : ""}
      </p>
      {popupInfo.compositeur && (
        <p style={{ fontStyle: "italic", color: "#555", marginTop: 6 }}>
          par {popupInfo.compositeur}
        </p>
      )}

{isAdmin ? (
  <button 
    onClick={handleNext}
    style={nextButtonStyle}
    disabled={roundEndedRef.current === false}
  >
    🎵 Round suivant ({playersReady} / {players.length})
  </button>
) : (
  <div
    style={{
      ...nextButtonStyle,
      backgroundColor: "#ccc",
      color: "#666",
      cursor: "not-allowed",
      textAlign: "center",
      display: "inline-block"
    }}
  >
    ⏳ En attente de l’admin ({playersReady} / {players.length})
  </div>
)}
    </div>
  </div>
)}

{showEndPopup && (
  <div style={popupOverlayStyle}>
    <div style={{ 
      ...popupStyle, 
      minWidth: 320, 
      paddingBottom: 24 
    }}>
      <h2 style={{ fontSize: 28, marginBottom: 6 }}>Fin de la partie !</h2>

      {finalScores.length > 0 && (
        <p style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>
          Le gagnant est : {finalScores[0].name}
        </p>
      )}

      <div style={{
        backgroundColor: "#f2f2f2",
        borderRadius: 12,
        padding: "10px 16px",
        marginBottom: 20,
        width: "100%",
        boxSizing: "border-box"
      }}>
        {finalScores.map((p, i) => {
          const isMe = p.name === playerName;
          return (
            <div
              key={p.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 8px",
                backgroundColor: isMe ? "#f7b733" : "transparent",
                borderRadius: 8,
                fontWeight: isMe ? "bold" : "normal",
                marginBottom: 4
              }}
            >
              <span>{i + 1}. {p.name}</span>
              <span>{p.score} pts</span>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 12, fontSize: 16, color: "#333" }}>
        Votre temps de réponse moyen est de {averageTime} sec
      </p>

      <button
        onClick={() => {
          setShowEndPopup(false);
          navigate("/");
        }}
        style={{
          ...nextButtonStyle,
          padding: "10px 18px",
          fontSize: 16
        }}
      >
        Quitter
      </button>
    </div>
  </div>
)}


    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  background: "#f7b733",
  color: "#1c2541",
  fontWeight: "bold",
  cursor: "pointer"
};

const buzzButtonStyle = {
  padding: "15px 40px",
  fontSize: 24,
  borderRadius: 30,
  background: "#f7b733",
  color: "#1c2541",
  border: "none",
  cursor: "pointer"
};

const inputStyle = {
  padding: 10,
  fontSize: 16,
  borderRadius: 10,
  width: 300,
  backgroundColor: "#fff",
  transition: "background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease"
};

const validateButtonStyle = {
  marginRight: 10,
  padding: "10px 20px",
  borderRadius: 10,
  background: "#4caf50",
  color: "white",
  border: "none",
  fontWeight: "bold",
  cursor: "pointer"
};

const cancelButtonStyle = {
  padding: "10px 20px",
  borderRadius: 10,
  background: "#f44336",
  color: "white",
  border: "none",
  fontWeight: "bold",
  cursor: "pointer"
};

const indiceBoxStyle = {
  background: "#fff",
  color: "#1c2541",
  borderRadius: "20px",
  padding: "6px 12px",
  display: "flex",
  alignItems: "center",
  fontSize: 14,
  fontWeight: 500,
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const indiceButtonStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer"
};

const popupOverlayStyle = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999
};

const popupStyle = {
  background: "#fff",
  padding: "30px 40px",
  borderRadius: "20px",
  textAlign: "center",
  color: "#1c2541",
  maxWidth: 480,
  width: "90%",
  boxShadow: "0 0 20px rgba(0,0,0,0.4)",
  fontFamily: "Arial, sans-serif"
};

const nextButtonStyle = {
  marginTop: 30,
  padding: "12px 30px",
  fontSize: 16,
  borderRadius: 10,
  background: "#f7b733",
  color: "#1c2541",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
};

export default GamePage;