import React from "react";

function LandingPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>🎧 Bienvenue sur Blindtest</h1>
      <p>Connecte-toi à Spotify pour démarrer une partie !</p>
      <a href="http://localhost:8888/login">
        <button style={{ padding: "10px 30px", fontSize: "18px" }}>
          Se connecter à Spotify
        </button>
      </a>
    </div>
  );
}

export default LandingPage;
