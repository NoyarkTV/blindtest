from pathlib import Path

# ConfigPage: add player count next to lobby heading.
path = Path('src/ConfigPage.js')
text = path.read_text(encoding='utf-8')
old = '''        <div>\n          <h3>Salle d’attente</h3>\n          <div className="bt-config-code">'''
new = '''        <div>\n          <div className="bt-config-lobby-heading">\n            <h3>Salle d’attente</h3>\n            <span>{players.length} {players.length > 1 ? "joueurs" : "joueur"}</span>\n          </div>\n          <div className="bt-config-code">'''
if old not in text:
    raise SystemExit('Config lobby heading pattern not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')

# End-game confetti: full-screen, finite and rectangles only.
path = Path('src/BlindtestUI.js')
text = path.read_text(encoding='utf-8')
old = '''      <div className={`bt-end-modal ${hasPodium ? "has-podium" : "no-podium"}`}>\n        <div className="bt-end-confetti" aria-hidden="true">\n          {Array.from({ length: confettiCount }, (_, index) => (\n            <i\n              key={`${confettiSeed}-${index}`}\n              className={`shape-${(index + confettiSeed) % 4}`}\n              style={{\n                "--x": `${2 + ((confettiSeed + index * 37) % 96)}%`,\n                "--delay": `${-(((confettiSeed % 19) * 0.07 + index * 0.23) % 4.8)}s`,\n                "--duration": `${2.8 + ((confettiSeed + index * 11) % 18) / 10}s`,\n                "--drift": `${-45 + ((confettiSeed + index * 23) % 91)}px`,\n                "--start-rotate": `${(confettiSeed + index * 53) % 360}deg`,\n                "--w": `${4 + ((confettiSeed + index) % 5)}px`,\n                "--h": `${7 + ((confettiSeed + index * 3) % 9)}px`,\n                "--fall-distance": hasPodium ? "650px" : "430px",\n                "--confetti": confettiColors[(index + confettiSeed) % confettiColors.length]\n              }}\n            />\n          ))}\n        </div>\n        <h2>Fin de la partie !</h2>'''
new = '''      <div className="bt-end-confetti" aria-hidden="true">\n        {Array.from({ length: 64 }, (_, index) => (\n          <i\n            key={`${confettiSeed}-${index}`}\n            style={{\n              "--x": `${1 + ((confettiSeed + index * 37) % 98)}%`,\n              "--delay": `${((confettiSeed + index * 17) % 55) / 100}s`,\n              "--duration": `${2.25 + ((confettiSeed + index * 11) % 95) / 100}s`,\n              "--drift": `${-75 + ((confettiSeed + index * 23) % 151)}px`,\n              "--start-rotate": `${(confettiSeed + index * 53) % 360}deg`,\n              "--w": `${5 + ((confettiSeed + index) % 5)}px`,\n              "--h": `${10 + ((confettiSeed + index * 3) % 9)}px`,\n              "--confetti": confettiColors[(index + confettiSeed) % confettiColors.length]\n            }}\n          />\n        ))}\n      </div>\n      <div className={`bt-end-modal ${hasPodium ? "has-podium" : "no-podium"}`}>\n        <h2>Fin de la partie !</h2>'''
if old not in text:
    raise SystemExit('Confetti block pattern not found')
text = text.replace(old, new, 1)
# Remove now-unused count declaration.
text = text.replace('  const confettiCount = hasPodium ? 38 : 52;\n', '', 1)
path.write_text(text, encoding='utf-8')

