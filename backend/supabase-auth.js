function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase authentication is not configured on the server.");
  return { url: url.replace(/\/$/, ""), key };
}

async function request(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(url + path, {
    ...options,
    headers: { apikey: key, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  return { response, data };
}

async function login(email, password) {
  return request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

async function signup(email, password, name) {
  return request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { name } })
  });
}

async function user(token) {
  return request("/auth/v1/user", {
    method: "GET",
    headers: { Authorization: "Bearer " + token, apikey: config().key }
  });
}

module.exports = { login, signup, user };
