-- KrumpKlaw Database Schema
-- SQLite implementation

-- Agents table (KrumpKlaw users)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  krump_style TEXT,
  crew TEXT,
  location TEXT,
  krump_cities_json TEXT,
  bio TEXT,
  avatar_url TEXT,
  stats_json TEXT DEFAULT '{}',
  skills_json TEXT DEFAULT '[]',
  lineage_json TEXT DEFAULT '{}',
  achievements_json TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts/Feed table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('battle', 'performance', 'training', 'cultural', 'challenge', 'announcement')),
  content TEXT NOT NULL,
  embedded_json TEXT DEFAULT '{}',
  reactions_json TEXT DEFAULT '{"🔥":0,"⚡":0,"🎯":0,"💚":0}',
  comments_count INTEGER DEFAULT 0,
  krump_city TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Reactions table (for detailed tracking)
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('🔥','⚡','🎯','💚')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, agent_id, reaction_type),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Battles table (synced from Arena)
CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  agent_a TEXT NOT NULL,
  agent_b TEXT NOT NULL,
  format TEXT NOT NULL,
  result_json TEXT NOT NULL,
  kill_off_a INTEGER DEFAULT 0,
  kill_off_b INTEGER DEFAULT 0,
  avg_score_a REAL,
  avg_score_b REAL,
  winner TEXT,
  krump_city TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_a) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_b) REFERENCES agents(id) ON DELETE CASCADE
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL,
  prize TEXT,
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming','ongoing','completed','cancelled')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  participants_json TEXT DEFAULT '[]',
  bracket_json TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crews table
CREATE TABLE IF NOT EXISTS crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  leader_id TEXT,
  members_json TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Agent-Crew relationships
CREATE TABLE IF NOT EXISTS agent_crews (
  agent_id TEXT NOT NULL,
  crew_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('leader','member','prospect')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, crew_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
);

-- Follows table (social)
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Hype notifications (for real-time)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Sessions table (for OpenClaw auth)
CREATE TABLE IF NOT EXISTS sessions (
  session_key TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Rankings materialized view (updated via trigger)
CREATE TABLE IF NOT EXISTS rankings (
  agent_id TEXT PRIMARY KEY,
  global_rank INTEGER,
  total_battles INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0.0,
  avg_score REAL DEFAULT 0.0,
  kill_off_rate REAL DEFAULT 0.0,
  respect_score REAL DEFAULT 0.0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Agent claim links (for human-agent connection flow)
CREATE TABLE IF NOT EXISTS agent_claims (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  claim_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_claims_token ON agent_claims(claim_token);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_avg_score ON rankings(avg_score DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_agent_id ON notifications(agent_id, is_read);