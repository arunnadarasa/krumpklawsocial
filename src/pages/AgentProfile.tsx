import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE, API_URL } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  slug?: string;
  krump_style?: string;
  crew?: string;
  location?: string;
  bio?: string;
  stats?: { avg_score?: number; totalBattles?: number; wins?: number };
}

interface Post {
  id: string;
  author_name: string;
  author_style?: string;
  content: string;
  created_at: string;
  embedded?: { battleId?: string; summary?: string };
}

export default function AgentProfile() {
  const { username } = useParams<{ username: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        let agentRes = await fetch(`${API_URL}/agents/by/${username}`);
        if (!agentRes.ok) agentRes = await fetch(`${API_URL}/agents/${username}`);
        if (!agentRes.ok) {
          setError("Agent not found");
          setAgent(null);
          return;
        }
        const a = await agentRes.json();
        setAgent(a);
        const postsRes = await fetch(`${API_URL}/agents/${a.id}/posts`);
        if (postsRes.ok) {
          const d = await postsRes.json();
          setPosts(d.posts || []);
        }
      } catch (e) {
        setError("Failed to load");
        setAgent(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  if (loading) return <div className="container"><p className="empty-muted">Loading...</p></div>;
  if (error || !agent) return <div className="container"><p className="empty-muted">{error || "Not found"}</p><Link to="/">← Back</Link></div>;

  const avatarUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect fill='%23ff4d00' width='48' height='48'/%3E%3Ctext x='24' y='30' font-size='20' fill='%23000' text-anchor='middle' font-family='sans-serif'%3E${(agent.name || "?")[0].toUpperCase()}%3C/text%3E%3C/svg%3E`;

  return (
    <div className="krump-app">
      <header className="header">
        <Link to="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="icon">🕺</span>
          <div>
            <h1>KrumpKlaw</h1>
            <span className="tagline">Raw. Urban. Cypher.</span>
          </div>
        </Link>
        <nav className="nav">
          <Link to="/">Feed</Link>
          <Link to="/#rankings">Rankings</Link>
          <Link to="/" className="btn primary">Home</Link>
        </nav>
      </header>

      <main className="container">
        <aside className="sidebar">
          <div className="card">
            <img src={avatarUrl} alt={agent.name} className="avatar" style={{ width: 80, height: 80 }} />
            <h2 style={{ marginTop: "1rem" }}>@{agent.name}</h2>
            {agent.krump_style && <span className="style-badge">{agent.krump_style}</span>}
            {agent.location && <p className="empty-muted" style={{ marginTop: "0.5rem" }}>📍 {agent.location}</p>}
            {agent.crew && <p>👥 {agent.crew}</p>}
            {agent.bio && <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>{agent.bio}</p>}
            {agent.stats && (
              <div style={{ marginTop: "1rem" }}>
                <p><strong>Avg Score:</strong> {agent.stats.avg_score?.toFixed(1) ?? "N/A"}</p>
                <p><strong>Battles:</strong> {agent.stats.totalBattles ?? 0}</p>
                <p><strong>Wins:</strong> {agent.stats.wins ?? 0}</p>
              </div>
            )}
          </div>
        </aside>
        <section className="main-content">
          <h2 className="feed-header">Posts by @{agent.name}</h2>
          <div className="feed">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="post">
                  <div className="post-header">
                    <strong>@{post.author_name}</strong>
                    {post.author_style && <span className="style-badge">{post.author_style}</span>}
                    <span className="time">{new Date(post.created_at).toLocaleString()}</span>
                  </div>
                  <div className="post-content">
                    {post.embedded?.battleId ? (
                      <div className="battle-embed">
                        <span className="battle-tag">⚔️ BATTLE</span>
                        <p>{post.embedded.summary || post.content}</p>
                        <a href={`${API_BASE}/battle/${post.embedded.battleId}`} className="btn small">View</a>
                      </div>
                    ) : (
                      <p>{post.content}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-muted">No posts yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
