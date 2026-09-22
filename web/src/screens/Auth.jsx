import { useState } from "react";
import logo from "../logo.png";
import { isDemo, login, register } from "../api.js";

const DEMO_HINT =
  "Demo logins: 72170000 / demo1234 (sender), 72111111 / runner1234 (runner), 72170001 / admin1234 (admin).";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cleanPhone = phone.replace(/[^\d]/g, "").slice(0, 8);

  const validate = () => {
    if (mode === "signup" && name.trim().length < 2) return "Please enter your name.";
    if (cleanPhone.length < 8) return "Enter your 8 digit phone number.";
    if (password.length < 6) return "Password needs at least 6 characters.";
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "login"
          ? await login(cleanPhone, password)
          : await register(name.trim(), cleanPhone, password, role);
      try {
        localStorage.setItem("sr_token", result.token);
        localStorage.setItem("sr_user", JSON.stringify(result.user));
      } catch {
        // Storage unavailable. Session still works in memory.
      }
      onAuth(result.user);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen auth-wrap">
      <div className="auth-card">
        <img className="auth-logo" src={logo} alt="SwiftRun" />
        <h2 style={{ marginBottom: 4 }}>SwiftRun</h2>
        <p className="sub" style={{ marginTop: 0 }}>
          {mode === "login" ? "Welcome back. Log in to continue." : "Create your account. It takes a minute."}
        </p>

        <div className="seg">
          <button className={mode === "login" ? "seg-btn active" : "seg-btn"} onClick={() => { setMode("login"); setError(""); }}>
            Log in
          </button>
          <button className={mode === "signup" ? "seg-btn active" : "seg-btn"} onClick={() => { setMode("signup"); setError(""); }}>
            Sign up
          </button>
        </div>

        {mode === "signup" && (
          <>
            <div className="field">
              <label>Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Thato M."
                maxLength={40}
              />
            </div>
            <div className="field">
              <label>I am signing up as</label>
              <div className="role-cards">
                <button
                  type="button"
                  className={role === "customer" ? "role-card sel" : "role-card"}
                  onClick={() => setRole("customer")}
                >
                  <div className="rc-icon">🧾</div>
                  <div className="rc-t">Sender</div>
                  <div className="rc-s">I need things moved</div>
                </button>
                <button
                  type="button"
                  className={role === "runner" ? "role-card sel" : "role-card"}
                  onClick={() => setRole("runner")}
                >
                  <div className="rc-icon">🛵</div>
                  <div className="rc-t">Runner</div>
                  <div className="rc-s">I do the moving</div>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label>Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
            placeholder="e.g. 72170000"
            inputMode="numeric"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          />
        </div>

        {error && <div className="err">{error}</div>}

        <button className="btn primary" onClick={submit} disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        {isDemo() && <div className="demo-hint">{DEMO_HINT}</div>}
      </div>
    </div>
  );
}
