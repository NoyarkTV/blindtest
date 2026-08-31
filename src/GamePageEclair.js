import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SpotifyPlayer from "./SpotifyPlayer";
import socket from "./socket";
import { isAcceptedTitle } from "./answerUtils";
import { RoundResultModal, EndGameModal } from "./BlindtestUI";

function GamePageEclair() {
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
  const [isBuzzed, setIsBuzzed] = useState(true);
  const [answer, setAnswer] = useState("");
  const [composer, setComposer] = useState("");
  const [composerGuess, setComposerGuess] = useState("");
  const [score, setScore] = useState(0);
  const answerInputRef = useRef(null);
  const [composerAttempts, setComposerAttempts] = useState(0); // max 2 tentatives
  const roundEndedRef = useRef(false);
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  
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
  const [endInsights, setEndInsights] = useState([]);
  const [endSummaryPlayers, setEndSummaryPlayers] = useState([]);
  const [preloadedImages, setPreloadedImages] = useState({});
  const [trackImages, setTrackImages] = useState({});
  const responseTimesRef = useRef([]);
  const [averageTime, setAverageTime] = useState(null);
  const isVerifyingRef = useRef(false);
  const [playersReady, setPlayersReady] = useState(0);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [isWrongAnswer, setIsWrongAnswer] = useState(false);
  const [roundsWon, setRoundsWon] = useState(0);
  const [readyPlayersInfo, setReadyPlayersInfo] = useState([]);
  const scoreboardRef = useRef([]);
  
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
        console.log("📦 Brut players reçus :", data.players);

        const rawPlayersFull = data.players; // ✅ correction ici
        console.log("🔍 Players extraits (objects):", rawPlayersFull);

        const rawPlayers = rawPlayersFull.map(p => p.name);
        console.log("👤 Noms extraits :", rawPlayers);
        setPlayers(rawPlayers);
        setPlayersTotal(data.activePlayerCount ?? rawPlayers.length);

        const photoMap = {};
        rawPlayersFull.forEach(p => {
          if (p.name && p.photo) {
            photoMap[p.name] = p.photo;
          }
        });
        console.log("🖼️ photoMap généré :", photoMap);

        const localPlayer = localStorage.getItem("playerName");
        const initialScoreboard = rawPlayers.map(name => ({
          name,
          photo: photoMap[name] || "/ppDefault.png",
          score: 0,
          isMe: name === localPlayer
        }));
        console.log("📊 Scoreboard initial :", initialScoreboard);
        setScoreboard(initialScoreboard);

        fetch(`https://blindtest-69h7.onrender.com/scores/${id}`)
          .then(res => res.json())
          .then(scores => {
            if (Array.isArray(scores)) {
              console.log("📥 Scores initiaux récupérés :", scores);

              const updatedScoreboard = scores.map(p => ({
                ...p,
                photo: photoMap[p.name] || "/ppDefault.png",
                isMe: p.name === localPlayer
              }));

              console.log("✅ Scoreboard final fusionné :", updatedScoreboard);
              setScoreboard(updatedScoreboard);

              const ownScore = scores.find(p => p.name === localPlayer);
              if (ownScore) setScore(Number(ownScore.score) || 0);

              const readyNames = Array.isArray(data.playersReady) ? data.playersReady : [];
              setPlayersReady(readyNames.length);
              setPlayersTotal(data.activePlayerCount ?? rawPlayers.length);
              if (readyNames.includes(localPlayer)) {
                roundEndedRef.current = true;
                setIsTimerRunning(false);
                const detail = data.roundResults?.[localPlayer];
                const previousScore = Number(detail?.previousScore) || 0;
                const gained = Math.max(0, (Number(ownScore?.score) || 0) - previousScore);
                setPopupInfo({
                  title: "Réponse déjà enregistrée",
                  points: `+${gained} point${gained > 1 ? "s" : ""}`,
                  responseTime: detail?.responseTime && detail.responseTime !== "-" ? `${detail.responseTime} sec` : null,
                  theme: "", titre: "", annee: "", compositeur: "", image: null
                });
                setShowPopup(true);
              }
            }
          })
          .catch(err => console.warn("⚠️ Pas de scores initiaux :", err));
      }
    })
    .catch(err => console.error("❌ Erreur lors de la récupération des joueurs :", err));
}, [id]);

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

    // ✅ Utiliser la ref pour garantir la bonne version du scoreboard
    const sorted = [...scoreboardRef.current].sort((a, b) => b.score - a.score);
    setFinalScores(sorted);

    setShowPopup(false);
    setShowEndPopup(true);

    fetch(`https://blindtest-69h7.onrender.com/game-summary/${id}`)
      .then(res => res.ok ? res.json() : { insights: [], players: [] })
      .then(data => {
        setEndInsights(Array.isArray(data.insights) ? data.insights : []);
        setEndSummaryPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch(() => {
        setEndInsights([]);
        setEndSummaryPlayers([]);
      });
    handlePause();
    return;
  }

  wrongAttemptsRef.current = 0;
  basePointsRef.current = 100;
  setTimeLeft(params.time);
  setShowIndiceMedia(false);
  setShowIndiceAnnee(false);

  setShowPopup(false);
  handlePause().finally(() => {
    setTimeout(() => playCurrentTrack(deviceId), 500);
  });

  roundEndedRef.current = false;

  console.log("🔍 Contenu de scoreboard :", scoreboardRef.current);
}, [currentRound]);

