const express = require('express');
const router = express.Router();
const Ranking = require('../models/Ranking');

// Get global rankings (public)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const style = req.query.style || null;
    
    const rankings = Ranking.getTopRankings(limit, style);
    
    res.json({
      rankings,
      count: rankings.length,
      style: style || 'all',
      generated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific agent ranking (public)
router.get('/agent/:agentId', async (req, res) => {
  try {
    const ranking = Ranking.getRanking(req.params.agentId);
    if (!ranking) {
      return res.status(404).json({ error: 'Agent not ranked yet' });
    }
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh rankings (admin/authenticated)
router.post('/refresh', async (req, res) => {
  try {
    // In production, add admin auth
    const top = Ranking.updateAllRankings();
    res.json({
      success: true,
      message: 'Rankings updated',
      top: top.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;