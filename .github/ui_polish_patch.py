from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# Global polish stylesheet.
replace_once(
    "src/App.js",
    'import React from "react";\n',
    'import React from "react";\nimport "./UiPolish.css";\n',
    "App polish CSS import",
)

# Shared SVG icon library + modal cleanup.
replace_once(
    "src/BlindtestUI.js",
    'import React from "react";\n',
    '''import React from "react";\n\nfunction SvgIcon({ name, className = "", size = 18 }) {\n  const common = { className: `bt-icon ${className}`.trim(), width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true };\n\n  const paths = {\n    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,\n    check: <path d="m5 12 4 4L19 6" />,\n    crown: <><path d="m3 7 4.5 4L12 5l4.5 6L21 7l-2 11H5L3 7Z" /><path d="M6 21h12" /></>,\n    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,\n    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M12 12v5M8 21h8M10 17h4M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4" /></>,\n    headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></>,\n    zap: <path d="M13 2 4 14h7l-1 8 10-13h-7V2Z" />,\n    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M15 9 21 3M17 3h4v4" /></>,\n    flame: <path d="M12 22c4 0 7-2.8 7-6.5 0-2.8-1.6-5.3-4.4-7.5.2 2-1 3.3-2.3 4.2.2-3.7-1.8-6.6-5-9.2.3 3.5-2.3 5.2-2.3 9.7C5 17.9 8 22 12 22Z" />,\n    rocket: <><path d="M14 5c3-2 5-2 7-2 0 2 0 4-2 7l-5 5-5-5 5-5Z" /><path d="M9 10 5 11l-2 3 5 1M14 15l-1 4-3 2-1-5M15 8h.01" /></>,\n    hourglass: <><path d="M6 3h12M6 21h12M7 3c0 5 2 6 5 9-3 3-5 4-5 9M17 3c0 5-2 6-5 9 3 3 5 4 5 9" /></>,\n    brain: <><path d="M9.5 4.5A3 3 0 0 0 6 7.4 3 3 0 0 0 5 13a3.5 3.5 0 0 0 4.5 5.4V4.5ZM14.5 4.5A3 3 0 0 1 18 7.4a3 3 0 0 1 1 5.6 3.5 3.5 0 0 1-4.5 5.4V4.5Z" /><path d="M9.5 9H7M14.5 9H17M9.5 14H7.5M14.5 14h2" /></>,\n    music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,\n    film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4" /></>,\n    sparkles: <><path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" /><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 13l.7 1.8 1.8.7-1.8.7L6 18l-.7-1.8-1.8-.7 1.8-.7L6 13Z" /></>,\n    arrowUp: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,\n  };\n\n  return <svg {...common}>{paths[name] || paths.sparkles}</svg>;\n}\n\nexport const CopyIcon = () => <SvgIcon name="copy" />;\nexport const CheckIcon = () => <SvgIcon name="check" />;\nexport const CrownIcon = () => <SvgIcon name="crown" />;\n''',
    "SVG icon library",
)

replace_once(
    "src/BlindtestUI.js",
    '<div className="bt-round-time">⏱ Réponse en {String(popupInfo.responseTime).replace(/\\s*sec(?:onde)?s?$/i, " sec")}</div>',
    '<div className="bt-round-time"><SvgIcon name="clock" /> Réponse en {String(popupInfo.responseTime).replace(/\\s*sec(?:onde)?s?$/i, " sec")}</div>',
    "round response clock",
)
replace_once(
    "src/BlindtestUI.js",
    '{movedUp && <span className="bt-rank-up">↑</span>}',
    '{movedUp && <span className="bt-rank-up" title="Gagne une place"><SvgIcon name="arrowUp" /></span>}',
    "rank up icon",
)
replace_once(
    "src/BlindtestUI.js",
    '{player.score} pts <span className={delta > 0 ? "gain" : "zero"}>({delta >= 0 ? `+${delta}` : delta})</span> ⏱ {formatResponseTime(detail.responseTime)}',
    '{player.score} pts <span className={delta > 0 ? "gain" : "zero"}>({delta >= 0 ? `+${delta}` : delta})</span> <SvgIcon name="clock" /> {formatResponseTime(detail.responseTime)}',
    "score row clock",
)

