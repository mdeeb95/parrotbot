export type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
  email: string;
  profile_image_url: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getRedirectUri(): string {
  return `${requireEnv("APP_URL")}/api/auth/callback/twitch`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("TWITCH_CLIENT_ID"),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "user:read:email",
    state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: requireEnv("TWITCH_CLIENT_ID"),
    client_secret: requireEnv("TWITCH_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Twitch token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Twitch token response missing access_token");
  return data.access_token;
}

export async function fetchTwitchUser(accessToken: string): Promise<TwitchUser> {
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": requireEnv("TWITCH_CLIENT_ID"),
    },
  });
  if (!res.ok) {
    throw new Error(`Twitch user fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: TwitchUser[] };
  const user = data.data?.[0];
  if (!user) throw new Error("Twitch user response had no user");
  return user;
}
