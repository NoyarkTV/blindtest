import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SpotifyPlayer from "./SpotifyPlayer";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

function GamePage() {
  const navigate = useNavigate();
  const savedParams = JSON.parse(localStorage.getItem("blindtestParams")) || {};
  const [timer, setTimer] = useState(savedParams.time || 30);
  const [timeLeft, setTimeLeft] = useState(savedParams.time || 30);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [composer, setComposer] = useState("");
  const [track, setTrack] = useState(null);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [musicPaused, setMusicPaused] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const answerInputRef = useRef(null);
  const [showIndiceMedia, setShowIndiceMedia] = useState(false);
  const [showIndiceAnnee, setShowIndiceAnnee] = useState(false);
  const indiceOuvert = showIndiceMedia || showIndiceAnnee;
  const [startTime, setStartTime] = useState(null); // au début du morceau
  const [composerAttempts, setComposerAttempts] = useState(0); // max 2 tentatives
  const basePointsRef = useRef(0);
  const roundEndedRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  const { id } = useParams();
  const [playlist, setPlaylist] = useState([]);
  const socket = io("https://blindtest-69h7.onrender.com");
  const playerName = localStorage.getItem("playerName") || "Joueur";
  const [scoreboard, setScoreboard] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [finalRanking, setFinalRanking] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  const buzzButtonStyle = {
  padding: "15px 40px",
  fontSize: 24,
  borderRadius: 30,
  background: "#f7b733",
  color: "#1e2a38",
  border: "none",
  cursor: "pointer"
};

const inputStyle = {
  padding: 10,
  fontSize: 16,
  borderRadius: 10,
  width: 300
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
  color: "#1e2a38",
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
  color: "#1e2a38",
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
  color: "#1e2a38",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
};


  useEffect(() => {
  socket.emit("join-room", id);

  socket.on("score-update", updatedScores => {
  if (Array.isArray(updatedScores)) {
    setScoreboard(updatedScores);
  } else {
    console.warn("⚠️ Données de score malformées :", updatedScores);
  }
});

  return () => socket.disconnect();
}, [id]);

function computeBasePoints() {
  const ratio = Math.min(1, timeLeft / timer); // timer restant
  let points = 100 * ratio;

  const multiplier = showIndiceMedia && showIndiceAnnee
    ? 0.6 : (showIndiceMedia || showIndiceAnnee)
    ? 0.8 : 1;

  return Math.ceil(points * multiplier);
}


  const includeComposer = savedParams.bonusCompositeur || false;

function showEndPopup({ success, points }) {
  const data = {
    title: success ? "Bonne réponse !" : "Fin du timer",
    points: `+${points} point${points > 1 ? "s" : ""}`,
    titre: track.titre,
    theme: track.theme,
    compositeur: track.compositeur,
    annee: track.annee,
    image: track.image
  };
  setPopupInfo(data);
  setShowPopup(true);
}
useEffect(() => {
  if (showPopup && popupInfo) {
    // On envoie le score *actuel* seulement une fois à l'affichage du popup
    fetch("https://blindtest-69h7.onrender.com/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, player: playerName, score })
    });
  }
}, [showPopup, popupInfo]);


useEffect(() => {
  document.body.style.backgroundColor = "#1e2a38";
  document.body.style.color = "white";

  const token = localStorage.getItem("spotify_token");
  if (token) {
    setAccessToken(token);
  }

  // 🔽 Récupération des infos de partie
  fetch(`https://blindtest-69h7.onrender.com/game/${id}`)
    .then(res => res.json())
    .then(data => {
      console.log("🎮 Données de la partie :", data);
      setPlaylist(data.playlist || []);
      setTrack(data.playlist?.[0] || null); // premier morceau
      setAutoPlay(true);
      setTimer(data.config.time || 30);
      setTimeLeft(data.config.time || 30);
      setTotalRounds(data.config.nbRounds || 10);
      setIsAdmin(data.admin === playerName);
    })
    .catch(err => {
      console.error("Erreur récupération partie :", err);
      navigate("/"); // fallback si erreur
    });
}, []);


