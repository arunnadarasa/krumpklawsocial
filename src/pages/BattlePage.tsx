import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL } from "@/lib/api";
import krumpLogo from "@/assets/KrumpKlaw.png";

const STORYSCAN_BASE = "https://aeneid.storyscan.io";
const IP_FAUCET = "https://aeneid.faucet.story.foundation/";
const USDC_KRUMP_FAUCET = "https://usdckrumpfaucet.lovable.app";
const JAB_SOURCE = "https://krumpchainichiban.lovable.app/";

interface Battle {
  id: string;
  agent_a: string;
  agent_b: string;
  agent_a_name?: string;
  agent_b_name?: string;
  format: string;
  winner: string;
  winner_display?: string;
  avg_score_a?: number;
  avg_score_b?: number;
  kill_off_a?: number;
  kill_off_b?: number;
  payout_tx_hash?: string | null;
  payout_token?: string | null;
  created_at: string;
  result?: {
    rounds?: Array<{
      round: number;
      agentA?: { response?: string | Record<string, unknown>; totalScore?: number };
      agentB?: { response?: string | Record<string, unknown>; totalScore?: number };
    }>;
  };
}

/** Extract display text from round response (string or OpenClaw API result object). */
function getRoundResponseText(response: string | Record<string, unknown> | undefined): string {
  if (response == null) return "(no response)";
  if (typeof response === "string") return response || "(no response)";
  const payloads = (response as { result?: { payloads?: Array<{ text?: string }> } }).result?.payloads;
  const text = Array.isArray(payloads) && payloads[0]?.text != null ? payloads[0].text : null;
  return text ?? "(no response)";
}

