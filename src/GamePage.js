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
  const [readyPlayersInfo, setReadyPlayersInfo] = useState([]);
  
const roundsWonRef = useRef(roundsWon);
useEffect(() => {
  roundsWonRef.current = roundsWon;
}, [roundsWon]);

const playerNameRef = useRef(playerName);
useEffect(() => {
  playerNameRef.current = playerName;
}, [playerName]);

const playlistRef = useRef(playlist);
useEffect(() => {
  playlistRef.current = playlist;
}, [playlist]);

const paramsRef = useRef(params);
useEffect(() => {
  paramsRef.current = params;
}, [params]);

const scoreRef = useRef(score);
useEffect(() => {
  scoreRef.current = score;
}, [score]);

useEffect(() => {
  fetch("https://blindtest-69h7.onrender.com/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.playerName) {
        console.log("🎵 Récupéré display_name pour la partie :", data.playerName);
        setPlayerName(data.playerName);
        localStorage.setItem("playerName", data.playerName); // pour cohérence
      }
    })
    .catch(err => {
      console.error("❌ Erreur récupération profile dans GamePage :", err);
    });
}, [token]);

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
// Étape 1 : tu gardes ton mapping des noms
const rawPlayers = data.players.map(obj => Object.values(obj)[0]);
setPlayers(rawPlayers);

// Étape 2 : tu construis une map { name: photo }
const photoMap = {};
data.players.forEach(p => {
  if (p.name && p.photo) {
    photoMap[p.name] = p.photo;
  }
});

// Étape 3 : tu construis le scoreboard en réutilisant la map
const localPlayer = localStorage.getItem("playerName");
const initialScoreboard = rawPlayers.map(name => ({
  name,
  photo: photoMap[name] || "/ppDefault.png",
  score: 0,
  isMe: name === localPlayer
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
  // Fermer le popup de fin de round et pauser la musique en cours
  setShowPopup(false);
  handlePause().finally(() => {
    // Attendre 500ms pour être sûr que le player est bien arrêté, puis lancer le nouveau morceau
    setTimeout(() => playCurrentTrack(deviceId), 500);
  });

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
    const totalResponseTime = responseTimesRef.current.reduce((sum, t) => sum + parseFloat(t), 0);
    const averageResponseTime = responseTimesRef.current.length > 0
      ? (totalResponseTime / responseTimesRef.current.length)
      : 0;

    const bestResponseTime = responseTimesRef.current.length > 0
      ? Math.min(...responseTimesRef.current.map(t => parseFloat(t)))
      : null;

    setAverageTime(averageResponseTime.toFixed(1));
    setFinalScores(sorted);
    setShowPopup(false); // Ferme le popup de fin de round si ouvert
    setShowEndPopup(true); // Affiche le popup de fin de partie
      console.log("📤 Envoi des stats de fin de partie :", {
        playerName,
        averageResponseTime,
        roundsPlayed: playlist.length,
        roundsWon,
        bestResponseTime,
        totalScore: score
      });

      fetch("https://blindtest-69h7.onrender.com/update-profile-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerNameRef.current,
          averageResponseTime,
          roundsPlayed: playlistRef.current.length,
          roundsWon: roundsWonRef.current,
          bestResponseTime,
          totalScore: scoreRef.current
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log("📤 Envoi des stats de fin de partie :", {
          playerName: playerNameRef.current,
          averageResponseTime,
          roundsPlayed: playlistRef.current.length,
          roundsWon: roundsWonRef.current,
          bestResponseTime,
          totalScore: score
        });
      })
      .catch(err => {
        console.error("❌ Erreur lors de l'envoi des stats :", err);
      });
  
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
    socket.emit("player-ready", {
      roomId: id,
      playerName,
      previousScore: score,
      responseTime: "-"
    });
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
  socket.on("players-ready-update", ({ ready, total, players }) => {
    setPlayersReady(ready);
    console.log(`✅ Players ready: ${ready}/${total}`, players);
    // Met à jour la liste des joueurs prêts avec détails (si fournie par le serveur)
    if (players) {
      setReadyPlayersInfo(players);
    }
  });
  return () => socket.off("players-ready-update");
}, []);

