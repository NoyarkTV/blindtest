import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState([]);
  const [params, setParams] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    fetch(`https://blindtest-69h7.onrender.com/game-info/${id}`)
      .then(res => res.json())
      .then(data => {
        setPlaylist(data.playlist || []);
        setParams(data.params || {});
      })
      .catch(err => {
        console.error("Erreur de récupération des infos de la partie :", err);
        navigate("/");
      });
  }, [id, navigate]);

  useEffect(() => {
    if (playlist.length > 0 && currentRound <= playlist.length) {
      const currentTrack = playlist[currentRound - 1];
      if (currentTrack && currentTrack.uri) {
        const newAudio = new Audio(`https://open.spotify.com/embed/track/${currentTrack.uri.split(":")[2]}`);
        audioRef.current = newAudio;
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);
      }
    } else if (playlist.length > 0 && currentRound > playlist.length) {
      alert("🎉 Fin de la partie !");
      navigate("/");
    }
  }, [currentRound, playlist, navigate]);

  const handleNext = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentRound(prev => prev + 1);
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (!params || playlist.length === 0) return <div>Chargement en cours...</div>;

  const currentTrack = playlist[currentRound - 1];

  return (
    <div style={{ padding: 20, color: "#fff", background: "#1e2a38", minHeight: "100vh" }}>
      <h1>Round {currentRound} / {playlist.length}</h1>
      {currentTrack && (
        <div>
          <p><strong>Oeuvre :</strong> {currentTrack.titre}</p>
          <p><strong>Compositeur :</strong> {currentTrack.compositeur}</p>
          <p><strong>Média :</strong> {currentTrack.media}</p>
          <p><strong>Catégorie :</strong> {currentTrack.categorie}</p>
          <p><strong>Année :</strong> {currentTrack.annee}</p>
          <p><strong>Réponses attendues :</strong> {(currentTrack.answers || []).join(", ")}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={handlePlay} style={buttonStyle}>▶️ Play</button>
        <button onClick={handlePause} style={buttonStyle}>⏸ Pause</button>
        <button onClick={handleNext} style={buttonStyle}>⏭ Next</button>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  background: "#f7b733",
  color: "#1e2a38",
  fontWeight: "bold",
  cursor: "pointer"
};

export default GamePage;