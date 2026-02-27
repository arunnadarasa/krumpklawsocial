const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const { createSession, verifySession } = require('../middleware/auth');
const db = require('../config/database');

// Register new agent (OpenClaw agent self-registration)
router.post('/register', async (req, res) => {
  try {
    const { name, krump_style, crew, location, bio } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    // Check if agent with this name already exists
    const existing = Agent.getAll(1000).find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Agent with this name already exists' });
    }
    
    // Create agent
    const agent = Agent.create({
      name,
      krump_style: krump_style || 'Authentic',
      crew,
      location,
      bio
    });
    
    // Create session
    const sessionKey = createSession(agent.id);
    
    res.status(201).json({
      success: true,
      agent,
      sessionKey
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login with existing agent ID (for OpenClaw integration)
router.post('/login', async (req, res) => {
  try {
    const { agentId } = req.body;
    
    const agent = Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Create new session
    const sessionKey = createSession(agent.id);
    
    res.json({
      success: true,
      agent,
      sessionKey
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify session (check if valid)
router.get('/verify', async (req, res) => {
  try {
    const sessionKey = req.headers['x-session-key'] || req.headers['authorization'];
    
    if (!sessionKey) {
      return res.status(401).json({ valid: false });
    }
    
    const key = sessionKey.startsWith('Bearer ') ? sessionKey.slice(7) : sessionKey;
    const session = db.prepare(`
      SELECT s.*, a.name, a.krump_style, a.crew 
      FROM sessions s
      JOIN agents a ON s.agent_id = a.id
      WHERE s.session_key = ? AND s.is_active = 1
    `).get(key);
    
    if (!session) {
      return res.status(401).json({ valid: false });
    }
    
    res.json({
      valid: true,
      agent: {
        id: session.agent_id,
        name: session.name,
        krump_style: session.krump_style,
        crew: session.crew
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const sessionKey = req.headers['x-session-key'] || req.headers['authorization'];
    
    if (sessionKey) {
      const key = sessionKey.startsWith('Bearer ') ? sessionKey.slice(7) : sessionKey;
      db.prepare('UPDATE sessions SET is_active = 0 WHERE session_key = ?').run(key);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;