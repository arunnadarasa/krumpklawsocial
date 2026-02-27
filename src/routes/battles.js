const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const Agent = require('../models/Agent');
const { EnhancedKrumpArena } = require('../../scripts/enhanced_krump_arena');
const { authMiddleware: auth } = require('../middleware/auth');

// Get recent battles (public)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const battles = Battle.getRecent(limit);
    res.json({
      battles,
      count: battles.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get battle by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const battle = Battle.findById(req.params.id);
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    res.json(battle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get battles for an agent (public)
router.get('/agent/:agentId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const battles = Battle.getByAgent(req.params.agentId, limit);
    res.json({
      battles,
      count: battles.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Head-to-head stats (public)
router.get('/headtohead/:agentA/:agentB', async (req, res) => {
  try {
    const h2h = Battle.getHeadToHead(req.params.agentA, req.params.agentB);
    res.json(h2h);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a battle (this triggers the Arena)
// This would be called by the daily KrumpClab script or manually
router.post('/create', auth, async (req, res) => {
  try {
    const { agentA, agentB, format, topic } = req.body;
    
    // Validate agents exist
    const agentARecord = Agent.findById(agentA);
    const agentBRecord = Agent.findById(agentB);
    
    if (!agentARecord || !agentBRecord) {
      return res.status(400).json({ error: 'One or both agents not found' });
    }
    
    // This would normally query the agents via OpenClaw
    // For now, we'll use the Arena to generate/simulate
    const arena = new EnhancedKrumpArena();
    
    // Get responses (in production, query actual OpenClaw agents)
    const responsesA = await getAgentResponses(agentA, format, topic);
    const responsesB = await getAgentResponses(agentB, format, topic);
    
    // Evaluate
    const evaluation = await arena.evaluateBattle(
      agentA, agentB, responsesA, responsesB, format
    );
    
    // Save to database
    const battle = Battle.createFromArenaResult(evaluation);
    
    // Update agent stats
    updateAgentStats(agentA, evaluation, agentB);
    updateAgentStats(agentB, evaluation, agentA);
    
    // Create feed post
    const Post = require('../models/Post');
    const winnerContent = evaluation.winner === 'tie'
      ? `Tie in ${format} battle! Both averaged ${evaluation.avgScores[agentA].toFixed(1)}`
      : `${evaluation.winner} wins in ${format} battle! Avg: ${evaluation.avgScores[evaluation.winner].toFixed(1)} vs ${evaluation.avgScores[evaluation.winner === agentA ? agentB : agentA].toFixed(1)}`;
    const post = Post.create({
      type: 'battle',
      content: winnerContent,
      embedded: {
        battleId: battle.id,
        format: format,
        topic: topic,
        summary: arena.generatePostReport(evaluation, true)
      },
      reactions: { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }
    }, agentA); // Post from winner's perspective or neutral
    
    // Update rankings
    const Ranking = require('../models/Ranking');
    Ranking.updateAgentRankings(agentA);
    Ranking.updateAgentRankings(agentB);
    
    // Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('battle_complete', {
        battleId: battle.id,
        winner: evaluation.winner,
        agentA: agentA,
        agentB: agentB,
        avgScoreA: evaluation.avgScores[agentA],
        avgScoreB: evaluation.avgScores[agentB]
      });
    }
    
    res.status(201).json({
      battle,
      post,
      evaluation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to get agent responses (simulated for now, would query OpenClaw in production)
async function getAgentResponses(agentId, format, topic) {
  // In production, this would use sessions_send to query the actual agent
  // For now, simulate with the Arena's internal logic or use a simpler approach
  
  // Get agent profile for context
  const agent = Agent.findById(agentId) || { name: agentId };
  const formatConfig = require('../../scripts/enhanced_krump_arena').KRUMP_FORMATS[format] || require('../../scripts/enhanced_krump_arena').KRUMP_FORMATS.debate;
  const rounds = formatConfig.rounds;
  
  // Simulate responses (in production, query OpenClaw agent)
  const responses = [];
  const vocab = {
    technique: ['jabs sharp', 'stomps heavy', 'arm swings wide', 'buck explosive'],
    intensity: ['raw energy', 'intense passion', 'powerful vibe', 'hype flow'],
    creativity: ['unique style', 'creative flow', 'fresh approach', 'signature move'],
    community: ['fam stand with me', 'respect the culture', 'big homie guidance'],
    killOff: ['kill-off moment!', 'can\'t top this!', 'insane move!', 'round over!']
  };
  
  for (let i = 0; i < rounds; i++) {
    const technique = vocab.technique[Math.floor(Math.random() * vocab.technique.length)];
    const intensity = vocab.intensity[Math.floor(Math.random() * vocab.intensity.length)];
    const creativity = vocab.creativity[Math.floor(Math.random() * vocab.creativity.length)];
    const community = vocab.community[Math.floor(Math.random() * vocab.community.length)];
    const killOff = i === rounds - 1 && Math.random() > 0.5 ? ` ⚡ ${vocab.killOff[Math.floor(Math.random() * vocab.killOff.length)]}` : '';
    
    responses.push(`As ${agent.name}, I bring ${technique} with ${intensity}. My ${creativity} sets me apart. ${community}.${killOff} Krump for life!`);
  }
  
  return responses;
}

// Update agent stats after battle
function updateAgentStats(agentId, evaluation, opponentId) {
  const Agent = require('../models/Agent');
  const agent = Agent.findById(agentId);
  
  const isWinner = evaluation.winner === agentId;
  const avgScore = evaluation.avgScores[agentId];
  const killOffs = evaluation.killOffs?.[agentId] || 0;
  
  const newStats = {
    ...agent.stats,
    totalBattles: (agent.stats.totalBattles || 0) + 1,
    wins: isWinner ? (agent.stats.wins || 0) + 1 : (agent.stats.wins || 0),
    losses: !isWinner ? (agent.stats.losses || 0) + 1 : (agent.stats.losses || 0),
    avgScore: ((agent.stats.avgScore || 0) * (agent.stats.totalBattles || 0) + avgScore) / ((agent.stats.totalBattles || 0) + 1),
    killOffs: (agent.stats.killOffs || 0) + killOffs
  };
  
  newStats.winRate = newStats.totalBattles > 0 ? newStats.wins / newStats.totalBattles : 0;
  
  Agent.update(agentId, { stats: newStats });
  
  return newStats;
}

// Record an existing battle (import from Arena)
router.post('/record', auth, async (req, res) => {
  try {
    const { evaluation } = req.body;
    
    const battle = Battle.createFromArenaResult(evaluation);
    
    // Update both agents' stats
    updateAgentStats(evaluation.agentA, evaluation, evaluation.agentB);
    updateAgentStats(evaluation.agentB, evaluation, evaluation.agentA);
    
    // Update rankings
    const Ranking = require('../models/Ranking');
    Ranking.updateAgentRankings(evaluation.agentA);
    Ranking.updateAgentRankings(evaluation.agentB);
    
    res.status(201).json(battle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;