useEffect(() => {
  if (!paused && !answerVisible && timeLeft > 0) {
    timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
  }

  if (timeLeft === 0 && !answerVisible && !roundEndedRef.current) {
    roundEndedRef.current = true;
    showEndPopup({ success: false, points: 0 });
  }

  return () => clearTimeout(timerRef.current);
}, [timeLeft, paused, answerVisible]);


useEffect(() => {
  if (track && accessToken && deviceId && autoPlay) {
    console.log("▶️ Lecture demandée pour :", track.uri);
    playTrack(track.uri);
    setAutoPlay(false);
  }
}, [track, accessToken, deviceId, autoPlay]);


function updateTrack(roundNumber) {
  const index = roundNumber - 1; // ✅ conversion round humain → index tableau
  const next = playlist[index];
  if (!next) return alert("❌ Aucun morceau trouvé pour ce round");

  setTrack(next);

  if (accessToken && deviceId) {
    setAutoPlay(true);
  } else {
    const interval = setInterval(() => {
      if (accessToken && deviceId) {
        setAutoPlay(true);
        clearInterval(interval);
      }
    }, 200);
    setTimeout(() => clearInterval(interval), 5000);
  }
}


  function pausePlayback() {
  fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }).catch(err => console.error("Erreur pause :", err));
}



function resumePlayback() {
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }).catch(err => console.error("Erreur reprise :", err));
}


 function playTrack(uri) {
  console.log("▶️ Lecture demandée :", uri);
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris: [uri] })
  }).catch(err => console.error("Erreur de lecture :", err));
}

  function handleBuzz() {
    basePointsRef.current = computeBasePoints();
    setPaused(true);
    setMusicPaused(true); // simulation pause musique
    setAnswerVisible(true);
    pausePlayback()

      setTimeout(() => {
    answerInputRef.current?.focus();
  }, 100); // petit délai pour s'assurer que le champ est visible
  }
  
