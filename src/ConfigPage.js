import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import socket from "./socket";
import { AppHeader, CopyIcon, CheckIcon, CrownIcon } from "./BlindtestUI";

console.log("✅ ConfigPage.js chargé !");

function ConfigPage() {
  const { id } = useParams();
  const playerName = localStorage.getItem("playerName") || "Joueur";
  const navigate = useNavigate();
  const [time, setTime] = useState(30);
  const [nbRounds, setNbRounds] = useState(10);
  const [bonusCompositeur, setBonusCompositeur] = useState(true);
  const [anneeMin, setAnneeMin] = useState(1925);
  const [anneeMax, setAnneeMax] = useState(new Date().getFullYear());
  const [allTracks, setAllTracks] = useState([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [sagaTracks, setSagaTracks] = useState([]);
  const [testMode, setTestMode] = useState(false);
  const [modeEclair, setModeEclair] = useState(false);
  const [modeDiffusion, setModeDiffusion] = useState(false);
  const shouldLeaveRef = useRef(true);


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
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem("profilePhoto") || "");

useEffect(() => {
  const handleLeave = () => {
    if (!shouldLeaveRef.current) return;
    fetch("https://blindtest-69h7.onrender.com/leave-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, playerName }),
      keepalive: true
    });
  };

  window.addEventListener("beforeunload", handleLeave);
  return () => {
    window.removeEventListener("beforeunload", handleLeave);
    handleLeave();
  };
}, [id, playerName]);

  useEffect(() => {
  socket.emit("join-room", { roomId: id, playerName });

  const onJoined = (updatedPlayers) => {
    console.log("🔁 Mise à jour reçue :", updatedPlayers);
    setPlayers(updatedPlayers);
  };
  const onLeft = (updatedPlayers) => setPlayers(updatedPlayers);
  const onGameStarted = (data) => {
    shouldLeaveRef.current = false;
    console.log("🚀 Partie lancée !");
    if (data?.config?.modeDiffusion) {
      navigate(`/diffuseur/${id}`);
    } else if (data?.config?.modeEclair) {
      navigate(`/game-eclair/${id}`);
    } else {
      navigate(`/game/${id}`);
    }
  };

  socket.on("player-joined", onJoined);
  socket.on("player-left", onLeft);
  socket.on("game-started", onGameStarted);

  return () => {
    socket.off("player-joined", onJoined);
    socket.off("player-left", onLeft);
    socket.off("game-started", onGameStarted);
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
      const years = data
        .map(track => Number(track.annee))
        .filter(year => Number.isFinite(year) && year > 0);
      if (years.length > 0) {
        setAnneeMin(Math.min(...years));
        setAnneeMax(Math.max(...years));
      }
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
  const photo = localStorage.getItem("profilePhoto") || "";

  const player = {
    name: playerName,
    photo: photo
  };

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
  if (filteredCount === 0 || nbRounds < 1 || nbRounds > filteredCount) {
    alert(`Impossible de lancer ${nbRounds} round(s) : ${filteredCount} morceau(x) disponible(s) avec ces filtres.`);
    return;
  }

  const params = {
    bonusCompositeur,
    nbRounds,
    time: modeEclair ? 0.5 : time,
    anneeMin,
    anneeMax,
    media: selectedMedia,
    categories: selectedCategorie,
    difficulte: selectedDifficulte,
    pays: selectedPays,
    testMode,
    modeEclair,
    modeDiffusion
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
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de générer la playlist");
      return data;
    })
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
        .then(() => {
          // Important : la navigation Config -> Jeu ne doit jamais être interprétée comme un départ de la room.
          shouldLeaveRef.current = false;
          if (modeDiffusion) {
            navigate(`/diffuseur/${id}`);
          } else if (modeEclair) {
            navigate(`/game-eclair/${id}`);
          } else {
            navigate(`/game/${id}`);
          }
        })
        .catch(err => console.error("❌ Erreur lancement partie :", err));
    })
    .catch(err => {
      console.error("❌ Erreur génération playlist :", err);
    });
};

