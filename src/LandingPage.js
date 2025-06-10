import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

function LandingPage({ isSpotifyConnected, onConnectSpotify }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
  const [joinCode, setJoinCode] = useState("");
  const [spotifyToken, setSpotifyToken] = useState(null);


const handleJoinGame = () => {
  const trimmed = joinCode.trim();
  if (!trimmed) return;

  navigate(`/room/${trimmed}`);
};

useEffect(() => {
  fetch("https://blindtest-69h7.onrender.com/profile", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("spotify_token") || ""}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.playerName) {
        setPlayerName(data.playerName);
        localStorage.setItem("playerName", data.playerName);
      }
    })
    .catch(err => {
      console.error("Erreur récupération profil :", err);
    });
}, []);



const handleCreateGame = async () => {
  const generateSimpleId = (length = 5) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

const gameId = generateSimpleId();

  const playerName = localStorage.getItem("playerName") || "";

  const game = {
    id: gameId,
    admin: playerName,
    players: [{ name: playerName }],
    // plus tard : playlist, settings, etc.
  };

  try {
    const res = await fetch("https://blindtest-69h7.onrender.com/create-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game)
    });

    if (!res.ok) throw new Error("Erreur création partie");

    navigate(`/config/${gameId}`);
  } catch (err) {
    console.error("Erreur création de partie :", err);
  }
};

useEffect(() => {
  const stored = localStorage.getItem("spotify_token");
  if (stored) setSpotifyToken(stored);
}, []);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("access_token");

  if (token) {
    localStorage.setItem("spotify_token", token);
    setSpotifyToken(token);
    window.history.replaceState({}, document.title, "/");
  }
}, []);


  const handleSpotifyConnect = () => {
    window.location.href = "https://blindtest-69h7.onrender.com/login";
  };

  <style>
{`
  .profile-tooltip {
    visibility: hidden;
  }

  div[style*="position: relative"]:hover .profile-tooltip {
    visibility: visible;
    opacity: 1 !important;
    pointerEvents: auto !important;
  }
`}
</style>
  return (


    
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#1e2a38",
      color: "#ffffff",
      fontFamily: "'Poppins', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px"
    }}>
      <header style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        fontSize: "2.5rem",
        fontFamily: "'Luckiest Guy', cursive",
        color: "#f7b733"
      }}>
        Blindtest
      </header>
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: "60px",
        flexWrap: "wrap",
        marginTop: "100px"
      }}>
        {/* Profil à gauche */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
          minWidth: "250px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px"
        }}>
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            backgroundColor: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem"
          }}>
            👤
          </div>

          {spotifyToken && (
  <div style={{ 
    position: "relative", 
    alignSelf: "flex-end", 
    marginTop: "-20px", 
    marginRight: "-10px", 
    cursor: "pointer" 
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#f7b733" className="bi bi-info-circle" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
    </svg>
    <div style={{
      position: "absolute",
      top: "20px",
      right: "0",
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      color: "#fff",
      padding: "10px",
      borderRadius: "8px",
      fontSize: "0.85rem",
      width: "200px",
      opacity: "0",
      pointerEvents: "none",
      transition: "opacity 0.3s",
      zIndex: 20
    }} className="profile-tooltip">
      <div>Temps moyen de réponse: --</div>
      <div>Nombre de rounds joués: --</div>
      <div>Nombre de rounds remportés: --</div>
      <div>Taux de réussite: -- %</div>
      <div>Nombre de parties jouées: --</div>
      <div>Meilleur temps de réponse: -- sec</div>
      <div>Score total cumulé: --</div>
    </div>
  </div>
)}

<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{playerName}</span>
</div>


          <button
        className="btn"
          onClick={handleSpotifyConnect}
          style={{
            backgroundColor: spotifyToken ? "#1db954" : "#f7b733",
            color: "#1e2a38",
            fontWeight: "bold",
            padding: "10px 20px",
            fontSize: "1rem",
            border: "none",
            borderRadius: "50px",
            cursor: "pointer"
          }}
>
          {spotifyToken ? "Connecté à Spotify" : "Se connecter à Spotify"}
        </button>
        {spotifyToken && (
  <button
    onClick={() => {
      localStorage.removeItem("spotify_token");
      setSpotifyToken(null);
    }}
    style={{
      marginTop: "10px",
      backgroundColor: "#444",
      color: "#fff",
      padding: "6px 12px",
      borderRadius: "20px",
      cursor: "pointer",
      border: "none"
    }}
  >
    Se déconnecter
  </button>
)}

        </div>

        {/* Boutons à droite */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px"
        }}>
          <h2 style={{ marginBottom: "10px" }}>Jouer</h2>
          <button className="btn" onClick={handleCreateGame} style={buttonStyle}>
            Créer une partie
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
  <input
    placeholder="Code de partie"
    value={joinCode}
    onChange={(e) => setJoinCode(e.target.value)}
    style={inputStyle}
  />
  <button className="btn" style={buttonStyle} onClick={() => navigate(`/room/${joinCode}`)}>
  Rejoindre
</button>
</div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  backgroundColor: "#f7b733",
  color: "#1e2a38",
  fontWeight: "bold",
  padding: "15px 30px",
  fontSize: "1.2rem",
  border: "none",
  borderRadius: "50px",
  cursor: "pointer",
  transition: "transform 0.2s ease"
};

const inputStyle = {
  padding: "10px 15px",
  borderRadius: "12px",
  border: "none",
  fontSize: "1rem"
};

export default LandingPage;