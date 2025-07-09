import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

function LandingPage({ isSpotifyConnected, onConnectSpotify }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
  const [joinCode, setJoinCode] = useState("");
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const adjectives = [
  "Groovy", "Sneaky", "Witty", "Epic", "Cheesy", "Cosmic", "Rebel", "Jazzy", "Funky", "Classy",
  "Legendary", "Wild", "Bizarre", "Electric", "Savage", "Majestic", "Spooky", "Shiny", "Vibrant", "Zany",
  "Grumpy", "Lucky", "Chill", "Psychedelic", "Melodic", "Sassy", "Retro", "Flashy", "Crazy", "Trendy",
  "Smooth", "Loyal", "Furious", "Bold", "Charming", "Nostalgic", "Offbeat", "Dreamy", "Loud", "Magnetic"
];

const nouns = [
  "Vader", "Leia", "Yoda", "Luke", "Han", "Chewbacca", "Kylo", "Rey", "Palpatine", "ObiWan",
  "Gandalf", "Frodo", "Aragorn", "Legolas", "Gollum", "Bilbo", "Galadriel", "Thorin", "Sauron", "Elrond",
  "Harry", "Hermione", "Ron", "Dumbledore", "Snape", "Voldemort", "Draco", "Neville", "Sirius", "Luna",
  "Neo", "Trinity", "Morpheus", "Smith", "Oracle",
  "Ironman", "Thor", "Hulk", "Spiderman", "BlackWidow", "DoctorStrange", "Loki", "ScarletWitch", "Vision", "AntMan",
  "Batman", "Joker", "Harley", "Superman", "Flash", "WonderWoman", "Aquaman", "GreenLantern", "Catwoman", "Riddler",
  "Indiana", "Bond", "Ripley", "SarahConnor", "Forrest", "Rocky", "Drago", "Maximus", "Marty", "Doc",
  "Ferris", "Jules", "Vincent", "TonyMontana", "Tyler", "TheDude", "Clarice", "Hannibal", "Shrek", "Donkey",
  "Po", "Tigress", "Hiccup", "Toothless", "JackSparrow", "WillTurner", "Elizabeth", "DavyJones", "Beetlejuice", "Edward",
  "Arya", "Jon", "Tyrion", "Daenerys", "Cersei", "Brienne", "Jaime", "Hodor", "Littlefinger", "Varys",
  "Walter", "Jesse", "Saul", "Gus", "Hank", "Skyler", "Mike", "Jane", "Tuco", "Badger",
  "Eleven", "Mike", "Dustin", "Lucas", "Will", "Max", "Hopper", "Joyce", "Steve", "Robin",
  "Dexter", "Debra", "Doakes", "Masuka", "TrinityKiller",
  "Sheldon", "Leonard", "Penny", "Howard", "Raj",
  "Barney", "Ted", "Marshall", "Robin", "Lily",
  "Rick", "Morty", "Summer", "Jerry", "Beth",
  "Mario", "Luigi", "Link", "Zelda", "Ganondorf", "Kratos", "Lara", "MasterChief", "Samus", "Geralt",
  "Cloud", "Tifa", "Sephiroth", "Sonic", "Knuckles", "Tails", "DonkeyKong", "Kirby", "FoxMcCloud", "Falco",
  "Pikachu", "Charizard", "Mewtwo", "Eevee", "Ash", "Red", "ChunLi", "Ryu", "Ken", "Blanka",
  "PacMan", "MegaMan", "Bomberman", "SimonBelmont", "Alucard", "Doomguy", "Arthur", "DukeNukem", "Scorpion", "SubZero",
  "Simba", "Nala", "Mufasa", "Scar", "Aladdin", "Jasmine", "Genie", "Jafar", "Belle", "Beast",
  "Ariel", "Ursula", "Eric", "Hercules", "Megara", "Hades", "Tarzan", "Jane", "Mulan", "ShanYu",
  "Elsa", "Anna", "Olaf", "Kristoff", "Buzz", "Woody", "Jessie", "Lotso", "Remy", "Linguini",
  "WallE", "EVE", "Lightning", "Mater", "Sully", "Mike", "Boo", "MrIncredible", "Elastigirl", "JackJack",
  "Godzilla", "KingKong", "GLaDOS", "Wheatley", "MasterRoshi", "Goku", "Vegeta", "Piccolo", "Naruto", "Sasuke",
  "Luffy", "Zoro", "Nami", "Sanji", "Chopper", "Dio", "Jotaro", "Spike", "Faye", "Ed"
];


  function generateRandomName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  }

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
      } else {
        // fallback uniquement côté client
        const fallbackName = generateRandomName();
        setPlayerName(fallbackName);
        localStorage.setItem("playerName", fallbackName);
      }

      if (data.stats) {
        setPlayerStats(data.stats);
      } else {
        setPlayerStats(null);
      }
    })
    .catch(() => {
      // En cas d’erreur d’appel → fallback local
      const fallbackName = generateRandomName();
      setPlayerName(fallbackName);
      localStorage.setItem("playerName", fallbackName);
    });
}, []);


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
      if (data.stats) {
        setPlayerStats(data.stats);
      } else {
        setPlayerStats(null);
      }
  })
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

  return (
<>
<style>
{`
  .info-icon-container {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .info-icon {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  .profile-tooltip {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    top: 30px;
    right: 0;
    background-color: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.9rem;
    min-width: 240px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 20;
    transition: opacity 0.3s;
    word-wrap: break-word;
  }

  .profile-tooltip div {
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .profile-tooltip div:last-child {
    border-bottom: none;
  }

  .info-icon:hover .profile-tooltip,
  .profile-tooltip:hover {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
  }

  .btn:hover {
    transform: scale(1.03);
    background-color: #ffc94a !important;
  }

  /* Ne change pas la couleur si c’est un bouton spécial */
.btn-spotify:hover {
  background-color: #1db954 !important;
}

  input:focus {
    outline: 2px solid #f7b733;
  }
  
  body {
    margin: 0;
    overflow: hidden;
  }
`}
</style>

<div style={{
  height: "100vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Poppins', sans-serif",
  backgroundColor: "#1c2541",
  color: "#ffffff",
}}>
  {/* Titre principal */}
  <h1 style={{
    fontSize: "3rem",
    fontFamily: "'Luckiest Guy', cursive",
    color: "#f7b733",
    marginBottom: "40px",
    textAlign: "center"
  }}>
    Blindtest
  </h1>

  {/* Section centrale */}
  <div style={{
    display: "flex",
    gap: "60px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start"
  }}>
    {/* Profil */}
    <div style={{
      background: "rgba(255,255,255,0.05)",
      padding: "20px 25px",
      borderRadius: "20px",
      boxShadow: "0 0 15px rgba(0,0,0,0.2)",
      width: "240px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "relative",
      gap: "12px"
    }}>
      {spotifyToken && (
        <div className="info-icon-container">
          <div className="info-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#f7b733" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
            </svg>
            <div className="profile-tooltip">
              <div>Temps moyen : {playerStats?.totalRoundsPlayed > 0 ? (playerStats.cumulativeResponseTime / playerStats.totalRoundsPlayed).toFixed(2) : "--"} sec</div>
              <div>Rounds joués : {playerStats?.totalRoundsPlayed ?? "--"}</div>
              <div>Rounds gagnés : {playerStats?.totalRoundsWon ?? "--"}</div>
              <div>Réussite : {playerStats?.totalRoundsPlayed > 0 ? Math.round((playerStats.totalRoundsWon / playerStats.totalRoundsPlayed) * 100) : "--"}%</div>
              <div>Parties jouées : {playerStats?.gamesPlayed ?? "--"}</div>
              <div>Meilleur temps : {playerStats?.bestResponseTime?.toFixed(2) ?? "--"} sec</div>
              <div>Score cumulé : {playerStats?.totalScore ?? "--"}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        backgroundColor: "#ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.5rem"
      }}>
        👤
      </div>

      <div style={{ fontSize: "1.1rem", fontWeight: "bold", textAlign: "center" }}>{playerName}</div>

      <button
        className={`btn ${spotifyToken ? "btn-spotify" : ""}`}
        onClick={handleSpotifyConnect}
        style={{
          backgroundColor: spotifyToken ? "#1db954" : "#f7b733",
          color: "#1e2a38",
          fontWeight: "bold",
          padding: "8px 20px",
          fontSize: "0.95rem",
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
            backgroundColor: "#444",
            color: "#fff",
            padding: "5px 12px",
            borderRadius: "20px",
            cursor: "pointer",
            border: "none",
            fontSize: "0.85rem"
          }}
        >
          Se déconnecter
        </button>
      )}
    </div>

    {/* Zone de jeu */}
<div style={{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "20px",
  width: "340px" // plus large !
}}>
  <h2 style={{ fontSize: "1.8rem", marginBottom: 0 }}>Jouer</h2>

  <button className="btn" onClick={handleCreateGame} style={buttonStyle}>
    Créer une partie
  </button>

  <div style={{
    display: "flex",
    gap: "10px",
    flexWrap: "nowrap", // 🔥 force l’alignement
    justifyContent: "center",
    width: "100%"
  }}>
    <input
      placeholder="Code de partie"
      value={joinCode}
      onChange={(e) => setJoinCode(e.target.value)}
      style={{ ...inputStyle, flex: 1 }}
    />
    <button
      className="btn"
      style={buttonStyle}
      onClick={() => navigate(`/room/${joinCode}`)}
    >
      Rejoindre
    </button>
  </div>
</div>
  </div>
</div>
</>
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