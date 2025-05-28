import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const playerName = localStorage.getItem("playerName") || "Joueur";

  // 🔁 Rejoindre la room et écouter les événements
  useEffect(() => {
    const socket = io("https://blindtest-69h7.onrender.com");

    socket.emit("join-room", id);
    socket.on("player-joined", updatedPlayers => {
      console.log("🧑‍🤝‍🧑 Mise à jour des joueurs :", updatedPlayers);
      setPlayers(updatedPlayers);
    });

    socket.on("game-started", () => {
      console.log("🚀 Partie lancée !");
      navigate(`/game/${id}`);
    });

    return () => socket.disconnect();
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
  <div style={{
    minHeight: "100vh",
    backgroundColor: "#1e2a38",
    color: "#ffffff",
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
      🎮 Salle {id}
    </h1>

    <div style={{
      background: "rgba(255,255,255,0.05)",
      padding: "30px",
      borderRadius: "20px",
      boxShadow: "0 0 10px rgba(0,0,0,0.3)",
      width: "100%",
      maxWidth: "600px"
    }}>
      <h2 style={{ color: "#f7b733", fontSize: "1.4rem" }}>👥 Joueurs connectés</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
        {players.map((p, i) => (
          <li key={i} style={{
            backgroundColor: "#333",
            padding: "8px 12px",
            marginBottom: 8,
            borderRadius: 8
          }}>
            {p.name}
          </li>
        ))}
      </ul>

      <h2 style={{ color: "#f7b733", fontSize: "1.4rem", marginTop: 30 }}>📋 Paramètres</h2>
      {game.config ? (
        <ul style={{ lineHeight: 1.8, paddingLeft: 0, listStyle: "none" }}>
          <li><b>Rounds :</b> {game.config.nbRounds}</li>
          <li><b>Temps par manche :</b> {game.config.time} secondes</li>
          <li><b>Bonus compositeur :</b> {game.config.bonusCompositeur ? "Oui" : "Non"}</li>
          <li><b>Années :</b> {game.config.anneeMin} à {game.config.anneeMax}</li>
          <li><b>Médias :</b> {game.config.media?.join(", ")}</li>
          <li><b>Catégories :</b> {game.config.categories?.join(", ")}</li>
          <li><b>Difficulté :</b> {game.config.difficulte?.join(", ")}</li>
          <li><b>Pays :</b> {game.config.pays?.join(", ")}</li>
        </ul>
      ) : (
        <p style={{ fontStyle: "italic", marginTop: 10 }}>
          🛠️ En attente de configuration par l'organisateur...
        </p>
      )}

      <div style={{
        marginTop: 40,
        fontSize: 18,
        background: "#555",
        padding: "20px",
        borderRadius: "12px",
        textAlign: "center"
      }}>
        ⏳ En attente que l'organisateur lance la partie...
      </div>
    </div>
  </div>
);
}

export default RoomPage;