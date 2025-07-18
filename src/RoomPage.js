import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "./socket";

function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const playerName = localStorage.getItem("playerName") || "Joueur";

  // 🔁 Rejoindre la room et écouter les événements
useEffect(() => {
  socket.emit("join-room", id);

  socket.on("player-joined", updatedPlayers => {
    setPlayers(updatedPlayers);
  });

  socket.on("player-list", fullList => {
    setPlayers(fullList);
  });

  socket.on("game-started", () => {
    navigate(`/game/${id}`);
  });

  return () => {
    socket.off("player-joined");
    socket.off("player-list");
    socket.off("game-started");
  };
}, [id]);

  // 👤 Ajout du joueur à la partie
  useEffect(() => {
    const player = { name: playerName };
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
  }, [id]);

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
                padding: "8px 12px",
                marginBottom: 6,
                borderRadius: 6
              }}>
                {p.name}
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