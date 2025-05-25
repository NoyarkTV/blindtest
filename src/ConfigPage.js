import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ConfigPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(30);
  const [nbRounds, setNbRounds] = useState(10);
  const [bonusCompositeur, setBonusCompositeur] = useState(false);
  const [anneeMin, setAnneeMin] = useState(1925);
  const [anneeMax, setAnneeMax] = useState(2025);
  const [emoji, setEmoji] = useState("🟠");
  const [allTracks, setAllTracks] = useState([]);
  const [filteredCount, setFilteredCount] = useState(0);


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
    document.body.style.backgroundColor = "#1e2a38";
    document.body.style.color = "#ffffff";
    document.body.style.fontFamily = "Poppins, sans-serif";
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  useEffect(() => {
  const count = allTracks.filter(track => {
    return selectedMedia.includes(track.media)
      && selectedCategorie.includes(track.categorie)
      && selectedDifficulte.includes(track.difficulte)
      && selectedPays.includes(track.pays)
      && track.annee >= anneeMin
      && track.annee <= anneeMax;
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
      emoji
    };
    localStorage.setItem("blindtestParams", JSON.stringify(params));

    fetch("http://localhost:8888/set-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    })
      .then(res => res.json())
      .then(() => navigate("/game"))
      .catch(err => console.error("Erreur filtre :", err));
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
              color: selected.includes(item) ? "#1e2a38" : "#000",
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
    <div style={{ background: "#1e2a38", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", color: "#1e2a38", borderRadius: "20px", padding: "20px", maxWidth: "1100px", width: "100%", display: "flex", gap: "30px", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1 style={{ color: "#000000", fontSize: "2rem", margin: 0 }}>Configurer la partie</h1>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: "bold" }}>Nombre de rounds</div>
              <label><input type="checkbox" checked={bonusCompositeur} onChange={e => setBonusCompositeur(e.target.checked)} /> Bonus compositeur</label>
            </div>
            <input type="number" min="1" max="100" value={nbRounds} onChange={e => setNbRounds(+e.target.value)} />

            <div style={{ fontSize: "0.9rem", marginTop: "4px", color: filteredCount === 0 ? "red" : "#1e2a38" }}>
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

          <button style={{ backgroundColor: "#f7b733", color: "#1e2a38", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: "bold", cursor: "pointer", marginTop: 8 }}>Importer un tableur</button>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="section-title" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Partie</div>
          <div style={{ background: "#f2f2f2", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ fontWeight: "bold", backgroundColor: "#fff3cd", padding: "5px 10px", borderRadius: "10px" }}>Thibault
              <select value={emoji} onChange={e => setEmoji(e.target.value)} style={{ marginLeft: "10px" }}>
                <option value="🟠">🟠</option>
                <option value="🟣">🟣</option>
                <option value="🟢">🟢</option>
                <option value="🔵">🔵</option>
                <option value="🟡">🟡</option>
              </select>
            </div>
            <div>Margaux 🟣</div>
          </div>
          <div className="code-box" style={{ display: "flex", gap: 10 }}>
            <input value="ABC12" readOnly style={{ fontSize: "1rem", fontWeight: "bold" }} />
            <button style={{ backgroundColor: "#f7b733", color: "#1e2a38", border: "none", borderRadius: "8px", padding: "6px 12px", fontWeight: "bold" }}>Copier</button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ flex: 1, padding: "8px", fontWeight: "bold", borderRadius: "10px", border: "none", backgroundColor: "#ccc", color: "#333" }} onClick={() => navigate("/")}>Annuler</button>
            <button style={{ flex: 1, padding: "8px", fontWeight: "bold", borderRadius: "10px", border: "none", backgroundColor: "#f7b733", color: "#1e2a38" }} onClick={validerPartie}>Lancer la partie</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigPage;
