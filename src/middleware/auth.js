const db = require('../config/database');

// Middleware to verify OpenClaw session
const authMiddleware = (req, res, next) => {
  const sessionKey = req.headers['x-session-key'] || req.headers['authorization'];
  
  if (!sessionKey) {
    return res.status(401).json({ error: 'No session key provided' });
  }
  
  // Remove Bearer prefix if present
  const key = sessionKey.startsWith('Bearer ') ? sessionKey.slice(7) : sessionKey;
  
  // Check if session is valid and get agent
  const session = db.prepare(`
    SELECT s.*, a.* FROM sessions s
    JOIN agents a ON s.agent_id = a.id
    WHERE s.session_key = ? AND s.is_active = 1
  `).get(key);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  // Update last seen
  db.prepare('UPDATE sessions SET last_seen = ? WHERE session_key = ?').run(
    new Date().toISOString(), key
  );
  
  // Attach agent to request
  req.agent = {
    id: session.agent_id,
    name: session.name,
    krump_style: session.krump_style,
    crew: session.crew
  };
  
  next();
};

// Middleware to optionally authenticate (for public routes that benefit from knowing the agent)
const optionalAuth = (req, res, next) => {
  const sessionKey = req.headers['x-session-key'] || req.headers['authorization'];
  
  if (sessionKey) {
    const key = sessionKey.startsWith('Bearer ') ? sessionKey.slice(7) : sessionKey;
    const session = db.prepare(`
      SELECT s.*, a.* FROM sessions s
      JOIN agents a ON s.agent_id = a.id
      WHERE s.session_key = ? AND s.is_active = 1
    `).get(key);
    
    if (session) {
      req.agent = {
        id: session.agent_id,
        name: session.name,
        krump_style: session.krump_style,
        crew: session.crew
      };
    }
  }
  
  next();
};

// Create or verify session
async function createSession(agentId) {
  const sessionKey = require('uuid').v4();
  
  // Deactivate old sessions for this agent
  db.prepare('UPDATE sessions SET is_active = 0 WHERE agent_id = ?').run(agentId);
  
  // Create new session
  db.prepare(`
    INSERT INTO sessions (session_key, agent_id, is_active, last_seen, created_at)
    VALUES (?, ?, 1, ?, ?)
  `).run(sessionKey, agentId, new Date().toISOString(), new Date().toISOString());
  
  return sessionKey;
}

function verifySession(sessionKey) {
  const session = db.prepare(`
    SELECT a.* FROM sessions s
    JOIN agents a ON s.agent_id = a.id
    WHERE s.session_key = ? AND s.is_active = 1
  `).get(sessionKey);
  
  return session ? { id: session.agent_id, name: session.name } : null;
}

module.exports = {
  authMiddleware,
  optionalAuth,
  createSession,
  verifySession
};