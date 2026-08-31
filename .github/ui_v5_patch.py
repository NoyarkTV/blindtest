from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_all(path, old, new, expected, label):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} matches, found {count}")
    p.write_text(text.replace(old, new), encoding="utf-8")


# Landing: current structure/functionality remains intact.
replace_once("src/LandingPage.js", '<div className="app" style={{', '<div className="app bt-landing-page" style={{', "landing root")
replace_once("src/LandingPage.js", '<div className="popup" style={{\n  width: "240px",', '<div className="popup bt-landing-profile" style={{\n  width: "240px",', "landing profile")
replace_once("src/LandingPage.js", 'className="btn btn"\n    onClick={() => {', 'className="btn bt-disconnect"\n    onClick={() => {', "landing disconnect")
replace_once("src/LandingPage.js", '      {/* Zone de jeu */}\n        <div style={{', '      {/* Zone de jeu */}\n        <div className="bt-landing-play" style={{', "landing play")


# Room.
replace_once("src/RoomPage.js", 'import socket from "./socket";\n', 'import socket from "./socket";\nimport { AppHeader, WaitingDots } from "./BlindtestUI";\n', "room imports")
replace_once("src/RoomPage.js", '  const shouldLeaveRef = useRef(true);\n', '  const shouldLeaveRef = useRef(true);\n  const [copied, setCopied] = useState(false);\n', "room copied")
room = Path("src/RoomPage.js")
text = room.read_text(encoding="utf-8")
start = text.index('return (\n  <div className="app"')
end = text.index('\n);\n}\n\nexport default RoomPage;', start)
room_render = r'''return (
  <div className="app bt-room-page">
    <AppHeader onHome={() => navigate("/")} />
    <div className="bt-room-content">
      <div className="popup bt-room-card">
        <h2>Salle d'attente</h2>
        <div className="bt-room-code-row">
          <code>{id}</code>
          <button
            className="bt-copy-code"
            onClick={() => {
              navigator.clipboard.writeText(id).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              });
            }}
            title="Copier le code de la salle"
          >
            {copied ? "✓" : "⧉"}
          </button>
        </div>
        <div className="bt-room-players">
          <h3>Joueurs connectés</h3>
          {players.map((player) => (
            <div className={`bt-room-player ${player.name === playerName ? "me" : ""}`} key={player.name}>
              <span className="bt-avatar"><img src={player.photo || "/ppDefault.png"} alt="" /></span>
              <span className="bt-room-player-name">
                {player.name}
                {player.name === game.admin && <span className="bt-admin-crown">♛</span>}
              </span>
              <span className="bt-online-dot" />
            </div>
          ))}
        </div>
        <div className="bt-room-waiting">
          <span>En attente que l’organisateur lance la partie</span>
          <WaitingDots />
        </div>
      </div>
    </div>
  </div>
)'''
room.write_text(text[:start] + room_render + text[end:], encoding="utf-8")


