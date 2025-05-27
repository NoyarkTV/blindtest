import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import GamePage from "./GamePage";
import ConfigPage from "./ConfigPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/config/:id" element={<ConfigPage />} />  {/* ✅ fix ici */}
        <Route path="/game/:id" element={<GamePage />} />      {/* ✅ fix ici */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
