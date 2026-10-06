const crypto = require("node:crypto");
const { usersByEmail, usersById, workspaces, friendCodes, createWorkspace } = require("./store");
const supabaseAuth = require("./supabase-auth");

const SESSION_COOKIE = "revizely_session";
// Supabase auth migration in progress.
// Vercel (and any HTTPS host) should only hand the session cookie back over TLS.
const SECURE_COOKIE = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

function cookieAttributes(maxAge) {
  return `HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? "; Secure" : ""}`;
}

// Roles are granted by email allow-list so the creator and admin portals can be
// opened to specific accounts without a user-management UI.
function rolesFor(email) {
  const roles = ["student"];
  const listed = (key) =>
    String(process.env[key] || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .includes(email);
  if (listed("CREATOR_EMAILS")) roles.push("creator");
  if (listed("ADMIN_EMAILS")) roles.push("admin");
  return roles;
}

function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function passwordMatches(password, user) {
  const candidate = crypto.scryptSync(password, user.passwordSalt, 64);
  const stored = Buffer.from(user.passwordHash, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key]) => key)
      .map(([key, ...value]) => [key, decodeURIComponent(value.join("="))])
  );
}

async function getSessionUser(request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const result = await supabaseAuth.user(token);
  return result.response.ok ? ensureLocalUser(result.data) : null;
}

function createSession(user, response, accessToken) {
  if (!accessToken) throw new Error("Supabase did not return an access token.");
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(accessToken)}; ${cookieAttributes(3600)}`);
}

function clearSession(request, response) {
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieAttributes(0)}`);
}

function ensureLocalUser(profile) {
  const email = normaliseEmail(profile.email);
  let user = usersByEmail.get(email);
  if (!user) {
    let friendCode;
    do friendCode = crypto.randomBytes(3).toString("hex").toUpperCase(); while (friendCodes.has(friendCode));
    user = {
      id: profile.id || crypto.randomUUID(),
      name: String(profile.user_metadata?.name || profile.user_metadata?.full_name || "Student").trim(),
      email,
      friendCode,
      roles: rolesFor(email),
      friends: [],
      createdAt: new Date().toISOString()
    };
    usersByEmail.set(email, user);
    usersById.set(user.id, user);
    friendCodes.set(friendCode, user.id);
    workspaces.set(user.id, createWorkspace(user));
  } else {
    user.id = profile.id || user.id;
    user.name = String(profile.user_metadata?.name || user.name || "Student").trim();
    user.roles = rolesFor(email);
    usersById.set(user.id, user);
    if (!workspaces.has(user.id)) workspaces.set(user.id, createWorkspace(user));
    if (!Array.isArray(user.friends)) user.friends = [];
  }
  return user;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    friendCode: user.friendCode,
    roles: user.roles || ["student"]
  };
}

module.exports = {
  clearSession,
  rolesFor,
  createSession,
  getSessionUser,
  hashPassword,
  normaliseEmail,
  passwordMatches,
  signInWithPassword: supabaseAuth.login,
  signUpWithPassword: supabaseAuth.signup,
  ensureLocalUser,
  publicUser
};
