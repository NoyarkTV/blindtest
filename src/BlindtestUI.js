import React from "react";

function SvgIcon({ name, className = "", size = 18 }) {
  const common = { className: `bt-icon ${className}`.trim(), width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true };

  const paths = {
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    crown: <><path d="m3 7 4.5 4L12 5l4.5 6L21 7l-2 11H5L3 7Z" /><path d="M6 21h12" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M12 12v5M8 21h8M10 17h4M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4" /></>,
    headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></>,
    zap: <path d="M13 2 4 14h7l-1 8 10-13h-7V2Z" />,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M15 9 21 3M17 3h4v4" /></>,
    flame: <path d="M12 22c4 0 7-2.8 7-6.5 0-2.8-1.6-5.3-4.4-7.5.2 2-1 3.3-2.3 4.2.2-3.7-1.8-6.6-5-9.2.3 3.5-2.3 5.2-2.3 9.7C5 17.9 8 22 12 22Z" />,
    rocket: <><path d="M14 5c3-2 5-2 7-2 0 2 0 4-2 7l-5 5-5-5 5-5Z" /><path d="M9 10 5 11l-2 3 5 1M14 15l-1 4-3 2-1-5M15 8h.01" /></>,
    hourglass: <><path d="M6 3h12M6 21h12M7 3c0 5 2 6 5 9-3 3-5 4-5 9M17 3c0 5-2 6-5 9 3 3 5 4 5 9" /></>,
    brain: <><path d="M9.5 4.5A3 3 0 0 0 6 7.4 3 3 0 0 0 5 13a3.5 3.5 0 0 0 4.5 5.4V4.5ZM14.5 4.5A3 3 0 0 1 18 7.4a3 3 0 0 1 1 5.6 3.5 3.5 0 0 1-4.5 5.4V4.5Z" /><path d="M9.5 9H7M14.5 9H17M9.5 14H7.5M14.5 14h2" /></>,
    music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
    film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4" /></>,
    sparkles: <><path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" /><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 13l.7 1.8 1.8.7-1.8.7L6 18l-.7-1.8-1.8-.7 1.8-.7L6 13Z" /></>,
    arrowUp: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
  };

  return <svg {...common}>{paths[name] || paths.sparkles}</svg>;
}

export const CopyIcon = () => <SvgIcon name="copy" />;
export const CheckIcon = () => <SvgIcon name="check" />;
export const CrownIcon = () => <SvgIcon name="crown" />;

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
          <div className="bt-round-time"><SvgIcon name="clock" /> Réponse en {String(popupInfo.responseTime).replace(/\s*sec(?:onde)?s?$/i, " sec")}</div>
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
                  {movedUp && <span className="bt-rank-up" title="Gagne une place"><SvgIcon name="arrowUp" /></span>}
                </div>
                {detail ? (
                  <div className="bt-round-score-detail">
                    {player.score} pts <span className={delta > 0 ? "gain" : "zero"}>({delta >= 0 ? `+${delta}` : delta})</span> <SvgIcon name="clock" /> {formatResponseTime(detail.responseTime)}
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

function InsightIcon({ type, index }) {
  const known = {
    "winner-reason": "trophy",
    "solo-summary": "headphones",
    "average-speed": "zap",
    "fastest": "zap",
    "solo-finds": "target",
    "streak": "flame",
    "best-reaction": "rocket",
    "last-second": "hourglass",
    "no-hints": "brain"
  };
  const fallback = ["sparkles", "music", "film"];
  return <span className="bt-fact-icon"><SvgIcon name={known[type] || fallback[index % fallback.length]} /></span>;
}

export function EndGameModal({ finalScores, summaryPlayers, insights, playerName, onQuit }) {
  const scores = Array.isArray(finalScores) ? [...finalScores].sort((a, b) => Number(b.score) - Number(a.score)) : [];
  if (!scores.length) return null;

  const hasPodium = scores.length >= 3;
  const podium = hasPodium ? [scores[1], scores[0], scores[2]] : [];
  const remaining = hasPodium ? scores.slice(3) : scores;
  const podiumPlace = player => scores.findIndex(score => score.name === player.name) + 1;
  const confettiSeed = scores.reduce(
    (sum, player, index) => sum + (Number(player.score) || 0) * (index + 3),
    scores.length * 97
  ) % 997;
  const confettiCount = hasPodium ? 38 : 52;
  const confettiColors = ["#ff7c2c", "#c22fa4", "#b494f8", "#65dca0", "#ffd166", "#5fb8ff", "#f06a9f", "#ffffff"];

  return (
    <div className="popup-rep-overlay bt-end-overlay">
      <div className={`bt-end-modal ${hasPodium ? "has-podium" : "no-podium"}`}>
        <div className="bt-end-confetti" aria-hidden="true">
          {Array.from({ length: confettiCount }, (_, index) => (
            <i
              key={`${confettiSeed}-${index}`}
              className={`shape-${(index + confettiSeed) % 4}`}
              style={{
                "--x": `${2 + ((confettiSeed + index * 37) % 96)}%`,
                "--delay": `${-(((confettiSeed % 19) * 0.07 + index * 0.23) % 4.8)}s`,
                "--duration": `${2.8 + ((confettiSeed + index * 11) % 18) / 10}s`,
                "--drift": `${-45 + ((confettiSeed + index * 23) % 91)}px`,
                "--start-rotate": `${(confettiSeed + index * 53) % 360}deg`,
                "--w": `${4 + ((confettiSeed + index) % 5)}px`,
                "--h": `${7 + ((confettiSeed + index * 3) % 9)}px`,
                "--fall-distance": hasPodium ? "650px" : "430px",
                "--confetti": confettiColors[(index + confettiSeed) % confettiColors.length]
              }}
            />
          ))}
        </div>
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
                    {place === 1 && <span className="bt-winner-crown"><CrownIcon /></span>}
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
                <InsightIcon type={insight.type} index={index} />
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
