from pathlib import Path
import re

# Ensure polish CSS loads after legacy App.css imported by pages.
app = Path('src/App.js')
text = app.read_text(encoding='utf-8')
text = text.replace('import "./UiPolish.css";\n', '')
needle = 'import StatsPage from "./StatsPage";\n'
if 'import "./UiPolish.css";' not in text:
    text = text.replace(needle, needle + 'import "./UiPolish.css";\n')
app.write_text(text, encoding='utf-8')

# Make confetti genuinely different between games and denser for 1–2 players.
ui = Path('src/BlindtestUI.js')
text = ui.read_text(encoding='utf-8')
needle = '  const podiumPlace = player => scores.findIndex(score => score.name === player.name) + 1;\n'
insert = '''  const podiumPlace = player => scores.findIndex(score => score.name === player.name) + 1;\n  const confettiSeed = scores.reduce(\n    (sum, player, index) => sum + (Number(player.score) || 0) * (index + 3),\n    scores.length * 97\n  ) % 997;\n  const confettiCount = hasPodium ? 38 : 52;\n  const confettiColors = ["#ff7c2c", "#c22fa4", "#b494f8", "#65dca0", "#ffd166", "#5fb8ff", "#f06a9f", "#ffffff"];\n'''
if needle not in text:
    raise SystemExit('podiumPlace anchor not found')
text = text.replace(needle, insert, 1)
text = text.replace('<div className="bt-end-modal">', '<div className={`bt-end-modal ${hasPodium ? "has-podium" : "no-podium"}`}>', 1)
old = '''          {Array.from({ length: 32 }, (_, index) => (\n            <i\n              key={index}\n              style={{\n                "--x": `${4 + ((index * 29) % 92)}%`,\n                "--delay": `${-((index * 0.31) % 3.7)}s`,\n                "--duration": `${3.1 + ((index * 7) % 13) / 10}s`,\n                "--drift": `${-24 + ((index * 17) % 49)}px`,\n                "--start-rotate": `${(index * 47) % 180}deg`,\n                "--w": `${5 + (index % 4)}px`,\n                "--h": `${9 + (index % 5) * 2}px`\n              }}\n            />\n          ))}'''
new = '''          {Array.from({ length: confettiCount }, (_, index) => (\n            <i\n              key={`${confettiSeed}-${index}`}\n              className={`shape-${(index + confettiSeed) % 4}`}\n              style={{\n                "--x": `${2 + ((confettiSeed + index * 37) % 96)}%`,\n                "--delay": `${-(((confettiSeed % 19) * 0.07 + index * 0.23) % 4.8)}s`,\n                "--duration": `${2.8 + ((confettiSeed + index * 11) % 18) / 10}s`,\n                "--drift": `${-45 + ((confettiSeed + index * 23) % 91)}px`,\n                "--start-rotate": `${(confettiSeed + index * 53) % 360}deg`,\n                "--w": `${4 + ((confettiSeed + index) % 5)}px`,\n                "--h": `${7 + ((confettiSeed + index * 3) % 9)}px`,\n                "--fall-distance": hasPodium ? "650px" : "430px",\n                "--confetti": confettiColors[(index + confettiSeed) % confettiColors.length]\n              }}\n            />\n          ))}'''
if old not in text:
    raise SystemExit('confetti block not found')
text = text.replace(old, new, 1)
ui.write_text(text, encoding='utf-8')

css = Path('src/UiPolish.css')
text = css.read_text(encoding='utf-8')
start = text.find('/* Config interactive controls */')
end = text.find('/* SVG icon treatment */')
if start == -1 or end == -1 or end <= start:
    raise SystemExit('config interaction CSS section not found')
