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
  rounds.forEach(rows => {
    const correct = rows.filter(row => row.correctTitle);
    if (correct.length === 1) soloFinds[correct[0].playerName] = (soloFinds[correct[0].playerName] || 0) + 1;
  });

  const metrics = playerNames.map(name => {
    const rows = history.filter(row => row.playerName === name);
    const correctRows = rows.filter(row => row.correctTitle);
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
      attempts: rows.length,
      averageTime: average(timedRows.map(row => row.responseTime)),
      bestTime: bestRow ? Number(bestRow.responseTime) : null,
      bestTrack: bestRow?.trackTitle || null,
      streak: longestCorrectStreak(rows),
      soloFinds: soloFinds[name] || 0,
      lastSecond,
      noHintCorrect,
      hintsUsed: rows.reduce((sum, row) => sum + Number(Boolean(row.mediaHint)) + Number(Boolean(row.yearHint)), 0)
    };
  });

  const ranked = scores.length
    ? scores.map(score => metrics.find(metric => metric.name === score.name)).filter(Boolean)
    : [...metrics].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const mandatory = [];
  const candidates = [];

  if (winner && runnerUp) {
    const winnerTime = winner.averageTime;
    const runnerTime = runnerUp.averageTime;
    if (winner.correct > runnerUp.correct) {
      const difference = winner.correct - runnerUp.correct;
      mandatory.push({
        type: "winner-reason",
        text: `${winner.name} a surtout gagné en trouvant ${difference} titre${difference > 1 ? "s" : ""} de plus que ${runnerUp.name}.`
      });
    } else if (winner.correct === runnerUp.correct && Number.isFinite(winnerTime) && Number.isFinite(runnerTime) && winnerTime < runnerTime) {
      mandatory.push({
        type: "winner-reason",
        text: `${winner.name} et ${runnerUp.name} ont trouvé autant de titres, mais ${winner.name} a été plus rapide (${winnerTime.toFixed(1)} s contre ${runnerTime.toFixed(1)} s).`
      });
    } else if (winner.correct < runnerUp.correct && Number.isFinite(winnerTime) && Number.isFinite(runnerTime)) {
      mandatory.push({
        type: "winner-reason",
        text: `${winner.name} a trouvé moins de titres que ${runnerUp.name}, mais sa rapidité et ses points par réponse lui donnent la victoire.`
      });
    } else {
      mandatory.push({ type: "winner-reason", text: `${winner.name} termine en tête avec ${winner.score} points.` });
    }
  } else if (winner) {
    mandatory.push({
      type: "solo-summary",
      text: `${winner.name} a trouvé ${winner.correct} titre${winner.correct > 1 ? "s" : ""} sur ${game.playlist?.length || winner.attempts}.`
    });
  }

  const fastest = [...metrics]
    .filter(metric => metric.correct >= 2 && Number.isFinite(metric.averageTime))
    .sort((a, b) => a.averageTime - b.averageTime)[0];
  if (fastest) {
    candidates.push({ type: "fastest", text: `${fastest.name} a été le plus rapide : ${fastest.averageTime.toFixed(1)} s en moyenne sur ses bonnes réponses.` });
  }

  const soloLeader = [...metrics].sort((a, b) => b.soloFinds - a.soloFinds)[0];
  if (soloLeader?.soloFinds > 0) {
    candidates.push({
      type: "solo-finds",
      text: `${soloLeader.name} a été le seul à reconnaître ${soloLeader.soloFinds} morceau${soloLeader.soloFinds > 1 ? "x" : ""}.`
    });
  }

  const streakLeader = [...metrics].sort((a, b) => b.streak - a.streak)[0];
  if (streakLeader?.streak >= 3) {
    candidates.push({ type: "streak", text: `${streakLeader.name} signe la meilleure série : ${streakLeader.streak} bonnes réponses d’affilée.` });
  }

  const bestReaction = [...metrics]
    .filter(metric => Number.isFinite(metric.bestTime))
    .sort((a, b) => a.bestTime - b.bestTime)[0];
  if (bestReaction) {
    candidates.push({
      type: "best-reaction",
      text: `Réponse éclair de ${bestReaction.name}${bestReaction.bestTrack ? ` sur ${bestReaction.bestTrack}` : ""} : ${bestReaction.bestTime.toFixed(1)} s.`
    });
  }

  const lastSecondLeader = [...metrics].sort((a, b) => b.lastSecond - a.lastSecond)[0];
  if (lastSecondLeader?.lastSecond > 0) {
    candidates.push({
      type: "last-second",
      text: `${lastSecondLeader.name} a sauvé ${lastSecondLeader.lastSecond} réponse${lastSecondLeader.lastSecond > 1 ? "s" : ""} dans les deux dernières secondes.`
    });
  }

  const noHintLeader = [...metrics].sort((a, b) => b.noHintCorrect - a.noHintCorrect)[0];
  if (noHintLeader?.noHintCorrect >= 3 && noHintLeader.hintsUsed === 0) {
    candidates.push({
      type: "no-hints",
      text: `${noHintLeader.name} a trouvé ${noHintLeader.noHintCorrect} titres sans utiliser un seul indice.`
    });
  }

  const seed = String(game.id || "game");
  const varied = [...candidates].sort((a, b) => hashString(`${seed}:${a.type}`) - hashString(`${seed}:${b.type}`));
  const insights = [...mandatory, ...varied].slice(0, 3);

  return { insights, players: metrics };
}

module.exports = { buildGameSummary };
