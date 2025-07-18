import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import './App.css';

function LandingPage({ isSpotifyConnected, onConnectSpotify }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
  const [joinCode, setJoinCode] = useState("");
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem("profilePhoto") || "");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const defaultAvatars = Array.from({ length: 35 }, (_, i) => `/avatarDefault/avatar${i + 1}.png`);
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

const handleAvatarConfirm = () => {
  if (!selectedAvatar) return;

  if (selectedAvatar === "auto") {
    const cleanName = playerName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const customAvatarPath = `/avatarCustom/pp_${cleanName}.png`;

    fetch(customAvatarPath).then(res => {
      if (res.ok) {
        setProfilePhoto(customAvatarPath);
        localStorage.setItem("profilePhoto", customAvatarPath);
      } else {
        const fallbackIndex = Math.floor(Math.random() * 35) + 1;
        setProfilePhoto(`/avatarDefault/avatar${fallbackIndex}.png`);
        localStorage.setItem("profilePhoto", `/avatarDefault/avatar${fallbackIndex}.png`);
      }
    }).catch(() => {
      const fallbackIndex = Math.floor(Math.random() * 35) + 1;
      setProfilePhoto(`/avatarDefault/avatar${fallbackIndex}.png`);
      localStorage.setItem("profilePhoto", `/avatarDefault/avatar${fallbackIndex}.png`);
    });
  } else {
    setProfilePhoto(selectedAvatar);
    localStorage.setItem("profilePhoto", selectedAvatar);
  }

  setShowAvatarModal(false);
  setSelectedAvatar(null);
};

