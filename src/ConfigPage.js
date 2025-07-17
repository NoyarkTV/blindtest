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

useEffect(() => {
  const slider = document.querySelector('input[type="range"]');
  if (slider) {
    const percentage = ((time - 5) / 55) * 100;
    slider.style.setProperty('--progress', `${percentage}%`);
  }
}, [time]);

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

  const filters = {
    media: selectedMedia,
    categories: selectedCategorie,
    difficulte: selectedDifficulte,
    pays: selectedPays,
    anneeMin,
    anneeMax
  };

  // 🎯 Demande au serveur de générer la playlist
  fetch("https://blindtest-69h7.onrender.com/generate-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filters, nbRounds })
  })
    .then(res => res.json())
    .then(data => {
      const playlist = data.playlist;
      if (!playlist || playlist.length === 0) {
        console.error("❌ Playlist vide ou non reçue");
        return;
      }

      // 🔁 Démarre la partie avec cette playlist
      fetch("https://blindtest-69h7.onrender.com/start-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          params,
          playlist,
          admin: playerName
        })
      })
        .then(res => res.json())
        .then(() => navigate(`/game/${id}`))
        .catch(err => console.error("❌ Erreur lancement partie :", err));
    })
    .catch(err => {
      console.error("❌ Erreur génération playlist :", err);
    });
};

const renderCheckboxGroup = (label, list, selected, setter, cssClass = "") => (
  <div style={{ marginTop: "15px" }}>
    <div className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
      <span>{label}</span>
      <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
        <button className="btn btn-orange" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => setter([...list])}>
          Tout sélectionner
        </button>
        <button className="btn btn-cancel" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => setter([])}>
          Tout désélectionner
        </button>
      </div>
    </div>
    <div className={`checkbox-group ${cssClass}`} style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
      {list.map((item) => (
        <label
          key={item}
          className={`checkbox-tag ${selected.includes(item) ? "selected-orange" : ""}`}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <input
            type="checkbox"
            checked={selected.includes(item)}
            onChange={() => toggleSelection(item, selected, setter)}
          />
          {item}
        </label>
      ))}
    </div>
  </div>
);

return (
  <div className="app" style={{ padding: "40px 10px" }}>
    <div className="popup" style={{
      maxWidth: "1200px",
      width: "100%",
      display: "flex",
      gap: "30px",
      flexWrap: "wrap",
      background: "var(--color-bg-popup)",
      borderRadius: "16px"
    }}>
      {/* Colonne gauche — Paramètres */}
      <div style={{ flex: 1.2, minWidth: 0, maxWidth: "680px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="title2">Paramètres</div>

        <div>
          <div className="title3">Nombre de rounds</div>
          <div style={{ display: "flex", alignItems: "center", gap: "180px" }}>
            <input className="text-input" type="number" min="1" max={filteredCount} value={nbRounds} onChange={e => setNbRounds(+e.target.value)} style={{ maxWidth: 80 }} />
            <label className="text-input" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", width: "fit-content", background: "transparent" }}>
              <input type="checkbox" checked={bonusCompositeur} onChange={e => setBonusCompositeur(e.target.checked)} />
              Bonus compositeur
            </label>
          </div>
          <div style={{ fontSize: "0.9rem", marginTop: "4px", color: filteredCount === 0 ? "var(--color-red)" : "var(--color-text)" }}>
            {filteredCount === 0 ? "Aucun morceau disponible avec ces filtres" : `${filteredCount} morceaux disponibles`}
          </div>
        </div>

        <div>
          <div className="title3" style={{ marginBottom: "5px" }}>Temps par manche</div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={time}
            onChange={e => setTime(+e.target.value)}
          />
          <div>{time} secondes</div>
        </div>

<div>
  <div className="title3" style={{ marginBottom: "5px" }}>Années</div>
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <span style={{ color: "#ffffff" }}>De</span>
    <input
      type="number"
      className="text-input"
      value={anneeMin}
      onChange={e => setAnneeMin(+e.target.value)}
      style={{ maxWidth: 80 }}
    />
    <span style={{ color: "#ffffff" }}>à</span>
    <input
      type="number"
      className="text-input"
      value={anneeMax}
      onChange={e => setAnneeMax(+e.target.value)}
      style={{ maxWidth: 80 }}
    />
  </div>
</div>

        {renderCheckboxGroup("Médias", media, selectedMedia, setSelectedMedia, "media")}
        {renderCheckboxGroup("Catégories", categorie, selectedCategorie, setSelectedCategorie, "categorie")}
        {renderCheckboxGroup("Difficulté", difficulte, selectedDifficulte, setSelectedDifficulte, "difficulte")}
        {renderCheckboxGroup("Pays", pays, selectedPays, setSelectedPays, "pays")}
      </div>

      {/* Colonne droite — Partie */}
      <div style={{ flex: 0.8, minWidth: "400px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="title2">Partie</div>

        <div style={{
          background: "#1a1835",
          padding: "10px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          minHeight: "0",
          borderRadius: "12px"
        }}>
          {players.map((p, i) => (
            <div
              key={i}
              className="player-item"
              style={{
                background: p.name === playerName ? "var(--gradient-main)" : "#1a1835",
                color: p.name === playerName ? "#fff" : "#fff",
                fontWeight: "bold",
                borderRadius: "12px",
                padding: "8px 12px"
              }}
            >
              {p.name}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input className="text-input" value={id} readOnly style={{ fontSize: "1rem", fontWeight: "bold", flex: 1, maxWidth: 250 }} />
          <button className="btn btn-orange" onClick={copierCode} style={{ whiteSpace: "nowrap" }}>
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-cancel" style={{ flex: 1 }} onClick={() => navigate("/")}>Annuler</button>
          <button className="btn btn-confirm" style={{ flex: 1 }} onClick={validerPartie}>Lancer la partie</button>
        </div>
      </div>
    </div>
  </div>
);

}

export default ConfigPage;
