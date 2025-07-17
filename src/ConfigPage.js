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
    {/* Titre + boutons alignés à gauche */}
    <div className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
      <span style={{ fontWeight: "bold" }}>{label}</span>
      <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
        <button
          onClick={() => setter([...list])}
          style={{
            backgroundColor: "#f7b733",
            color: "#1c2541",
            border: "none",
            padding: "4px 10px",
            borderRadius: "0px",
            fontSize: "0.8rem",
            cursor: "pointer"
          }}
        >
          Tout sélectionner
        </button>
        <button
          onClick={() => setter([])}
          style={{
            backgroundColor: "#ccc",
            color: "#333",
            border: "none",
            padding: "4px 10px",
            borderRadius: "0px",
            fontSize: "0.8rem",
            cursor: "pointer"
          }}
        >
          Tout désélectionner
        </button>
      </div>
    </div>

    {/* Groupe des cases */}
    <div className={`checkbox-group ${cssClass}`} style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "10px"
    }}>
      {list.map((item) => (
        <label
          key={item}
          style={{
            background: selected.includes(item) ? "#f7b733" : "#eee",
            color: selected.includes(item) ? "#1c2541" : "#000",
            padding: "5px 10px",
            borderRadius: "15px",
            cursor: "pointer",
            fontSize: "0.85rem"
          }}
        >
          <input
            type="checkbox"
            checked={selected.includes(item)}
            onChange={() => toggleSelection(item, selected, setter)}
            style={{ marginRight: 6 }}
          />
          {item}
        </label>
      ))}
    </div>
  </div>
);


return (
  <div style={{ background: "#1c2541", minHeight: "100vh", fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
    <div style={{ background: "white", color: "#1c2541", borderRadius: "20px", padding: "20px", maxWidth: "1100px", width: "100%", display: "flex", gap: "30px", flexWrap: "wrap" }}>
      
      {/* Colonne de gauche – paramètre */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: "620px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="section-title" style={{ fontSize: "1.4rem", fontWeight: "bold" }}>Paramètres</div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: "bold" }}>Nombre de rounds</div>
            <label>
              <input type="checkbox" checked={bonusCompositeur} onChange={e => setBonusCompositeur(e.target.checked)} />
              Bonus compositeur
            </label>
          </div>
          {playerName === "thibchoffardet" && (
            <div style={{ marginTop: "10px" }}>
            </div>
          )}
          <input type="number" min="1" max={filteredCount} value={nbRounds} onChange={e => setNbRounds(+e.target.value)} />
          <div style={{ fontSize: "0.9rem", marginTop: "4px", color: filteredCount === 0 ? "red" : "#1c2541" }}>
            {filteredCount === 0 ? "Aucun morceau disponible avec ces filtres" : `${filteredCount} morceaux disponibles`}
          </div>
        </div>

        <div>
          <div className="section-title" style={{ fontWeight: "bold", marginBottom: "5px" }}>Temps par manche</div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={time}
            onChange={e => setTime(+e.target.value)}
            style={{
              width: "100%",
              WebkitAppearance: "none",
              height: "6px",
              borderRadius: "3px",
              background: `linear-gradient(to right, #f7b733 0%, #f7b733 ${(time - 5) / 55 * 100}%, #ddd ${(time - 5) / 55 * 100}%, #ddd 100%)`,
              outline: "none"
            }}
          />

          <div>{time} secondes</div>
        </div>

        <div>
          <div className="section-title" style={{ fontWeight: "bold", marginBottom: "5px" }}>Années</div>
          <label>
            De <input type="number" value={anneeMin} onChange={e => setAnneeMin(+e.target.value)} style={{ width: 70 }} />
            à <input type="number" value={anneeMax} onChange={e => setAnneeMax(+e.target.value)} style={{ width: 70, marginLeft: 10 }} />
          </label>
        </div>

        {renderCheckboxGroup("Médias", media, selectedMedia, setSelectedMedia, "media")}
        {renderCheckboxGroup("Catégories", categorie, selectedCategorie, setSelectedCategorie, "categorie")}
        {renderCheckboxGroup("Difficulté", difficulte, selectedDifficulte, setSelectedDifficulte, "difficulte")}
        {renderCheckboxGroup("Pays", pays, selectedPays, setSelectedPays, "pays")}
      </div>

      {/* Colonne de droite – Partie */}
      <div style={{ flex: 1, minWidth: 0, minWidth: "460px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="section-title" style={{ fontSize: "1.4rem", fontWeight: "bold" }}>Partie</div>

        {/* Bloc joueur – doit prendre le max de hauteur */}
        <div style={{ background: "#f2f2f2", borderRadius: "10px", padding: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "5px", minHeight: "0" }}>
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

        {/* Code partie */}
        <div className="code-box" style={{ display: "flex", gap: 10 }}>
          <input value={id} readOnly style={{ fontSize: "1rem", fontWeight: "bold", flex: 1 }} />
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
              width: "80px",
              textAlign: "center"
            }}
          >
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        {/* Boutons bas */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              flex: 1,
              padding: "8px",
              fontWeight: "bold",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#ccc",
              color: "#333",
              cursor: "pointer"
            }}
            onClick={() => navigate("/")}
          >
            Annuler
          </button>
          <button
            style={{
              flex: 1,
              padding: "8px",
              fontWeight: "bold",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#f7b733",
              color: "#1c2541",
              cursor: "pointer"
            }}
            onClick={validerPartie}
          >
            Lancer la partie
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

export default ConfigPage;
