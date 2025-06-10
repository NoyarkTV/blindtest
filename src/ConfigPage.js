import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import socket from "./socket";

console.log("✅ ConfigPage.js chargé !");

function ConfigPage() {
  const { id } = useParams();
  const playerName = localStorage.getItem("playerName") || "Joueur";
  const navigate = useNavigate();
  const [time, setTime] = useState(30);
  const [nbRounds, setNbRounds] = useState(10);
  const [bonusCompositeur, setBonusCompositeur] = useState(false);
  const [anneeMin, setAnneeMin] = useState(1925);
  const [anneeMax, setAnneeMax] = useState(2025);
  const [allTracks, setAllTracks] = useState([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [sagaTracks, setSagaTracks] = useState([]);
  const [testMode, setTestMode] = useState(false);



  const [media, setMedia] = useState(["Animé", "Film", "Série", "Dessin Animé", "Jeux vidéo"]);
  const [categorie, setCategorie] = useState([
    "Science-Fiction", "Fantasy", "Comédie", "Western", "Super-héro", "Thriller",
    "Horreur", "Action", "Disney", "Marvel", "Animation", "Drame",
    "Histoire", "Musical", "Romance"
  ]);
  const [difficulte, setDifficulte] = useState(["Facile", "Moyen", "Difficile"]);
  const [pays, setPays] = useState(["Asie", "France", "USA", "UK", "Europe", "Espagne"]);

  const [selectedMedia, setSelectedMedia] = useState([...media]);
  const [selectedCategorie, setSelectedCategorie] = useState([...categorie]);
  const [selectedDifficulte, setSelectedDifficulte] = useState([...difficulte]);
  const [selectedPays, setSelectedPays] = useState([...pays]);

useEffect(() => {
  socket.emit("join-room", id);

  socket.on("player-joined", (updatedPlayers) => {
    console.log("🔁 Mise à jour reçue :", updatedPlayers);
    setPlayers(updatedPlayers);
  });

  socket.on("game-started", () => {
    console.log("🚀 Partie lancée !");
    navigate(`/game/${id}`);
  });

  return () => {
    socket.off("player-joined");
    socket.off("game-started");
  };
}, [id, navigate]);

  useEffect(() => {
  socket.emit("join-room", id);

  socket.on("player-joined", (updatedPlayers) => {
    console.log("🔁 Mise à jour reçue :", updatedPlayers);
    setPlayers(updatedPlayers);
  });
  socket.on("game-started", () => {
    console.log("🚀 Partie lancée !");
    navigate(`/game/${id}`);
  });

  return () => {
  socket.off("player-joined");
  socket.off("game-started");
};
}, [id]);


  useEffect(() => {
  fetch(`https://blindtest-69h7.onrender.com/game/${id}`)
    .then(res => res.json())
    .then(data => {
      setPlayers(data.players || []);
    });
}, [id]);

  useEffect(() => {
  fetch("https://blindtest-69h7.onrender.com/all-tracks")
    .then(res => res.json())
    .then(data => {
      setAllTracks(data);
      console.log("🎵 Morceaux reçus :", data);
    })
    .catch(err => {
      console.error("Erreur lors du chargement des morceaux :", err);
      setAllTracks([]);
    });
}, []);

useEffect(() => {
  fetch("https://blindtest-69h7.onrender.com/saga-tracks")
    .then(res => res.json())
    .then(data => {
      setSagaTracks(data);
      console.log("🎬 Morceaux saga chargés :", data.length);
    })
    .catch(err => {
      console.error("Erreur chargement morceaux saga :", err);
      setSagaTracks([]);
    });
}, []);

useEffect(() => {
  const playerName = localStorage.getItem("playerName") || "Joueur";
  const player = { name: playerName };

  fetch("https://blindtest-69h7.onrender.com/join-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, player })
  }).then(() => {
    // recharger liste après ajout
    fetch(`https://blindtest-69h7.onrender.com/game/${id}`)
      .then(res => res.json())
      .then(data => setPlayers(data.players || []));
  });
}, [id]);

  useEffect(() => {
const count = allTracks.filter(track => {
  const okMedia = selectedMedia.includes(track.media);
  const okCategorie =
  !selectedCategorie.length || selectedCategorie.some(cat =>
    (track.categorie || "")
      .split(",")
      .map(c => c.trim())
      .includes(cat)
  );
  const okDiff = selectedDifficulte.includes(track.difficulte);
  const okPays = selectedPays.includes(track.pays);
  const okAnnee = track.annee >= anneeMin && track.annee <= anneeMax;

  const keep = okMedia && okCategorie && okDiff && okPays && okAnnee;

  return keep;
}).length;


  setFilteredCount(count);
}, [allTracks, selectedMedia, selectedCategorie, selectedDifficulte, selectedPays, anneeMin, anneeMax]);



  const toggleSelection = (value, selectedList, setter) => {
    setter(
      selectedList.includes(value)
        ? selectedList.filter((v) => v !== value)
        : [...selectedList, value]
    );
  };

const copierCode = () => {
  navigator.clipboard.writeText(id)
    .then(() => {
      console.log("✅ Code copié :", id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reviennent à "Copier" après 2 secondes
    })
    .catch(err => console.error("❌ Erreur copie :", err));
};



const validerPartie = () => {
  const params = {
    bonusCompositeur,
    nbRounds,
    time,
    anneeMin,
    anneeMax,
    media: selectedMedia,
    categories: selectedCategorie,
    difficulte: selectedDifficulte,
    pays: selectedPays,
    testMode
  };

  // 🔎 Filtrer les morceaux selon les critères
  const filteredTracks = allTracks.filter(track => {
    const okMedia = selectedMedia.includes(track.media);
    const okCategorie =
      !selectedCategorie.length || selectedCategorie.some(cat =>
        (track.categorie || "")
          .split(",")
          .map(c => c.trim())
          .includes(cat)
      );
    const okDiff = selectedDifficulte.includes(track.difficulte);
    const okPays = selectedPays.includes(track.pays);
    const okAnnee = track.annee >= anneeMin && track.annee <= anneeMax;

    return okMedia && okCategorie && okDiff && okPays && okAnnee;
  });

function fisherYatesShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomSagaTrack(sagaName) {
  const sagaOptions = sagaTracks.filter(t => t.saga === sagaName);
  if (sagaOptions.length === 0) {
    console.warn(`❌ Saga inconnue ou vide : "${sagaName}"`);
    return null;
  }
  const picked = sagaOptions[Math.floor(Math.random() * sagaOptions.length)];
  console.log(`🎬 Saga détectée : "${sagaName}" → ${picked.titre}`);
  return picked;
}

// 🎲 Tirage avec gestion saga + complétion
let shuffled = fisherYatesShuffle(filteredTracks);
const enrichedTracks = [];

for (let i = 0; i < shuffled.length && enrichedTracks.length < nbRounds; i++) {
  const track = shuffled[i];

  if (!track.uri?.startsWith("spotify:track:")) {
    const sagaName = track.uri?.trim();
    console.log(`🔍 URI non standard détecté, tentative saga : "${sagaName}"`);

    const sagaTrack = getRandomSagaTrack(sagaName);
    if (sagaTrack) {
      enrichedTracks.push({
        ...sagaTrack,
        image: sagaTrack.image || null
      });
    } else {
      console.warn(`⚠️ Aucun morceau trouvé pour saga "${sagaName}"`);
    }
  } else {
    const original = allTracks.find(t => t.uri === track.uri);
    enrichedTracks.push({
      ...track,
      image: original?.image || null
    });
  }
}

// 🔁 Complétion si on n’a pas assez de morceaux
if (enrichedTracks.length < nbRounds) {
  console.log(`🔄 Complétion : ${nbRounds - enrichedTracks.length} morceaux manquants, recherche en cours...`);

  const remaining = fisherYatesShuffle(allTracks).filter(t =>
    !enrichedTracks.some(et => et.uri === t.uri) &&
    t.uri?.startsWith("spotify:track:")
  );

  for (let i = 0; i < remaining.length && enrichedTracks.length < nbRounds; i++) {
    enrichedTracks.push({
      ...remaining[i],
      image: remaining[i].image || null
    });
    console.log(`➕ Complément ajouté : ${remaining[i].titre}`);
  }
}

console.log(`✅ Playlist finale générée (${enrichedTracks.length}/${nbRounds})`);


  const payload = {
    id,                   // ID de la partie
    params,               // paramètres de jeu
    playlist: enrichedTracks, // morceaux choisis
    admin: playerName
  };

  fetch("https://blindtest-69h7.onrender.com/start-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(() => navigate(`/game/${id}`))
    .catch(err => console.error("Erreur lancement partie :", err));
};

  const renderCheckboxGroup = (label, list, selected, setter) => (
    <div>
      <div style={{ fontWeight: "bold", marginTop: 10 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {list.map((item) => (
          <label
            key={item}
            style={{
              background: selected.includes(item) ? "#f7b733" : "#eee",
              color: selected.includes(item) ? "#1c2541" : "#000",
              padding: "4px 8px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => toggleSelection(item, selected, setter)}
              style={{ marginRight: 4 }}
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background: "#1c2541", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", color: "#1c2541", borderRadius: "20px", padding: "20px", maxWidth: "1100px", width: "100%", display: "flex", gap: "30px", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1 style={{ color: "#000000", fontSize: "2rem", margin: 0 }}>Configurer la partie</h1>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: "bold" }}>Nombre de rounds</div>
              <label><input type="checkbox" checked={bonusCompositeur} onChange={e => setBonusCompositeur(e.target.checked)} /> Bonus compositeur</label>
            </div>
            {playerName === "thibchoffardet" && (
  <div style={{ marginTop: "10px" }}>
    <label>
      <input
        type="checkbox"
        checked={testMode}
        onChange={(e) => setTestMode(e.target.checked)}
        style={{ marginRight: "6px" }}
      />
      Mode test (n'envoie pas les stats)
    </label>
  </div>
)}
            <input type="number" min="1" max={filteredCount} value={nbRounds} onChange={e => setNbRounds(+e.target.value)} />

            <div style={{ fontSize: "0.9rem", marginTop: "4px", color: filteredCount === 0 ? "red" : "#1c2541" }}>
  {filteredCount === 0
    ? "Aucun morceau disponible avec ces filtres"
    : `${filteredCount} morceaux disponibles`}
</div>

          </div>
          <div>
            <div style={{ fontWeight: "bold" }}>Temps par manche</div>
            <input type="range" min="5" max="60" step="5" value={time} onChange={e => setTime(+e.target.value)} />
            <div>{time} secondes</div>
          </div>
          <div>
            <div style={{ fontWeight: "bold" }}>Années</div>
            <label>
              De <input type="number" value={anneeMin} onChange={e => setAnneeMin(+e.target.value)} style={{ width: 70 }} /> à <input type="number" value={anneeMax} onChange={e => setAnneeMax(+e.target.value)} style={{ width: 70 }} />
            </label>
          </div>

          {renderCheckboxGroup("Médias", media, selectedMedia, setSelectedMedia)}
          {renderCheckboxGroup("Catégories", categorie, selectedCategorie, setSelectedCategorie)}
          {renderCheckboxGroup("Difficulté", difficulte, selectedDifficulte, setSelectedDifficulte)}
          {renderCheckboxGroup("Pays", pays, selectedPays, setSelectedPays)}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="section-title" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Partie</div>
          <div style={{ background: "#f2f2f2", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
{players.map((p, i) => (
  <div
    key={i}
    style={{
      fontWeight: "bold",
      backgroundColor: p.name === playerName ? "#fff3cd" : "#e2e3e5",
      padding: "5px 10px",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}
  >
    <span>{p.name}</span>
  </div>
))}


          </div>
          <div className="code-box" style={{ display: "flex", gap: 10 }}>
            <input value={id} readOnly style={{ fontSize: "1rem", fontWeight: "bold" }} />
            <button
  onClick={copierCode}
  style={{
    backgroundColor: "#f7b733",
    color: "#1c2541",
    border: "none",
    borderRadius: "8px",
    padding: "6px 12px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
    width: "80px", // pour garder une taille fixe
    textAlign: "center"
  }}
>
  {copied ? "Copié !" : "Copier"}
</button>

          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ flex: 1, padding: "8px", fontWeight: "bold", borderRadius: "10px", border: "none", backgroundColor: "#ccc", color: "#333", cursor: "pointer" }} onClick={() => navigate("/")}>Annuler</button>
            <button style={{ flex: 1, padding: "8px", fontWeight: "bold", borderRadius: "10px", border: "none", backgroundColor: "#f7b733", color: "#1c2541", cursor: "pointer" }} onClick={validerPartie}>Lancer la partie</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigPage;
