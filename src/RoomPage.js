import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "./socket";

function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const playerName = localStorage.getItem("playerName") || "Joueur";
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem("profilePhoto") || "");
  const shouldLeaveRef = useRef(true);

  // 🔁 Rejoindre la room et écouter les événements
useEffect(() => {
  socket.emit("join-room", id);

  const onJoined = updatedPlayers => setPlayers(updatedPlayers);
  const onList = fullList => setPlayers(fullList);
  const onLeft = updatedPlayers => setPlayers(updatedPlayers);
  const onGameStarted = (data) => {
    if (data?.config?.modeEclair) {
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
  }).then(() => {
    fetch(`https://blindtest-69h7.onrender.com/game/${id}`)
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players || []);
        setGame(data);
      });
  });
}, [id, playerName]);

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
  <div className="app" style={{ minHeight: "100vh", paddingTop: 60, display: "flex", flexDirection: "column" }}>
    {/* Header avec logo cliquable */}
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
      zIndex: 10
    }}>
      <img
        src="/logo-line.svg"
        alt="Retour accueil"
        onClick={() => navigate("/")}
        style={{ height: 40, cursor: "pointer" }}
      />
    </header>

    {/* Contenu centré sous le header */}
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px"
    }}>
      <div className="popup" style={{ maxWidth: 600, width: "100%" }}>
        <h2 className="title2" style={{ color: "#fff", marginBottom: 16 }}>
          Salle d'attente
        </h2>

{/* Liste des joueurs */}
<div style={{
  backgroundColor: "#1e1a3a",
  borderRadius: 8,
  padding: "16px",
  marginBottom: 30
}}>
  <h3 style={{
    color: "#b494f8",
    fontSize: "1rem",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 0
  }}>
    Joueurs connectés
  </h3>
  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
{players.map((p, i) => (
  <li key={i} style={{
    color: "#fff",
    padding: "6px 10px",
    marginBottom: 6,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#27224c"
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
  </li>
))}
  </ul>
</div>

        {/* Message d'attente */}
        <div
          className="btn btn-cancel"
          style={{
            display: "inline-block",
            textAlign: "center",
            fontSize: "1rem",
            padding: "12px 24px",
            borderRadius: 20,
            background: "transparent",
            cursor: "default",
            pointerEvents: "none",
            color: "#fff",
            maxWidth: "calc(100% - 32px)",
            whiteSpace: "normal"
          }}
        >
          En attente que l’organisateur lance la partie...
        </div>

        {/* ID de la room */}
        <p style={{
          marginTop: 25,
          textAlign: "center",
          fontSize: 14,
          color: "#999"
        }}>
          ID de la salle :{" "}
          <code style={{
            background: "#2d2b45",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: 14
          }}>
            {id}
          </code>
        </p>
      </div>
    </div>
  </div>
);
}

export default RoomPage;