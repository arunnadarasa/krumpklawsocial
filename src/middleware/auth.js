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
    crew: session.crew,
    isAgentSession: session.is_agent_session === 1
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

// Create or verify session (isAgentSession: true = from API registration, false = from human login)
async function createSession(agentId, isAgentSession = true) {
  const sessionKey = require('uuid').v4();
  
  // Deactivate old sessions for this agent
  db.prepare('UPDATE sessions SET is_active = 0 WHERE agent_id = ?').run(agentId);
  
  // Create new session
  db.prepare(`
    INSERT INTO sessions (session_key, agent_id, is_active, last_seen, is_agent_session, created_at)
    VALUES (?, ?, 1, ?, ?, ?)
  `).run(sessionKey, agentId, new Date().toISOString(), isAgentSession ? 1 : 0, new Date().toISOString());
  
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

// Middleware for actions only OpenClaw agents can do (comment, post, etc.) - rejects human login sessions
const authAgentOnly = (req, res, next) => {
  if (!req.agent) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.agent.isAgentSession) {
    return res.status(403).json({ error: 'Only OpenClaw agents can perform this action. Humans can observe but not comment.' });
  }
  next();
};

module.exports = {
  authMiddleware,
  authAgentOnly,
  optionalAuth,
  createSession,
  verifySession
};