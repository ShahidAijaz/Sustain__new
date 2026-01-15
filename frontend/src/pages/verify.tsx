import { useEffect, useRef } from "react";
import { verifyMagicToken } from "../services/auth";

export default function Verify() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    async function run() {
      try {
        const res = await verifyMagicToken(token);

        // 🔐 MUST STORE BOTH
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));

        // ✅ GO TO FLOORPLAN
        window.location.replace("/");
      } catch (err) {
        console.error("Verify failed", err);
        localStorage.clear();
        window.location.replace("/login");
      }
    }

    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg text-slate-600">Signing you in…</p>
    </div>
  );
}
