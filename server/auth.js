const crypto = require("node:crypto");
const { supabase } = require("./supabase");

const SESSION_COOKIE = "revizely_session";

function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key]) => key)
      .map(([key, ...value]) => [
        key,
        decodeURIComponent(value.join("="))
      ])
  );
}

async function getSessionUser(request) {
  const token = parseCookies(request)[SESSION_COOKIE];

  if (!token) return null;

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) return null;

    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Student",
      email: user.email,
      createdAt: user.created_at
    };
  } catch {
    return null;
  }
}

function createSession(user, response, session) {
  if (!session?.access_token) return;

  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(session.access_token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
  );
}

function clearSession(request, response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

module.exports = {
  clearSession,
  createSession,
  getSessionUser,
  normaliseEmail,
  publicUser
};
