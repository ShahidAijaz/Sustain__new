const API = "http://127.0.0.1:5000";

export async function sendMagicLink(email: string) {
  const res = await fetch(`${API}/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Failed to send magic link");
  }

  return res.json();
}

export async function verifyMagicToken(token: string) {
  const res = await fetch(`${API}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    throw new Error("Invalid token");
  }

  return res.json();
}

/* 🔐 AUTH CHECK — SOURCE OF TRUTH */
export async function getMe() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No token");
  }

  const res = await fetch(`${API}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  return res.json();
}
