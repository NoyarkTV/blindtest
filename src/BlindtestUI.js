import React from "react";

export function AppHeader({ onHome }) {
  return (
    <header className="bt-header">
      <img src="/logo-line.svg" alt="Blindtest" onClick={onHome} />
    </header>
  );
}

export function WaitingDots() {
  return (
    <span className="bt-waiting-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function PlayerAvatar({ player, size = 30 }) {
  return (
    <span className="bt-avatar" style={{ width: size, height: size }}>
      <img src={player?.photo || "/ppDefault.png"} alt="" />
    </span>
  );
}

export function Waveform({ active }) {
  return (
    <div className={`bt-waveform ${active ? "active" : "paused"}`} aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => <span key={index} />)}
    </div>
  );
}

export function GameScoreboard({ scoreboard, playerName }) {
  if (!Array.isArray(scoreboard) || !scoreboard.length) return null;

  return (
    <aside className="bt-game-scoreboard">
      <h3>Scores</h3>
      {[...scoreboard]
        .sort((a, b) => Number(b.score) - Number(a.score))
        .map((player, index) => (
          <div className={`bt-game-score-row ${player.name === playerName ? "me" : ""}`} key={player.name}>
            <strong className="bt-game-rank">{index + 1}</strong>
            <PlayerAvatar player={player} size={28} />
            <span className="bt-game-player-name">{player.name}</span>
            <strong>{Number(player.score) || 0}</strong>
          </div>
        ))}
    </aside>
  );
}

function rankMap(rows) {
  return new Map(
    [...rows]
      .sort((a, b) => {
        const scoreDiff = Number(b.score) - Number(a.score);
        if (scoreDiff !== 0) return scoreDiff;
        return String(a.name).localeCompare(String(b.name));
      })
      .map((row, index) => [row.name, index])
  );
}

