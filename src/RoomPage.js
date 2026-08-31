import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "./socket";
import { AppHeader, WaitingDots } from "./BlindtestUI";

function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const playerName = localStorage.getItem("playerName") || "Joueur";
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem("profilePhoto") || "");
  const shouldLeaveRef = useRef(true);
  const [copied, setCopied] = useState(false);

  // 🔁 Rejoindre la room et écouter les événements
useEffect(() => {
  socket.emit("join-room", { roomId: id, playerName });

  const onJoined = updatedPlayers => setPlayers(updatedPlayers);
  const onList = fullList => setPlayers(fullList);
  const onLeft = updatedPlayers => setPlayers(updatedPlayers);
  const onGameStarted = (data) => {
    shouldLeaveRef.current = false;
    if (data?.config?.modeDiffusion) {
      navigate(`/game-diffusion/${id}`);
    } else if (data?.config?.modeEclair) {
      navigate(`/game-eclair/${id}`);
    } else {
      navigate(`/game/${id}`);
    }
  };

    socket.on("player-joined", onJoined);
    socket.on("player-list", onList);
    socket.on("player-left", onLeft);
    socket.on("game-started", onGameStarted);

  return () => {
    socket.off("player-joined", onJoined);
    socket.off("player-list", onList);
    socket.off("player-left", onLeft);
    socket.off("game-started", onGameStarted);
  };
}, [id, navigate]);

  // 👤 Ajout du joueur à la partie
useEffect(() => {
  if (!playerName) return; // on évite d’envoyer si pas encore chargé
  const photo = localStorage.getItem("profilePhoto") || "";

  const player = {
    name: playerName,
    photo: photo
  };

  fetch("https://blindtest-69h7.onrender.com/join-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, player })
  }).then(async res => {
    if (res.status === 409) {
      alert("Cette partie a déjà commencé.");
      navigate("/");
      return null;
    }
    if (!res.ok) throw new Error("Impossible de rejoindre la partie");
    return fetch(`https://blindtest-69h7.onrender.com/game/${id}`);
  }).then(res => {
    if (!res) return null;
    return res.json();
  }).then(data => {
    if (!data) return;
    setPlayers(data.players || []);
    setGame(data);
  }).catch(err => {
    console.error("Erreur pour rejoindre la partie :", err);
    navigate("/");
  });
}, [id, playerName, navigate]);

  // 🚪 Signaler au serveur lorsqu'on quitte la page
useEffect(() => {
  const handleLeave = () => {
    if (!shouldLeaveRef.current) return;
    fetch("https://blindtest-69h7.onrender.com/leave-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, playerName }),
      keepalive: true
    });
  };

  window.addEventListener("beforeunload", handleLeave);
  return () => {
    window.removeEventListener("beforeunload", handleLeave);
    handleLeave();
  };
}, [id, playerName]);

  if (!game) return <div style={{ color: "white", textAlign: "center" }}>Chargement...</div>;

  const config = game.config || {};

return (
  <div className="app bt-room-page">
    <AppHeader onHome={() => navigate("/")} />
    <div className="bt-room-content">
      <div className="popup bt-room-card">
        <h2>Salle d'attente</h2>
        <div className="bt-room-code-row">
          <code>{id}</code>
          <button
            className="bt-copy-code"
            onClick={() => {
              navigator.clipboard.writeText(id).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              });
            }}
            title="Copier le code de la salle"
          >
            {copied ? "✓" : "⧉"}
          </button>
        </div>
        <div className="bt-room-players">
          <h3>Joueurs connectés</h3>
          {players.map((player) => (
            <div className={`bt-room-player ${player.name === playerName ? "me" : ""}`} key={player.name}>
              <span className="bt-avatar"><img src={player.photo || "/ppDefault.png"} alt="" /></span>
              <span className="bt-room-player-name">
                {player.name}
                {player.name === game.admin && <span className="bt-admin-crown">♛</span>}
              </span>
              <span className="bt-online-dot" />
            </div>
          ))}
        </div>
        <div className="bt-room-waiting">
          <span>En attente que l’organisateur lance la partie</span>
          <WaitingDots />
        </div>
      </div>
    </div>
  </div>
);
}

export default RoomPage;