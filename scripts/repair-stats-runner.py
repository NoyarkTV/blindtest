from pathlib import Path
import sys


def pre():
    p = Path("scripts/apply-stats-feature.js")
    s = p.read_text(encoding="utf-8")
    s = s.replace(
        's = replaceOnce(s, composerEmit, composerEmitNew, "normal composer stats emit");',
        's = replaceFirst(s, composerEmit, composerEmitNew, "normal composer stats emit");'
    )
    marker = '"eclair validation stats emit"'
    marker_pos = s.find(marker)
    if marker_pos < 0:
        raise SystemExit("Sélecteur éclair attendu introuvable")
    call_pos = s.rfind("s = replaceOnce(", 0, marker_pos)
    if call_pos < 0:
        raise SystemExit("Appel replaceOnce éclair introuvable")
    s = s[:call_pos] + s[call_pos:].replace("s = replaceOnce(", "s = replaceFirst(", 1)
    p.write_text(s, encoding="utf-8")


def post():
    for filename in ["src/GamePage.js", "src/GamePageEclair.js"]:
        p = Path(filename)
        s = p.read_text(encoding="utf-8")
        start = s.find("    const enriched = scores.map")
        if start < 0:
            raise SystemExit(f"Bloc game-over introuvable dans {filename}")
        marker = "    setShowEndPopup(true);"
        pos = s.find(marker, start)
        if pos < 0:
            raise SystemExit(f"Ouverture fin de partie introuvable dans {filename}")
        insert_at = pos + len(marker)
        if "/game-summary/" not in s[insert_at:insert_at + 450]:
            addition = '''

    fetch(`https://blindtest-69h7.onrender.com/game-summary/${id}`)
      .then(res => res.ok ? res.json() : { insights: [] })
      .then(data => setEndInsights(Array.isArray(data.insights) ? data.insights : []))
      .catch(() => setEndInsights([]));'''
            s = s[:insert_at] + addition + s[insert_at:]
        p.write_text(s, encoding="utf-8")

    p = Path("src/StatsPage.js")
    s = p.read_text(encoding="utf-8")
    s = s.replace(
        'const formatTime = value => Number.isFinite(Number(value)) ? `${formatNumber(value, 1)} s` : "—";',
        'const formatTime = value => (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) ? `${formatNumber(value, 1)} s` : "—";'
    )
    s = s.replace(
        '  const aNum = Number(a);\n  const bNum = Number(b);\n  const comparable = Number.isFinite(aNum) && Number.isFinite(bNum);',
        '  const aNum = Number(a);\n  const bNum = Number(b);\n  const comparable = a !== null && a !== undefined && b !== null && b !== undefined && Number.isFinite(aNum) && Number.isFinite(bNum);'
    )
    p.write_text(s, encoding="utf-8")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "pre":
        pre()
    elif mode == "post":
        post()
    else:
        raise SystemExit("Usage: repair-stats-runner.py pre|post")
