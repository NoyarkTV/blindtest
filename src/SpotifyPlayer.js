import { useEffect, useRef } from "react";

let sdkInitialized = false;

function SpotifyPlayer({ token, onReady, onError }) {
  const playerRef = useRef(null);

  useEffect(() => {
    if (!token || sdkInitialized) return;

    // ✅ 1. DÉFINIR la fonction en amont
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Blindtest Player",
        getOAuthToken: cb => cb(token),
        volume: 0.5
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("✅ SDK prêt avec device_id :", device_id);

        fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ device_ids: [device_id], play: false })
        })
          .then(() => {
            console.log("📡 Transfert vers Web Playback effectué");
            setTimeout(() => onReady(device_id), 1000);
          })
          .catch(err => {
            console.error("❌ Erreur transfert lecteur :", err);
            onError(err);
          });
      });

      player.addListener("initialization_error", ({ message }) => onError(message));
      player.addListener("authentication_error", ({ message }) => onError(message));
      player.addListener("account_error", ({ message }) => onError(message));
      player.addListener("playback_error", ({ message }) => onError(message));

      player.connect();
      playerRef.current = player;
      sdkInitialized = true;
    };

    // ✅ 2. CHARGER le script SEULEMENT APRÈS
    const script = document.createElement("script");
    script.id = "spotify-sdk";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      delete window.onSpotifyWebPlaybackSDKReady;
    };
  }, [token, onReady, onError]);

  return null;
}

export default SpotifyPlayer;