# Rewrite UI polish CSS sections with exact requested motion.
path = Path('src/UiPolish.css')
css = path.read_text(encoding='utf-8')
start = css.index('/* Config interactions: restrained, with motion only where it communicates state. */')
end = css.index('/* SVG icon treatment */', start)
config_css = r'''/* Config interactions: explicit motion only on the controls that need it. */
.bt-mode-card {
  transition: transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease !important;
}
.bt-mode-card:hover {
  transform: translateY(-2px) !important;
  border-color: rgba(180,148,248,.42) !important;
  box-shadow: 0 8px 20px rgba(7,4,30,.16) !important;
}
.bt-mode-card:active {
  transform: translateY(0) scale(.965) !important;
  box-shadow: none !important;
}

/* Chips: no hover movement, only a tactile click animation. */
.bt-config-chip {
  transition: transform .10s ease, background .14s ease, border-color .14s ease, color .14s ease !important;
  box-shadow: none !important;
}
.bt-config-chip:hover {
  transform: none !important;
  box-shadow: none !important;
}
.bt-config-chip:active {
  transform: scale(.94) !important;
}

/* Round +/-: click feedback only, no hover effect. */
.bt-round-stepper button {
  transition: transform .10s ease !important;
  box-shadow: none !important;
}
.bt-round-stepper button:hover {
  transform: none !important;
  box-shadow: none !important;
}
.bt-round-stepper button:active {
  transform: scale(.88) !important;
}

/* Year fields: subtle click/focus feedback, no hover animation. */
.bt-year-range input {
  transition: transform .10s ease, border-color .14s ease, box-shadow .14s ease !important;
}
.bt-year-range input:focus {
  transform: scale(.98);
  border-color: rgba(180,148,248,.60) !important;
  box-shadow: 0 0 0 3px rgba(180,148,248,.08);
  outline: none;
}

/* Group utility buttons stay visually stable. */
.bt-config-filter-head button {
  transition: none !important;
  transform: none !important;
  box-shadow: none !important;
}
.bt-config-filter-head button:hover,
.bt-config-filter-head button:active {
  transform: none !important;
  box-shadow: none !important;
}

/* Composer: the card stays still; only the knob slides. */
.bt-composer-toggle {
  transform: none !important;
  box-shadow: none !important;
  transition: background .14s ease, border-color .14s ease !important;
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
  width: 39px !important;
  height: 22px !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  justify-content: initial !important;
  transition: background .20s ease !important;
}
.bt-switch i {
  position: absolute !important;
  left: 3px !important;
  top: 50% !important;
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
  transform: translate(0,-50%) !important;
  transition: transform .22s cubic-bezier(.2,.8,.2,1) !important;
}
.bt-composer-toggle.selected .bt-switch {
  box-shadow: none !important;
}
.bt-composer-toggle.selected .bt-switch i {
  transform: translate(17px,-50%) !important;
}

'''
css = css[:start] + config_css + css[end:]

# Replace confetti section.
start = css.index('/* Confetti contained inside the end modal */')
end = css.index('/* Avatar selector refresh */', start)
confetti_css = r'''/* End-game confetti: full viewport, above every modal element, one finite burst. */
.bt-end-overlay {
  isolation: isolate;
}
.bt-end-modal {
  position: relative;
  z-index: 2;
}
.bt-end-confetti {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 10050;
}
.bt-end-confetti i {
  position: absolute;
  left: var(--x, 50%);
  top: -24px;
  width: var(--w, 7px);
  height: var(--h, 14px);
  border-radius: 1px;
  background: var(--confetti, #ff7c2c);
  will-change: transform, opacity;
  transform: rotate(var(--start-rotate, 0deg));
  animation: bt-confetti-burst var(--duration, 2.8s) cubic-bezier(.18,.62,.35,1) var(--delay,0s) 1 forwards;
  box-shadow: 0 0 6px rgba(255,255,255,.04);
}
@keyframes bt-confetti-burst {
  0% {
    transform: translate3d(0,-24px,0) rotate(var(--start-rotate,0deg));
    opacity: 0;
  }
  5% { opacity: 1; }
  70% { opacity: .95; }
  100% {
    transform: translate3d(var(--drift,14px), calc(100vh + 40px),0) rotate(calc(var(--start-rotate,0deg) + 680deg));
    opacity: 0;
  }
}

'''
css = css[:start] + confetti_css + css[end:]

# Replace desktop config geometry block at the end.
marker = '/* Desktop config: fit the available viewport without document scrolling. */'
start = css.index(marker)
config_layout_css = r'''/* Desktop config: compact content-driven frame, without document scrolling. */
@media (min-width: 901px) and (min-height: 720px) {
  .bt-config-page {
    height: 100vh !important;
    min-height: 100vh !important;
    overflow: hidden !important;
    box-sizing: border-box;
    padding-top: 60px !important;
  }
  .bt-config-shell {
    height: auto !important;
    min-height: 0 !important;
    max-height: calc(100vh - 68px) !important;
    margin: 4px auto !important;
    align-items: stretch;
  }
  .bt-config-main {
    overflow: hidden !important;
    padding: 14px 18px !important;
  }
  .bt-config-lobby {
    min-height: 0 !important;
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

.bt-config-lobby-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.bt-config-lobby-heading h3 {
  margin: 0 !important;
}
.bt-config-lobby-heading > span {
  color: #b9b5c7;
  font-size: .78rem;
  font-weight: 700;
}

/* Config and room use exactly the same copy control. */
.bt-config-code .bt-copy-code {
  width: 34px !important;
  height: 34px !important;
  border-radius: 10px !important;
  padding: 0 !important;
}
'''
css = css[:start] + config_layout_css
path.write_text(css, encoding='utf-8')
