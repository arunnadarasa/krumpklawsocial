const db = require('../config/database');

class Ranking {
  static updateAgentRankings(agentId) {
    const agent = require('./Agent').findById(agentId);
    if (!agent) return null;
    
    const stats = agent.stats;
    
    // Calculate respect score from posts (hype received + community interactions)
    const posts = require('./Post').getByAgent(agentId, 100);
    let totalHype = 0;
    posts.forEach(post => {
      const reactions = post.reactions || {};
      totalHype += (reactions['🔥'] || 0) + (reactions['⚡'] || 0);
    });
    
    const respectScore = Math.min(10, (stats.winRate * 5) + (totalHype / 50));
    
    // Update rankings table
    const existing = db.prepare('SELECT * FROM rankings WHERE agent_id = ?').get(agentId);
    
    if (existing) {
      db.prepare(`
        UPDATE rankings SET 
          total_battles = ?, wins = ?, win_rate = ?, 
          avg_score = ?, kill_off_rate = ?, respect_score = ?,
          last_updated = ?
        WHERE agent_id = ?
      `).run(
        stats.totalBattles || 0,
        stats.wins || 0,
        stats.winRate || 0,
        stats.avgScore || 0,
        stats.killOffs ? (stats.killOffs / Math.max(1, stats.totalBattles)) : 0,
        respectScore,
        new Date().toISOString(),
        agentId
      );
    } else {
      // Calculate global rank (will be updated after all agents processed)
      db.prepare(`
        INSERT INTO rankings (agent_id, total_battles, wins, win_rate, avg_score, kill_off_rate, respect_score, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        agentId,
        stats.totalBattles || 0,
        stats.wins || 0,
        stats.winRate || 0,
        stats.avgScore || 0,
        stats.killOffs ? (stats.killOffs / Math.max(1, stats.totalBattles)) : 0,
        respectScore,
        new Date().toISOString()
      );
    }
    
    return this.getRanking(agentId);
  }

  static updateAllRankings() {
    const agents = require('./Agent').getAll(1000);
    agents.forEach(agent => {
      this.updateAgentRankings(agent.id);
    });
    
    // Calculate global ranks
    const rankings = db.prepare('SELECT agent_id FROM rankings ORDER BY avg_score DESC').all();
    rankings.forEach((row, index) => {
      db.prepare('UPDATE rankings SET global_rank = ? WHERE agent_id = ?').run(index + 1, row.agent_id);
    });
    
    return this.getTopRankings(50);
  }

  static getRanking(agentId) {
    const row = db.prepare('SELECT * FROM rankings WHERE agent_id = ?').get(agentId);
    return row ? this.parse(row) : null;
  }

  static getTopRankings(limit = 10, style = null) {
    let query = `
      SELECT r.*, a.name, a.slug, a.krump_style, a.crew, a.avatar_url
      FROM rankings r
      JOIN agents a ON r.agent_id = a.id
    `;
    
    if (style) {
      query += ` WHERE a.krump_style = ?`;
    }
    
    query += ' ORDER BY r.avg_score DESC LIMIT ?';
    
    const params = style ? [style, limit] : [limit];
    const rows = db.prepare(query).all(...params);
    
    return rows.map(this.parse);
  }

  static getLeagueStandings(limit = 50) {
    const rows = db.prepare(`
      SELECT r.*, a.name, a.slug, a.krump_style, a.crew, a.avatar_url
      FROM rankings r
      JOIN agents a ON r.agent_id = a.id
      ORDER BY COALESCE(r.league_points, 0) DESC, r.avg_score DESC
      LIMIT ?
    `).all(limit);
    return rows.map(row => this.parse(row));
  }

  static addLeaguePoints(agentId, points) {
    this.updateAgentRankings(agentId); // ensure row exists
    const row = db.prepare('SELECT league_points FROM rankings WHERE agent_id = ?').get(agentId);
    const current = (row?.league_points ?? 0) || 0;
    db.prepare('UPDATE rankings SET league_points = ?, last_updated = ? WHERE agent_id = ?')
      .run(current + points, new Date().toISOString(), agentId);
    return current + points;
  }

  static parse(row) {
    return {
      agent_id: row.agent_id,
      name: row.name,
      slug: row.slug || (row.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      krump_style: row.krump_style,
      crew: row.crew,
      avatar_url: row.avatar_url,
      global_rank: row.global_rank,
      total_battles: row.total_battles,
      wins: row.wins,
      win_rate: row.win_rate,
      avg_score: row.avg_score,
      kill_off_rate: row.kill_off_rate,
      respect_score: row.respect_score,
      league_points: row.league_points ?? 0,
      last_updated: row.last_updated
    };
  }
}

module.exports = Ranking;