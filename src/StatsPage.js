import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API = "https://blindtest-69h7.onrender.com";

const formatNumber = (value, digits = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};

const formatPercent = value => `${formatNumber(value, 0)} %`;
const formatTime = value => Number.isFinite(Number(value)) ? `${formatNumber(value, 1)} s` : "—";

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="stats-metric-card">
      <span className="stats-metric-label">{label}</span>
      <strong>{value}</strong>
      {subtitle && <small>{subtitle}</small>}
    </div>
  );
}

function DimensionCard({ title, item }) {
  return (
    <div className="stats-feature-card">
      <span>{title}</span>
      {item ? (
        <>
          <strong>{item.name}</strong>
          <small>{formatPercent(item.accuracy)} · {item.correct}/{item.attempts} · {formatTime(item.averageTime)}</small>
        </>
      ) : (
        <strong>Pas encore assez de données</strong>
      )}
    </div>
  );
}

function TrackList({ title, items, mode = "accuracy", emptyText = "Pas encore assez de données." }) {
  return (
    <div className="stats-list-card">
      <h3>{title}</h3>
      {items?.length ? items.slice(0, 4).map((item, index) => (
        <div className="stats-list-row" key={`${item.trackUri || item.title}-${index}`}>
          <span>{item.title}</span>
          <strong>
            {mode === "time" && formatTime(item.averageTime)}
            {mode === "difference" && `${item.difference > 0 ? "+" : ""}${formatNumber(item.difference, 0)} pts`}
            {mode === "accuracy" && `${formatPercent(item.accuracy)} (${item.correct}/${item.attempts})`}
          </strong>
        </div>
      )) : <p className="stats-empty">{emptyText}</p>}
    </div>
  );
}

function CompareMetric({ label, a, b, formatter = formatNumber, lowerIsBetter = false }) {
  const aNum = Number(a);
  const bNum = Number(b);
  const comparable = Number.isFinite(aNum) && Number.isFinite(bNum);
  const aWins = comparable && aNum !== bNum && (lowerIsBetter ? aNum < bNum : aNum > bNum);
  const bWins = comparable && aNum !== bNum && (lowerIsBetter ? bNum < aNum : bNum > aNum);

  return (
    <div className="compare-metric-row">
      <strong className={aWins ? "compare-best" : ""}>{formatter(a)}</strong>
      <span>{label}</span>
      <strong className={bWins ? "compare-best" : ""}>{formatter(b)}</strong>
    </div>
  );
}

function TerrainComparison({ title, terrain, playerA, playerB }) {
  if (!terrain) return null;
  const label = terrain.category || terrain.year;
  return (
    <div className="compare-terrain-card">
      <span>{title}</span>
      <strong>{label}</strong>
      <div>
        <small>{playerA}: {terrain.a ? `${formatPercent(terrain.a.accuracy)} (${terrain.a.correct}/${terrain.a.attempts})` : "aucune donnée"}</small>
        <small>{playerB}: {terrain.b ? `${formatPercent(terrain.b.accuracy)} (${terrain.b.correct}/${terrain.b.attempts})` : "aucune donnée"}</small>
      </div>
    </div>
  );
}

