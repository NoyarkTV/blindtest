import { useEffect, useRef } from "react";

function SpotifyPlayer({ token, onReady, onError }) {
  const playerRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const reportError = (error) => {
      if (typeof onErrorRef.current === "function") onErrorRef.current(error);
      else console.error("❌ Spotify Player :", error);
    };

    const initializePlayer = () => {
      if (cancelled || !window.Spotify || playerRef.current) return;

      const player = new window.Spotify.Player({
        name: "Blindtest Player",
        getOAuthToken: cb => cb(token),
        volume: 0.5
      });

      player.addListener("ready", ({ device_id }) => {
        if (cancelled) return;
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
            setTimeout(() => {
              if (!cancelled && typeof onReadyRef.current === "function") onReadyRef.current(device_id);
            }, 1000);
          })
          .catch(reportError);
      });

      player.addListener("initialization_error", ({ message }) => reportError(message));
      player.addListener("authentication_error", ({ message }) => reportError(message));
      player.addListener("account_error", ({ message }) => reportError(message));
      player.addListener("playback_error", ({ message }) => reportError(message));

      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
      if (!document.getElementById("spotify-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (window.onSpotifyWebPlaybackSDKReady === initializePlayer) {
        delete window.onSpotifyWebPlaybackSDKReady;
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [token]);

  return null;
}

export default SpotifyPlayer;
