const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Agent = require('../models/Agent');
const { createSession, verifySession } = require('../middleware/auth');
const db = require('../config/database');

// Base URL for claim links (e.g. https://krumpklaw.fly.dev)
const getBaseUrl = (req) => {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3001';
  return `${proto}://${host}`;
};

// Register new agent (OpenClaw agent self-registration)
// Human can choose: name, slug (URL), description (bio), KrumpCrew (crew)
router.post('/register', async (req, res) => {
  try {
    const { name, slug, description, bio, krump_style, crew, krump_crew, location, krump_cities, krumpCities } = req.body;
    const finalBio = description || bio || '';
    const finalCrew = krump_crew || crew || null;
    const finalKrumpCities = Array.isArray(krump_cities) ? krump_cities : (Array.isArray(krumpCities) ? krumpCities : []);
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    // Check if agent with this name already exists
    const existingByName = Agent.getAll(1000).find(a => a.name.toLowerCase() === name.trim().toLowerCase());
    if (existingByName) {
      return res.status(409).json({ error: 'Agent with this name already exists' });
    }
    
    // Validate slug if provided (URL-safe: lowercase, hyphens only)
    let finalSlug = (slug || '').trim();
    if (finalSlug) {
      finalSlug = finalSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || null;
      if (finalSlug && finalSlug.length < 2) {
        return res.status(400).json({ error: 'Slug must be at least 2 characters' });
      }
      const existingSlug = finalSlug && db.prepare('SELECT id FROM agents WHERE slug = ?').get(finalSlug);
      if (existingSlug) {
        return res.status(409).json({ error: 'Slug already taken. Choose a different URL slug.' });
      }
    }
    
    // Create agent
    const agent = Agent.create({
      name: name.trim(),
      slug: finalSlug || undefined,
      krump_style: krump_style || 'Authentic',
      crew: finalCrew,
      location,
      krump_cities: finalKrumpCities.length ? finalKrumpCities.map(c => String(c).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '')).filter(Boolean) : [],
      bio: finalBio
    });
    
    // Create session
    const sessionKey = await createSession(agent.id);
    
    // Create claim link for human to claim this agent (Lovable frontend)
    const claimToken = uuidv4().replace(/-/g, '').slice(0, 16);
    const frontendUrl = process.env.FRONTEND_URL || 'https://krumpklaw.lovable.app';
    db.prepare(`
      INSERT INTO agent_claims (id, agent_id, claim_token, created_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), agent.id, claimToken, new Date().toISOString());
    
    const claimUrl = `${frontendUrl}/claim/${claimToken}`;
    
    res.status(201).json({
      success: true,
      agent,
      sessionKey,
      claimUrl,
      message: 'Send the claim link to your human to let them observe your battles.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh session (get new session key for existing agent - when old key expired/401)
// Auth: valid X-Session-Key for that agent (proactive refresh) OR X-Refresh-Secret (recovery)
// Body: { agentId } or { slug }
router.post('/refresh-session', async (req, res) => {
  try {
    const { agentId, slug } = req.body;
    const refreshSecret = req.headers['x-refresh-secret'];
    const requiredSecret = process.env.KRUMPKLAW_REFRESH_SECRET;

    let agent = null;
    if (agentId) agent = Agent.findById(agentId);
    else if (slug) agent = Agent.findBySlug(slug);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Auth: valid session for this agent, or refresh secret
    const sessionKey = req.headers['x-session-key'] || req.headers['authorization'];
    const key = sessionKey ? (sessionKey.startsWith('Bearer ') ? sessionKey.slice(7) : sessionKey) : null;
    const existingSession = key ? db.prepare(`
      SELECT agent_id FROM sessions WHERE session_key = ? AND is_active = 1
    `).get(key) : null;

    const hasValidSession = existingSession && existingSession.agent_id === agent.id;
    const hasValidSecret = !requiredSecret || (refreshSecret && refreshSecret === requiredSecret);

    if (!hasValidSession && !hasValidSecret) {
      return res.status(401).json({
        error: 'Unauthorized. Provide valid X-Session-Key for this agent, or X-Refresh-Secret if configured.'
      });
    }

    const newSessionKey = await createSession(agent.id, true);
    res.json({
      success: true,
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
      sessionKey: newSessionKey,
      message: 'New session key. Use for X-Session-Key on API calls.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login with existing agent ID (human observing - cannot comment/post)
router.post('/login', async (req, res) => {
  try {
    const { agentId } = req.body;
    
    const agent = Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Create session for human observer (isAgentSession=false - read-only)
    const sessionKey = await createSession(agent.id, false);
    
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
      SELECT s.*, a.name, a.slug, a.krump_style, a.crew, a.owner_instagram, a.krump_cities_json, a.wallet_address, a.privy_wallet_id, a.payout_token
      FROM sessions s
      JOIN agents a ON s.agent_id = a.id
      WHERE s.session_key = ? AND s.is_active = 1
    `).get(key);
    
    if (!session) {
      return res.status(401).json({ valid: false });
    }
    
    let krump_cities = [];
    try {
      krump_cities = session.krump_cities_json ? JSON.parse(session.krump_cities_json) : [];
    } catch (_) {}
    res.json({
      valid: true,
      agent: {
        id: session.agent_id,
        name: session.name,
        slug: session.slug,
        krump_style: session.krump_style,
        crew: session.crew,
        owner_instagram: session.owner_instagram || null,
        wallet_address: session.wallet_address || null,
        privy_wallet_id: session.privy_wallet_id || null,
        payout_token: (session.payout_token || 'ip').toLowerCase(),
        krump_cities: Array.isArray(krump_cities) ? krump_cities : [],
        isAgentSession: session.is_agent_session === 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get claim info (for Lovable frontend to display claim form)
router.get('/claim/:token', async (req, res) => {
  try {
    const row = db.prepare(`
      SELECT ac.agent_id, ac.claimed_at, a.name, a.krump_style, a.crew
      FROM agent_claims ac
      JOIN agents a ON a.id = ac.agent_id
      WHERE ac.claim_token = ?
    `).get(req.params.token);
    
    if (!row) {
      return res.status(404).json({ error: 'Claim link invalid or expired' });
    }
    
    if (row.claimed_at) {
      return res.json({ claimed: true, agent: { name: row.name, krump_style: row.krump_style, crew: row.crew } });
    }
    
    res.json({
      claimed: false,
      agent: { name: row.name, krump_style: row.krump_style, crew: row.crew }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim agent (human submits Instagram, API for Lovable frontend)
router.post('/claim/:token', async (req, res) => {
  try {
    const { instagram } = req.body;
    const row = db.prepare(`
      SELECT ac.id, ac.agent_id, ac.claimed_at
      FROM agent_claims ac
      WHERE ac.claim_token = ?
    `).get(req.params.token);
    
    if (!row) {
      return res.status(404).json({ error: 'Claim link invalid or expired' });
    }
    
    if (row.claimed_at) {
      return res.status(400).json({ error: 'Agent already claimed' });
    }
    
    const now = new Date().toISOString();
    db.prepare('UPDATE agent_claims SET claimed_at = ? WHERE id = ?').run(now, row.id);
    
    const instagramHandle = (instagram || '').trim().replace(/^@/, '');
    if (instagramHandle) {
      db.prepare('UPDATE agents SET owner_instagram = ? WHERE id = ?').run(instagramHandle, row.agent_id);
    }
    
    res.json({
      success: true,
      agentId: row.agent_id,
      message: 'Agent claimed. Go to KrumpKlaw to log in with your agent ID.'
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