function formatResponseTime(value) {
  if (value === null || value === undefined || value === "" || value === "-") return "-";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}s` : String(value).replace(/\s*sec(?:onde)?s?$/i, "s");
}

function normalizedPointLabel(points) {
  const match = String(points || "").match(/[+-]?\d+/);
  const numeric = match ? Number(match[0]) : 0;
  return { numeric, label: `${numeric >= 0 ? "+" : ""}${numeric} pts` };
}

export function RoundResultModal({
  popupInfo,
  image,
  scoreboard,
  readyPlayersInfo,
  playerName,
  isAdmin,
  playersReady,
  playersTotal,
  canNext,
  onNext
}) {
  if (!popupInfo) return null;

  const scoreRows = Array.isArray(scoreboard) ? scoreboard : [];
  const detailMap = new Map((readyPlayersInfo || []).map(detail => [detail.name, detail]));
  const currentRows = scoreRows.map(player => ({ ...player, score: Number(player.score) || 0 }));
  const previousRows = currentRows.map(player => {
    const detail = detailMap.get(player.name);
    const delta = detail && Number.isFinite(Number(detail.pointsGained)) ? Number(detail.pointsGained) : 0;
    return { ...player, score: player.score - delta };
  });
  const currentRanks = rankMap(currentRows);
  const previousRanks = rankMap(previousRows);
  const orderedRows = [...currentRows].sort((a, b) => (currentRanks.get(a.name) ?? 0) - (currentRanks.get(b.name) ?? 0));
  const pointLabel = normalizedPointLabel(popupInfo.points);
  const total = playersTotal || scoreRows.length;

  return (
    <div className="popup-rep-overlay bt-round-overlay">
      <div className="bt-round-modal">
        <h2 className="bt-round-status">{popupInfo.title}</h2>
        <div className={`bt-round-points ${pointLabel.numeric > 0 ? "positive" : "zero"}`}>{pointLabel.label}</div>
        {popupInfo.responseTime && popupInfo.responseTime !== "-" && (
          <div className="bt-round-time">⏱ Réponse en {String(popupInfo.responseTime).replace(/\s*sec(?:onde)?s?$/i, " sec")}</div>
        )}

        {image && <img className="bt-round-cover" src={image} alt="Pochette du morceau" />}

        <div className="bt-round-track">
          {popupInfo.theme ? `${popupInfo.theme} - ` : ""}
          {popupInfo.titre}{popupInfo.annee ? ` (${popupInfo.annee})` : ""}
        </div>
        {popupInfo.compositeur && <div className="bt-round-composer">par {popupInfo.compositeur}</div>}

        <div className="bt-round-scoreboard">
          <h3>Scores</h3>
          {orderedRows.map(player => {
            const detail = detailMap.get(player.name);
            const delta = detail && Number.isFinite(Number(detail.pointsGained)) ? Number(detail.pointsGained) : 0;
            const movedUp = detail && (currentRanks.get(player.name) ?? 0) < (previousRanks.get(player.name) ?? 0);
            return (
              <div className={`bt-round-score-row ${player.name === playerName ? "me" : ""}`} key={player.name}>
                <PlayerAvatar player={player} size={28} />
                <div className="bt-round-player-name">
                  <span>{player.name}</span>
                  {movedUp && <span className="bt-rank-up">↑</span>}
                </div>
                {detail ? (
                  <div className="bt-round-score-detail">
                    {player.score} pts <span className={delta > 0 ? "gain" : "zero"}>({delta >= 0 ? `+${delta}` : delta})</span> ⏱ {formatResponseTime(detail.responseTime)}
                  </div>
                ) : (
                  <WaitingDots />
                )}
              </div>
            );
          })}
        </div>

        <div className="bt-round-footer">
          {isAdmin ? (
            <button className="btn btn-confirm bt-next-round" onClick={onNext} disabled={!canNext}>
              Prochain round ({playersReady}/{total})
            </button>
          ) : (
            <div className="bt-wait-admin">
              <span>En attente de l'organisateur</span>
              <WaitingDots />
              <span>({playersReady}/{total})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function summaryMetric(summaryPlayers, name) {
  return (summaryPlayers || []).find(player => player.name === name) || null;
}

function metricLabel(metric) {
  if (!metric) return { correct: "-", time: "-" };
  const total = metric.roundsTotal || metric.attempts || 0;
  return {
    correct: `${metric.correct || 0}/${total}`,
    time: Number.isFinite(Number(metric.averageTime)) ? `${Number(metric.averageTime).toFixed(1)} s` : "-"
  };
}

function insightEmoji(type, index) {
  const known = {
    "winner-reason": "🏆",
    "solo-summary": "🎧",
    "average-speed": "⚡",
    "fastest": "⚡",
    "solo-finds": "🎯",
    "streak": "🔥",
    "best-reaction": "🚀",
    "last-second": "⏳",
    "no-hints": "🧠"
  };
  return known[type] || ["✨", "🎵", "🎬"][index % 3];
}

export function EndGameModal({ finalScores, summaryPlayers, insights, playerName, onQuit }) {
  const scores = Array.isArray(finalScores) ? [...finalScores].sort((a, b) => Number(b.score) - Number(a.score)) : [];
  if (!scores.length) return null;

  const hasPodium = scores.length >= 3;
  const podium = hasPodium ? [scores[1], scores[0], scores[2]] : [];
  const remaining = hasPodium ? scores.slice(3) : scores;
  const podiumPlace = player => scores.findIndex(score => score.name === player.name) + 1;

  return (
    <div className="popup-rep-overlay bt-end-overlay">
      <div className="bt-end-confetti" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
      </div>
      <div className="bt-end-modal">
        <h2>Fin de la partie !</h2>

        {hasPodium && (
          <div className="bt-podium">
            {podium.map(player => {
              const place = podiumPlace(player);
              const metric = metricLabel(summaryMetric(summaryPlayers, player.name));
              return (
                <div className={`bt-podium-card place-${place}`} key={player.name}>
                  <div className="bt-podium-avatar-wrap">
                    <PlayerAvatar player={player} size={58} />
                    {place === 1 && <span className="bt-winner-crown">♛</span>}
                  </div>
                  <strong>{player.name}</strong>
                  <span className="bt-podium-score">{Number(player.score) || 0} pts</span>
                  <small>{metric.correct} · {metric.time}</small>
                  <div className="bt-podium-block">{place}</div>
                </div>
              );
            })}
          </div>
        )}

        {remaining.length > 0 && (
          <div className="bt-final-board">
            <div className="bt-final-head"><span>#</span><span>Joueur</span><span>Points</span><span>Bonnes réponses</span><span>Temps moyen</span></div>
            {remaining.map(player => {
              const rank = scores.findIndex(score => score.name === player.name) + 1;
              const metric = metricLabel(summaryMetric(summaryPlayers, player.name));
              return (
                <div className={`bt-final-row ${player.name === playerName ? "me" : ""}`} key={player.name}>
                  <strong>{rank}</strong>
                  <div className="bt-final-player"><PlayerAvatar player={player} size={28} /><span>{player.name}</span></div>
                  <strong>{Number(player.score) || 0}</strong>
                  <span>{metric.correct}</span>
                  <span>{metric.time}</span>
                </div>
              );
            })}
          </div>
        )}

        {Array.isArray(insights) && insights.length > 0 && (
          <div className={`bt-fun-facts count-${Math.min(insights.length, 3)}`}>
            {insights.map((insight, index) => (
              <div className="bt-fun-fact" key={`${insight.type || "insight"}-${index}`}>
                <span>{insightEmoji(insight.type, index)}</span>
                <p>{insight.text}</p>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-confirm bt-quit-game" onClick={onQuit}>Quitter</button>
      </div>
    </div>
  );
}
