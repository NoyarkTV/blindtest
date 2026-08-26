const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

for (const rel of ["src/GamePage.js", "src/GamePageDiffusion.js", "src/GamePageDiffuseur.js"]) {
  const file = path.join(root, rel);
  let text = fs.readFileSync(file, "utf8");
  const pattern = /if \(timeLeft (?:===|<=) 0\) \{([\s\S]*?)setRoundsWon\(prev => prev \+ 1\);/g;
  const before = text;
  text = text.replace(pattern, (match) => match.replace(/\n\s*setRoundsWon\(prev => prev \+ 1\);/, ""));
  if (text !== before) fs.writeFileSync(file, text, "utf8");
}

// Also remove the duplicate timeout win increment from the diffusion round-ended handler.
for (const rel of ["src/GamePageDiffusion.js", "src/GamePageDiffuseur.js"]) {
  const file = path.join(root, rel);
  let text = fs.readFileSync(file, "utf8");
  text = text.replace(
    "    setIsTimerRunning(false);\n    roundEndedRef.current = true;\n    setRoundsWon(prev => prev + 1);\n",
    "    setIsTimerRunning(false);\n    roundEndedRef.current = true;\n"
  );
  fs.writeFileSync(file, text, "utf8");
}

console.log("✅ Statistiques de victoire corrigées pour les timeouts.");