useEffect(() => {
  if (spotifyToken) {
    fetch("https://blindtest-69h7.onrender.com/profile", {
      headers: { Authorization: `Bearer ${spotifyToken}` }
    })
      .then(res => res.json())
      .then(data => {
        let finalName;

        if (data.playerName) {
          finalName = data.playerName;
        } else {
          finalName = generateRandomName();
        }

        // Nettoyage du pseudo : suppression des caractères spéciaux
        const cleanName = finalName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const customAvatarPath = `/avatarCustom/pp_${cleanName}.png`;

        // Vérification si l'image personnalisée existe
        fetch(customAvatarPath)
          .then((res) => {
            if (res.ok) {
              // Image personnalisée trouvée
              setProfilePhoto(customAvatarPath);
              localStorage.setItem("profilePhoto", customAvatarPath);
            } else {
              // Image non trouvée, choisir une image par défaut au hasard
              const randomIndex = Math.floor(Math.random() * 35) + 1;
              const defaultAvatarPath = `/avatarDefault/avatar${randomIndex}.png`;
              setProfilePhoto(defaultAvatarPath);
              localStorage.setItem("profilePhoto", defaultAvatarPath);
            }
          })
          .catch(() => {
            // En cas d’erreur, fallback aussi vers un avatar aléatoire
            const randomIndex = Math.floor(Math.random() * 35) + 1;
            const defaultAvatarPath = `/avatarDefault/avatar${randomIndex}.png`;
            setProfilePhoto(defaultAvatarPath);
            localStorage.setItem("profilePhoto", defaultAvatarPath);
          });

        // Mise à jour du nom et des stats
        setPlayerName(finalName);
        localStorage.setItem("playerName", finalName);
        setPlayerStats(data.stats ? data.stats : null);
      })
      .catch(() => {
        // Erreur de fetch profil → fallback complet
        const fallbackName = generateRandomName();
        setPlayerName(fallbackName);
        localStorage.setItem("playerName", fallbackName);
        setPlayerStats(null);

        // Avatar par défaut aléatoire
        const randomIndex = Math.floor(Math.random() * 35) + 1;
        const defaultAvatarPath = `/avatarDefault/avatar${randomIndex}.png`;
        setProfilePhoto(defaultAvatarPath);
        localStorage.setItem("profilePhoto", defaultAvatarPath);
      });
  }
}, [spotifyToken]);

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
  <div className="app" style={{
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px 20px",
  boxSizing: "border-box"
}}>

    {/* Titre principal */}
    <div className="logo" style={{ width: "280px", maxWidth: "100%" }}>
      <img src="/Logo.svg" alt="Blindtest Logo" style={{ width: "100%" }} />
    </div>

    <div style={{
      display: "flex",
      gap: "60px",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "stretch",
      marginTop: "40px"
    }}>
{/* Profil joueur */}
<div className="popup" style={{
  width: "240px",
  alignItems: "center",
  gap: "12px",
  display: "flex",
  flexDirection: "column",
  position: "relative"
}}>
  {spotifyToken && (
    <div className="info-icon-container">
      <div className="info-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ff7c2c" viewBox="0 0 16 16">
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

  {/* Avatar avec bouton de modification */}
  <div style={{
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "var(--color-bg-popup)",
    border: "2px solid var(--color-secondary)",
    overflow: "hidden",
    position: "relative"
  }}>
    <img
      src={spotifyToken ? (profilePhoto || "/ppDefault.png") : "/ppDefault.png"}
      alt="Photo de profil"
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    {/* Bouton rond orange avec crayon */}
    <button
      onClick={() => setShowAvatarModal(true)}
      style={{
        position: "absolute",
        bottom: "0",
        right: "0",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "#ff7c2c",
        border: "2px solid var(--color-bg-popup)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil-fill" viewBox="0 0 16 16">
        <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>
      </svg>
    </button>
  </div>

  {/* Nom du joueur */}
  <div style={{ fontSize: "1.1rem", fontWeight: "bold", textAlign: "center" }}>{playerName}</div>

  {/* Bouton de connexion Spotify */}
  <button
    className={`btn ${spotifyToken ? "btn-spotify" : "btn-confirm"}`}
    onClick={handleSpotifyConnect}
  >
    {spotifyToken ? "Connecté à Spotify" : "Se connecter à Spotify"}
  </button>

  {/* Bouton de déconnexion */}
  {spotifyToken && (
    <button
      className="btn btn-cancel"
      onClick={() => {
        localStorage.removeItem("spotify_token");
        setSpotifyToken(null);
      }}
      style={{ padding: "5px 12px", fontSize: "0.85rem" }}
    >
      Se déconnecter
    </button>
  )}
</div>

{showAvatarModal && (
  <div className="avatar-modal-overlay" style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0, 0, 0, 0.6)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 999
  }}>
    <div className="avatar-modal" style={{
      background: "#2d2b45", padding: "20px", borderRadius: "8px", width: "90%", maxWidth: "400px"
    }}>
      <h3 style={{ color: "#fff", textAlign: "center", marginTop: 0 }}>Choisir un avatar</h3>

      <div className="avatar-grid" style={{
        display: "flex", flexWrap: "wrap", gap: "10px",
        maxHeight: "300px", overflowY: "auto", justifyContent: "center", margin: "20px 0"
      }}>
        {/* Avatar automatique via playerName */}
        <img 
          src="/ppCustom.png" 
          alt="Avatar automatique"
          title="Avatar personnalisé"
          onClick={() => setSelectedAvatar("auto")}
          style={{
            width: "60px", height: "60px", borderRadius: "50%", cursor: "pointer",
            border: selectedAvatar === "auto" ? "3px solid #b494f8" : "3px solid transparent"
          }}
        />
        {/* Avatars par défaut */}
        {defaultAvatars.map((src, idx) => (
          <img 
            key={idx}
            src={src}
            alt={`Avatar ${idx + 1}`}
            onClick={() => setSelectedAvatar(src)}
            style={{
              width: "60px", height: "60px", borderRadius: "50%", cursor: "pointer",
              border: selectedAvatar === src ? "3px solid #b494f8" : "3px solid transparent"
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: "right", marginTop: "10px" }}>
        <button className="btn btn-cancel" onClick={() => { 
          setShowAvatarModal(false); setSelectedAvatar(null);
        }} style={{ marginRight: "8px" }}>
          Annuler
        </button>
        <button 
          className="btn btn-confirm" 
          onClick={handleAvatarConfirm} 
          disabled={!selectedAvatar}
        >
          Valider
        </button>
      </div>
    </div>
  </div>
)}


      {/* Zone de jeu */}
        <div style={{
          width: "340px",
          gap: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center" // <-- ajoute ceci
        }}>
        <h2 className="title2" style={{ marginBottom: 0, color: "white" }}>Jouer</h2>

        <button className="btn btn-confirm" onClick={handleCreateGame}>
          Créer une partie
        </button>

        <div style={{
          display: "flex",
          gap: "10px",
          flexWrap: "nowrap",
          justifyContent: "center",
          width: "100%"
        }}>
          <input
            className="text-input"
            placeholder="Code de partie"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-confirm"
            onClick={() => navigate(`/room/${joinCode}`)}
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  </div>
);

}

export default LandingPage;