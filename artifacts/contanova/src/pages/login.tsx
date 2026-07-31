import { useState } from "react";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err: any) {
      const messages: Record<string, string> = {
        "auth/user-not-found": "Usuario no encontrado.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "auth/invalid-email": "Correo inválido.",
        "auth/email-already-in-use": "El correo ya está en uso.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/invalid-credential": "Credenciales inválidas.",
        "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
      };
      setError(messages[err.code] || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "20px",
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        overflow: "hidden", pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", width: "600px", height: "600px",
          borderRadius: "50%", top: "-200px", left: "-200px",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          animation: "pulse 8s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: "400px", height: "400px",
          borderRadius: "50%", bottom: "-100px", right: "-100px",
          background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          animation: "pulse 6s ease-in-out infinite reverse",
        }} />
      </div>

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: "420px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px", borderRadius: "16px",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            marginBottom: "16px", fontSize: "28px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
          }}>
            📊
          </div>
          <h1 style={{
            fontSize: "28px", fontWeight: "800", color: "#fff",
            margin: "0 0 4px 0", letterSpacing: "-0.5px",
          }}>ContaNova ERP</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: 0 }}>
            Sistema de Gestión Empresarial
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "32px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex", marginBottom: "24px",
            background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "4px",
          }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px 16px", borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "14px", fontWeight: "600",
                transition: "all 0.2s ease",
                background: mode === m ? "rgba(99,102,241,0.8)" : "transparent",
                color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
              }}>
                {m === "login" ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                Correo Electrónico
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="correo@empresa.com"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.08)", color: "#fff",
                  fontSize: "14px", outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.8)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.08)", color: "#fff",
                  fontSize: "14px", outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.8)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
                color: "#fca5a5", fontSize: "14px",
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "#fff", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "⏳ Procesando..." : mode === "login" ? "🚀 Iniciar Sesión" : "✨ Crear Cuenta"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "20px" }}>
          © 2026 ContaNova ERP · Todos los derechos reservados
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
