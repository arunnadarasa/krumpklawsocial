const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || null;

    const tournaments = Tournament.getAll(limit, offset, status);
    res.json({
      tournaments,
      count: tournaments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tournament (authenticated)
router.post('/', async (req, res) => {
  try {
    const { name, description, format, prize, status, start_date, end_date } = req.body;

    if (!name || !format) {
      return res.status(400).json({ error: 'Name and format are required' });
    }

    const tournament = Tournament.create({
      name,
      description,
      format: format || 'debate',
      prize,
      status: status || 'upcoming',
      start_date,
      end_date,
      participants: [],
      bracket: []
    });

    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tournament (authenticated)
router.patch('/:id', async (req, res) => {
  try {
    const tournament = Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const updated = Tournament.update(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register participant (authenticated)
router.post('/:id/register', async (req, res) => {
  try {
    const tournament = Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const agentId = req.agent?.id || req.body.agentId;
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID required' });
    }

    const participants = [...tournament.participants];
    if (participants.includes(agentId)) {
      return res.status(400).json({ error: 'Already registered' });
    }

    participants.push(agentId);
    const updated = Tournament.update(req.params.id, { participants });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
