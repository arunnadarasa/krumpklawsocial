const db = require('../config/database');
const { EnhancedKrumpArena } = require('../../scripts/enhanced_krump_arena');

class Battle {
  static create(battleData) {
    const id = battleData.id || require('uuid').v4();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO battles (id, agent_a, agent_b, format, result_json, kill_off_a, kill_off_b, avg_score_a, avg_score_b, winner, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      battleData.agent_a,
      battleData.agent_b,
      battleData.format,
      JSON.stringify(battleData.result),
      battleData.kill_off_a || 0,
      battleData.kill_off_b || 0,
      battleData.avg_score_a,
      battleData.avg_score_b,
      battleData.winner,
      now
    );
    
    return this.findById(id);
  }

  static findById(id) {
    const row = db.prepare('SELECT * FROM battles WHERE id = ?').get(id);
    return row ? this.parse(row) : null;
  }

  static findByIdWithAgents(id) {
    const row = db.prepare(`
      SELECT b.*,
             a1.name as agent_a_name, a1.slug as agent_a_slug, a1.krump_style as agent_a_style,
             a2.name as agent_b_name, a2.slug as agent_b_slug, a2.krump_style as agent_b_style,
             winner_agent.name as winner_name, winner_agent.slug as winner_slug
      FROM battles b
      JOIN agents a1 ON b.agent_a = a1.id
      JOIN agents a2 ON b.agent_b = a2.id
      LEFT JOIN agents winner_agent ON b.winner = winner_agent.id
      WHERE b.id = ?
    `).get(id);
    return row ? this.parseWithAgents(row) : null;
  }

  static getRecent(limit = 50) {
    const rows = db.prepare(`
      SELECT b.*, 
             a1.name as agent_a_name, a1.krump_style as agent_a_style,
             a2.name as agent_b_name, a2.krump_style as agent_b_style
      FROM battles b
      JOIN agents a1 ON b.agent_a = a1.id
      JOIN agents a2 ON b.agent_b = a2.id
      ORDER BY b.created_at DESC
      LIMIT ?
    `).all(limit);
    
    return rows.map(this.parseWithAgents);
  }

  static getByAgent(agentId, limit = 50) {
    const rows = db.prepare(`
      SELECT b.*, 
             a1.name as agent_a_name, a1.krump_style as agent_a_style,
             a2.name as agent_b_name, a2.krump_style as agent_b_style
      FROM battles b
      JOIN agents a1 ON b.agent_a = a1.id
      JOIN agents a2 ON b.agent_b = a2.id
      WHERE b.agent_a = ? OR b.agent_b = ?
      ORDER BY b.created_at DESC
      LIMIT ?
    `).all(agentId, agentId, limit);
    
    return rows.map(this.parseWithAgents);
  }

  static createFromArenaResult(evaluation) {
    // Convert Arena evaluation to database format
    const avgA = evaluation.avgScores[evaluation.agentA];
    const avgB = evaluation.avgScores[evaluation.agentB];
    
    return this.create({
      id: evaluation.id,
      agent_a: evaluation.agentA,
      agent_b: evaluation.agentB,
      format: evaluation.format,
      result: evaluation,
      kill_off_a: evaluation.killOffs?.[evaluation.agentA] || 0,
      kill_off_b: evaluation.killOffs?.[evaluation.agentB] || 0,
      avg_score_a: avgA,
      avg_score_b: avgB,
      winner: evaluation.winner
    });
  }

  static parse(row) {
    return {
      id: row.id,
      agent_a: row.agent_a,
      agent_b: row.agent_b,
      format: row.format,
      result: JSON.parse(row.result_json || '{}'),
      kill_off_a: row.kill_off_a,
      kill_off_b: row.kill_off_b,
      avg_score_a: row.avg_score_a,
      avg_score_b: row.avg_score_b,
      winner: row.winner,
      created_at: row.created_at
    };
  }

  static parseWithAgents(row) {
    const battle = this.parse(row);
    return {
      ...battle,
      agent_a_name: row.agent_a_name,
      agent_a_slug: row.agent_a_slug,
      agent_a_style: row.agent_a_style,
      agent_b_name: row.agent_b_name,
      agent_b_slug: row.agent_b_slug,
      agent_b_style: row.agent_b_style,
      winner_name: row.winner_name,
      winner_slug: row.winner_slug
    };
  }

  // Get head-to-head stats
  static getHeadToHead(agentA, agentB) {
    const battles = db.prepare(`
      SELECT * FROM battles 
      WHERE (agent_a = ? AND agent_b = ?) OR (agent_a = ? AND agent_b = ?)
      ORDER BY created_at DESC
    `).all(agentA, agentB, agentB, agentA);
    
    const stats = {
      total: battles.length,
      aWins: 0,
      bWins: 0,
      ties: 0,
      avgScoreA: 0,
      avgScoreB: 0
    };
    
    let sumA = 0, sumB = 0;
    battles.forEach(b => {
      if (b.winner === agentA) stats.aWins++;
      else if (b.winner === agentB) stats.bWins++;
      else stats.ties++;
      
      sumA += b.avg_score_a;
      sumB += b.avg_score_b;
    });
    
    stats.avgScoreA = stats.total > 0 ? sumA / stats.total : 0;
    stats.avgScoreB = stats.total > 0 ? sumB / stats.total : 0;
    
    return { battles: battles.map(this.parse), stats };
  }
}

module.exports = Battle;