useEffect(() => {
  setShowPopup(false);
  setIsBuzzed(true); // mode éclair : champs de réponse toujours visibles
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
}, [deviceId, playlist, isPlaying]);

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

    const totalResponseTime = responseTimesRef.current.reduce((sum, t) => sum + parseFloat(t), 0);
    const averageResponseTime = responseTimesRef.current.length > 0
      ? (totalResponseTime / responseTimesRef.current.length)
      : 0;

    const bestResponseTime = responseTimesRef.current.length > 0
      ? Math.min(...responseTimesRef.current.map(t => parseFloat(t)))
      : null;

    setAverageTime(averageResponseTime.toFixed(1));

    const enriched = scores.map(p => {
      const previous = scoreboardRef.current.find(e => e.name === p.name);
      return {
        ...p,
        photo: p.photo || previous?.photo || "/ppDefault.png",
        isMe: p.name === playerNameRef.current
      };
    });

    const sorted = enriched.sort((a, b) => b.score - a.score);
    setFinalScores(sorted);

    setShowPopup(false);
    setShowEndPopup(true);

    fetch(`https://blindtest-69h7.onrender.com/game-summary/${id}`)
      .then(res => res.ok ? res.json() : { insights: [], players: [] })
      .then(data => {
        setEndInsights(Array.isArray(data.insights) ? data.insights : []);
        setEndSummaryPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch(() => {
        setEndInsights([]);
        setEndSummaryPlayers([]);
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
        totalScore: scoreRef.current,
        responseCount: responseTimesRef.current.length
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Stats envoyées avec succès :", data);
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
    handlePause();
  }
}, [timeLeft]);

useEffect(() => {
  socket.on("score-update", (updatedScores) => {
    console.log("📊 Scoreboard mis à jour :", updatedScores);

    setScoreboard(prev => {
      return updatedScores.map(p => {
        const previous = prev.find(e => e.name === p.name);
        return {
          ...p,
          photo: p.photo || previous?.photo || "/ppDefault.png",
          isMe: p.name === playerNameRef.current
        };
      });
    });
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
  if (answerInputRef.current) {
    answerInputRef.current.focus();
  }
}, [currentRound]);

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
    setPlayersTotal(total);
    console.log(`✅ Players ready: ${ready}/${total}`, players);
    // Met à jour la liste des joueurs prêts avec détails (si fournie par le serveur)
    if (players) {
      setReadyPlayersInfo(players);
    }
  });
  return () => socket.off("players-ready-update");
}, []);

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
  if (roundEndedRef.current) return;
  const currentTrack = playlist[currentRound - 1];
  const bonusCompositeur = params.bonusCompositeur ?? false;

  const acceptedTitles = [
    ...(currentTrack.answers || []),
    currentTrack.oeuvre,
    currentTrack.titre
  ].filter(Boolean);
  const isCorrect = isAcceptedTitle(answer, acceptedTitles);

 let composerMatch = false;

  if (bonusCompositeur && currentTrack.compositeur) {
    const guessList = composerGuess.toLowerCase().split(",").map(s => s.trim());
    const real = currentTrack.compositeur.toLowerCase().split(",").map(s => s.trim());
    composerMatch = guessList.some(g => {
      const gNorm = normalize(g);
      return real.some(r => levenshtein(gNorm, normalize(r)) <= 2);
    });
  }

  let points = 0;
  if (isCorrect && composerMatch) points = 100;
  else if (isCorrect) points = 75;
  else if (composerMatch) points = 25;

  const updatedScore = score + points;
  setScore(updatedScore);
  setScoreboard(prev =>
    prev.map(p =>
      p.name === playerName ? { ...p, score: updatedScore } : p
    )
  );

  fetch("https://blindtest-69h7.onrender.com/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, player: playerName, score: updatedScore })
  }).catch(err => console.error("❌ Erreur lors de l'envoi du score :", err));

  setPopupInfo({
    title: isCorrect ? "Bonne r\u00e9ponse" : composerMatch ? "Compositeur correct" : "Mauvaise r\u00e9ponse",
    points: `+${points} points`,
    theme: currentTrack.theme || "",
    titre: currentTrack.oeuvre || currentTrack.titre || "",
    annee: currentTrack.annee || "",
    compositeur: currentTrack.compositeur || "",
    image: preloadedImages[currentTrack.id || currentTrack.titre] || currentTrack.image || null
  });

  roundEndedRef.current = true;
  if (isCorrect) setRoundsWon(prev => prev + 1);
  setShowPopup(true);
  socket.emit("player-ready", { roomId: id, playerName, previousScore: score, responseTime: "-", pointsGained: points, correctTitle: isCorrect, correctComposer: composerMatch, wrongAttempts: 0, mediaHint: showIndiceMedia, yearHint: showIndiceAnnee });
  setAnswer("");
  setComposerGuess("");
};

