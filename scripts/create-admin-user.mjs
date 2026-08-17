const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "3678elespinillo@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "torneo26trives";
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "Administrador";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const baseUrl = SUPABASE_URL.replace(/\/$/, "");

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await readResponse(response);

  if (!response.ok) {
    const details =
      typeof body === "string" ? body : JSON.stringify(body, null, 2);
    throw new Error(`${response.status} ${response.statusText}: ${details}`);
  }

  return body;
}

async function findUserByEmail(email) {
  const result = await supabaseRequest("/auth/v1/admin/users?page=1&per_page=100");
  const users = result?.users || [];
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

async function createAuthUser() {
  try {
    const result = await supabaseRequest("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: ADMIN_DISPLAY_NAME,
        },
      }),
    });

    return result;
  } catch (error) {
    const existingUser = await findUserByEmail(ADMIN_EMAIL);

    if (!existingUser) {
      throw error;
    }

    console.log(`User already exists: ${ADMIN_EMAIL}`);
    return existingUser;
  }
}

async function upsertAdminProfile(userId) {
  const result = await supabaseRequest("/rest/v1/profiles?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      id: userId,
      display_name: ADMIN_DISPLAY_NAME,
      role: "admin",
    }),
  });

  return Array.isArray(result) ? result[0] : result;
}

async function main() {
  const user = await createAuthUser();
  const profile = await upsertAdminProfile(user.id);

  console.log("Admin user ready.");
  console.log(`Email: ${user.email || ADMIN_EMAIL}`);
  console.log(`User id: ${user.id}`);
  console.log(`Role: ${profile?.role || "admin"}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
