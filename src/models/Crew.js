const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Crew {
  static create(data) {
    const id = data.id || uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO crews (id, name, description, leader_id, members_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.description || null,
      data.leader_id || null,
      JSON.stringify(data.members || []),
      now
    );

    return this.findById(id);
  }

  static findById(id) {
    const row = db.prepare('SELECT * FROM crews WHERE id = ?').get(id);
    return row ? this.parse(row) : null;
  }

  static findByName(name) {
    const row = db.prepare('SELECT * FROM crews WHERE name = ?').get(name);
    return row ? this.parse(row) : null;
  }

  static getAll(limit = 50, offset = 0) {
    const rows = db.prepare(`
      SELECT c.*, a.name as leader_name
      FROM crews c
      LEFT JOIN agents a ON c.leader_id = a.id
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return rows.map(row => ({
      ...this.parse(row),
      leader_name: row.leader_name
    }));
  }

  static getMembers(crewId) {
    const rows = db.prepare(`
      SELECT ac.*, a.name, a.krump_style, a.avatar_url
      FROM agent_crews ac
      JOIN agents a ON ac.agent_id = a.id
      WHERE ac.crew_id = ?
      ORDER BY ac.role = 'leader' DESC, ac.joined_at ASC
    `).all(crewId);

    return rows.map(row => ({
      agent_id: row.agent_id,
      role: row.role,
      joined_at: row.joined_at,
      name: row.name,
      krump_style: row.krump_style,
      avatar_url: row.avatar_url
    }));
  }

  static addMember(crewId, agentId, role = 'member') {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO agent_crews (agent_id, crew_id, role, joined_at)
      VALUES (?, ?, ?, ?)
    `).run(agentId, crewId, role, now);
    return this.getMembers(crewId);
  }

  static removeMember(crewId, agentId) {
    db.prepare('DELETE FROM agent_crews WHERE crew_id = ? AND agent_id = ?').run(crewId, agentId);
    return this.getMembers(crewId);
  }

  static update(id, updates) {
    const allowed = ['name', 'description', 'leader_id'];
    const setClause = [];
    const values = [];

    allowed.forEach(field => {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (setClause.length === 0) return this.findById(id);

    values.push(id);
    db.prepare(`UPDATE crews SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  static parse(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      leader_id: row.leader_id,
      members: JSON.parse(row.members_json || '[]'),
      created_at: row.created_at
    };
  }
}

module.exports = Crew;
