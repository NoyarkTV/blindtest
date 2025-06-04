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
socket.on("join-room", (roomId) => {
  const playerName = getPlayerName(socket); // ta fonction existante
  if (!rooms[roomId]) {
    rooms[roomId] = { players: [] };
  }

  // Ajoute le joueur s’il n’y est pas déjà
  if (!rooms[roomId].players.includes(playerName)) {
    rooms[roomId].players.push(playerName);
  }

  socket.join(roomId);

  // 👇 Répond uniquement à celui qui vient d'arriver
  socket.emit("player-list", rooms[roomId].players);

  // 👇 Informe les autres (facultatif si tu veux mettre à jour les autres)
  socket.to(roomId).emit("player-joined", rooms[roomId].players);
});
  }, [id]);

  // 👤 Ajout du joueur à la partie
  useEffect(() => {
    const player = { name: playerName };
    fetch("https://blindtest-69h7.onrender.com/join-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, player })
    }).then(() => {
      fetch(`https://blindtest-69h7.onrender.com/game-info/${id}`)
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
<div style={{
  minHeight: "100vh",
  backgroundColor: "#ffffff", // fond général blanc
  color: "#1e2a38",           // texte sombre
  fontFamily: "'Poppins', sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "40px 20px"
}}>
  <h1 style={{
    fontSize: "2.5rem",
    fontFamily: "'Luckiest Guy', cursive",
    color: "#f7b733",
    marginBottom: 30
  }}>
    Salle d'attente
  </h1>

  <div style={{
    background: "#ffffff",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "600px"
  }}>
    <h2 style={{ color: "#f7b733", fontSize: "1.4rem" }}>👥 Joueurs connectés</h2>
    <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
      {players.map((p, i) => (
        <li key={i} style={{
          backgroundColor: "#f0f0f0",
          color: "#1e2a38",
          padding: "8px 12px",
          marginBottom: 8,
          borderRadius: 8
        }}>
          {p.name}
        </li>
      ))}
    </ul>


    <div style={{
      marginTop: 40,
      fontSize: 18,
      background: "#e0e0e0",
      color: "#666",
      padding: "20px",
      borderRadius: "12px",
      textAlign: "center"
    }}>
      ⏳ En attente que l'organisateur lance la partie...
    </div>

    <p style={{
      marginTop: 25,
      textAlign: "center",
      fontSize: 14,
      color: "#999"
    }}>
      ID de la salle : <code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: "6px" }}>{id}</code>
    </p>
  </div>
</div>
);
}

export default RoomPage;