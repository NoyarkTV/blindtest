import { useEffect, useRef } from "react";

let sdkInitialized = false;

function SpotifyPlayer({ token, onReady, onError }) {
  const playerRef = useRef(null);

  useEffect(() => {
    if (!token || sdkInitialized) return;

    if (!document.getElementById("spotify-sdk")) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    // ✅ Fonction exigée par Spotify
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Blindtest Player",
        getOAuthToken: cb => cb(token),
        volume: 0.5
      });

      player.addListener("ready", ({ device_id }) => {
  console.log("✅ SDK prêt avec device_id :", device_id);

  // ⬇️ Activation obligatoire du lecteur web côté compte utilisateur
  fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      device_ids: [device_id],
      play: false
    })
  })
  .then(() => {
    console.log("📡 Transfert vers Web Playback effectué");
    onReady(device_id);
  })
  .catch(err => {
    console.error("❌ Erreur transfert lecteur :", err);
    onError(err);
  });
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
  }, [token, onReady, onError]);

  return null;
}

export default SpotifyPlayer;