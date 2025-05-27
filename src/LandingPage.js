import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LandingPage({ isSpotifyConnected, onConnectSpotify }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "Thibault");
  const [editing, setEditing] = useState(false);
  const [inputName, setInputName] = useState(playerName);

  const handleSaveName = () => {
    const name = inputName.trim() || "Thibault";
    setPlayerName(name);
    localStorage.setItem("playerName", name);
    setEditing(false);
  };

  const handleCreateGame = async () => {
    // 🔧 Tu lanceras ici ta vraie logique de création de partie
    // et tu pourras passer l’ID en paramètre si nécessaire
    navigate("/config");
  };

    const [spotifyToken, setSpotifyToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("spotify_token", token);
      setSpotifyToken(token);
      window.history.replaceState({}, document.title, "/"); // Nettoie l'URL
    } else {
      const stored = localStorage.getItem("spotify_token");
      if (stored) setSpotifyToken(stored);
    }
  }, []);

  const handleSpotifyConnect = () => {
    window.location.href = "https://blindtest-69h7.onrender.com/login";
  };

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

          {!editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{playerName}</span>
              <button onClick={() => setEditing(true)} className="btn-edit">Modifier</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                style={{
                  fontSize: "1rem",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "none"
                }}
              />
              <button onClick={handleSaveName} className="btn-edit">Valider</button>
            </div>
          )}

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
            <input placeholder="Code de partie" style={inputStyle} />
            <button className="btn" style={buttonStyle}>Rejoindre</button>
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