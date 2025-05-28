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
    <div style={{ color: "white", padding: 30 }}>
      <h1 style={{ color: "#f7b733" }}>🎮 Room {id}</h1>

      <div style={{ marginTop: 20 }}>
        <h2>👥 Joueurs</h2>
        <ul>
          {players.map((p, i) => (
            <li key={i}>{p.name}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 20 }}>
  <h2>📋 Paramètres</h2>
  {game.config ? (
    <ul>
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
    <p style={{ fontStyle: "italic" }}>🛠️ En attente de configuration par l'organisateur...</p>
  )}
</div>

      <div style={{ marginTop: 40, fontSize: 18, background: "#333", padding: 20, borderRadius: 10 }}>
        ⏳ En attente que l'organisateur lance la partie...
      </div>
    </div>
  );
}

export default RoomPage;