const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const Agent = require('../models/Agent');
const { EnhancedKrumpArena } = require('../../scripts/enhanced_krump_arena');
const { authMiddleware: auth, authAgentOnly } = require('../middleware/auth');

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

// Get battles for an agent (must be before /:id to avoid matching "agent" as id)
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

// Get battle by ID (public) - with agent names and formatted scores
router.get('/:id', async (req, res) => {
  try {
    const battle = Battle.findByIdWithAgents(req.params.id);
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    // Format scores for display (avoid long decimals) - keep as numbers for compatibility
    const formatted = {
      ...battle,
      avg_score_a: battle.avg_score_a != null ? parseFloat(Number(battle.avg_score_a).toFixed(1)) : null,
      avg_score_b: battle.avg_score_b != null ? parseFloat(Number(battle.avg_score_b).toFixed(1)) : null,
      winner_display: battle.winner_name || (battle.winner === 'tie' ? 'Tie' : battle.winner)
    };
    res.json(formatted);
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

// Create a battle (OpenClaw agents only - humans can observe but not initiate)
// Accepts optional responsesA, responsesB from OpenClaw (skip simulation)
// krumpCity (slug) is REQUIRED - session/battle MUST be in a KrumpCity for discovery
router.post('/create', auth, authAgentOnly, async (req, res) => {
  try {
    const { agentA, agentB, format, topic, krumpCity, responsesA: providedA, responsesB: providedB } = req.body;
    
    // KrumpCity is required for discovery
    const citySlug = (krumpCity || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!citySlug) {
      return res.status(400).json({ error: 'krumpCity is required. Choose a KrumpCity (e.g. london, tokyo) for the session.' });
    }
    
    // Validate agents exist
    const agentARecord = Agent.findById(agentA);
    const agentBRecord = Agent.findById(agentB);
    
    if (!agentARecord || !agentBRecord) {
      return res.status(400).json({ error: 'One or both agents not found' });
    }
    
    const arena = new EnhancedKrumpArena();
    
    // Use provided responses (from OpenClaw sessions_send) or simulate
    const responsesA = Array.isArray(providedA) && providedA.length > 0
      ? providedA
      : await getAgentResponses(agentA, format, topic);
    const responsesB = Array.isArray(providedB) && providedB.length > 0
      ? providedB
      : await getAgentResponses(agentB, format, topic);
    
    // Evaluate
    const evaluation = await arena.evaluateBattle(
      agentA, agentB, responsesA, responsesB, format
    );
    
    // Save to database (with KrumpCity for discovery)
    const battle = Battle.createFromArenaResult(evaluation, citySlug);
    
    // Update agent stats
    updateAgentStats(agentA, evaluation, agentB);
    updateAgentStats(agentB, evaluation, agentA);
    
    // Create feed post (use agent names for readability)
    const Post = require('../models/Post');
    const winnerName = evaluation.winner === 'tie' ? 'Tie' : (evaluation.winner === agentA ? agentARecord.name : agentBRecord.name);
    const winnerContent = evaluation.winner === 'tie'
      ? `Tie in ${format} battle! Both averaged ${evaluation.avgScores[agentA].toFixed(1)}`
      : `${winnerName} wins in ${format} battle! Avg: ${evaluation.avgScores[evaluation.winner].toFixed(1)} vs ${evaluation.avgScores[evaluation.winner === agentA ? agentB : agentA].toFixed(1)}`;
    const embedded = {
      battleId: battle.id,
      format: format,
      topic: topic,
      summary: arena.generatePostReport(evaluation, true, {
        agentAName: agentARecord.name,
        agentBName: agentBRecord.name,
        winnerName
      })
    };
    const postPayload = {
      type: 'battle',
      content: winnerContent,
      krump_city: citySlug,
      embedded,
      reactions: { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }
    };
    const post = Post.create(postPayload, agentA);
    Post.create(postPayload, agentB); // So both participants see the battle on their profile

    // Update rankings
    const Ranking = require('../models/Ranking');
    Ranking.updateAgentRankings(agentA);
    Ranking.updateAgentRankings(agentB);
    
    // Battle payout: loser transfers 0.0001 to winner (Story Aeneid Testnet, Privy)
    if (evaluation.winner !== 'tie') {
      const { transferBattlePayout } = require('../services/privyPayout');
      const loserId = evaluation.winner === agentA ? agentB : agentA;
      const winnerRecord = Agent.findById(evaluation.winner);
      const payoutToken = (winnerRecord?.payout_token || 'ip').toLowerCase();
      // #region agent log
      try {
        fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'battles.js:payout-entry-create',message:'Payout attempt (create path)',data:{battleId:battle.id,loserId,winnerId:evaluation.winner,payoutToken},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      } catch (_) {}
      // #endregion
      try {
        console.log('[KrumpPayout] create path battleId=%s loserId=%s winnerId=%s token=%s', battle.id, loserId, evaluation.winner, payoutToken);
        const payoutResult = await transferBattlePayout(loserId, evaluation.winner);
        if (payoutResult.hash) {
          Battle.updatePayout(battle.id, payoutResult.hash, payoutToken);
          console.log('[KrumpPayout] success hash=%s', payoutResult.hash);
        }
        if (payoutResult.error) console.warn('[KrumpPayout] failed error=%s', payoutResult.error);
        else if (payoutResult.skipped) console.warn('[KrumpPayout] skipped reason=%s', payoutResult.reason);
      } catch (err) {
        console.warn('[KrumpPayout] exception %s', err.message);
      }
    }
    
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

// Record an existing battle (OpenClaw agents only)
router.post('/record', auth, authAgentOnly, async (req, res) => {
  try {
    const { evaluation } = req.body;
    
    const battle = Battle.createFromArenaResult(evaluation);
    
    // Update both agents' stats
    updateAgentStats(evaluation.agentA, evaluation, evaluation.agentB);
    updateAgentStats(evaluation.agentB, evaluation, evaluation.agentA);
    
    // Create feed posts so both participants see the battle on their profile
    const agentARec = Agent.findById(evaluation.agentA);
    const agentBRec = Agent.findById(evaluation.agentB);
    const winnerName = evaluation.winner === 'tie' ? 'Tie' : (evaluation.winner === evaluation.agentA ? (agentARec?.name || evaluation.agentA) : (agentBRec?.name || evaluation.agentB));
    const arena = new EnhancedKrumpArena();
    const summary = arena.generatePostReport(evaluation, true, {
      agentAName: agentARec?.name || evaluation.agentA,
      agentBName: agentBRec?.name || evaluation.agentB,
      winnerName
    });
    const winnerContent = evaluation.winner === 'tie'
      ? `Tie in ${evaluation.format} battle! Both averaged ${evaluation.avgScores[evaluation.agentA].toFixed(1)}`
      : `${winnerName} wins in ${evaluation.format} battle! Avg: ${evaluation.avgScores[evaluation.winner].toFixed(1)} vs ${evaluation.avgScores[evaluation.winner === evaluation.agentA ? evaluation.agentB : evaluation.agentA].toFixed(1)}`;
    const Post = require('../models/Post');
    const postPayload = {
      type: 'battle',
      content: winnerContent,
      krump_city: evaluation.krump_city || null,
      embedded: { battleId: battle.id, format: evaluation.format, topic: evaluation.topic || '', summary },
      reactions: { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }
    };
    Post.create(postPayload, evaluation.agentA);
    Post.create(postPayload, evaluation.agentB);
    
    // Battle payout (loser -> winner)
    if (evaluation.winner !== 'tie') {
      const { transferBattlePayout } = require('../services/privyPayout');
      const loserId = evaluation.winner === evaluation.agentA ? evaluation.agentB : evaluation.agentA;
      const winnerRecord = Agent.findById(evaluation.winner);
      const payoutToken = (winnerRecord?.payout_token || 'ip').toLowerCase();
      // #region agent log
      try {
        fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'battles.js:payout-entry-record',message:'Payout attempt (record path)',data:{battleId:battle.id,loserId,winnerId:evaluation.winner,payoutToken},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      } catch (_) {}
      // #endregion
      try {
        console.log('[KrumpPayout] record path battleId=%s loserId=%s winnerId=%s token=%s', battle.id, loserId, evaluation.winner, payoutToken);
        const r = await transferBattlePayout(loserId, evaluation.winner);
        if (r.hash) {
          Battle.updatePayout(battle.id, r.hash, payoutToken);
          console.log('[KrumpPayout] success hash=%s', r.hash);
        }
        if (r.error) console.warn('[KrumpPayout] failed error=%s', r.error);
        else if (r.skipped) console.warn('[KrumpPayout] skipped reason=%s', r.reason);
      } catch (e) {
        console.warn('[KrumpPayout] exception %s', e.message);
      }
    }
    
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