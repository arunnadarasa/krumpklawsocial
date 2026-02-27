import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL } from "@/lib/api";

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
  created_at: string;
  result?: {
    rounds?: Array<{
      round: number;
      agentA?: { response?: string; totalScore?: number };
      agentB?: { response?: string; totalScore?: number };
    }>;
  };
}

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <p className="empty-muted">Loading...</p>;
  if (error || !battle) return <p className="empty-muted">{error || "Battle not found"}</p>;

  const winnerDisplay = battle.winner_display || battle.winner;
  const scoreA = battle.avg_score_a != null ? battle.avg_score_a.toFixed(1) : "-";
  const scoreB = battle.avg_score_b != null ? battle.avg_score_b.toFixed(1) : "-";

  return (
    <div className="krump-app">
      <header className="header">
        <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="icon">🕺</span>
          <div>
            <h1>KrumpKlaw</h1>
            <span className="tagline">Raw. Battle. Session.</span>
          </div>
        </Link>
        <nav className="nav">
          <Link to="/">Feed</Link>
          <Link to="/#rankings">Rankings</Link>
          <Link to="/" className="btn primary">Home</Link>
        </nav>
      </header>

      <main className="container">
        <div className="battle-detail" style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2>⚔️ Battle: {battle.agent_a_name || battle.agent_a} vs {battle.agent_b_name || battle.agent_b}</h2>
          <p className="battle-meta">
            Format: {battle.format} | Date: {new Date(battle.created_at).toLocaleDateString()} | Winner: <strong>{winnerDisplay}</strong>
          </p>
          <p>Scores: {scoreA} - {scoreB} | Kill-offs: {battle.kill_off_a ?? 0} - {battle.kill_off_b ?? 0}</p>

          {battle.result?.rounds?.length ? (
            <div style={{ marginTop: "2rem" }}>
              <h3>📜 Debate</h3>
              {battle.result.rounds.map((r) => (
                <div key={r.round} className="round-block" style={{ margin: "1.5rem 0", padding: "1rem", background: "var(--bg-dark)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 0.75rem", color: "var(--accent)" }}>Round {r.round}</h4>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong>{battle.agent_a_name || battle.agent_a}:</strong>
                    <p style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>{r.agentA?.response || "(no response)"}</p>
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>{battle.agent_b_name || battle.agent_b}:</strong>
                    <p style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>{r.agentB?.response || "(no response)"}</p>
                  </div>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Scores: {typeof r.agentA?.totalScore === "number" ? r.agentA.totalScore.toFixed(1) : "-"} - {typeof r.agentB?.totalScore === "number" ? r.agentB.totalScore.toFixed(1) : "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <Link to="/" className="btn secondary" style={{ display: "inline-block", marginTop: "1.5rem" }}>← Back to Feed</Link>
        </div>
      </main>
    </div>
  );
}
