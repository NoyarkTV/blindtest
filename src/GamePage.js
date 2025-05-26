// 🚀 Version GamePage avec gestion du timer + lecture Spotify auto
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SpotifyPlayer from "./SpotifyPlayer";

function GamePage() {
  const navigate = useNavigate();
  const savedParams = JSON.parse(localStorage.getItem("blindtestParams")) || {};
  const [timer, setTimer] = useState(savedParams.time || 30);
  const [timeLeft, setTimeLeft] = useState(savedParams.time || 30);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(savedParams.nbRounds || 10);
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
    document.body.style.backgroundColor = "#1e2a38";
    document.body.style.color = "white";
    fetch("https://blindtest-69h7.onrender.com/get-token")
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          setAccessToken(data.access_token);
        }
      });
    fetchNewTrack();
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
      console.log("🧠 AutoPlay lancé avec :", track.uri);
      playTrack(track.uri);
      setAutoPlay(false);
    }
  }, [track, accessToken, deviceId, autoPlay]);

  function fetchNewTrack() {
    fetch("https://blindtest-69h7.onrender.com/random-track")
      .then((res) => res.json())
      .then((data) => {
        console.log("🎧 Nouveau track reçu :", data);
        setTrack(data);
        setAutoPlay(true);
      })
      .catch((err) => console.error("Erreur musique :", err));
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
  roundEndedRef.current = false;
  setShowPopup(false);
  setStartTime(Date.now());
  nextRound();
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

  function nextRound() {
    if (currentRound >= totalRounds) {
      alert("Partie terminée ! Score : " + score);
      navigate("/config");
    } else {
      wrongAttemptsRef.current = 0;
      setCurrentRound((r) => r + 1);
      setTimeLeft(timer);
      setAnswerVisible(false);
      setPaused(false);
      setMusicPaused(false);
      setShowIndiceMedia(false);
      setShowIndiceAnnee(false);
      setAnswer("");
      setComposer("");
      fetchNewTrack();
    }
  }

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  return (
    <div style={{ textAlign: "center", paddingTop: 50 }}>
      <h1 style={{ color: "#f7b733", fontFamily: "Luckiest Guy" }}>Round {currentRound} / {totalRounds}</h1>
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

      {!answerVisible ? (
        <button
          onClick={handleBuzz}
          style={{ padding: "15px 40px", fontSize: 24, borderRadius: 30, background: "#f7b733", color: "#1e2a38", border: "none", cursor: "pointer" }}
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
  onKeyDown={(e) => {
    if (e.key === "Enter") submitAnswer();
  }}
  ref={answerInputRef}
  style={{ padding: 10, fontSize: 16, borderRadius: 10, width: 300 }}
/>
          {includeComposer && (
            <input
              type="text"
              placeholder="Compositeur (facultatif)"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              style={{ padding: 10, fontSize: 16, borderRadius: 10, width: 300 }}
            />
          )}
          <div>
            <button
              onClick={submitAnswer}
              disabled={!answer && (!includeComposer || !composer)}
              style={{ marginRight: 10, padding: "10px 20px", borderRadius: 10, background: "#4caf50", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
            >
              Valider
            </button>
            <button
              onClick={cancelAnswer}
              style={{ padding: "10px 20px", borderRadius: 10, background: "#f44336", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, fontSize: 20 }}>Score : {score} pts</div>

<div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
  {/* Média */}
  <div style={{
    background: "#fff", color: "#1e2a38", borderRadius: "20px", padding: "6px 12px", display: "flex",
    alignItems: "center", fontSize: 14, fontWeight: 500, boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
  }}>
    <span style={{ marginRight: 8 }}>Média :</span>
    {!showIndiceMedia ? (
      <button onClick={() => setShowIndiceMedia(true)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/>
          <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
          <path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/>
        </svg>
      </button>
    ) : (
      <span>{track?.media || "?"}</span>
    )}
  </div>

  {/* Année */}
  <div style={{
    background: "#fff", color: "#1e2a38", borderRadius: "20px", padding: "6px 12px", display: "flex",
    alignItems: "center", fontSize: 14, fontWeight: 500, boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
  }}>
    <span style={{ marginRight: 8 }}>Année :</span>
    {!showIndiceAnnee ? (
      <button onClick={() => setShowIndiceAnnee(true)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/>
          <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
          <path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/>
        </svg>
      </button>
    ) : (
      <span>{track?.annee || "?"}</span>
    )}
  </div>
</div>



{showPopup && popupInfo && (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999
  }}>
    <div style={{
      background: "#fff",
      padding: "30px 40px",
      borderRadius: "20px",
      textAlign: "center",
      color: "#1e2a38",
      maxWidth: 480,
      width: "90%",
      boxShadow: "0 0 20px rgba(0,0,0,0.4)",
      fontFamily: "Arial, sans-serif"
    }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 26 }}>{popupInfo.title}</h2>
      <h1 style={{ margin: "0 0 20px", fontSize: 48, color: popupInfo.points === "+0 point" ? "#d32f2f" : "#388e3c" }}>
        {popupInfo.points}
      </h1>

      {popupInfo.image && (
        <img
          src={popupInfo.image}
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
        {popupInfo.theme ? `${popupInfo.theme} de ` : ""}{popupInfo.titre} {popupInfo.annee ? `(${popupInfo.annee})` : ""}
      </p>
      {popupInfo.compositeur && (
        <p style={{ fontStyle: "italic", color: "#555", marginTop: 6 }}>
          par {popupInfo.compositeur}
        </p>
      )}

      <button onClick={handleNextRoundPopup} style={{
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
      }}>
        🎵 Round suivant
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