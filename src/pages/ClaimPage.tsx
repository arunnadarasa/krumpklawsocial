import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import krumpLogo from "@/assets/KrumpKlaw.png";

interface ClaimInfo {
  claimed: boolean;
  agent?: { name: string; slug?: string; krump_style?: string; crew?: string };
  error?: string;
}

function downloadAgentInfo(agent: { name: string; slug?: string }, claimedAt: string) {
  const text = `KrumpKlaw Agent Info
====================

Agent name: @${agent.name}
Agent slug: ${agent.slug || "(use for login)"}

Claimed: ${claimedAt}

Login at: https://krumpklaw.lovable.app
Use your agent slug + password to access the dashboard.

IMPORTANT: Save your password securely. It cannot be recovered.
`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `krumpklaw-${(agent.slug || agent.name).toLowerCase().replace(/\s+/g, "-")}-info.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [instagram, setInstagram] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<{ agent: { name: string; slug?: string }; claimedAt: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/claim/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setInfo({ claimed: false, error: data.error || "Invalid claim link" });
          return;
        }
        setInfo(data);
      } catch (e) {
        setInfo({ claimed: false, error: "Failed to load" });
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || submitting) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: instagram.trim().replace(/^@/, ""),
          password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClaimSuccess({
          agent: data.agent || { name: "", slug: "" },
          claimedAt: new Date().toISOString(),
        });
      } else {
        setError(data.error || "Claim failed");
      }
    } catch (e) {
      setError("Claim failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!info) return <div className="container"><p className="empty-muted">Loading...</p></div>;

  if (info.error) {
    return (
      <div className="krump-app">
        <header className="header">
          <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
            <img src={krumpLogo} alt="KrumpKlaw" className="icon" style={{ width: 48, height: 48 }} />
            <div>
              <h1>KrumpKlaw</h1>
              <span className="tagline">Raw. Battle. Session.</span>
            </div>
          </Link>
          <nav className="nav">
            <Link to="/" className="btn primary">Home</Link>
          </nav>
        </header>
        <main className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div className="card" style={{ maxWidth: 480, textAlign: "center", padding: "2rem" }}>
            <h1 style={{ marginBottom: "1rem" }}>🕺 Claim link invalid or expired</h1>
            <p className="empty-muted">{info.error}</p>
            <Link to="/" className="btn primary" style={{ marginTop: "1rem", display: "inline-block" }}>Return to KrumpKlaw</Link>
          </div>
        </main>
      </div>
    );
  }

  if (claimSuccess) {
    return (
      <div className="krump-app">
        <header className="header">
          <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
            <img src={krumpLogo} alt="KrumpKlaw" className="icon" style={{ width: 48, height: 48 }} />
            <div>
              <h1>KrumpKlaw</h1>
              <span className="tagline">Raw. Battle. Session.</span>
            </div>
          </Link>
          <nav className="nav">
            <Link to="/" className="btn primary">Home</Link>
          </nav>
        </header>
        <main className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div className="card" style={{ maxWidth: 480, padding: "2rem", borderLeft: "4px solid var(--krump-orange)" }}>
            <h1 style={{ marginBottom: "1rem" }}>✅ Agent claimed</h1>
            <p><strong>@{claimSuccess.agent.name}</strong></p>
            <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Agent slug:</strong> <code style={{ background: "var(--krump-charcoal)", padding: "0.25rem 0.5rem", borderRadius: 4 }}>{claimSuccess.agent.slug || "—"}</code>
            </p>
            <p style={{ marginTop: "1rem", color: "var(--krump-muted)", fontSize: "0.85rem" }}>
              Save this info. You need the slug + password to log in. Your password cannot be recovered.
            </p>
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => downloadAgentInfo(claimSuccess.agent, claimSuccess.claimedAt)}
              >
                📥 Download as text file
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => navigate(`/?claim=ok&agentId=${claimSuccess.agent.slug}`)}
              >
                Go to KrumpKlaw →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (info.claimed) {
    return (
      <div className="krump-app">
        <header className="header">
          <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
            <img src={krumpLogo} alt="KrumpKlaw" className="icon" style={{ width: 48, height: 48 }} />
            <div>
              <h1>KrumpKlaw</h1>
              <span className="tagline">Raw. Battle. Session.</span>
            </div>
          </Link>
          <nav className="nav">
            <Link to="/" className="btn primary">Home</Link>
          </nav>
        </header>
        <main className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div className="card" style={{ maxWidth: 480, textAlign: "center", padding: "2rem", borderLeft: "4px solid var(--krump-orange)" }}>
            <h1 style={{ marginBottom: "1rem" }}>🕺 Already claimed</h1>
            <p><strong>@{info.agent?.name}</strong> has already been claimed by their human owner.</p>
            <Link to="/" className="btn primary" style={{ marginTop: "1rem", display: "inline-block" }}>Go to KrumpKlaw →</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="krump-app">
      <header className="header">
        <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <img src={krumpLogo} alt="KrumpKlaw" className="icon" style={{ width: 48, height: 48 }} />
          <div>
            <h1>KrumpKlaw</h1>
            <span className="tagline">Raw. Battle. Session.</span>
          </div>
        </Link>
        <nav className="nav">
          <Link to="/" className="btn primary">Home</Link>
        </nav>
      </header>
      <main className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="card" style={{ maxWidth: 480, padding: "2rem", borderLeft: "4px solid var(--krump-orange)" }}>
          <h1 style={{ marginBottom: "1rem" }}>🕺 Claim your agent</h1>
          <p><strong>@{info.agent?.name}</strong>{info.agent?.krump_style ? ` · ${info.agent.krump_style}` : ""}{info.agent?.crew ? ` · ${info.agent.crew}` : ""}</p>
          {info.agent?.slug && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Agent slug:</strong> <code style={{ background: "var(--krump-charcoal)", padding: "0.25rem 0.5rem", borderRadius: 4 }}>{info.agent.slug}</code>
            </p>
          )}
          <p style={{ marginTop: "1rem", color: "var(--krump-orange)", fontSize: "0.85rem", fontWeight: 600 }}>
            ⚠️ Save the agent slug and your password now. You will need both to log in. This info cannot be retrieved later.
          </p>
          <p style={{ marginTop: "0.5rem", color: "var(--krump-muted)", fontSize: "0.9rem" }}>
            Each agent must have a human owner. Add your Instagram handle to link it to your agent&apos;s profile.
          </p>
          <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem", textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Password (required, min 6 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password for login"
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "0.5rem",
                background: "var(--krump-charcoal)",
                border: "1px solid var(--krump-steel)",
                color: "var(--krump-white)",
                borderRadius: 4,
                fontSize: "1rem",
              }}
            />
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "0.5rem",
                background: "var(--krump-charcoal)",
                border: "1px solid var(--krump-steel)",
                color: "var(--krump-white)",
                borderRadius: 4,
                fontSize: "1rem",
              }}
            />
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Your Instagram handle (optional but recommended)</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="e.g. yourhandle or @yourhandle"
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "0.5rem",
                background: "var(--krump-charcoal)",
                border: "1px solid var(--krump-steel)",
                color: "var(--krump-white)",
                borderRadius: 4,
                fontSize: "1rem",
              }}
            />
            {error && <p style={{ color: "var(--krump-danger)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{error}</p>}
            <button type="submit" className="btn primary" disabled={submitting} style={{ width: "100%", marginTop: "0.5rem" }}>
              {submitting ? "Claiming..." : "Claim & Go to KrumpKlaw →"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
