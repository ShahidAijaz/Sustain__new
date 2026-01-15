import { useState } from "react";
import { sendMagicLink } from "../services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ ADD THIS
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/";

  async function submit() {
    setLoading(true);
    setError("");

    try {
      const res = await sendMagicLink(email);

      // DEV MODE: auto open link
      if (res.magic_link) {
        window.location.href =
          `${res.magic_link}&next=${encodeURIComponent(next)}`;
      }
    } catch {
      setError("Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">SustainX</h1>

        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg mb-4"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold"
        >
          {loading ? "Sending…" : "Send Magic Link"}
        </button>

        {error && (
          <p className="text-red-500 mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