const handleBuzz = () => {
    pausedTimeRef.current = timeLeft;
    clearInterval(intervalRef.current);
    setIsTimerRunning(false);
    setIsBuzzed(true);
    handlePause().catch(err => console.error("Erreur pause :", err));
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
    const rawTimeLeft = pausedTimeRef.current;
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
    socket.emit("player-ready", {
      roomId: id,
      playerName,
      previousScore: score, // score AVANT ajout
      responseTime: responseTime.toFixed(1)
    });
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
    socket.emit("player-ready", {
      roomId: id,
      playerName,
      previousScore: score,
      responseTime: "-"
    });

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
  <div className="app">
    <SpotifyPlayer token={token} onReady={handleReady} />

{/* HEADER GLOBAL */}
<header style={{
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "0 20px",
  zIndex: 20
}}>
  <img
    src="/logo-line.svg"
    alt="Logo"
    onClick={() => navigate("/")}
    style={{
      height: 40,
      cursor: "pointer"
    }}
  />
</header>

{/* CONTENU CENTRAL */}
<div style={{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  width: "100vw",
  overflow: "hidden"
}}>
  {/* TITRE ROUND */}
  <div style={{
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    marginBottom: 20,
    marginTop: 60 // espace sous le header
  }}>
    ROUND {currentRound} / {playlist.length}
  </div>
      {/* TIMER avec contour dégradé animé */}
<div
  className="timer"
  style={{ "--progress": `${(timeLeft / timer) * 360}deg` }}
>
  <span>{Math.ceil(timeLeft ?? 0)}</span>
</div>

      {/* INDICES */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
{["media", "annee"].map((type, i) => {
  const visible = type === "media" ? showIndiceMedia : showIndiceAnnee;
  const toggle = type === "media" ? () => setShowIndiceMedia(true) : () => setShowIndiceAnnee(true);
  const label = type === "media" ? "Média" : "Année";
  const value = playlist[currentRound - 1]?.[type] || "?";

  return (
    <button key={i} className="indice-button" onClick={toggle}>
      <span>{label}</span>
      <span>
        {visible ? value : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
          </svg>
        )}
      </span>
    </button>
  );
})}
      </div>

      {/* BUZZER ou CHAMP RÉPONSE */}
      <div style={{ marginBottom: 30 }}>
        {!isBuzzed ? (
          <button className="buzz-button" onClick={handleBuzz}>BUZZ</button>
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
              className={`text-input ${isWrongAnswer ? "wrong-answer" : ""}`}
              style={{ width: 300 }}
            />
            {bonusCompositeur && (
              <input
                key={isWrongAnswer ? "wrong-composer-input" : "normal-composer-input"}
                type="text"
                placeholder="Compositeur (facultatif)"
                value={composerGuess}
                onChange={(e) => setComposerGuess(e.target.value)}
                className={`text-input ${isWrongAnswer ? "wrong-answer" : ""}`}
                style={{ width: 300 }}
              />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-confirm"
                onClick={handleValidate}
                disabled={!answer && (!bonusCompositeur || !composerGuess)}
              >
                Valider
              </button>
              <button
                className="btn btn-cancel"
                onClick={() => {
                  setIsBuzzed(false);
                  setAnswer("");
                  setComposerGuess("");
                  setIsTimerRunning(true);
                  handlePlay();
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCOREBOARD */}
{Array.isArray(scoreboard) && scoreboard.every(p => typeof p === "object" && typeof p.name === "string") && (
  <div className="scoreboard-popup">
    <h3>Scores</h3>
    {scoreboard.map((p, i) => {
      const isMe = p.name === playerName;
      return (
        <div
          key={i}
          className={`scoreboard-entry${isMe ? " me" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "6px 8px",
            borderRadius: 8,
            background: isMe ? "var(--gradient-main)" : "transparent",
            color: "#fff",
            fontWeight: isMe ? "bold" : "normal"
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <img
                src={p.photo || "/ppDefault.png"}
                alt="Avatar"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transform: "translateY(40%)"
                }}
              />
            </div>
            <span>{p.name}</span>
          </div>
          <span>{typeof p.score === "number" ? p.score : 0}</span>
        </div>
      );
    })}
  </div>
)}
    </div>

{showPopup && popupInfo && (
  <div className="popup-rep-overlay">
    <div className="popup-rep">
      <h2 style={{ fontSize: 26 }}>{popupInfo.title}</h2>

      <h1 style={{ fontSize: 48, color: popupInfo.points === "+0 point" ? "#d32f2f" : "#388e3c" }}>
        {popupInfo.points}
      </h1>

      {popupInfo.responseTime && (
        <p style={{ fontSize: 16, color: "#ccc", marginBottom: 6 }}>
          ⏱ Réponse en {popupInfo.responseTime}
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

      <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#fff" }}>
        {popupInfo.theme ? `${popupInfo.theme} - ` : ""}
        {popupInfo.titre} {popupInfo.annee ? `(${popupInfo.annee})` : ""}
      </p>

      {popupInfo.compositeur && (
        <p style={{ fontStyle: "italic", color: "#ccc", marginTop: 6 }}>
          par {popupInfo.compositeur}
        </p>
      )}

      {/* ✅ Résumé du round */}
      <div style={{
        backgroundColor: "#1e1a3a",
        borderRadius: 8,
        padding: "10px 16px",
        margin: "20px 0",
        textAlign: "left"
      }}>
        <h4 style={{ 
          marginTop: 0, 
          marginBottom: 12, 
          color: "#b494f8", 
          textAlign: "center", 
          fontSize: 18, 
          fontWeight: "bold"
        }}>
          Scores
        </h4>

        {scoreboard.map(player => {
  const detail = readyPlayersInfo.find(p => p.name === player.name);
  const currentScore = player.score;
  const delta = detail ? currentScore - detail.previousScore : null;
  const isMe = player.name === playerName;

  return (
    <div
      key={player.name}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
        padding: "6px 8px",
        background: isMe ? "var(--gradient-main)" : "transparent",
        color: isMe ? "#fff" : "#fff",
        borderRadius: 8,
        fontWeight: isMe ? "bold" : "normal"
      }}
    >
      {/* Nom + avatar à gauche */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <img
            src={player.photo || "/ppDefault.png"}
            alt="Avatar"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: "translateY(40%)"
            }}
          />
        </div>
        <span>{player.name}</span>
      </div>

      {/* Score + bonus à droite */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <span>{currentScore} pts</span>
        {detail && (
          <span style={{
            marginLeft: 8,
            color: delta > 0 ? "#388e3c" : "#d32f2f",
            fontWeight: "bold"
          }}>
            ({delta >= 0 ? `+${delta}` : delta})
          </span>
        )}
        {detail?.responseTime && (
          <span style={{
            marginLeft: 8,
            fontSize: 14,
            color: "#ccc"
          }}>
            ⏱ {detail.responseTime === "-" ? "-" : `${parseFloat(detail.responseTime).toFixed(1)}s`}
          </span>
        )}
      </div>
    </div>
  );
})}

      </div>

      {/* ✅ Bouton ou attente admin */}
{isAdmin ? (
        <button className="btn btn-confirm" onClick={handleNext} disabled={!roundEndedRef.current}>
          Round suivant ({playersReady} / {players.length})
        </button>
      ) : (
        <div className="btn btn-cancel" style={{
          pointerEvents: "none",
          background: "transparent",
          color: "#aaa",
          cursor: "default"
        }}>
          En attente de l’admin ({playersReady} / {players.length})
        </div>
      )}
    </div>
  </div>
)}

{showEndPopup && (
  <div className="popup-rep-overlay">
    <div className="popup-rep" style={{ paddingBottom: 24 }}>
      <h2 style={{ fontSize: 28, marginBottom: 6 }}>Fin de la partie !</h2>

      {/* Affichage du gagnant avec avatar */}
      {finalScores.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 20
        }}>
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            overflow: "hidden",
            marginBottom: 8
          }}>
            <img
              src={finalScores[0].photo || "/ppDefault.png"}
              alt="Avatar gagnant"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: "translateY(40%)"
              }}
            />
          </div>
          <p style={{ fontSize: 20, fontWeight: "bold", color: "#fff", margin: 0 }}>
            Le gagnant est : {finalScores[0].name}
          </p>
        </div>
      )}

      {/* Liste des scores */}
      <div style={{
        backgroundColor: "#1e1a3a",
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
                alignItems: "center",
                padding: "6px 8px",
                background: isMe ? "var(--gradient-main)" : "transparent",
                borderRadius: 8,
                fontWeight: isMe ? "bold" : "normal",
                marginBottom: 4,
                color: "#fff"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <img
                    src={p.photo || "/ppDefault.png"}
                    alt="Avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      transform: "translateY(40%)"
                    }}
                  />
                </div>
                <span>{i + 1}. {p.name}</span>
              </div>
              <span>{p.score} pts</span>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 12, fontSize: 16, color: "#ccc" }}>
        Votre temps de réponse moyen est de {averageTime} sec
      </p>

      <button
        onClick={() => {
          setShowEndPopup(false);
          navigate("/");
        }}
        className="btn btn-confirm"
        style={{ padding: "10px 18px", fontSize: 20 }}
      >
        Quitter
      </button>
    </div>
  </div>
)}

    </div>
  );
}
export default GamePage;