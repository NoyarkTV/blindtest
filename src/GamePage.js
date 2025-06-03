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


const playCurrentTrack = (devId) => {
  const track = playlist[currentRound - 1];
  if (!track?.uri) return;

  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${devId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris: [track.uri] })
  })
    .then(() => {
      setIsPlaying(true);
    })
    .catch(err => console.error("Erreur lecture Spotify :", err));
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
    if (deviceId && playlist.length > 0) {
      playCurrentTrack(deviceId);
    }
  }, [currentRound]);

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
    socket.on("game-over", () => {
      alert("🎉 Fin de la partie !");
      navigate("/");
    });
    return () => socket.off("game-over");
  }, []);

useEffect(() => {
  if (params && playlist.length > 0 && !isBuzzed ) {
    if (timeLeft === null) { // ✅ uniquement si timeLeft est null
      const timer = params.time ?? 30;
      setTimeLeft(timer);
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
  clearInterval(interval);
  roundEndedRef.current = true;
  setShowPopup(true);
  setPopupInfo({
    title: "⏱ Temps écoulé",
    points: "+0 point",
    theme: currentTrack.theme || "",
    titre: currentTrack.oeuvre || currentTrack.titre || "",
    annee: currentTrack.annee || "",
    compositeur: currentTrack.compositeur || "",
    image: currentTrack.image || null
  });
  return 0;
}
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }
}, [params, playlist, currentRound, isBuzzed, timeLeft]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isBuzzed) handleBuzz();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBuzzed]);

    useEffect(() => {
  if (params) {
    console.log("🧪 params reçus :", params);
    console.log("⏱️ Time:", params.Time);
    console.log("🎼 BonusCompositeur:", params.BonusCompositeur);
  }
}, [params]);

  const handleBuzz = () => {
      pausedTimeRef.current = timeLeft; // on garde la valeur
      setIsBuzzed(true);
      handlePause();
  };

const handleValidate = () => {
  setIsBuzzed(false);
  const currentTrack = playlist[currentRound - 1];
  const timer = params.Time ?? 30;
  const bonusCompositeur = params.BonusCompositeur ?? false;

  // 🔤 Normalisation souple des réponses
  const normalize = str =>
    str.toLowerCase()
      .replace(/[^a-z0-9]/gi, '')      // enlève espaces, ponctuation
      .replace(/\s+/g, '');            // supprime les espaces restants

  const normalizedAnswer = normalize(answer);
  const validAnswers = (currentTrack.answers || []).map(a => normalize(a));
  const isCorrect = validAnswers.includes(normalizedAnswer);

  // 🎼 Compositeur bonus
  let bonus = 0;
  let bonusText = "";
  if (bonusCompositeur && currentTrack.compositeur) {
    const guessList = composerGuess.toLowerCase().split(",").map(s => s.trim());
    const realComposers = currentTrack.compositeur.toLowerCase().split(",").map(s => s.trim());
    if (guessList.some(g => realComposers.includes(g))) {
      bonus = 20;
      bonusText = " (+20 bonus compositeur)";
    }
  }

  // 🟢 Bonne réponse
  if (isCorrect) {
    const totalPoints = Math.max(0, basePointsRef.current + bonus);
    setScore(prev => prev + totalPoints);
    pausedTimeRef.current = timeLeft;  // 🧠 on garde le temps restant
    setTimeLeft(null); // ⏸️ met le timer en pause visuellement
    setShowPopup(true);
    setPopupInfo({
      title: "✅ Bonne réponse",
      points: `+${totalPoints} points${bonusText}`,
      theme: currentTrack.theme || "",
      titre: currentTrack.oeuvre || currentTrack.titre || "",
      annee: currentTrack.annee || "",
      compositeur: currentTrack.compositeur || "",
      image: currentTrack.image || null
    });
    roundEndedRef.current = true;
    basePointsRef.current = 100; // reset pour le prochain round
  }

  // 🔴 Mauvaise réponse
  else {
    basePointsRef.current = Math.max(0, basePointsRef.current - 20); // ❗ diminue les points potentiels
    console.log("❌ Mauvaise réponse - points restants :", basePointsRef.current);
    handlePlay(); // ▶️ reprend la musique là où elle s’était arrêtée
  }

  // Nettoyage
  setAnswer("");
  setComposerGuess("");
};



  const handleReady = (id) => {
    setDeviceId(id);
    playCurrentTrack(id);
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
  setTimeLeft(null);
  basePointsRef.current = 100;

  if (currentRound < playlist.length) {
    console.log("🟢 ADMIN : Envoi next-round au serveur");
    handlePause().finally(() => {
      socket.emit("next-round", { roomId: id });
    });
  } else {
    alert("🎉 Fin de la partie !");
    socket.emit("next-round", { roomId: id });
    navigate("/");
  }
};

  if (!params || playlist.length === 0 ) {
    return <div>Chargement en cours...</div>;
  }

  const timer = params.time ?? 30;
  const bonusCompositeur = params.BonusCompositeur ?? false;
  const currentTrack = playlist[currentRound - 1];
  
  const handleNextRoundPopup = () => {
    setShowPopup(false);
    handlePause();
  };

  return (
    <div style={{ padding: 20, color: "#fff", background: "#1e2a38", minHeight: "100vh", alignItems: "center" }}>
      <SpotifyPlayer token={token} onReady={handleReady} />
      
      
      <h1 style={{ color: "#f7b733", fontFamily: "Luckiest Guy" }}>
        Round {currentRound} / {playlist.length}
      </h1>
            
      
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


      {/* BUZZER / REPONSE */}
      <div style={{ marginTop: 40 }}>
  {!isBuzzed ? (
    <button onClick={handleBuzz} style={buzzButtonStyle}> BUZZ</button>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <input
        type="text"
        placeholder="Votre réponse"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleValidate()}
        ref={answerInputRef}
        style={inputStyle}
      />
      {bonusCompositeur && (
        <input
          type="text"
          placeholder="Compositeur (facultatif)"
          value={composerGuess}
          onChange={(e) => setComposerGuess(e.target.value)}
          style={inputStyle}
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
            setTimeLeft(pausedTimeRef.current); // on restaure le temps
            handlePlay(); // on reprend la musique là où elle en était
          }}
          style={cancelButtonStyle}
        >
          Annuler
        </button>
      </div>
    </div>
  )}

      {/* SCORE PERSO */}
      <div style={{ marginTop: 40, fontSize: 20 }}>Score : {score} pts</div>
</div>



      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={handlePlay} style={buttonStyle}>▶️ Play</button>
        <button onClick={handlePause} style={buttonStyle}>⏸ Pause</button>
        {isAdmin && <button onClick={handleNext} style={buttonStyle}>⏭ Next</button>}
      </div>
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
        {popupInfo.theme ? `${popupInfo.theme} - ` : ""}{popupInfo.titre} {popupInfo.annee ? `(${popupInfo.annee})` : ""}
      </p>
      {popupInfo.compositeur && (
        <p style={{ fontStyle: "italic", color: "#555", marginTop: 6 }}>
          par {popupInfo.compositeur}
        </p>
      )}

        <button 
          onClick={handleNextRoundPopup}
          style={nextButtonStyle}
          disabled={roundEndedRef.current === false}
        >
          Fermer
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
  color: "#1e2a38",
  fontWeight: "bold",
  cursor: "pointer"
};

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

export default GamePage;