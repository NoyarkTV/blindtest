function LandingPage() {
  return (
    <div style={{
      height: "100vh",
      background: "#1e2a38",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Poppins, sans-serif"
    }}>
      <h1 style={{ fontSize: "2.5rem" }}>🎧 Bienvenue sur Blindtest</h1>
      <p style={{ marginBottom: "30px", fontSize: "1.2rem" }}>Connecte-toi à Spotify pour démarrer une partie !</p>
      <a
        href="https://blindtest-69h7.onrender.com/login"
        style={{
          padding: "12px 30px",
          fontSize: "18px",
          backgroundColor: "#1db954",
          color: "white",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "bold"
        }}
      >
        Se connecter à Spotify
      </a>
    </div>
  );
}

export default LandingPage;