function StatsPage() {
  const navigate = useNavigate();
  const playerName = localStorage.getItem("playerName") || "";
  const profilePhoto = localStorage.getItem("profilePhoto") || "/ppDefault.png";
  const [stats, setStats] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [comparison, setComparison] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (!playerName) {
      setLoading(false);
      setError("Aucun profil joueur n'est disponible sur cet appareil.");
      return;
    }

    Promise.all([
      fetch(`${API}/stats/player/${encodeURIComponent(playerName)}`).then(res => {
        if (!res.ok) throw new Error("Impossible de charger tes statistiques");
        return res.json();
      }),
      fetch(`${API}/stats/global`).then(res => res.ok ? res.json() : null)
    ])
      .then(([personal, global]) => {
        setStats(personal);
        setGlobalStats(global);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [playerName]);

  useEffect(() => {
    if (!showCompare) return;
    const timer = setTimeout(() => {
      fetch(`${API}/stats/players?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setPlayers((data.players || []).filter(name => name !== playerName)))
        .catch(() => setPlayers([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [query, showCompare, playerName]);

  const performComparison = name => {
    if (!name) return;
    setSelectedPlayer(name);
    setCompareLoading(true);
    setComparison(null);
    fetch(`${API}/stats/compare?playerA=${encodeURIComponent(playerName)}&playerB=${encodeURIComponent(name)}`)
      .then(res => {
        if (!res.ok) throw new Error("Comparaison indisponible");
        return res.json();
      })
      .then(setComparison)
      .catch(() => setComparison(null))
      .finally(() => setCompareLoading(false));
  };

  const storageMode = stats?.storage || globalStats?.storage;
  const summary = stats?.summary || {};
  const categoryRows = useMemo(() => stats?.categories?.slice(0, 6) || [], [stats]);
  const yearRows = useMemo(() => stats?.years?.slice(0, 6) || [], [stats]);

  if (loading) {
    return <div className="app stats-page"><div className="stats-loading">Chargement des statistiques…</div></div>;
  }

  return (
    <div className="app stats-page">
      <header className="stats-header">
        <img src="/logo-line.svg" alt="Retour accueil" onClick={() => navigate("/")} />
        <div className="stats-header-actions">
          <button className="btn btn-confirm" onClick={() => setShowCompare(true)}>Comparer</button>
        </div>
      </header>

      <main className="stats-shell">
        <section className="stats-title-row">
          <div className="stats-profile-title">
            <img src={stats?.photo || profilePhoto} alt="Avatar" />
            <div>
              <span>Statistiques de</span>
              <h1>{playerName || "Joueur"}</h1>
            </div>
          </div>
        </section>

        {storageMode === "local" && (
          <div className="stats-storage-warning">
            Les nouvelles statistiques fonctionnent, mais elles sont encore stockées localement sur le serveur. Connecte une base Render Postgres via <code>DATABASE_URL</code> pour les rendre permanentes entre les déploiements.
          </div>
        )}

        {error ? (
          <div className="stats-empty-state">{error}</div>
        ) : (
          <>
            <section className="stats-metric-grid">
              <MetricCard label="Parties jouées" value={formatNumber(summary.gamesPlayed)} />
              <MetricCard label="Parties gagnées" value={formatNumber(summary.gamesWon)} subtitle={summary.gamesPlayed ? `${formatPercent((summary.gamesWon / summary.gamesPlayed) * 100)} de victoires` : undefined} />
              <MetricCard label="Points cumulés" value={formatNumber(summary.totalScore)} />
              <MetricCard label="Titres trouvés" value={formatNumber(summary.roundsWon)} subtitle={`${formatNumber(summary.roundsPlayed)} manches jouées`} />
              <MetricCard label="Taux de réussite" value={formatPercent(summary.accuracy)} />
              <MetricCard label="Temps moyen" value={formatTime(summary.averageResponseTime)} subtitle={`Record : ${formatTime(summary.bestResponseTime)}`} />
            </section>

            <section className="stats-section">
              <div className="stats-section-heading">
                <div>
                  <span>Profil</span>
                  <h2>Tes terrains forts</h2>
                </div>
              </div>
              <div className="stats-feature-grid">
                <DimensionCard title="Meilleure catégorie" item={stats?.bestCategory} />
                <DimensionCard title="Meilleure année" item={stats?.bestYear} />
                <div className="stats-feature-card">
                  <span>Points / manche</span>
                  <strong>{formatNumber(summary.averagePointsPerRound, 1)}</strong>
                  <small>{formatNumber(summary.hintsUsed)} indice(s) utilisés · {formatNumber(summary.wrongAttempts)} mauvaise(s) tentative(s)</small>
                </div>
              </div>
            </section>

            <section className="stats-section stats-two-columns">
              <div className="stats-table-card">
                <h3>Catégories les plus jouées</h3>
                {categoryRows.length ? categoryRows.map(item => (
                  <div className="stats-performance-row" key={item.name}>
                    <span>{item.name}</span>
                    <strong>{formatPercent(item.accuracy)}</strong>
                    <small>{item.correct}/{item.attempts} · {formatTime(item.averageTime)}</small>
                  </div>
                )) : <p className="stats-empty">Pas encore assez de données.</p>}
              </div>
              <div className="stats-table-card">
                <h3>Années les plus rencontrées</h3>
                {yearRows.length ? yearRows.map(item => (
                  <div className="stats-performance-row" key={item.name}>
                    <span>{item.name}</span>
                    <strong>{formatPercent(item.accuracy)}</strong>
                    <small>{item.correct}/{item.attempts} · {formatTime(item.averageTime)}</small>
                  </div>
                )) : <p className="stats-empty">Pas encore assez de données.</p>}
              </div>
            </section>

            <section className="stats-section">
              <div className="stats-section-heading">
                <div>
                  <span>Morceaux</span>
                  <h2>Ce que ton historique raconte</h2>
                </div>
              </div>
              <div className="stats-list-grid">
                <TrackList title="Tes valeurs sûres" items={stats?.tracks?.reliable} />
                <TrackList title="Tes bêtes noires" items={stats?.tracks?.nemesis} />
                <TrackList title="Ceux que tu reconnais le plus vite" items={stats?.tracks?.fastest} mode="time" />
                <TrackList title="Ceux qui mettent du temps à revenir" items={stats?.tracks?.late} mode="time" />
                <TrackList title="Tes spécialités face aux autres" items={stats?.tracks?.signature} mode="difference" />
                <TrackList title="Tes angles morts face aux autres" items={stats?.tracks?.blindSpots} mode="difference" />
              </div>
            </section>

            {globalStats && (
              <section className="stats-section">
                <div className="stats-section-heading">
                  <div>
                    <span>Communauté</span>
                    <h2>Statistiques globales</h2>
                  </div>
                </div>
                <div className="stats-global-summary">
                  <MetricCard label="Parties enregistrées" value={formatNumber(globalStats.summary?.gamesPlayed)} />
                  <MetricCard label="Joueurs avec historique" value={formatNumber(globalStats.summary?.players)} />
                  <MetricCard label="Réponses enregistrées" value={formatNumber(globalStats.summary?.answersRecorded)} />
                  <MetricCard label="Réussite globale" value={formatPercent(globalStats.summary?.globalAccuracy)} />
                </div>
                <div className="stats-list-grid stats-global-lists">
                  <TrackList title="Morceaux les plus trouvés" items={globalStats.tracks?.easiest} />
                  <TrackList title="Morceaux les moins trouvés" items={globalStats.tracks?.hardest} />
                  <TrackList title="Morceaux reconnus le plus vite" items={globalStats.tracks?.fastest} mode="time" />
                  <TrackList title="Morceaux les plus joués" items={globalStats.tracks?.mostPlayed} />
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {showCompare && (
        <div className="stats-modal-overlay" onMouseDown={e => e.target === e.currentTarget && setShowCompare(false)}>
          <div className="stats-modal">
            <div className="stats-modal-header">
              <div>
                <span>Face-à-face</span>
                <h2>{playerName}{selectedPlayer ? ` vs ${selectedPlayer}` : " vs …"}</h2>
              </div>
              <button className="stats-close" onClick={() => setShowCompare(false)}>×</button>
            </div>

            <input
              className="text-input stats-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher un joueur…"
              autoFocus
            />

            {!selectedPlayer && (
              <div className="stats-player-results">
                {players.length ? players.map(name => (
                  <button key={name} onClick={() => performComparison(name)}>{name}</button>
                )) : <p className="stats-empty">Aucun autre joueur trouvé.</p>}
              </div>
            )}

            {selectedPlayer && (
              <button className="stats-change-player" onClick={() => { setSelectedPlayer(""); setComparison(null); }}>
                Choisir un autre joueur
              </button>
            )}

            {compareLoading && <div className="stats-loading stats-loading-small">Calcul du face-à-face…</div>}

            {comparison && !compareLoading && (() => {
              const a = comparison.players?.a;
              const b = comparison.players?.b;
              return (
                <div className="compare-content">
                  <div className="compare-heads">
                    <div><img src={a?.photo || profilePhoto} alt="" /><strong>{a?.playerName}</strong></div>
                    <span>VS</span>
                    <div><img src={b?.photo || "/ppDefault.png"} alt="" /><strong>{b?.playerName}</strong></div>
                  </div>

                  <div className="compare-metrics">
                    <CompareMetric label="Parties jouées" a={a?.summary?.gamesPlayed} b={b?.summary?.gamesPlayed} />
                    <CompareMetric label="Parties gagnées" a={a?.summary?.gamesWon} b={b?.summary?.gamesWon} />
                    <CompareMetric label="Points cumulés" a={a?.summary?.totalScore} b={b?.summary?.totalScore} />
                    <CompareMetric label="Titres trouvés" a={a?.summary?.roundsWon} b={b?.summary?.roundsWon} />
                    <CompareMetric label="Taux de réussite" a={a?.summary?.accuracy} b={b?.summary?.accuracy} formatter={formatPercent} />
                    <CompareMetric label="Temps moyen" a={a?.summary?.averageResponseTime} b={b?.summary?.averageResponseTime} formatter={formatTime} lowerIsBetter />
                    <CompareMetric label="Meilleur temps" a={a?.summary?.bestResponseTime} b={b?.summary?.bestResponseTime} formatter={formatTime} lowerIsBetter />
                  </div>

                  <div className="compare-terrain-grid">
                    <TerrainComparison title={`Catégorie forte de ${a?.playerName}`} terrain={comparison.categories?.aBest} playerA={a?.playerName} playerB={b?.playerName} />
                    {comparison.categories?.bBest?.category !== comparison.categories?.aBest?.category && (
                      <TerrainComparison title={`Catégorie forte de ${b?.playerName}`} terrain={comparison.categories?.bBest} playerA={a?.playerName} playerB={b?.playerName} />
                    )}
                    <TerrainComparison title={`Année forte de ${a?.playerName}`} terrain={comparison.years?.aBest} playerA={a?.playerName} playerB={b?.playerName} />
                    {comparison.years?.bBest?.year !== comparison.years?.aBest?.year && (
                      <TerrainComparison title={`Année forte de ${b?.playerName}`} terrain={comparison.years?.bBest} playerA={a?.playerName} playerB={b?.playerName} />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsPage;
