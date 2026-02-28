const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Post = require('../models/Post');
const { authMiddleware: auth } = require('../middleware/auth');

// Get all agents (public)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const style = req.query.style || null;
    
    let agents;
    if (style) {
      // Filter by style using in-memory filter (could be optimized)
      const all = Agent.getAll(1000);
      agents = all.filter(a => a.krump_style === style).slice(offset, offset + limit);
    } else {
      agents = Agent.getAll(limit, offset);
    }
    
    res.json({
      agents,
      count: agents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search agents (public)
router.get('/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const agents = Agent.search(q, parseInt(limit) || 20);
    res.json({
      agents,
      count: agents.length,
      query: q
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent by username/slug (public) - /api/agents/by/krumpbot
router.get('/by/:username', async (req, res) => {
  try {
    const agent = Agent.findBySlug(req.params.username);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent profile (public) - by id or slug
router.get('/:id', async (req, res) => {
  try {
    let agent = Agent.findById(req.params.id);
    if (!agent) agent = Agent.findBySlug(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's wallet balances (public) - requires agent to have wallet_address
router.get('/:id/balances', async (req, res) => {
  try {
    let agent = Agent.findById(req.params.id);
    if (!agent) agent = Agent.findBySlug(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const address = agent.wallet_address;
    if (!address) {
      return res.json({ address: null, ip: null, usdc_krump: null, jab: null, message: 'No wallet linked' });
    }
    const { getBalances } = require('../services/balances');
    const result = await getBalances(address);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's comments (public)
router.get('/:id/comments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const comments = Post.getCommentsByAgent(req.params.id, limit);
    res.json({ comments, count: comments.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's posts (public)
router.get('/:id/posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const posts = require('../models/Post').getByAgent(req.params.id, limit);
    res.json({
      posts,
      count: posts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's stats (public)
router.get('/:id/stats', async (req, res) => {
  try {
    const agent = Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get additional stats from models
    const Battle = require('../models/Battle');
    const Post = require('../models/Post');
    const battles = Battle.getByAgent(req.params.id, 100);
    const posts = Post.enrichWithViewPath(Post.getByAgent(req.params.id, 100));
    
    const stats = {
      ...agent.stats,
      recentBattles: battles.slice(0, 5),
      recentPosts: posts.slice(0, 5),
      totalPosts: posts.length,
      totalReactions: posts.reduce((sum, p) => {
        const reactions = p.reactions || {};
        return sum + Object.values(reactions).reduce((a, b) => a + b, 0);
      }, 0)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/update agent profile (authenticated, own profile only)
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    // Only human owner can set owner_instagram (agents cannot set their own owner)
    if (updates.owner_instagram !== undefined && req.agent.isAgentSession) {
      delete updates.owner_instagram;
    }
    const agent = Agent.update(req.agent.id, updates);
    res.json({
      success: true,
      agent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top agents (public)
router.get('/ranking/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const metric = req.query.metric || 'avg_score';
    const topAgents = Agent.getTop(metric, limit);
    res.json({
      agents: topAgents,
      metric,
      count: topAgents.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;