# Config.
replace_once("src/ConfigPage.js", 'import socket from "./socket";\n', 'import socket from "./socket";\nimport { AppHeader } from "./BlindtestUI";\n', "config import")
replace_once("src/ConfigPage.js", 'const [bonusCompositeur, setBonusCompositeur] = useState(false);', 'const [bonusCompositeur, setBonusCompositeur] = useState(true);', "composer default")
config = Path("src/ConfigPage.js")
text = config.read_text(encoding="utf-8")
helper_start = text.index("const renderCheckboxGroup =")
render_start = text.index("\nreturn (", helper_start)
helper = r'''const renderCheckboxGroup = (label, list, selected, setter, cssClass = "") => (
  <div className="bt-config-filter">
    <div className="bt-config-filter-head">
      <strong>{label}</strong>
      <div>
        <button onClick={() => setter([...list])}>Tout sélectionner</button>
        <button onClick={() => setter([])}>Tout désélectionner</button>
      </div>
    </div>
    <div className={`bt-config-chips ${cssClass}`}>
      {list.map(item => (
        <button
          type="button"
          key={item}
          className={`bt-config-chip ${selected.includes(item) ? "selected" : ""}`}
          onClick={() => toggleSelection(item, selected, setter)}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
);
'''
text = text[:helper_start] + helper + text[render_start:]
start = text.index("\nreturn (") + 1
end = text.index("\n);\n\n}\n\nexport default ConfigPage;", start)
config_render = r'''return (
  <div className="app bt-config-page">
    <AppHeader onHome={() => navigate("/")} />
    <div className="bt-config-shell">
      <section className="bt-config-main">
        <div className="bt-config-heading">
          <div><span>Paramètres</span><h2>Configurer le blindtest</h2></div>
          <small className={filteredCount === 0 ? "empty" : ""}>
            {filteredCount === 0 ? "Aucun morceau disponible" : `${filteredCount} morceaux disponibles`}
          </small>
        </div>

        <div className="bt-mode-grid">
          <button className={`bt-mode-card ${!modeEclair && !modeDiffusion ? "selected" : ""}`} onClick={() => { setModeEclair(false); setModeDiffusion(false); }}>
            <strong>Classique</strong><small>Le mode principal du blindtest</small>
          </button>
          <button className={`bt-mode-card ${modeEclair ? "selected" : ""}`} onClick={() => { setModeEclair(true); setModeDiffusion(false); }}>
            <strong>Éclair</strong><small>Réponses très rapides</small>
          </button>
          <button className={`bt-mode-card ${modeDiffusion ? "selected" : ""}`} onClick={() => { setModeDiffusion(true); setModeEclair(false); }}>
            <strong>Diffusion</strong><small>Un diffuseur, plusieurs joueurs</small>
          </button>
        </div>

        <div className="bt-config-top-controls">
          <div className="bt-config-control">
            <label>Nombre de rounds</label>
            <div className="bt-round-stepper">
              <button onClick={() => setNbRounds(value => Math.max(1, value - 1))}>−</button>
              <input
                type="number"
                min="1"
                max={Math.max(filteredCount, 1)}
                value={nbRounds}
                onChange={event => setNbRounds(Math.max(1, Math.min(+event.target.value || 1, Math.max(filteredCount, 1))))}
              />
              <button onClick={() => setNbRounds(value => Math.min(Math.max(filteredCount, 1), value + 1))}>+</button>
            </div>
          </div>
          <div className="bt-config-control">
            <label>Temps par manche</label>
            <input type="range" min="5" max="60" step="5" value={time} disabled={modeEclair} onChange={event => setTime(+event.target.value)} />
            <div className="bt-range-caption"><span>5 s</span><strong>{modeEclair ? "0.5 seconde" : `${time} secondes`}</strong><span>60 s</span></div>
          </div>
          <div className="bt-config-control">
            <label>Années</label>
            <div className="bt-year-range">
              <span>De</span><input type="number" value={anneeMin} onChange={event => setAnneeMin(+event.target.value)} />
              <span>à</span><input type="number" value={anneeMax} onChange={event => setAnneeMax(+event.target.value)} />
            </div>
          </div>
        </div>

        <button className={`bt-composer-toggle ${bonusCompositeur ? "selected" : ""}`} onClick={() => setBonusCompositeur(value => !value)}>
          <span className="bt-switch"><i /></span>
          <span><strong>Bonus compositeur</strong><small>Permet de gagner des points supplémentaires en trouvant le compositeur.</small></span>
        </button>

        {renderCheckboxGroup("Médias", media, selectedMedia, setSelectedMedia, "media")}
        {renderCheckboxGroup("Difficulté", difficulte, selectedDifficulte, setSelectedDifficulte, "difficulte")}
        {renderCheckboxGroup("Catégories", categorie, selectedCategorie, setSelectedCategorie, "categorie")}
        {renderCheckboxGroup("Pays", pays, selectedPays, setSelectedPays, "pays")}
      </section>

      <aside className="bt-config-lobby">
        <div>
          <h3>Salle d’attente</h3>
          <div className="bt-config-code"><code>{id}</code><button onClick={copierCode} title="Copier le code">{copied ? "✓" : "⧉"}</button></div>
          <div className="bt-config-players">
            {players.map(player => (
              <div className={`bt-config-player ${player.name === playerName ? "me" : ""}`} key={player.name}>
                <span className="bt-avatar"><img src={player.photo || "/ppDefault.png"} alt="" /></span>
                <span>{player.name}{player.name === playerName && <span className="bt-admin-crown">♛</span>}</span>
                <i className="bt-online-dot" />
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-confirm bt-launch-game" onClick={validerPartie} disabled={filteredCount === 0 || nbRounds < 1 || nbRounds > filteredCount}>
          Lancer la partie
        </button>
      </aside>
    </div>
  </div>
)'''
config.write_text(text[:start] + config_render + text[end:], encoding="utf-8")


