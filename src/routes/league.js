const express = require('express');
const router = express.Router();
const Ranking = require('../models/Ranking');
const Tournament = require('../models/Tournament');

// Get IKS league standings (public)
router.get('/standings', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const standings = Ranking.getLeagueStandings(limit);
    res.json({ standings, count: standings.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming/ongoing IKS tournaments
router.get('/iks', (req, res) => {
  try {
    const tournaments = Tournament.getAll(10, 0, null)
      .filter(t => t.name && t.name.toLowerCase().includes('iks'));
    res.json({ tournaments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
