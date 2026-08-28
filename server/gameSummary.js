function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < String(value).length; i++) {
    hash = ((hash << 5) - hash) + String(value).charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function longestCorrectStreak(rows) {
  let best = 0;
  let current = 0;
  [...rows].sort((a, b) => a.roundNumber - b.roundNumber).forEach(row => {
    if (row.correctTitle) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

function buildGameSummary(game) {
  if (!game) return { insights: [], players: [] };
  const history = Array.isArray(game.statsHistory) ? game.statsHistory : [];
  const scores = Array.isArray(game.scores) ? [...game.scores].sort((a, b) => Number(b.score) - Number(a.score)) : [];
  const playerNames = [...new Set([
    ...(game.players || []).map(player => player.name),
    ...scores.map(player => player.name),
    ...history.map(row => row.playerName)
  ].filter(Boolean))];

  const soloFinds = Object.fromEntries(playerNames.map(name => [name, 0]));
  const rounds = new Map();
  history.forEach(row => {
    if (!rounds.has(row.roundNumber)) rounds.set(row.roundNumber, []);
    rounds.get(row.roundNumber).push(row);
  });
  rounds.forEach(rowsForRound => {
    const correct = rowsForRound.filter(row => row.correctTitle);
    if (correct.length === 1) soloFinds[correct[0].playerName] = (soloFinds[correct[0].playerName] || 0) + 1;
  });

  const metrics = playerNames.map(name => {
    const rowsForPlayer = history.filter(row => row.playerName === name);
    const correctRows = rowsForPlayer.filter(row => row.correctTitle);
    const timedRows = correctRows.filter(row => Number.isFinite(Number(row.responseTime)));
    const bestRow = [...timedRows].sort((a, b) => Number(a.responseTime) - Number(b.responseTime))[0];
    const score = Number(scores.find(player => player.name === name)?.score) || 0;
    const lastSecond = timedRows.filter(row =>
      Number.isFinite(Number(row.timerSeconds)) && Number(row.timerSeconds) - Number(row.responseTime) <= 2
    ).length;
    const noHintCorrect = correctRows.filter(row => !row.mediaHint && !row.yearHint).length;

    return {
      name,
      score,
      correct: correctRows.length,
      attempts: rowsForPlayer.length,
      averageTime: average(timedRows.map(row => row.responseTime)),
      bestTime: bestRow ? Number(bestRow.responseTime) : null,
      bestTrack: bestRow?.trackTitle || null,
      streak: longestCorrectStreak(rowsForPlayer),
      soloFinds: soloFinds[name] || 0,
      lastSecond,
      noHintCorrect,
      hintsUsed: rowsForPlayer.reduce((sum, row) => sum + Number(Boolean(row.mediaHint)) + Number(Boolean(row.yearHint)), 0)
    };
  });

  const ranked = scores.length
    ? scores.map(score => metrics.find(metric => metric.name === score.name)).filter(Boolean)
    : [...metrics].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const targetCount = Math.min(3, metrics.length);
  const candidates = [];

  const addCandidate = (playerName, type, text, priority = 1) => {
    if (!playerName || !text) return;
    candidates.push({ playerName, type, text, priority });
  };

  if (winner && runnerUp) {
    const winnerTime = winner.averageTime;
    const runnerTime = runnerUp.averageTime;
    if (winner.correct > runnerUp.correct) {
      const difference = winner.correct - runnerUp.correct;
      addCandidate(
        winner.name,
        "winner-reason",
        `${winner.name} a surtout gagné en trouvant ${difference} titre${difference > 1 ? "s" : ""} de plus que ${runnerUp.name}.`,
        0
      );
    } else if (winner.correct === runnerUp.correct && Number.isFinite(winnerTime) && Number.isFinite(runnerTime) && winnerTime < runnerTime) {
      addCandidate(
        winner.name,
        "winner-reason",
        `${winner.name} et ${runnerUp.name} ont trouvé autant de titres, mais ${winner.name} a été plus rapide (${winnerTime.toFixed(1)} s contre ${runnerTime.toFixed(1)} s).`,
        0
      );
    } else if (winner.correct < runnerUp.correct && Number.isFinite(winnerTime) && Number.isFinite(runnerTime)) {
      addCandidate(
        winner.name,
        "winner-reason",
        `${winner.name} a trouvé moins de titres que ${runnerUp.name}, mais sa rapidité et ses points par réponse lui donnent la victoire.`,
        0
      );
    } else {
      addCandidate(winner.name, "winner-reason", `${winner.name} termine en tête avec ${winner.score} points.`, 0);
    }
  } else if (winner) {
    addCandidate(
      winner.name,
      "solo-summary",
      `${winner.name} a trouvé ${winner.correct} titre${winner.correct > 1 ? "s" : ""} sur ${game.playlist?.length || winner.attempts}.`,
      0
    );
  }

  metrics.forEach(metric => {
    if (metric.correct >= 2 && Number.isFinite(metric.averageTime)) {
      addCandidate(
        metric.name,
        "average-speed",
        `${metric.name} a répondu en ${metric.averageTime.toFixed(1)} s de moyenne sur ses ${metric.correct} bonnes réponses.`
      );
    }

    if (metric.soloFinds > 0) {
      addCandidate(
        metric.name,
        "solo-finds",
        `${metric.name} a été le seul à reconnaître ${metric.soloFinds} morceau${metric.soloFinds > 1 ? "x" : ""}.`
      );
    }

    if (metric.streak >= 3) {
      addCandidate(metric.name, "streak", `${metric.name} signe une série de ${metric.streak} bonnes réponses d’affilée.`);
    }

    if (Number.isFinite(metric.bestTime)) {
      addCandidate(
        metric.name,
        "best-reaction",
        `Réponse éclair de ${metric.name}${metric.bestTrack ? ` sur ${metric.bestTrack}` : ""} : ${metric.bestTime.toFixed(1)} s.`
      );
    }

    if (metric.lastSecond > 0) {
      addCandidate(
        metric.name,
        "last-second",
        `${metric.name} a sauvé ${metric.lastSecond} réponse${metric.lastSecond > 1 ? "s" : ""} dans les deux dernières secondes.`
      );
    }

    if (metric.noHintCorrect >= 3 && metric.hintsUsed === 0) {
      addCandidate(
        metric.name,
        "no-hints",
        `${metric.name} a trouvé ${metric.noHintCorrect} titres sans utiliser un seul indice.`
      );
    }
  });

  const seed = String(game.id || "game");
  const selected = [];
  const usedPlayers = new Set();

  const mandatory = candidates
    .filter(candidate => candidate.priority === 0)
    .sort((a, b) => hashString(`${seed}:${a.type}:${a.playerName}`) - hashString(`${seed}:${b.type}:${b.playerName}`));

  for (const candidate of mandatory) {
    if (selected.length >= targetCount || usedPlayers.has(candidate.playerName)) continue;
    selected.push(candidate);
    usedPlayers.add(candidate.playerName);
  }

  const varied = candidates
    .filter(candidate => candidate.priority !== 0)
    .sort((a, b) => hashString(`${seed}:${a.type}:${a.playerName}`) - hashString(`${seed}:${b.type}:${b.playerName}`));

  for (const candidate of varied) {
    if (selected.length >= targetCount) break;
    if (usedPlayers.has(candidate.playerName)) continue;
    selected.push(candidate);
    usedPlayers.add(candidate.playerName);
  }

  const fallbackOrder = [...ranked, ...metrics]
    .filter((metric, index, array) => metric && array.findIndex(other => other?.name === metric.name) === index)
    .sort((a, b) => {
      const aUsed = usedPlayers.has(a.name) ? 1 : 0;
      const bUsed = usedPlayers.has(b.name) ? 1 : 0;
      if (aUsed !== bUsed) return aUsed - bUsed;
      return hashString(`${seed}:fallback:${a.name}`) - hashString(`${seed}:fallback:${b.name}`);
    });

  for (const metric of fallbackOrder) {
    if (selected.length >= targetCount) break;
    if (usedPlayers.has(metric.name)) continue;
    const totalRounds = metric.attempts || game.playlist?.length || 0;
    let text;
    if (metric.correct > 0 && Number.isFinite(metric.averageTime)) {
      text = `${metric.name} termine avec ${metric.correct}/${totalRounds} bonnes réponses et ${metric.averageTime.toFixed(1)} s de moyenne.`;
    } else if (metric.correct > 0) {
      text = `${metric.name} termine avec ${metric.correct}/${totalRounds} bonnes réponses et ${metric.score} points.`;
    } else {
      text = `${metric.name} termine cette partie avec ${metric.score} points.`;
    }
    selected.push({ playerName: metric.name, type: "player-summary", text, priority: 2 });
    usedPlayers.add(metric.name);
  }

  return {
    insights: selected.slice(0, targetCount).map(({ playerName, type, text }) => ({ playerName, type, text })),
    players: metrics
  };
}

module.exports = { buildGameSummary };