const renderCheckboxGroup = (label, list, selected, setter, cssClass = "") => (
  <div className="bt-config-filter">
    <div className="bt-config-filter-head">
      <strong>{label}</strong>
      <div>
        <button onClick={() => setter([...list])}>Tout sélectionner</button>
        <button onClick={() => setter([])}>Tout désélectionner</button>
      </div>
    </div>
    <div className={`bt-config-chips ${cssClass}`}>
      {list.map(item => (
        <button
          type="button"
          key={item}
          className={`bt-config-chip ${selected.includes(item) ? "selected" : ""}`}
          onClick={() => toggleSelection(item, selected, setter)}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
);

return (
  <div className="app bt-config-page">
    <AppHeader onHome={() => navigate("/")} />
    <div className="bt-config-shell">
      <section className="bt-config-main">
        <div className="bt-config-heading">
          <div><span>Paramètres</span><h2>Configurer le blindtest</h2></div>
          <small className={filteredCount === 0 ? "empty" : ""}>
            {filteredCount === 0 ? "Aucun morceau disponible" : `${filteredCount} morceaux disponibles`}
          </small>
        </div>

        <div className="bt-mode-grid">
          <button className={`bt-mode-card ${!modeEclair && !modeDiffusion ? "selected" : ""}`} onClick={() => { setModeEclair(false); setModeDiffusion(false); }}>
            <strong>Classique</strong><small>Le mode principal du blindtest</small>
          </button>
          <button className={`bt-mode-card ${modeEclair ? "selected" : ""}`} onClick={() => { setModeEclair(true); setModeDiffusion(false); }}>
            <strong>Éclair</strong><small>Réponses très rapides</small>
          </button>
          <button className={`bt-mode-card ${modeDiffusion ? "selected" : ""}`} onClick={() => { setModeDiffusion(true); setModeEclair(false); }}>
            <strong>Diffusion</strong><small>Un diffuseur, plusieurs joueurs</small>
          </button>
        </div>

        <div className="bt-config-top-controls">
          <div className="bt-config-control">
            <label>Nombre de rounds</label>
            <div className="bt-round-stepper">
              <button onClick={() => setNbRounds(value => Math.max(1, value - 1))}>−</button>
              <input
                type="number"
                min="1"
                max={Math.max(filteredCount, 1)}
                value={nbRounds}
                onChange={event => setNbRounds(Math.max(1, Math.min(+event.target.value || 1, Math.max(filteredCount, 1))))}
              />
              <button onClick={() => setNbRounds(value => Math.min(Math.max(filteredCount, 1), value + 1))}>+</button>
            </div>
          </div>
          <div className="bt-config-control">
            <label>Temps par manche</label>
            <input type="range" min="5" max="60" step="5" value={time} disabled={modeEclair} onChange={event => setTime(+event.target.value)} />
            <div className="bt-range-caption"><span>5 s</span><strong>{modeEclair ? "0.5 seconde" : `${time} secondes`}</strong><span>60 s</span></div>
          </div>
          <div className="bt-config-control">
            <label>Années</label>
            <div className="bt-year-range">
              <span>De</span><input type="number" value={anneeMin} onChange={event => setAnneeMin(+event.target.value)} />
              <span>à</span><input type="number" value={anneeMax} onChange={event => setAnneeMax(+event.target.value)} />
            </div>
          </div>
        </div>

        <button className={`bt-composer-toggle ${bonusCompositeur ? "selected" : ""}`} onClick={() => setBonusCompositeur(value => !value)}>
          <span className="bt-switch"><i /></span>
          <span><strong>Bonus compositeur</strong><small>Permet de gagner des points supplémentaires en trouvant le compositeur.</small></span>
        </button>

        {renderCheckboxGroup("Médias", media, selectedMedia, setSelectedMedia, "media")}
        {renderCheckboxGroup("Difficulté", difficulte, selectedDifficulte, setSelectedDifficulte, "difficulte")}
        {renderCheckboxGroup("Catégories", categorie, selectedCategorie, setSelectedCategorie, "categorie")}
        {renderCheckboxGroup("Pays", pays, selectedPays, setSelectedPays, "pays")}
      </section>

      <aside className="bt-config-lobby">
        <div>
          <h3>Salle d’attente</h3>
          <div className="bt-config-code"><code>{id}</code><button className={`bt-copy-code ${copied ? "copied" : ""}`} onClick={copierCode} title={copied ? "Code copié" : "Copier le code"} aria-label={copied ? "Code copié" : "Copier le code"}>{copied ? <CheckIcon /> : <CopyIcon />}</button></div>
          <div className="bt-config-players">
            {players.map(player => (
              <div className={`bt-config-player ${player.name === playerName ? "me" : ""}`} key={player.name}>
                <span className="bt-avatar"><img src={player.photo || "/ppDefault.png"} alt="" /></span>
                <span>{player.name}{player.name === playerName && <span className="bt-admin-crown" title="Organisateur"><CrownIcon /></span>}</span>
                <i className="bt-online-dot" />
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-confirm bt-launch-game" onClick={validerPartie} disabled={filteredCount === 0 || nbRounds < 1 || nbRounds > filteredCount}>
          Lancer la partie
        </button>
      </aside>
    </div>
  </div>
);

}

export default ConfigPage;