# Shared summary fetch replacement.
old_summary = '''    fetch(`https://blindtest-69h7.onrender.com/game-summary/${id}`)
      .then(res => res.ok ? res.json() : { insights: [] })
      .then(data => setEndInsights(Array.isArray(data.insights) ? data.insights : []))
      .catch(() => setEndInsights([]));'''
new_summary = '''    fetch(`https://blindtest-69h7.onrender.com/game-summary/${id}`)
      .then(res => res.ok ? res.json() : { insights: [], players: [] })
      .then(data => {
        setEndInsights(Array.isArray(data.insights) ? data.insights : []);
        setEndSummaryPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch(() => {
        setEndInsights([]);
        setEndSummaryPlayers([]);
      });'''


# Classic game.
replace_once("src/GamePage.js", 'import { isAcceptedTitle } from "./answerUtils";\n', 'import { isAcceptedTitle } from "./answerUtils";\nimport { AppHeader, Waveform, GameScoreboard, RoundResultModal, EndGameModal } from "./BlindtestUI";\n', "game imports")
replace_once("src/GamePage.js", '  const [endInsights, setEndInsights] = useState([]);\n', '  const [endInsights, setEndInsights] = useState([]);\n  const [endSummaryPlayers, setEndSummaryPlayers] = useState([]);\n', "game summary state")
replace_all("src/GamePage.js", old_summary, new_summary, 2, "game summary fetch")
game = Path("src/GamePage.js")
text = game.read_text(encoding="utf-8")
start = text.index('return (\n  <div className="app">')
end = text.index('\n  );\n}\nexport default GamePage;', start)
game_render = r'''return (
  <div className="app bt-game-page">
    <SpotifyPlayer token={token} onReady={handleReady} />
    <AppHeader onHome={() => navigate("/")} />

    <div className="bt-game-shell">
      <div className="bt-game-round">ROUND {currentRound} / {playlist.length}</div>
      <div className="bt-game-center">
        <div className="timer bt-game-timer" style={{ "--progress": `${(timeLeft / timer) * 360}deg` }}>
          <span>{Math.ceil(timeLeft ?? 0)}</span>
        </div>

        <Waveform active={Boolean(isTimerRunning && isPlaying && !showPopup && !showEndPopup)} />

        <div className="bt-game-hints">
          {["media", "annee"].map(type => {
            const visible = type === "media" ? showIndiceMedia : showIndiceAnnee;
            const toggle = type === "media" ? () => setShowIndiceMedia(true) : () => setShowIndiceAnnee(true);
            const label = type === "media" ? "Média" : "Année";
            const value = currentTrack?.[type] || "?";
            return (
              <button className="bt-hint-button" key={type} onClick={toggle}>
                <span className="bt-eye-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                  </svg>
                </span>
                <span>{visible ? value : label}</span>
              </button>
            );
          })}
        </div>

        {!isBuzzed ? (
          <button className="buzz-button bt-buzz" onClick={handleBuzz}>BUZZ</button>
        ) : (
          <div className="bt-answer-form">
            <input key={isWrongAnswer ? "wrong" : "normal"} type="text" placeholder="Votre réponse" value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => event.key === "Enter" && handleValidate()} ref={answerInputRef} className={`text-input ${isWrongAnswer ? "wrong-answer" : ""}`} />
            {bonusCompositeur && <input key={isWrongAnswer ? "wrong-composer-input" : "normal-composer-input"} type="text" placeholder="Compositeur (facultatif)" value={composerGuess} onChange={event => setComposerGuess(event.target.value)} className={`text-input ${isWrongAnswer ? "wrong-answer" : ""}`} />}
            <div>
              <button className="btn btn-confirm" onClick={handleValidate} disabled={!answer && (!bonusCompositeur || !composerGuess)}>Valider</button>
              <button className="btn btn-cancel" onClick={() => { setIsBuzzed(false); setAnswer(""); setComposerGuess(""); setIsTimerRunning(true); handlePlay(); }}>Annuler</button>
            </div>
          </div>
        )}
      </div>
      <GameScoreboard scoreboard={scoreboard} playerName={playerName} />
    </div>

    {showPopup && popupInfo && (
      <RoundResultModal popupInfo={popupInfo} image={trackImages[currentTrack?.uri] || popupInfo.image} scoreboard={scoreboard} readyPlayersInfo={readyPlayersInfo} playerName={playerName} isAdmin={isAdmin} playersReady={playersReady} playersTotal={playersTotal || players.length} canNext={roundEndedRef.current} onNext={handleNext} />
    )}

    {showEndPopup && (
      <EndGameModal finalScores={finalScores} summaryPlayers={endSummaryPlayers} insights={endInsights} playerName={playerName} onQuit={() => { setShowEndPopup(false); navigate("/"); }} />
    )}
  </div>
)'''
game.write_text(text[:start] + game_render + text[end:], encoding="utf-8")


