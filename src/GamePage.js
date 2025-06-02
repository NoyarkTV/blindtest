import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SpotifyPlayer from "./SpotifyPlayer";
import { io } from "socket.io-client";

const socket = io("https://blindtest-69h7.onrender.com");

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


  // useEffect(() => {
  //   if (!token) {
  //     console.error("❌ Token Spotify manquant");
  //     navigate("/");
  //   }
  // }, [token, navigate]);

  const handleReady = (id) => {
    setDeviceId(id);
    playCurrentTrack(id);
  };

  const handleError = (err) => {
    console.error("Erreur Spotify SDK :", err);
    alert("Erreur Spotify. Vérifie ta connexion Spotify premium.");
    navigate("/");
  };

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
      .then(() => setIsPlaying(true))
      .catch(err => console.error("Erreur lecture Spotify :", err));
  };

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
    console.log("🟣 Nouveau round reçu :", newRound);
    setCurrentRound(newRound);
  });

  return () => {
    socket.off("round-updated");
  };
}, []);

useEffect(() => {
  socket.on("game-over", () => {
    alert("🎉 Fin de la partie !");
    navigate("/");
  });

  return () => {
    socket.off("game-over");
  };
}, []);


  const handleNext = () => {
    if (currentRound < playlist.length) {
      console.log("🟢 ADMIN : Envoi next-round au serveur");
      fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      }).finally(() => {
        socket.emit("next-round", { roomId: id });
      });
    } else {
      alert("🎉 Fin de la partie !");
      socket.emit("next-round", { roomId: id });
      navigate("/");
    }
  };

  const handlePause = () => {
    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => setIsPlaying(false))
      .catch(err => console.error("Erreur pause :", err));
  };

  const handlePlay = () => {
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => setIsPlaying(true))
      .catch(err => console.error("Erreur reprise lecture :", err));
  };

  if (!params || playlist.length === 0 || !token) return <div>Chargement en cours...</div>;

  const currentTrack = playlist[currentRound - 1];

  return (
    <div style={{ padding: 20, color: "#fff", background: "#1e2a38", minHeight: "100vh" }}>
      <SpotifyPlayer token={token} onReady={handleReady} />

      <h1>Round {currentRound} / {playlist.length}</h1>
      {currentTrack && (
        <div>
          <p><strong>Oeuvre :</strong> {currentTrack.titre}</p>
          <p><strong>Compositeur :</strong> {currentTrack.compositeur}</p>
          <p><strong>Média :</strong> {currentTrack.media}</p>
          <p><strong>Catégorie :</strong> {currentTrack.categorie}</p>
          <p><strong>Année :</strong> {currentTrack.annee}</p>
          <p><strong>Réponses attendues :</strong> {(currentTrack.answers || []).join(", ")}</p>
        </div>
      )}

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

export default GamePage;