replacement = r'''/* Config interactions: restrained, with motion only where it communicates state. */
.bt-config-chip {
  transition: background .14s ease, border-color .14s ease, color .14s ease !important;
  transform: none !important;
  box-shadow: none !important;
}
.bt-config-chip:hover,
.bt-config-chip:active {
  transform: none !important;
  box-shadow: none !important;
}
.bt-config-chip:not(.selected):hover {
  border-color: #736f8d !important;
  color: #b9b5c7 !important;
}
.bt-config-chip.selected:hover {
  border-color: #fff !important;
  color: #151133 !important;
}

.bt-composer-toggle {
  transform: none !important;
  box-shadow: none !important;
  transition: background .16s ease, border-color .16s ease !important;
}
.bt-composer-toggle:hover,
.bt-composer-toggle:active {
  transform: none !important;
  box-shadow: none !important;
  border-color: rgba(255,255,255,.10) !important;
}
.bt-switch {
  position: relative !important;
  display: block !important;
  justify-content: initial !important;
  transition: background .2s ease !important;
}
.bt-switch i {
  position: absolute !important;
  left: 3px;
  top: 3px;
  transform: translateX(0);
  transition: transform .22s cubic-bezier(.2,.8,.2,1) !important;
}
.bt-composer-toggle.selected .bt-switch {
  box-shadow: none !important;
}
.bt-composer-toggle.selected .bt-switch i {
  transform: translateX(17px);
}

.bt-round-stepper button,
.bt-config-filter-head button {
  transition: none !important;
  transform: none !important;
  box-shadow: none !important;
}
.bt-round-stepper button:hover,
.bt-round-stepper button:active,
.bt-config-filter-head button:hover,
.bt-config-filter-head button:active {
  transform: none !important;
  box-shadow: none !important;
}
.bt-mode-card {
  transition: background .16s ease, border-color .16s ease !important;
  transform: none !important;
  box-shadow: none !important;
}
.bt-mode-card:hover,
.bt-mode-card:active {
  transform: none !important;
  box-shadow: none !important;
}

'''
text = text[:start] + replacement + text[end:]

# Confetti: use actual per-game colors/geometry, different shapes, and modal-height-aware travel.
text = text.replace('  background: var(--confetti, #ff7c2c);\n', '  background: var(--confetti, #ff7c2c);\n  will-change: transform, opacity;\n')
text = re.sub(r'\.bt-end-confetti i:nth-child\(7n\+1\).*?\.bt-end-confetti i:nth-child\(7n\)\{--confetti:#f06a9f\}\n', '', text, flags=re.S)
text = text.replace('  100% { transform: translate3d(calc(var(--drift,14px) * -0.5), 590px,0) rotate(calc(var(--start-rotate,0deg) + 520deg)); opacity: .15; }', '  100% { transform: translate3d(calc(var(--drift,14px) * -0.5), var(--fall-distance,590px),0) rotate(calc(var(--start-rotate,0deg) + 520deg)); opacity: .12; }')
shape_css = r'''
.bt-end-confetti i.shape-0 { border-radius: 2px; }
.bt-end-confetti i.shape-1 { border-radius: 999px; }
.bt-end-confetti i.shape-2 { clip-path: polygon(50% 0, 100% 100%, 0 100%); border-radius: 0; }
.bt-end-confetti i.shape-3 { border-radius: 1px; transform-origin: center; }
.bt-end-modal.no-podium .bt-end-confetti { opacity: 1; }
'''
anchor = '/* Avatar selector refresh */'
if shape_css.strip() not in text:
    text = text.replace(anchor, shape_css + '\n' + anchor)

# Desktop config should fit within the viewport instead of creating a pointless document scroll.
compact_css = r'''
/* Desktop config: fit the available viewport without document scrolling. */
@media (min-width: 901px) and (min-height: 720px) {
  .bt-config-page {
    height: 100vh !important;
    min-height: 100vh !important;
    overflow: hidden !important;
    box-sizing: border-box;
    padding-top: 60px !important;
  }
  .bt-config-shell {
    height: calc(100vh - 68px) !important;
    min-height: 0 !important;
    margin: 4px auto !important;
  }
  .bt-config-main {
    overflow: hidden !important;
    padding: 14px 18px !important;
  }
  .bt-config-heading { margin-bottom: 10px !important; }
  .bt-mode-grid { margin-bottom: 8px !important; }
  .bt-mode-card { padding: 10px 12px !important; }
  .bt-config-control { padding: 9px 10px !important; }
  .bt-composer-toggle { margin-top: 8px !important; padding: 8px 11px !important; }
  .bt-config-filter { padding-top: 8px !important; margin-top: 8px !important; }
  .bt-config-filter-head { margin-bottom: 6px !important; }
  .bt-config-chips { gap: 5px !important; }
  .bt-config-chip { padding: 5px 8px !important; font-size: .74rem !important; }
}
'''
if compact_css.strip() not in text:
    text += '\n' + compact_css

css.write_text(text, encoding='utf-8')
