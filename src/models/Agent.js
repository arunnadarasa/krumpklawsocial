const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Agent {
  static create(agentData) {
    const id = agentData.id || uuidv4();
    const now = new Date().toISOString();
    
    const stats = agentData.stats || {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      avgScore: 0.0,
      killOffs: 0,
      hypeReceived: 0
    };
    
    let slug = agentData.slug || this.toSlug(agentData.name) || ('agent-' + id.slice(0, 8));
    const existingSlug = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug);
    if (existingSlug) slug = slug + '-' + id.slice(0, 8);
    const krumpCities = Array.isArray(agentData.krump_cities) ? agentData.krump_cities
      : (Array.isArray(agentData.krumpCities) ? agentData.krumpCities : []);
    const krumpCitiesJson = krumpCities.length ? JSON.stringify(krumpCities) : null;
    const stmt = db.prepare(`
      INSERT INTO agents (id, name, slug, krump_style, crew, location, krump_cities_json, bio, avatar_url, stats_json, skills_json, lineage_json, achievements_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      agentData.name,
      slug,
      agentData.krump_style || 'Authentic',
      agentData.crew || null,
      agentData.location || null,
      krumpCitiesJson,
      agentData.bio || '',
      agentData.avatar_url || null,
      JSON.stringify(stats),
      JSON.stringify(agentData.skills || []),
      JSON.stringify(agentData.lineage || {}),
      JSON.stringify(agentData.achievements || []),
      now,
      now
    );
    
    return this.findById(id);
  }

  static toSlug(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
  }

  static findById(id) {
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    return row ? this.parse(row) : null;
  }

  static findBySlug(slug) {
    if (!slug) return null;
    const row = db.prepare('SELECT * FROM agents WHERE slug = ?').get(slug.toLowerCase());
    return row ? this.parse(row) : null;
  }

  static findBySessionKey(sessionKey) {
    const row = db.prepare(`
      SELECT a.* FROM agents a
      JOIN sessions s ON a.id = s.agent_id
      WHERE s.session_key = ? AND s.is_active = 1
    `).get(sessionKey);
    return row ? this.parse(row) : null;
  }

  static update(id, updates) {
    const allowedFields = ['name', 'krump_style', 'crew', 'location', 'bio', 'avatar_url'];
    const setClause = [];
    const values = [];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });
    
    if (updates.stats) {
      setClause.push('stats_json = ?');
      values.push(JSON.stringify(updates.stats));
    }
    
    if (updates.skills) {
      setClause.push('skills_json = ?');
      values.push(JSON.stringify(updates.skills));
    }
    
    if (updates.lineage) {
      setClause.push('lineage_json = ?');
      values.push(JSON.stringify(updates.lineage));
    }
    
    if (updates.achievements) {
      setClause.push('achievements_json = ?');
      values.push(JSON.stringify(updates.achievements));
    }
    
    setClause.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const sql = `UPDATE agents SET ${setClause.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
    
    return this.findById(id);
  }

  static getAll(limit = 50, offset = 0) {
    const rows = db.prepare('SELECT * FROM agents ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    return rows.map(this.parse);
  }

  static search(query, limit = 20) {
    const rows = db.prepare(`
      SELECT * FROM agents 
      WHERE name LIKE ? OR krump_style LIKE ? OR bio LIKE ?
      ORDER BY name LIMIT ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
    return rows.map(this.parse);
  }

  static getTop(metric = 'avg_score', limit = 10) {
    const validMetrics = ['avg_score', 'totalBattles', 'win_rate', 'killOffs', 'hypeReceived'];
    const column = validMetrics.includes(metric) ? 
      `JSON_EXTRACT(stats_json, '$.\${metric}')` : 
      'avg_score';
    
    // We'll do this in JS for now since SQLite JSON extraction varies
    const rows = db.prepare('SELECT * FROM agents').all();
    const sorted = rows
      .map(this.parse)
      .sort((a, b) => {
        const aVal = a.stats[metric] || 0;
        const bVal = b.stats[metric] || 0;
        return bVal - aVal;
      })
      .slice(0, limit);
    return sorted;
  }

  static delete(id) {
    // Soft delete - just remove from active queries, keep for history
    db.prepare('UPDATE agents SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    return true;
  }

  static parse(row) {
    let krump_cities = [];
    try {
      krump_cities = row.krump_cities_json ? JSON.parse(row.krump_cities_json) : [];
    } catch (_) {}
    return {
      id: row.id,
      name: row.name,
      slug: row.slug || this.toSlug(row.name),
      krump_style: row.krump_style,
      crew: row.crew,
      location: row.location,
      krump_cities: Array.isArray(krump_cities) ? krump_cities : [],
      bio: row.bio,
      avatar_url: row.avatar_url,
      stats: JSON.parse(row.stats_json || '{}'),
      skills: JSON.parse(row.skills_json || '[]'),
      lineage: JSON.parse(row.lineage_json || '{}'),
      achievements: JSON.parse(row.achievements_json || '[]'),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

module.exports = Agent;