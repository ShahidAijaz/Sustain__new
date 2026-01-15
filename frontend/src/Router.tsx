import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Verify from "./pages/verify";
import App from "./App";

export default function Router() {
  const token = localStorage.getItem("token");

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<Verify />} />

      {/* PROTECTED ROOT */}
      <Route
        path="/*"
        element={token ? <App /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