old_insights = '''function insightEmoji(type, index) {\n  const known = {\n    "winner-reason": "🏆",\n    "solo-summary": "🎧",\n    "average-speed": "⚡",\n    "fastest": "⚡",\n    "solo-finds": "🎯",\n    "streak": "🔥",\n    "best-reaction": "🚀",\n    "last-second": "⏳",\n    "no-hints": "🧠"\n  };\n  return known[type] || ["✨", "🎵", "🎬"][index % 3];\n}\n'''
new_insights = '''function InsightIcon({ type, index }) {\n  const known = {\n    "winner-reason": "trophy",\n    "solo-summary": "headphones",\n    "average-speed": "zap",\n    "fastest": "zap",\n    "solo-finds": "target",\n    "streak": "flame",\n    "best-reaction": "rocket",\n    "last-second": "hourglass",\n    "no-hints": "brain"\n  };\n  const fallback = ["sparkles", "music", "film"];\n  return <span className="bt-fact-icon"><SvgIcon name={known[type] || fallback[index % fallback.length]} /></span>;\n}\n'''
replace_once("src/BlindtestUI.js", old_insights, new_insights, "insight SVG mapping")
replace_once(
    "src/BlindtestUI.js",
    '{place === 1 && <span className="bt-winner-crown">♛</span>}',
    '{place === 1 && <span className="bt-winner-crown"><CrownIcon /></span>}',
    "winner crown SVG",
)
replace_once(
    "src/BlindtestUI.js",
    '''    <div className="popup-rep-overlay bt-end-overlay">\n      <div className="bt-end-confetti" aria-hidden="true">\n        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}\n      </div>\n      <div className="bt-end-modal">\n        <h2>Fin de la partie !</h2>''',
    '''    <div className="popup-rep-overlay bt-end-overlay">\n      <div className="bt-end-modal">\n        <div className="bt-end-confetti" aria-hidden="true">\n          {Array.from({ length: 32 }, (_, index) => (\n            <i\n              key={index}\n              style={{\n                "--x": `${4 + ((index * 29) % 92)}%`,\n                "--delay": `${-((index * 0.31) % 3.7)}s`,\n                "--duration": `${3.1 + ((index * 7) % 13) / 10}s`,\n                "--drift": `${-24 + ((index * 17) % 49)}px`,\n                "--start-rotate": `${(index * 47) % 180}deg`,\n                "--w": `${5 + (index % 4)}px`,\n                "--h": `${9 + (index % 5) * 2}px`\n              }}\n            />\n          ))}\n        </div>\n        <h2>Fin de la partie !</h2>''',
    "denser modal confetti",
)
replace_once(
    "src/BlindtestUI.js",
    '<span>{insightEmoji(insight.type, index)}</span>\n                <p>{insight.text}</p>',
    '<InsightIcon type={insight.type} index={index} />\n                <p>{insight.text}</p>',
    "fact SVG rendering",
)

# Config: proper copy/check/crown SVGs.
replace_once(
    "src/ConfigPage.js",
    'import { AppHeader } from "./BlindtestUI";',
    'import { AppHeader, CopyIcon, CheckIcon, CrownIcon } from "./BlindtestUI";',
    "config icon imports",
)
replace_once(
    "src/ConfigPage.js",
    '<div className="bt-config-code"><code>{id}</code><button onClick={copierCode} title="Copier le code">{copied ? "✓" : "⧉"}</button></div>',
    '<div className="bt-config-code"><code>{id}</code><button className={`bt-copy-code ${copied ? "copied" : ""}`} onClick={copierCode} title={copied ? "Code copié" : "Copier le code"} aria-label={copied ? "Code copié" : "Copier le code"}>{copied ? <CheckIcon /> : <CopyIcon />}</button></div>',
    "config copy SVG",
)
replace_once(
    "src/ConfigPage.js",
    '{player.name}{player.name === playerName && <span className="bt-admin-crown">♛</span>}',
    '{player.name}{player.name === playerName && <span className="bt-admin-crown" title="Organisateur"><CrownIcon /></span>}',
    "config crown SVG",
)

# Player room: same icon system.
replace_once(
    "src/RoomPage.js",
    'import { AppHeader, WaitingDots } from "./BlindtestUI";',
    'import { AppHeader, WaitingDots, CopyIcon, CheckIcon, CrownIcon } from "./BlindtestUI";',
    "room icon imports",
)
replace_once(
    "src/RoomPage.js",
    'className="bt-copy-code"',
    'className={`bt-copy-code ${copied ? "copied" : ""}`}',
    "room copy state class",
)
replace_once(
    "src/RoomPage.js",
    '{copied ? "✓" : "⧉"}',
    '{copied ? <CheckIcon /> : <CopyIcon />}',
    "room copy SVG",
)
replace_once(
    "src/RoomPage.js",
    '{player.name === game.admin && <span className="bt-admin-crown">♛</span>}',
    '{player.name === game.admin && <span className="bt-admin-crown" title="Organisateur"><CrownIcon /></span>}',
    "room crown SVG",
)

# Remove the only visible emoji still injected by classic round state.
replace_once(
    "src/GamePage.js",
    'title: "⏱ Temps écoulé",',
    'title: "Temps écoulé",',
    "timeout title emoji",
)

print("UI polish patch applied")
