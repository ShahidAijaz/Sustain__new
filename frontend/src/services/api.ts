const API_URL = "http://127.0.0.1:5000";

/* ---------- generic fetch ---------- */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error("API error");
  }

  return res.json();
}

/* ---------- THIS IS WHAT App.tsx EXPECTS ---------- */
export async function runSimulationAPI(
  room: any,
  config: any
) {
  return apiFetch("/simulation/run", {
    method: "POST",
    body: JSON.stringify({
      room,
      config,
    }),
  });
}