function handleNextRoundPopup() {
  console.log("✅ handleNextRoundPopup déclenché");
  roundEndedRef.current = false;
  setShowPopup(false);
  setStartTime(Date.now());

  if (isAdmin) {
    console.log("📡 Envoi socket next-round depuis admin, roomId :", id);
    socket.emit("next-round", { roomId: id, player: localStorage.getItem("playerName") });
  }
}

  function handleKeyDown(e) {
    if (e.key === " " && !answerVisible) {
      e.preventDefault();
      handleBuzz();
    } else if (e.key === "Escape" && answerVisible) {
      cancelAnswer();
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

function submitAnswer() {
  if (!track) return;

  const base = Math.max(0, basePointsRef.current);
  const malus = wrongAttemptsRef.current * 20;
  const finalPoints = Math.max(0, base - malus);

  const acceptedTitles = track.answers.map(normalize);
  const acceptedComposers = track.compositeur
    .split(",")
    .map(c => normalize(c.trim()))
    .filter(Boolean);

  const titreValid = acceptedTitles.includes(normalize(answer));
  const compositeurValid = includeComposer && composer && acceptedComposers.includes(normalize(composer));

  if (!answer && !composer) return;

  // ✅ Cas 1 : titre ET compositeur valides
  if (titreValid && compositeurValid) {
    const total = finalPoints + 20;
    setScore(prev => prev + total);
    roundEndedRef.current = true;
    return showEndPopup({ success: true, points: total, track });
  }

  // ✅ Cas 2 : titre seul
  if (titreValid) {
    setScore(prev => prev + finalPoints);
    roundEndedRef.current = true;
    return showEndPopup({ success: true, points: finalPoints, track });
  }

  // ✅ Cas 3 : compositeur seul
  if (compositeurValid) {
    setScore(prev => prev + 20);
    roundEndedRef.current = true;
    return showEndPopup({ success: true, points: 20, track });
  }

  // ❌ Cas 4 : erreur sur le compositeur
  if (composer && includeComposer && !compositeurValid) {
    const newAttempts = composerAttempts + 1;
    setComposerAttempts(newAttempts);

    if (newAttempts >= 2) {
      return showEndPopup({ success: false, points: 0, track, message: "Pas de bonus compositeur" });
    } else {
      return cancelAnswer(); // musique reprend
    }
  }

  // ❌ Cas 5 : mauvaise réponse sur le titre — on enregistre l’erreur
  wrongAttemptsRef.current += 1;
  cancelAnswer();
}



  function cancelAnswer() {
    setAnswerVisible(false);
    setPaused(false);
    setMusicPaused(false); // simulation reprise musique
    setAnswer("");
    setComposer("");
    resumePlayback();
  }

// function nextRound() {
//   console.log("🟢 nextRound() appelée — currentRound =", currentRound, "totalRounds =", totalRounds);

//   if (currentRound >= totalRounds) {
//     console.log("🔴 Partie terminée, redirection");
//     alert("Partie terminée ! Score : " + score);
//     localStorage.setItem("spotify_token", accessToken);
//     navigate("/config");
//   } else {
//     console.log("➡️ Passage au round", currentRound + 1);
//     wrongAttemptsRef.current = 0;
//     const next = currentRound + 1;

//     setCurrentRound(next);
//     setTimeLeft(timer);
//     setAnswerVisible(false);
//     setPaused(false);
//     setMusicPaused(false);
//     setShowIndiceMedia(false);
//     setShowIndiceAnnee(false);
//     setAnswer("");
//     setComposer("");

//     updateTrack(next);
//   }
// }

function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  useEffect(() => {
  if (!socket) {
    console.warn("⛔ Aucun socket défini au moment du useEffect round-update");
    return;
  }

  const handleRoundUpdate = ({ round, track, isLast }) => {
    console.log("🔄 Nouveau round reçu :", round, track, "fin de partie ?", isLast);

    setCurrentRound(round);
    setTrack(track);
    console.log("🎯 Nouveau morceau reçu côté client :", track?.titre || "[aucun titre]");

    setTimeLeft(timer);
    setAnswerVisible(false);
    setPaused(false);
    setMusicPaused(false);
    setShowIndiceMedia(false);
    setShowIndiceAnnee(false);
    setAnswer("");
    setComposer("");

    setAutoPlay(true);

    if (isLast) {
      const finalScores = [...scoreboard].sort((a, b) => b.score - a.score);
      setFinalRanking(finalScores);
      setGameOver(true);
    }
  };

  socket.on("round-update", handleRoundUpdate);

  return () => {
    socket.off("round-update", handleRoundUpdate);
  };
}, [socket, timer, scoreboard]);


return (
  <div style={{ display: "flex", minHeight: "100vh", position: "relative", background: "#1e2a38" }}>
    
    {/* SCOREBOARD */}
    <div style={{
      position: "fixed",
      right: 20,
      top: 20,
      background: "#fff",
      color: "#1e2a38",
      padding: 12,
      borderRadius: 12,
      width: 200,
      boxShadow: "0 0 10px rgba(0,0,0,0.3)",
      fontSize: 14,
      zIndex: 10
    }}>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>🏆 Scoreboard</div>
      {scoreboard.map((p, i) => (
        <div
          key={i}
          style={{
            fontWeight: p.name === playerName ? "bold" : "normal",
            backgroundColor: p.name === playerName ? "#f7b733" : "transparent",
            padding: "4px 6px",
            borderRadius: 6,
            display: "flex",
            justifyContent: "space-between"
          }}
        >
          <span>{p.name}</span>
          <span>{p.score}</span>
        </div>
      ))}
    </div>

    {/* ZONE CENTRALE */}
    <div style={{ flex: 1, paddingTop: 60, textAlign: "center", color: "white" }}>
      <h1 style={{ color: "#f7b733", fontFamily: "Luckiest Guy" }}>
        Round {currentRound} / {totalRounds}
      </h1>

      <h1>Round {currentRound}</h1>

      {/* TIMER */}
      <div
        style={{
          width: 120,
          height: 120,
          margin: "20px auto",
          borderRadius: "50%",
          background: `conic-gradient(#f7b733 ${360 * (timeLeft / timer)}deg, #555 ${360 * (timeLeft / timer)}deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          fontWeight: "bold",
          color: "#1e2a38"
        }}
      >
        {timeLeft}
      </div>

      {/* INDICES */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
        {/* Média */}
        <div style={indiceBoxStyle}>
          <span style={{ marginRight: 8 }}>Média :</span>
          {!showIndiceMedia ? (
            <button onClick={() => setShowIndiceMedia(true)} style={indiceButtonStyle}>👁️</button>
          ) : (
            <span>{track?.media || "?"}</span>
          )}
        </div>

        {/* Année */}
        <div style={indiceBoxStyle}>
          <span style={{ marginRight: 8 }}>Année :</span>
          {!showIndiceAnnee ? (
            <button onClick={() => setShowIndiceAnnee(true)} style={indiceButtonStyle}>👁️</button>
          ) : (
            <span>{track?.annee || "?"}</span>
          )}
        </div>
      </div>

      {/* BUZZER / REPONSE */}
      <div style={{ marginTop: 40 }}>
        {!answerVisible ? (
          <button
            onClick={handleBuzz}
            style={buzzButtonStyle}
          >
            BUZZ
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              placeholder="Votre réponse"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
              ref={answerInputRef}
              style={inputStyle}
            />
            {includeComposer && (
              <input
                type="text"
                placeholder="Compositeur (facultatif)"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                style={inputStyle}
              />
            )}
            <div>
              <button
                onClick={submitAnswer}
                disabled={!answer && (!includeComposer || !composer)}
                style={validateButtonStyle}
              >
                Valider
              </button>
              <button
                onClick={cancelAnswer}
                style={cancelButtonStyle}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCORE PERSO */}
      <div style={{ marginTop: 40, fontSize: 20 }}>Score : {score} pts</div>
    </div>

    {/* POPUP NEXT ROUND */}
    {showPopup && popupInfo && (
      <div style={popupOverlayStyle}>
        <div style={popupStyle}>
          <h2 style={{ fontSize: 26 }}>{popupInfo.title}</h2>
          <h1 style={{ fontSize: 48, color: popupInfo.points === "+0 point" ? "#d32f2f" : "#388e3c" }}>
            {popupInfo.points}
          </h1>

          {popupInfo.image && (
            <img
              src={popupInfo.image}
              alt="Pochette album"
              style={{
                width: 160, height: 160, borderRadius: 12, objectFit: "cover",
                marginBottom: 20, boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
              }}
            />
          )}

          <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {popupInfo.theme ? `${popupInfo.theme} de ` : ""}{popupInfo.titre} {popupInfo.annee ? `(${popupInfo.annee})` : ""}
          </p>
          {popupInfo.compositeur && (
            <p style={{ fontStyle: "italic", color: "#555", marginTop: 6 }}>
              par {popupInfo.compositeur}
            </p>
          )}
{isAdmin && (
  <button 
    onClick={handleNextRoundPopup}
    style={nextButtonStyle}
    disabled={roundEndedRef.current === false}
  >
    🎵 Round suivant
  </button>
)}
        </div>
      </div>
    )}

    {/* POPUP FIN DE PARTIE */}
    {gameOver && finalRanking && (
  <div style={popupOverlayStyle}>
    <div style={popupStyle}>
      <h2 style={{ fontSize: 26 }}>🏁 Fin de la partie !</h2>
      <h3 style={{ fontSize: 20, marginBottom: 20 }}>Classement final</h3>
      <div style={{ textAlign: "left", maxHeight: 300, overflowY: "auto", marginBottom: 20 }}>
        {finalRanking.map((p, i) => (
          <div key={i} style={{
            backgroundColor: p.name === playerName ? "#f7b733" : "transparent",
            fontWeight: p.name === playerName ? "bold" : "normal",
            padding: "6px 10px",
            borderRadius: 6,
            display: "flex",
            justifyContent: "space-between"
          }}>
            <span>{i + 1}. {p.name}</span>
            <span>{p.score} pts</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate("/")} style={nextButtonStyle}>
        🔙 Quitter
      </button>
    </div>
  </div>
)}


    <SpotifyPlayer
      token={accessToken}
      onReady={(id) => setDeviceId(id)}
      onError={(err) => console.error("Erreur SDK :", err)}
    />
  </div>
);
}

export default GamePage;