# Eclair keeps gameplay, shares the redesigned result/end modals.
replace_once("src/GamePageEclair.js", 'import { isAcceptedTitle } from "./answerUtils";\n', 'import { isAcceptedTitle } from "./answerUtils";\nimport { RoundResultModal, EndGameModal } from "./BlindtestUI";\n', "eclair imports")
replace_once("src/GamePageEclair.js", '  const [endInsights, setEndInsights] = useState([]);\n', '  const [endInsights, setEndInsights] = useState([]);\n  const [endSummaryPlayers, setEndSummaryPlayers] = useState([]);\n', "eclair summary state")
replace_all("src/GamePageEclair.js", old_summary, new_summary, 2, "eclair summary fetch")
eclair = Path("src/GamePageEclair.js")
text = eclair.read_text(encoding="utf-8")
start = text.index("{showPopup && popupInfo && (")
end = text.index("\n\n    </div>\n  );", start)
modals = r'''{showPopup && popupInfo && (
  <RoundResultModal popupInfo={popupInfo} image={trackImages[currentTrack?.uri] || popupInfo.image} scoreboard={scoreboard} readyPlayersInfo={readyPlayersInfo} playerName={playerName} isAdmin={isAdmin} playersReady={playersReady} playersTotal={playersTotal || players.length} canNext={roundEndedRef.current} onNext={handleNext} />
)}
{showEndPopup && (
  <EndGameModal finalScores={finalScores} summaryPlayers={endSummaryPlayers} insights={endInsights} playerName={playerName} onQuit={() => { setShowEndPopup(false); navigate("/"); }} />
)}'''
eclair.write_text(text[:start] + modals + text[end:], encoding="utf-8")


