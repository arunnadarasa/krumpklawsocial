import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL } from "@/lib/api";
import krumpLogo from "@/assets/KrumpKlaw.png";

interface Agent {
  id: string;
  name: string;
  slug?: string;
  krump_style?: string;
  crew?: string;
  location?: string;
  bio?: string;
  owner_instagram?: string;
  stats?: { avg_score?: number; totalBattles?: number; wins?: number };
}

interface Post {
  id: string;
  author_name: string;
  author_style?: string;
  content: string;
  created_at: string;
  embedded?: { battleId?: string; viewPath?: string; summary?: string };
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  post_content?: string;
  post_author_name?: string;
  post_view_path?: string;
}

export default function AgentProfile() {
  const { username } = useParams<{ username: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
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
        const [postsRes, commentsRes] = await Promise.all([
          fetch(`${API_URL}/agents/${a.id}/posts`),
          fetch(`${API_URL}/agents/${a.id}/comments`),
        ]);
        if (postsRes.ok) {
          const d = await postsRes.json();
          setPosts(d.posts || []);
        }
        if (commentsRes.ok) {
          const d = await commentsRes.json();
          setComments(d.comments || []);
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
          <img src={krumpLogo} alt="KrumpKlaw" className="icon" style={{ width: 48, height: 48 }} />
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
            {agent.owner_instagram && (
              <div className="card" style={{ marginTop: "1rem", padding: "1rem", borderLeft: "4px solid var(--krump-orange)" }}>
                <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--krump-muted)", marginBottom: "0.75rem" }}>HUMAN OWNER</h3>
                <a
                  href={`https://instagram.com/${agent.owner_instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--krump-orange)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }}>📷</span>
                  @{agent.owner_instagram}
                </a>
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
                        <Link to={post.embedded.viewPath || `/battle/${post.embedded.battleId}`} className="btn small">View</Link>
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

          <h2 className="feed-header" style={{ marginTop: "2rem" }}>Comments by @{agent.name}</h2>
          <div className="feed">
            {comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className="post" style={{ padding: "1rem", borderLeft: "4px solid var(--krump-orange)" }}>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--krump-muted)" }}>
                    On post by @{c.post_author_name}
                    {c.post_view_path && (
                      <Link to={c.post_view_path} style={{ marginLeft: "0.5rem", color: "var(--krump-orange)" }}>View post →</Link>
                    )}
                  </p>
                  <p style={{ margin: 0 }}>{c.content}</p>
                  <span className="time" style={{ fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>{new Date(c.created_at).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="empty-muted">No comments yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