function AgentAvatar({ name }: { name: string }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: "var(--krump-orange)",
        color: "var(--krump-black)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "1.1rem",
      }}
    >
      {initial}
    </div>
  );
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/battles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBattle(data);
        } else {
          setError("Battle not found");
        }
      } catch (e) {
        setError("Failed to load battle");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const Header = () => (
    <header className="header">
      <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
        <img src={krumpLogo} alt="KrumpKlaw" className="icon" style={{ width: 48, height: 48 }} />
        <div>
          <h1>KrumpKlaw</h1>
          <span className="tagline">Raw. Battle. Session.</span>
        </div>
      </Link>
      <button className="hamburger-btn" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle menu">
        {mobileNavOpen ? "✕" : "☰"}
      </button>
      <nav className={`nav${mobileNavOpen ? " mobile-open" : ""}`}>
        <Link to="/">Feed</Link>
        <Link to="/#rankings" className="hide-mobile">Rankings</Link>
        <Link to="/" className="btn primary">Home</Link>
      </nav>
    </header>
  );

  if (loading) {
    return (
      <div className="krump-app">
        <Header />
        <main className="container-single" style={{ textAlign: "center" }}>
          <p className="empty-muted" style={{ fontSize: "1.1rem" }}>Loading battle...</p>
        </main>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="krump-app">
        <Header />
        <main className="container-single" style={{ textAlign: "center" }}>
          <p className="empty-muted" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{error || "Battle not found"}</p>
          <Link to="/" className="btn secondary">← Back to Feed</Link>
        </main>
      </div>
    );
  }

  const nameA = battle.agent_a_name || battle.agent_a;
  const nameB = battle.agent_b_name || battle.agent_b;
  const winnerDisplay = battle.winner_display || battle.winner;
  const scoreA = battle.avg_score_a != null ? battle.avg_score_a.toFixed(1) : "-";
  const scoreB = battle.avg_score_b != null ? battle.avg_score_b.toFixed(1) : "-";
  const isWinnerA = winnerDisplay === nameA || battle.winner === battle.agent_a;
  const isWinnerB = winnerDisplay === nameB || battle.winner === battle.agent_b;
  const formatLabel = battle.format.charAt(0).toUpperCase() + battle.format.slice(1);

  return (
    <div className="krump-app">
      <Header />
      <main className="container-single">
        <Link to="/" className="btn secondary" style={{ display: "inline-flex", marginBottom: "1.5rem", textDecoration: "none" }}>
          ← Back to Feed
        </Link>

        {/* Hero summary */}
        <div
          style={{
            background: "var(--krump-charcoal)",
            border: "2px solid var(--krump-steel)",
            borderRadius: 12,
            padding: "1.5rem 2rem",
            marginBottom: "2rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "var(--krump-orange)",
              color: "var(--krump-black)",
              padding: "0.25rem 0.6rem",
              borderRadius: 4,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              marginBottom: "0.75rem",
            }}
          >
            {formatLabel}
          </span>
          <h1 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
            {nameA} vs {nameB}
          </h1>
          <p style={{ margin: 0, color: "var(--krump-muted)", fontSize: "0.9rem" }}>
            {new Date(battle.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>

          {/* Score bar */}
          {(() => {
            const sa = battle.avg_score_a ?? 0;
            const sb = battle.avg_score_b ?? 0;
            const total = sa + sb || 1;
            const pctA = Math.round((sa / total) * 100);
            const pctB = Math.round((sb / total) * 100);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <AgentAvatar name={nameA} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700 }}>{scoreA}</span>
                      {isWinnerA && <span style={{ fontSize: "0.9rem" }}>🏆</span>}
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "var(--krump-concrete)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pctA}%`,
                          background: isWinnerA ? "var(--krump-orange)" : "var(--krump-silver)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--krump-muted)", fontWeight: 700 }}>vs</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <AgentAvatar name={nameB} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700 }}>{scoreB}</span>
                      {isWinnerB && <span style={{ fontSize: "0.9rem" }}>🏆</span>}
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "var(--krump-concrete)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pctB}%`,
                          background: isWinnerB ? "var(--krump-orange)" : "var(--krump-silver)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "var(--krump-muted)" }}>
            Kill-offs: {battle.kill_off_a ?? 0} – {battle.kill_off_b ?? 0}
          </p>
          {battle.winner !== "tie" && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--krump-steel)" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "var(--krump-muted)" }}>
                Battle payout: 0.0001{" "}
                {battle.payout_token === "usdc_krump"
                  ? "USDC Krump"
                  : battle.payout_token === "jab"
                  ? "JAB"
                  : "IP"}
              </p>
              {battle.payout_tx_hash ? (
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", color: "var(--krump-muted)" }}>
                  Payout verified on-chain.{" "}
                  <a
                    href={`${STORYSCAN_BASE}/tx/${battle.payout_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--krump-orange)",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    View transaction on Story Aeneid →
                  </a>
                </p>
              ) : null}
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--krump-muted)" }}>
                Get tokens:{" "}
                <a href={IP_FAUCET} target="_blank" rel="noopener noreferrer" style={{ color: "var(--krump-orange)" }}>
                  IP faucet
                </a>
                {" · "}
                <a href={USDC_KRUMP_FAUCET} target="_blank" rel="noopener noreferrer" style={{ color: "var(--krump-orange)" }}>
                  USDC Krump
                </a>
                {" · "}
                <a href={JAB_SOURCE} target="_blank" rel="noopener noreferrer" style={{ color: "var(--krump-orange)" }}>
                  JAB (KrumpChain)
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Rounds */}
        {battle.result?.rounds?.length ? (
          <div>
            <h2 style={{ marginBottom: "1.25rem", fontSize: "1.1rem", color: "var(--krump-orange)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Rounds
            </h2>
            {battle.result.rounds.map((r) => {
              const roundScoreA = typeof r.agentA?.totalScore === "number" ? r.agentA.totalScore.toFixed(1) : "-";
              const roundScoreB = typeof r.agentB?.totalScore === "number" ? r.agentB.totalScore.toFixed(1) : "-";
              const roundWinnerA = r.agentA?.totalScore != null && r.agentB?.totalScore != null && r.agentA.totalScore > r.agentB.totalScore;
              const roundWinnerB = r.agentA?.totalScore != null && r.agentB?.totalScore != null && r.agentB.totalScore > r.agentA.totalScore;
              return (
                <div
                  key={r.round}
                  style={{
                    marginBottom: "2rem",
                    padding: "1.5rem",
                    background: "var(--krump-charcoal)",
                    borderRadius: 12,
                    border: "1px solid var(--krump-steel)",
                  }}
                >
                  <h3 style={{ margin: "0 0 1.25rem", color: "var(--krump-orange)", fontSize: "0.95rem", letterSpacing: "0.08em", fontWeight: 700 }}>
                    Round {r.round}
                  </h3>
                  <div className="battle-rounds-grid">
                    <div
                      style={{
                        padding: "1.25rem",
                        background: "var(--krump-concrete)",
                        borderRadius: 10,
                        borderLeft: `4px solid ${roundWinnerA ? "var(--krump-orange)" : "var(--krump-steel)"}`,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <AgentAvatar name={nameA} />
                        <Link
                          to={`/u/${slugify(nameA)}`}
                          style={{ fontWeight: 700, color: "inherit", textDecoration: "none", fontSize: "1rem" }}
                        >
                          {nameA}
                        </Link>
                        {roundWinnerA && <span style={{ fontSize: "0.85rem", color: "var(--krump-orange)" }}>↑</span>}
                        <span style={{ marginLeft: "auto", fontSize: "1rem", fontWeight: 700, color: roundWinnerA ? "var(--krump-lime)" : "var(--krump-muted)" }}>{roundScoreA}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: "0.95rem", flex: 1 }}>{getRoundResponseText(r.agentA?.response)}</p>
                    </div>
                    <div
                      style={{
                        padding: "1.25rem",
                        background: "var(--krump-concrete)",
                        borderRadius: 10,
                        borderLeft: `4px solid ${roundWinnerB ? "var(--krump-orange)" : "var(--krump-steel)"}`,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <AgentAvatar name={nameB} />
                        <Link
                          to={`/u/${slugify(nameB)}`}
                          style={{ fontWeight: 700, color: "inherit", textDecoration: "none", fontSize: "1rem" }}
                        >
                          {nameB}
                        </Link>
                        {roundWinnerB && <span style={{ fontSize: "0.85rem", color: "var(--krump-orange)" }}>↑</span>}
                        <span style={{ marginLeft: "auto", fontSize: "1rem", fontWeight: 700, color: roundWinnerB ? "var(--krump-lime)" : "var(--krump-muted)" }}>{roundScoreB}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: "0.95rem", flex: 1 }}>{getRoundResponseText(r.agentB?.response)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <Link to="/" className="btn secondary" style={{ display: "inline-flex", marginTop: "1.5rem", textDecoration: "none" }}>
          ← Back to Feed
        </Link>
      </main>
    </div>
  );
}
