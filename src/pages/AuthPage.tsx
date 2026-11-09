import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function AuthPage() {
  const { signUp, signIn, resetPassword } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        await signUp(name.trim(), email.trim(), password);
        setMessage(
          "Account created! Check your email to verify your account before logging in."
        );
        setMode("login");
      } else if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await resetPassword(email.trim());
        setMessage("Password reset link sent. Check your email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">M</div>
          <h1>MERIDIAN CAPITAL</h1>
          <p>Intelligent Portfolio Analytics</p>
        </div>

        <h2>
          {mode === "signup"
            ? "Create your account"
            : mode === "forgot"
              ? "Reset your password"
              : "Welcome back"}
        </h2>

        <p className="auth-subtitle">
          {mode === "signup"
            ? "Create an account to access your portfolio."
            : mode === "forgot"
              ? "Enter your email to receive a reset link."
              : "Sign in to access your investment dashboard."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          {mode !== "forgot" && (
            <label>
              Password
              <div className="auth-password">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          )}

          {mode === "signup" && (
            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "signup"
                ? "Create Account"
                : mode === "forgot"
                  ? "Send Reset Link"
                  : "Sign In"}
          </button>
        </form>

        {mode === "login" && (
          <button className="auth-link" onClick={() => setMode("forgot")}>
            Forgot password?
          </button>
        )}

        <div className="auth-footer">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }}>
                Sign In
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}