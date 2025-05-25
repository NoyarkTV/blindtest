import { useEffect, useRef } from "react";

let sdkInitialized = false; // ← clé : éviter de créer plusieurs players

function SpotifyPlayer({ token, onReady, onError }) {
  const playerRef = useRef(null);

  useEffect(() => {
    if (!token || sdkInitialized) return;

    const waitForSpotify = () => {
      if (!window.Spotify) {
        setTimeout(waitForSpotify, 100);
        return;
      }

      const player = new window.Spotify.Player({
        name: "Blindtest Player",
        getOAuthToken: cb => cb(token),
        volume: 0.5
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("✅ SDK prêt avec device_id :", device_id);
        onReady(device_id);
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("Erreur init :", message);
        onError(message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Erreur auth :", message);
        onError(message);
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Erreur compte :", message);
        onError(message);
      });

      player.addListener("playback_error", ({ message }) => {
        console.error("Erreur lecture :", message);
        onError(message);
      });

      player.connect();
      playerRef.current = player;
      sdkInitialized = true;
    };

    waitForSpotify();
  }, [token, onReady, onError]);

  return null;
}

export default SpotifyPlayer;
