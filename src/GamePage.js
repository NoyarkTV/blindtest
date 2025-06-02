import React, { useEffect, useState } from "react";
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
  const [composerGuess, setComposerGuess] = useState("");
  const [score, setScore] = useState(0);

  useEffect(() => {
    const playerName = localStorage.getItem("playerName");
    setPlayerName(playerName);

    fetch(`https://blindtest-69h7.onrender.com/game-info/${id}`)
      .then(res => res.json())
      .then(data => {
        setPlaylist(data.playlist || []);
        setParams(data.params || {});
        setIsAdmin(data.params?.admin === playerName);
        setCurrentRound(data.currentRound || 1);
        console.log("\ud83e\udde0 Admin attendu :", data.params?.admin, "| Toi :", playerName);
      })
      .catch(err => {
        console.error("Erreur de r\u00e9cup\u00e9ration des infos de la partie :", err);
        navigate("/");
      });
  }, [id, navigate]);

  useEffect(() => {
    if (!playerName || !id) return;
    socket.emit("join-room", { roomId: id, playerName });
    console.log("\ud83d\udce1 Socket client : a rejoint la room", id);
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
    socket.on("round-updated", ({ newRound }) => {
      console.log("\ud83d\udfe3 Nouveau round re\u00e7u :", newRound);
      setCurrentRound(newRound);
    });
    return () => socket.off("round-updated");
  }, []);

  useEffect(() => {
    socket.on("game-over", () => {
      alert("\ud83c\udf89 Fin de la partie !");
      navigate("/");
    });
    return () => socket.off("game-over");
  }, []);

  useEffect(() => {
    if (params && playlist.length > 0 && !isBuzzed) {
      const timeLimit = params.Time ?? 30;
      setTimeLeft(timeLimit);
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [params, playlist, currentRound, isBuzzed]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isBuzzed) handleBuzz();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBuzzed]);

  const handleBuzz = () => {
    setIsBuzzed(true);
    setTimeLeft(null);
    handlePause();
  };

  const handleValidate = () => {
    const currentTrack = playlist[currentRound - 1];
    const timeLimit = params.Time ?? 30;
    const bonusCompositeur = params.BonusCompositeur ?? false;

    const normalizedAnswer = answer.trim().toLowerCase();
    const validAnswers = (currentTrack.answers || []).map(a => a.toLowerCase());
    const isCorrect = validAnswers.includes(normalizedAnswer);

    let bonus = 0;
    if (bonusCompositeur && currentTrack.compositeur) {
      const guessList = composerGuess.toLowerCase().split(",").map(s => s.trim());
      const realComposers = currentTrack.compositeur.toLowerCase().split(",").map(s => s.trim());
      if (guessList.some(g => realComposers.includes(g))) bonus = 20;
    }

    if (isCorrect) {
      setScore(prev => prev + 100 + bonus);
      console.log("\u2705 Bonne r\u00e9ponse !");
    } else {
      console.log("\u274c Mauvaise r\u00e9ponse");
      setIsBuzzed(false);
      setAnswer("");
      setComposerGuess("");
      playCurrentTrack(deviceId);
    }
  };

  const handleReady = (id) => {
    setDeviceId(id);
    playCurrentTrack(id);
  };

  const handlePause = () => {
    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
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
    if (currentRound < playlist.length) {
      console.log("\ud83d\udfe2 ADMIN : Envoi next-round au serveur");
      handlePause().finally(() => {
        socket.emit("next-round", { roomId: id });
      });
    } else {
      alert("\ud83c\udf89 Fin de la partie !");
      socket.emit("next-round", { roomId: id });
      navigate("/");
    }
  };

  if (!params || playlist.length === 0 || !token) {
    return <div>Chargement en cours...</div>;
  }

  const timeLimit = params.Time ?? 30;
  const bonusCompositeur = params.BonusCompositeur ?? false;
  const currentTrack = playlist[currentRound - 1];

  return (
    <div style={{ padding: 20, color: "#fff", background: "#1e2a38", minHeight: "100vh" }}>
      <SpotifyPlayer token={token} onReady={handleReady} />
      <h1>Round {currentRound} / {playlist.length}</h1>
      <h2 style={{ fontSize: "48px", textAlign: "center" }}>⏳ {timeLeft !== null ? timeLeft + "s" : ""}</h2>

      <div style={{ display: "flex", gap: 10, marginTop: 20, flexDirection: "column", alignItems: "center" }}>
        {!isBuzzed ? (
          <button onClick={handleBuzz} style={buttonStyle}>🔔 Buzz</button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="text"
              placeholder="Réponse"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              style={inputStyle}
            />
            {bonusCompositeur && (
              <input
                type="text"
                placeholder="Compositeur"
                value={composerGuess}
                onChange={e => setComposerGuess(e.target.value)}
                style={inputStyle}
              />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleValidate} style={buttonStyle}>✅ Valider</button>
              <button onClick={() => {
                setIsBuzzed(false);
                setAnswer("");
                setComposerGuess("");
                playCurrentTrack(deviceId);
              }} style={buttonStyle}>❌ Annuler</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={handlePlay} style={buttonStyle}>▶️ Play</button>
        <button onClick={handlePause} style={buttonStyle}>⏸ Pause</button>
        {isAdmin && <button onClick={handleNext} style={buttonStyle}>⏭ Next</button>}
      </div>
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

const inputStyle = {
  padding: "10px",
  fontSize: "16px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  width: "240px"
};

export default GamePage;