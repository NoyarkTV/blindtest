export const normalizeAnswer = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");

const stripLeadingArticle = (value = "") =>
  String(value)
    .trim()
    .replace(/^(?:the\s+|le\s+|la\s+|les\s+|l[’']\s*)/i, "")
    .trim();

export const levenshteinDistance = (a = "", b = "") => {
  const left = String(a);
  const right = String(b);
  const matrix = Array.from({ length: right.length + 1 }, (_, i) =>
    Array.from({ length: left.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );

  for (let i = 1; i <= right.length; i++) {
    for (let j = 1; j <= left.length; j++) {
      const cost = left[j - 1] === right[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[right.length][left.length];
};

const toleranceForLength = (length) => {
  if (length <= 5) return 0;
  if (length <= 9) return 1;
  return 2;
};

const variants = (value) => {
  const raw = String(value || "").trim();
  const withoutArticle = stripLeadingArticle(raw);
  return [...new Set([normalizeAnswer(raw), normalizeAnswer(withoutArticle)].filter(Boolean))];
};

export const isAcceptedTitle = (guess, acceptedAnswers = []) => {
  const guessVariants = variants(guess);
  if (!guessVariants.length) return false;

  return acceptedAnswers.some(answer => {
    const acceptedVariants = variants(answer);
    return acceptedVariants.some(valid =>
      guessVariants.some(candidate => {
        if (candidate === valid) return true;
        const tolerance = toleranceForLength(Math.max(candidate.length, valid.length));
        return tolerance > 0 && levenshteinDistance(valid, candidate) <= tolerance;
      })
    );
  });
};