const handleAbandon = () => {
  const currentTrack = playlist[currentRound - 1];
  setPopupInfo({
    title: "Abandon",
    points: "+0 point",
    theme: currentTrack.theme || "",
    titre: currentTrack.oeuvre || currentTrack.titre || "",
    annee: currentTrack.annee || "",
    compositeur: currentTrack.compositeur || "",
    image: preloadedImages[currentTrack.id || currentTrack.titre] || currentTrack.image || null
  });
  roundEndedRef.current = true;
  setShowPopup(true);
  socket.emit("player-ready", { roomId: id, playerName, previousScore: score, responseTime: "-", pointsGained: 0, correctTitle: false, correctComposer: false, wrongAttempts: 0, mediaHint: showIndiceMedia, yearHint: showIndiceAnnee });
  setAnswer("");
  setComposerGuess("");
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

  // Les champs de réponse doivent rester affichés
  setIsBuzzed(true);
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

      {/* CHAMPS RÉPONSE */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <input
            key={isWrongAnswer ? "wrong-composer-input" : "normal-composer-input"}
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
              key={isWrongAnswer ? "wrong" : "normal"}
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
              onClick={handleAbandon}
            >
              Abandonner
            </button>
          </div>
          </div>
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
  <RoundResultModal popupInfo={popupInfo} image={trackImages[currentTrack?.uri] || popupInfo.image} scoreboard={scoreboard} readyPlayersInfo={readyPlayersInfo} playerName={playerName} isAdmin={isAdmin} playersReady={playersReady} playersTotal={playersTotal || players.length} canNext={roundEndedRef.current} onNext={handleNext} />
)}
{showEndPopup && (
  <EndGameModal finalScores={finalScores} summaryPlayers={endSummaryPlayers} insights={endInsights} playerName={playerName} onQuit={() => { setShowEndPopup(false); navigate("/"); }} />
)}

    </div>
  );
}
export default GamePageEclair;