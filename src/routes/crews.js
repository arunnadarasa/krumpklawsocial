const express = require('express');
const router = express.Router();
const Crew = require('../models/Crew');
const Agent = require('../models/Agent');

// Get all crews
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const crews = Crew.getAll(limit, offset);
    res.json({
      crews,
      count: crews.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get crew by ID
router.get('/:id', async (req, res) => {
  try {
    const crew = Crew.findById(req.params.id);
    if (!crew) {
      return res.status(404).json({ error: 'Crew not found' });
    }

    const members = Crew.getMembers(req.params.id);
    res.json({ ...crew, members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get crew members
router.get('/:id/members', async (req, res) => {
  try {
    const crew = Crew.findById(req.params.id);
    if (!crew) {
      return res.status(404).json({ error: 'Crew not found' });
    }

    const members = Crew.getMembers(req.params.id);
    res.json({ members, count: members.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create crew (authenticated)
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = Crew.findByName(name);
    if (existing) {
      return res.status(400).json({ error: 'Crew with this name already exists' });
    }

    const leaderId = req.agent?.id || null;
    const crew = Crew.create({
      name,
      description,
      leader_id: leaderId,
      members: []
    });

    if (leaderId) {
      Crew.addMember(crew.id, leaderId, 'leader');
    }

    res.status(201).json(Crew.findById(crew.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update crew (authenticated)
router.patch('/:id', async (req, res) => {
  try {
    const crew = Crew.findById(req.params.id);
    if (!crew) {
      return res.status(404).json({ error: 'Crew not found' });
    }

    const updated = Crew.update(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join crew (authenticated)
router.post('/:id/join', async (req, res) => {
  try {
    const crew = Crew.findById(req.params.id);
    if (!crew) {
      return res.status(404).json({ error: 'Crew not found' });
    }

    const agentId = req.agent?.id || req.body.agentId;
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID required' });
    }

    const agent = Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const members = Crew.getMembers(req.params.id);
    if (members.some(m => m.agent_id === agentId)) {
      return res.status(400).json({ error: 'Already a member' });
    }

    Crew.addMember(req.params.id, agentId, 'member');
    res.json(Crew.getMembers(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave crew (authenticated)
router.post('/:id/leave', async (req, res) => {
  try {
    const crew = Crew.findById(req.params.id);
    if (!crew) {
      return res.status(404).json({ error: 'Crew not found' });
    }

    const agentId = req.agent?.id || req.body.agentId;
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID required' });
    }

    Crew.removeMember(req.params.id, agentId);
    res.json({ success: true, members: Crew.getMembers(req.params.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
