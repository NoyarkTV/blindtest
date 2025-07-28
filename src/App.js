import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import GamePage from "./GamePage";
import GamePageEclair from "./GamePageEclair";
import GamePageDiffusion from "./GamePageDiffusion";
import GamePageDiffuseur from "./GamePageDiffuseur";
import ConfigPage from "./ConfigPage";
import RoomPage from "./RoomPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/config/:id" element={<ConfigPage />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/game-eclair/:id" element={<GamePageEclair />} />
        <Route path="/game-diffusion/:id" element={<GamePageDiffusion />} />
        <Route path="/diffuseur/:id" element={<GamePageDiffuseur />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
