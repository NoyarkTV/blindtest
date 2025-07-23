export async function refreshToken() {
  try {
    const res = await fetch("https://blindtest-69h7.onrender.com/get-token");
    if (!res.ok) throw new Error("Failed to refresh token");
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("spotify_token", data.access_token);
      return data.access_token;
    }
  } catch (err) {
    console.error("\u274c Error refreshing Spotify token:", err);
  }
  return null;
}

export async function spotifyFetch(url, options = {}, onTokenRefreshed) {
  let token = localStorage.getItem("spotify_token") || "";
  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      if (typeof onTokenRefreshed === "function") {
        onTokenRefreshed(newToken);
      }
      res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
  }

  return res;
}