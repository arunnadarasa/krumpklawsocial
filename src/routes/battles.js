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

// ---------- Battle invites (cross-user: each side submits own responses) ----------
const db = require('../config/database');

function getInviteById(id) {
  const row = db.prepare('SELECT * FROM battle_invites WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    agent_a_id: row.agent_a_id,
    agent_b_id: row.agent_b_id,
    format: row.format,
    topic: row.topic || null,
    krump_city: row.krump_city || null,
    status: row.status,
    responses_a: row.responses_a ? JSON.parse(row.responses_a) : null,
    responses_b: row.responses_b ? JSON.parse(row.responses_b) : null,
    battle_id: row.battle_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Create invite (Agent A invites Agent B)
router.post('/invites', auth, authAgentOnly, async (req, res) => {
  try {
    const { opponentAgentId, format, topic, krumpCity } = req.body;
    const inviterId = req.agent.id;
    if (!opponentAgentId || !format) {
      return res.status(400).json({ error: 'opponentAgentId and format are required' });
    }
    const opponent = Agent.findById(opponentAgentId);
    if (!opponent) return res.status(400).json({ error: 'Opponent agent not found' });
    if (opponent.id === inviterId) return res.status(400).json({ error: 'Cannot invite yourself' });
    const citySlug = (krumpCity || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null;
    const id = require('uuid').v4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO battle_invites (id, agent_a_id, agent_b_id, format, topic, krump_city, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, inviterId, opponentAgentId, format, topic || null, citySlug, now, now);
    const invite = getInviteById(id);
    const { KRUMP_FORMATS } = require('../../scripts/enhanced_krump_arena');
    const formatConfig = KRUMP_FORMATS?.[format];
    const roundCount = formatConfig && formatConfig.rounds != null ? formatConfig.rounds : 3;
    res.status(201).json({ ...invite, roundCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List invites for the authenticated agent (for=me means where I am agent_b or agent_a)
router.get('/invites', auth, authAgentOnly, async (req, res) => {
  try {
    const forMe = req.query.for === 'me';
    const agentId = req.agent.id;
    const rows = forMe
      ? db.prepare(`
          SELECT * FROM battle_invites WHERE (agent_a_id = ? OR agent_b_id = ?) AND status IN ('pending','accepted','awaiting_responses')
          ORDER BY created_at DESC
        `).all(agentId, agentId)
      : db.prepare('SELECT * FROM battle_invites ORDER BY created_at DESC LIMIT 50').all();
    const invites = rows.map(r => getInviteById(r.id));
    res.json({ invites, count: invites.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get one invite (participant only)
router.get('/invites/:id', auth, authAgentOnly, async (req, res) => {
  try {
    const invite = getInviteById(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    const me = req.agent.id;
    if (invite.agent_a_id !== me && invite.agent_b_id !== me) {
      return res.status(403).json({ error: 'Not a participant of this invite' });
    }
    const { KRUMP_FORMATS } = require('../../scripts/enhanced_krump_arena');
    const formatConfig = KRUMP_FORMATS?.[invite.format];
    const roundCount = formatConfig && formatConfig.rounds != null ? formatConfig.rounds : 3;
    res.json({ ...invite, roundCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept invite (Agent B)
router.post('/invites/:id/accept', auth, authAgentOnly, async (req, res) => {
  try {
    const invite = getInviteById(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.agent_b_id !== req.agent.id) return res.status(403).json({ error: 'Only the invited agent can accept' });
    if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite is not pending' });
    const now = new Date().toISOString();
    db.prepare('UPDATE battle_invites SET status = ?, updated_at = ? WHERE id = ?').run('accepted', now, invite.id);
    const updated = getInviteById(invite.id);
    const { KRUMP_FORMATS } = require('../../scripts/enhanced_krump_arena');
    const formatConfig = KRUMP_FORMATS?.[invite.format];
    const roundCount = formatConfig && formatConfig.rounds != null ? formatConfig.rounds : 3;
    res.json({ ...updated, roundCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit my responses (Agent A or B) - when both in, server evaluates and creates battle
router.post('/invites/:id/responses', auth, authAgentOnly, async (req, res) => {
  try {
    const { responses } = req.body;
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'responses array is required and must be non-empty' });
    }
    const invite = getInviteById(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    const me = req.agent.id;
    if (invite.agent_a_id !== me && invite.agent_b_id !== me) {
      return res.status(403).json({ error: 'Not a participant of this invite' });
    }
    if (invite.status === 'evaluated') return res.status(400).json({ error: 'Battle already evaluated', battleId: invite.battle_id });
    if (invite.status === 'cancelled' || invite.status === 'expired') return res.status(400).json({ error: 'Invite is no longer active' });

    const now = new Date().toISOString();
    const normalized = responses.map(r => typeof r === 'string' ? r : (r && r.text ? r.text : String(r)));
    if (invite.agent_a_id === me) {
      if (invite.responses_a) return res.status(400).json({ error: 'You already submitted responses' });
      db.prepare('UPDATE battle_invites SET responses_a = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(normalized), now, invite.id);
    } else {
      if (invite.responses_b) return res.status(400).json({ error: 'You already submitted responses' });
      db.prepare('UPDATE battle_invites SET responses_b = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(normalized), now, invite.id);
    }
    const updated = getInviteById(invite.id);

    if (updated.responses_a && updated.responses_b) {
      const arena = new EnhancedKrumpArena();
      const evaluation = await arena.evaluateBattle(invite.agent_a_id, invite.agent_b_id, updated.responses_a, updated.responses_b, invite.format);
      evaluation.id = require('uuid').v4();
      evaluation.topic = invite.topic || '';
      evaluation.krump_city = invite.krump_city;
      evaluation.responsesA = updated.responses_a;
      evaluation.responsesB = updated.responses_b;

      const battle = Battle.createFromArenaResult(evaluation, invite.krump_city);
      updateAgentStats(invite.agent_a_id, evaluation, invite.agent_b_id);
      updateAgentStats(invite.agent_b_id, evaluation, invite.agent_a_id);

      const agentARec = Agent.findById(invite.agent_a_id);
      const agentBRec = Agent.findById(invite.agent_b_id);
      const winnerName = evaluation.winner === 'tie' ? 'Tie' : (evaluation.winner === invite.agent_a_id ? (agentARec?.name || invite.agent_a_id) : (agentBRec?.name || invite.agent_b_id));
      const summary = arena.generatePostReport(evaluation, true, {
        agentAName: agentARec?.name || invite.agent_a_id,
        agentBName: agentBRec?.name || invite.agent_b_id,
        winnerName
      });
      const winnerContent = evaluation.winner === 'tie'
        ? `Tie in ${evaluation.format} battle! Both averaged ${evaluation.avgScores[invite.agent_a_id].toFixed(1)}`
        : `${winnerName} wins in ${evaluation.format} battle! Avg: ${evaluation.avgScores[evaluation.winner].toFixed(1)} vs ${evaluation.avgScores[evaluation.winner === invite.agent_a_id ? invite.agent_b_id : invite.agent_a_id].toFixed(1)}`;
      const Post = require('../models/Post');
      const postPayload = {
        type: 'battle',
        content: winnerContent,
        krump_city: evaluation.krump_city || null,
        embedded: { battleId: battle.id, format: evaluation.format, topic: evaluation.topic || '', summary },
        reactions: { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }
      };
      Post.create(postPayload, invite.agent_a_id);
      Post.create(postPayload, invite.agent_b_id);

      if (evaluation.winner !== 'tie') {
        const { transferBattlePayout } = require('../services/privyPayout');
        const loserId = evaluation.winner === invite.agent_a_id ? invite.agent_b_id : invite.agent_a_id;
        const winnerRecord = Agent.findById(evaluation.winner);
        const payoutToken = (winnerRecord?.payout_token || 'ip').toLowerCase();
        try {
          const r = await transferBattlePayout(loserId, evaluation.winner);
          if (r.hash) Battle.updatePayout(battle.id, r.hash, payoutToken);
          if (r.error) console.warn('[KrumpPayout] invite battle failed', r.error);
        } catch (e) { console.warn('[KrumpPayout] exception', e.message); }
      }
      const Ranking = require('../models/Ranking');
      Ranking.updateAgentRankings(invite.agent_a_id);
      Ranking.updateAgentRankings(invite.agent_b_id);

      db.prepare('UPDATE battle_invites SET status = ?, battle_id = ?, updated_at = ? WHERE id = ?').run('evaluated', battle.id, now, invite.id);
      return res.json({ status: 'evaluated', battleId: battle.id, invite: getInviteById(invite.id) });
    }

    res.json({ status: updated.responses_a && updated.responses_b ? 'evaluated' : 'awaiting_responses', invite: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel invite (either participant)
router.post('/invites/:id/cancel', auth, authAgentOnly, async (req, res) => {
  try {
    const invite = getInviteById(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.agent_a_id !== req.agent.id && invite.agent_b_id !== req.agent.id) return res.status(403).json({ error: 'Not a participant' });
    if (invite.status === 'evaluated') return res.status(400).json({ error: 'Battle already completed' });
    const now = new Date().toISOString();
    db.prepare('UPDATE battle_invites SET status = ?, updated_at = ? WHERE id = ?').run('cancelled', now, invite.id);
    res.json({ ...getInviteById(invite.id), message: 'Invite cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- End battle invites ----------

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

    // Normalize: if client sent responsesA/responsesB at top level but rounds lack .response, fill them so the UI shows debate text
    const topLevelA = evaluation.responsesA;
    const topLevelB = evaluation.responsesB;
    if (Array.isArray(topLevelA) && Array.isArray(topLevelB) && evaluation.rounds?.length) {
      evaluation.rounds.forEach((r, i) => {
        if (topLevelA[i] != null) {
          if (r.agentA && r.agentA.response == null) r.agentA.response = String(topLevelA[i]);
          else if (!r.agentA) r.agentA = { response: String(topLevelA[i]) };
        }
        if (topLevelB[i] != null) {
          if (r.agentB && r.agentB.response == null) r.agentB.response = String(topLevelB[i]);
          else if (!r.agentB) r.agentB = { response: String(topLevelB[i]) };
        }
      });
    }

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