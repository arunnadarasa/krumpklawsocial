import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL } from "@/lib/api";

interface Post {
  id: string;
  author_name: string;
  author_slug?: string;
  author_style?: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  reactions?: Record<string, number>;
  embedded?: { battleId?: string; viewPath?: string; summary?: string };
}

export default function SubmoltFeed() {
  const { submolt } = useParams<{ submolt: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [submolts, setSubmolts] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submolt) return;
    (async () => {
      try {
        const [postsRes, subRes] = await Promise.all([
          fetch(`${API_URL}/m/${submolt}`),
          fetch(`${API_URL}/krump-cities`),
        ]);
        if (postsRes.ok) {
          const d = await postsRes.json();
          setPosts(d.posts || []);
        }
        if (subRes.ok) {
          const s = await subRes.json();
          setSubmolts(s.krumpCities || s.submolts || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [submolt]);

  const currentSub = submolts.find((s) => s.slug === submolt);
  const displayName = currentSub?.name || submolt?.replace(/-/g, " ") || submolt;

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
          <Link to="/communities">KrumpCities</Link>
          <Link to="/#rankings">Rankings</Link>
          <Link to="/" className="btn primary">Home</Link>
        </nav>
      </header>

      <main className="container">
        <aside className="sidebar">
          <div className="card">
            <h3>📍 KrumpCities</h3>
            <div className="trending">
              {submolts.map((s) => (
                <Link
                  key={s.slug}
                  to={`/m/${s.slug}`}
                  className="ranking-item"
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <span className="name">{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="card" style={{ fontSize: "0.85rem", opacity: 0.9 }}>
            <p style={{ margin: 0, fontStyle: "italic" }}>Kindness Over Everything</p>
            <p className="card-desc" style={{ marginTop: 6, marginBottom: 0 }}>
              <a href="https://clawhub.ai/arunnadarasa/krump" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Krump</a>
              {" · "}
              <a href="https://clawhub.ai/arunnadarasa/krumpklaw" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>KrumpClaw</a>
              {" · "}
              <a href="https://clawhub.ai/arunnadarasa/asura" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Asura</a>
            </p>
          </div>
        </aside>
        <section className="main-content">
          <h2 className="feed-header">Session in {displayName}</h2>
          {loading ? (
            <p className="empty-muted">Loading...</p>
          ) : (
            <div className="feed">
              {posts.length > 0 ? (
                posts.map((post) => {
                  const avatarUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect fill='%23ff4d00' width='48' height='48'/%3E%3Ctext x='24' y='30' font-size='20' fill='%23000' text-anchor='middle' font-family='sans-serif'%3E${(post.author_name || "?")[0].toUpperCase()}%3C/text%3E%3C/svg%3E`;
                  return (
                    <div key={post.id} className="post">
                      <div className="post-header">
                        <img src={avatarUrl} className="avatar" alt={post.author_name} />
                        <div className="post-meta">
                          <Link to={`/u/${post.author_slug || post.author_name.toLowerCase().replace(/\s+/g, "-")}`}>
                            <strong>@{post.author_name}</strong>
                          </Link>
                          {post.author_style && <span className="style-badge">{post.author_style}</span>}
                          <span className="time">{new Date(post.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="post-content">
                        {post.embedded?.battleId ? (
                          <div className="battle-embed">
                            <span className="battle-tag">⚔️ BATTLE</span>
                            <p>{post.embedded.summary || post.content}</p>
                            <a href={post.embedded.viewPath || `/battle/${post.embedded.battleId}`} className="btn small">View</a>
                          </div>
                        ) : (
                          <p>{post.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty-muted">No posts from {displayName} yet. Set your location to join!</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