# V5 CSS appended so untouched modes keep their existing styling.
css = r'''
/* === Blindtest UI V5 === */
body{background:radial-gradient(circle at 14% 5%,rgba(255,124,44,.09),transparent 25%),radial-gradient(circle at 90% 8%,rgba(123,29,175,.16),transparent 28%),var(--color-bg)}
.popup{border:1px solid rgba(255,255,255,.08);box-shadow:0 18px 45px rgba(3,1,20,.28)}
.bt-header{position:absolute;inset:0 0 auto 0;height:60px;display:flex;align-items:center;padding:0 20px;z-index:50;pointer-events:none}.bt-header img{height:40px;cursor:pointer;pointer-events:auto}.bt-avatar{border-radius:50%;overflow:hidden;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.12)}.bt-avatar img{width:100%;height:100%;object-fit:cover;display:block;margin:0;border-radius:0;box-shadow:none}.bt-online-dot{width:7px;height:7px;border-radius:50%;background:#4bd58b;box-shadow:0 0 0 3px rgba(75,213,139,.11);margin-left:auto}.bt-admin-crown{color:#ff7c2c;margin-left:6px;font-size:1rem;filter:drop-shadow(0 2px 6px rgba(255,124,44,.3))}.bt-waiting-dots{display:inline-flex;gap:4px;align-items:center}.bt-waiting-dots i{width:5px;height:5px;border-radius:50%;background:#b494f8;animation:bt-dot 1s infinite ease-in-out}.bt-waiting-dots i:nth-child(2){animation-delay:.15s}.bt-waiting-dots i:nth-child(3){animation-delay:.3s}@keyframes bt-dot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}
.bt-landing-page .logo{filter:drop-shadow(0 16px 36px rgba(123,29,175,.16))}.bt-landing-profile{border-radius:20px!important}.bt-landing-play{min-height:285px}.bt-disconnect{padding:5px 12px!important;font-size:.85rem!important;background:transparent!important;color:#ccc!important;font-weight:400!important;border:0!important;box-shadow:none!important}.bt-disconnect:hover{background:transparent!important;color:#fff!important}
.bt-room-page{min-height:100vh;padding-top:60px}.bt-room-content{flex:1;width:100%;display:flex;align-items:center;justify-content:center;padding:36px 20px;box-sizing:border-box}.bt-room-card{max-width:620px;width:100%;text-align:center;padding:26px;border-radius:24px}.bt-room-card h2{margin:0 0 18px;color:#fff;font-size:1.7rem}.bt-room-code-row{display:inline-flex;align-items:center;gap:8px;margin-bottom:22px;padding:9px 10px 9px 16px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:linear-gradient(90deg,rgba(255,124,44,.12),rgba(123,29,175,.14))}.bt-room-code-row code{font-family:inherit;font-size:1.2rem;font-weight:900;letter-spacing:.16em;color:#fff}.bt-copy-code{width:34px;height:34px;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.bt-room-players{padding:14px;border-radius:16px;background:#19153b;border:1px solid rgba(255,255,255,.055);text-align:left}.bt-room-players h3{margin:0 0 9px;text-align:center;color:#b494f8;font-size:1rem}.bt-room-player{display:flex;align-items:center;gap:10px;padding:9px 10px;margin-top:6px;border-radius:11px;background:#292252;border:1px solid rgba(255,255,255,.04)}.bt-room-player.me,.bt-config-player.me,.bt-game-score-row.me,.bt-round-score-row.me,.bt-final-row.me{background:linear-gradient(90deg,rgba(255,124,44,.18),rgba(123,29,175,.16));border-color:rgba(255,255,255,.12);box-shadow:inset 3px 0 #ff7c2c}.bt-room-player-name{display:flex;align-items:center;flex:1;font-weight:800}.bt-room-waiting{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:20px;color:#d8d2e7;font-size:.9rem}
.bt-config-page{min-height:100vh;padding-top:60px;width:100%}.bt-config-shell{width:min(1240px,calc(100% - 32px));min-height:calc(100vh - 88px);margin:14px auto;display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:18px;box-sizing:border-box}.bt-config-main,.bt-config-lobby{border:1px solid rgba(255,255,255,.09);border-radius:22px;background:rgba(255,255,255,.035)}.bt-config-main{padding:19px;overflow-y:auto}.bt-config-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:14px}.bt-config-heading>div>span{color:#aaa4c2;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;font-weight:800}.bt-config-heading h2{margin:3px 0 0;color:#fff;font-size:1.55rem}.bt-config-heading small{color:#ddd}.bt-config-heading small.empty{color:var(--color-red)}.bt-mode-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.bt-mode-card{border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;text-align:left;background:#1c1740;color:#fff;cursor:pointer}.bt-mode-card.selected{background:linear-gradient(120deg,rgba(255,124,44,.16),rgba(123,29,175,.18));border-color:rgba(255,255,255,.18)}.bt-mode-card strong{display:block}.bt-mode-card small{display:block;color:#aaa4c2;margin-top:3px}.bt-config-top-controls{display:grid;grid-template-columns:.75fr 1.25fr 1.2fr;gap:9px}.bt-config-control{border:1px solid rgba(255,255,255,.10);border-radius:14px;background:#1b163d;padding:11px}.bt-config-control label{display:block;margin-bottom:7px;color:#aaa4c2;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.09em}.bt-round-stepper{display:flex;align-items:center;justify-content:center;gap:7px}.bt-round-stepper button{width:32px;height:32px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:#292352;color:#fff;font-size:1.1rem;cursor:pointer}.bt-round-stepper input,.bt-year-range input{width:64px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:#282154;color:#fff;text-align:center;padding:8px;font-weight:800}.bt-range-caption{display:flex;justify-content:space-between;align-items:center;margin-top:7px;color:#aaa4c2;font-size:.72rem}.bt-range-caption strong{color:#fff}.bt-year-range{display:flex;align-items:center;gap:6px;color:#aaa4c2;font-size:.75rem;flex-wrap:wrap}.bt-composer-toggle{width:100%;margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:#1b163d;color:#fff;text-align:left;cursor:pointer}.bt-composer-toggle>span:last-child{display:flex;flex-direction:column;gap:2px}.bt-composer-toggle small{color:#aaa4c2}.bt-switch{width:39px;height:22px;border-radius:999px;padding:3px;background:#55506f;display:flex;align-items:center;justify-content:flex-start}.bt-switch i{width:16px;height:16px;border-radius:50%;background:#fff}.bt-composer-toggle.selected .bt-switch{background:var(--gradient-main);justify-content:flex-end}.bt-config-filter{padding-top:11px;margin-top:11px;border-top:1px solid rgba(255,255,255,.06)}.bt-config-filter-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.bt-config-filter-head strong{font-size:.9rem}.bt-config-filter-head>div{display:flex;gap:5px}.bt-config-filter-head button{border:0;border-radius:8px;padding:5px 8px;background:rgba(255,255,255,.06);color:#d8d1e6;font-size:.68rem;font-weight:800;cursor:pointer}.bt-config-chips{display:flex;flex-wrap:wrap;gap:6px}.bt-config-chip{padding:6px 9px;border-radius:999px;border:1px solid #736f8d;background:transparent;color:#b9b5c7;font-size:.78rem;font-weight:700;cursor:pointer}.bt-config-chip.selected{background:#fff;color:#151133;border-color:#fff}.bt-config-lobby{padding:16px;display:flex;flex-direction:column}.bt-config-lobby h3{margin:0 0 10px}.bt-config-code{display:flex;gap:7px;margin-bottom:12px}.bt-config-code code{flex:1;padding:11px;border-radius:11px;background:#171233;border:1px solid rgba(255,255,255,.10);text-align:center;color:#fff;font-family:inherit;font-size:1.2rem;font-weight:900;letter-spacing:.16em}.bt-config-code button{width:40px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#292253;color:#fff;cursor:pointer}.bt-config-player{display:flex;align-items:center;gap:8px;padding:8px 9px;margin-top:6px;border-radius:11px;border:1px solid rgba(255,255,255,.04);background:#27204f}.bt-config-player>span:nth-child(2){display:flex;align-items:center;flex:1;font-weight:800;font-size:.85rem}.bt-launch-game{width:100%;margin-top:auto}
.bt-game-page{min-height:100vh;width:100%}.bt-game-shell{position:relative;width:100%;min-height:100vh;padding-top:72px;box-sizing:border-box}.bt-game-round{text-align:center;color:#fff;font-size:1.75rem;font-weight:900}.bt-game-center{width:min(560px,100%);min-height:calc(100vh - 120px);margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center}.bt-game-page .bt-game-timer{width:150px;height:150px;margin:0 auto;box-shadow:0 15px 38px rgba(255,124,44,.13)}.bt-waveform{height:72px;display:flex;align-items:center;justify-content:center;gap:4px;margin:21px 0 14px}.bt-waveform span{width:5px;height:14px;border-radius:999px;background:linear-gradient(to top,#7b1daf,#ff7c2c);transform-origin:center}.bt-waveform.active span{animation:bt-wave 1.05s infinite ease-in-out}.bt-waveform span:nth-child(2n){animation-delay:-.18s}.bt-waveform span:nth-child(3n){animation-delay:-.36s}.bt-waveform span:nth-child(5n){animation-delay:-.54s}.bt-waveform.paused span{opacity:.35;height:14px}@keyframes bt-wave{0%,100%{height:14px;opacity:.55}50%{height:58px;opacity:1}}.bt-game-hints{display:flex;gap:8px;margin-bottom:15px}.bt-hint-button{min-width:110px;display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 13px;border:1px solid rgba(180,148,248,.34);border-radius:13px;background:#27214f;color:#fff;cursor:pointer;font-weight:800}.bt-hint-button:hover{background:#302861}.bt-eye-icon{display:inline-flex;color:#fff}.bt-buzz{min-width:250px;box-shadow:0 16px 35px rgba(177,54,129,.26)}.bt-answer-form{width:min(360px,90vw);display:flex;flex-direction:column;align-items:stretch;gap:8px}.bt-answer-form .text-input{width:100%;box-sizing:border-box}.bt-answer-form>div{display:flex;justify-content:center;gap:8px}.bt-answer-form .btn{padding:10px 18px;font-size:.95rem}.bt-game-scoreboard{position:absolute;right:22px;top:50%;transform:translateY(-42%);width:270px;padding:13px;border-radius:18px;background:#1c1740;border:1px solid rgba(255,255,255,.10)}.bt-game-scoreboard h3{margin:0 0 9px;text-align:center;color:#b494f8}.bt-game-score-row{display:flex;align-items:center;gap:8px;padding:8px;margin-top:5px;border-radius:11px;background:#27204f;border:1px solid rgba(255,255,255,.04)}.bt-game-rank{width:18px;color:#c8c2d7}.bt-game-player-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-round-overlay{background:rgba(7,4,25,.72)}.bt-round-modal{width:min(660px,94vw);max-height:92vh;overflow-y:auto;padding:24px;border-radius:24px;background:#1f1a48;border:1px solid rgba(255,255,255,.11);text-align:center;box-shadow:0 28px 80px rgba(0,0,0,.44)}.bt-round-status{margin:0;font-size:1.55rem}.bt-round-points{margin:5px 0 2px;font-size:3rem;font-weight:900}.bt-round-points.positive{color:#4bd58b}.bt-round-points.zero{color:#ff6572}.bt-round-time{margin-bottom:14px;color:#c7c1d4}.bt-round-cover{width:150px!important;height:150px!important;margin:0 auto 14px!important;border-radius:14px!important;object-fit:cover;display:block}.bt-round-track{color:#fff;font-size:1.2rem;font-weight:700}.bt-round-composer{margin-top:5px;color:#c9c3d6;font-style:italic}.bt-round-scoreboard{margin-top:18px;padding:10px;border-radius:15px;background:#19153a;border:1px solid rgba(255,255,255,.055);text-align:left}.bt-round-scoreboard h3{margin:0 0 8px;text-align:center;color:#b494f8}.bt-round-score-row{display:flex;align-items:center;gap:8px;padding:8px 9px;margin-top:5px;border-radius:11px;background:#27204f;border:1px solid rgba(255,255,255,.035)}.bt-round-player-name{display:flex;align-items:center;gap:5px;flex:1;min-width:0;font-weight:800}.bt-round-player-name>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt-rank-up{color:#4bd58b;font-weight:900;font-size:1.1rem}.bt-round-score-detail{color:#eee;font-size:.9rem;white-space:nowrap}.bt-round-score-detail .gain{color:#4bd58b;font-size:inherit;margin:0}.bt-round-score-detail .zero{color:#ff6572;font-weight:900}.bt-round-footer{display:flex;justify-content:center;margin-top:14px}.bt-next-round{min-width:220px}.bt-next-round:disabled{opacity:.5;cursor:default;transform:none}.bt-wait-admin{min-height:42px;display:flex;align-items:center;justify-content:center;gap:7px;color:#aaa4c2}
.bt-end-overlay{overflow-y:auto;padding:20px 0;background:rgba(7,4,25,.72)}.bt-end-modal{position:relative;z-index:2;width:min(820px,94vw);max-height:94vh;overflow-y:auto;padding:24px;border-radius:25px;background:linear-gradient(180deg,rgba(40,33,86,.98),rgba(31,26,72,.98));border:1px solid rgba(255,255,255,.11);text-align:center;box-shadow:0 28px 85px rgba(0,0,0,.48)}.bt-end-modal>h2{margin:0;font-size:1.8rem}.bt-end-confetti{position:fixed;inset:0;pointer-events:none;z-index:1}.bt-end-confetti i{position:absolute;width:9px;height:17px;border-radius:999px;background:linear-gradient(180deg,#ff7c2c,#b494f8);opacity:.78;animation:bt-confetti 4.8s ease-in-out infinite}.bt-end-confetti i:nth-child(1){left:12%;top:16%}.bt-end-confetti i:nth-child(2){left:25%;top:9%;animation-delay:.5s}.bt-end-confetti i:nth-child(3){left:77%;top:12%;animation-delay:1.1s}.bt-end-confetti i:nth-child(4){left:89%;top:27%;animation-delay:1.7s}.bt-end-confetti i:nth-child(5){left:8%;top:70%;animation-delay:.8s}.bt-end-confetti i:nth-child(6){left:83%;top:72%;animation-delay:1.3s}.bt-end-confetti i:nth-child(7){left:35%;top:84%;animation-delay:.2s}.bt-end-confetti i:nth-child(8){left:67%;top:88%;animation-delay:1.9s}@keyframes bt-confetti{50%{transform:translateY(-9px) rotate(20deg)}}.bt-podium{height:255px;display:flex;align-items:flex-end;justify-content:center;gap:12px;margin:20px auto 15px;max-width:610px}.bt-podium-card{width:165px;text-align:center;animation:bt-podium-rise .7s cubic-bezier(.2,.8,.2,1) both}.bt-podium-card.place-1{animation-delay:.02s}.bt-podium-card.place-2{animation-delay:.15s}.bt-podium-card.place-3{animation-delay:.28s}@keyframes bt-podium-rise{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}.bt-podium-avatar-wrap{width:fit-content;margin:0 auto 7px;position:relative}.bt-winner-crown{position:absolute;left:50%;top:-24px;transform:translateX(-50%);color:#ff7c2c;font-size:1.55rem;filter:drop-shadow(0 4px 8px rgba(255,124,44,.35));animation:bt-crown-float 1.6s infinite ease-in-out}@keyframes bt-crown-float{50%{transform:translate(-50%,-4px)}}.bt-podium-card>strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt-podium-score{display:block;margin-top:2px;font-weight:900}.bt-podium-card small{display:block;margin-top:3px;color:#ddd7eb}.bt-podium-block{display:flex;align-items:center;justify-content:center;margin-top:8px;border-radius:12px 12px 0 0;background:linear-gradient(180deg,rgba(255,124,44,.40),rgba(123,29,175,.30));border:1px solid rgba(255,255,255,.08);font-size:1.55rem;font-weight:900}.bt-podium-card.place-1 .bt-podium-block{height:122px}.bt-podium-card.place-2 .bt-podium-block{height:92px}.bt-podium-card.place-3 .bt-podium-block{height:70px}.bt-small-game-winner{margin:22px auto 16px;display:flex;flex-direction:column;align-items:center;gap:6px}.bt-small-game-winner strong{font-size:1.2rem}.bt-small-game-winner>span:last-child{color:#b494f8;font-weight:900}.bt-final-board{padding:8px;border-radius:14px;background:#19153a;border:1px solid rgba(255,255,255,.06)}.bt-final-head,.bt-final-row{display:grid;grid-template-columns:34px minmax(0,1.4fr) .7fr .85fr .85fr;gap:8px;align-items:center}.bt-final-head{padding:5px 8px;color:#aaa4c2;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em}.bt-final-row{padding:8px;margin-top:5px;border-radius:10px;background:#27204f}.bt-final-player{display:flex;align-items:center;gap:8px;min-width:0;text-align:left}.bt-final-player span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt-fun-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.bt-fun-facts.count-1{grid-template-columns:minmax(0,1fr);max-width:480px;margin-left:auto;margin-right:auto}.bt-fun-facts.count-2{grid-template-columns:repeat(2,1fr)}.bt-fun-fact{position:relative;overflow:hidden;padding:11px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(255,124,44,.18),rgba(123,29,175,.16));border:1px solid rgba(255,255,255,.08);text-align:left}.bt-fun-fact>span{display:block;font-size:1.25rem;margin-bottom:4px}.bt-fun-fact p{margin:0;color:#efeaf8;line-height:1.4}.bt-quit-game{margin-top:15px;padding-left:28px;padding-right:28px}
@media(max-width:980px){.bt-config-shell{grid-template-columns:1fr}.bt-config-lobby{min-height:300px}.bt-game-scoreboard{position:relative;right:auto;top:auto;transform:none;width:min(520px,calc(100% - 30px));margin:0 auto 24px}.bt-game-center{min-height:auto;padding:55px 0 25px}}@media(max-width:680px){.bt-config-top-controls,.bt-mode-grid{grid-template-columns:1fr}.bt-config-heading{align-items:flex-start;flex-direction:column}.bt-final-head,.bt-final-row{grid-template-columns:28px 1.3fr .65fr .75fr}.bt-final-head>*:last-child,.bt-final-row>*:last-child{display:none}.bt-fun-facts,.bt-fun-facts.count-2{grid-template-columns:1fr}.bt-podium{gap:5px}.bt-podium-card{width:32%}.bt-round-score-detail{font-size:.78rem}}
'''
app_css = Path("src/App.css")
current_css = app_css.read_text(encoding="utf-8")
if "/* === Blindtest UI V5 === */" in current_css:
    raise SystemExit("UI V5 CSS already present unexpectedly")
app_css.write_text(current_css.rstrip() + "\n\n" + css, encoding="utf-8")


# Assertions.
assert 'const [bonusCompositeur, setBonusCompositeur] = useState(true);' in Path("src/ConfigPage.js").read_text(encoding="utf-8")
assert '<Waveform active={Boolean(isTimerRunning && isPlaying' in Path("src/GamePage.js").read_text(encoding="utf-8")
assert 'const hasPodium = scores.length >= 3;' in Path("src/BlindtestUI.js").read_text(encoding="utf-8")
print("UI V5 patch applied")
