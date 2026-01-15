export function bootstrapAuth() {
  const token = localStorage.getItem("token");
  const path = window.location.pathname;

  // ✅ already logged in
  if (token) return;

  // ✅ allow public pages
  if (path === "/login" || path === "/verify") return;

  // ❌ block everything else
  window.location.replace("/login");
}
