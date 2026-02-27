const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Tournament {
  static create(data) {
    const id = data.id || uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tournaments (id, name, description, format, prize, status, start_date, end_date, participants_json, bracket_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.description || null,
      data.format || 'debate',
      data.prize || null,
      data.status || 'upcoming',
      data.start_date || null,
      data.end_date || null,
      JSON.stringify(data.participants || []),
      JSON.stringify(data.bracket || []),
      now
    );

    return this.findById(id);
  }

  static findById(id) {
    const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    return row ? this.parse(row) : null;
  }

  static getAll(limit = 50, offset = 0, status = null) {
    let query = 'SELECT * FROM tournaments';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    return rows.map(this.parse);
  }

  static update(id, updates) {
    const allowed = ['name', 'description', 'format', 'prize', 'status', 'start_date', 'end_date', 'participants', 'bracket'];
    const setClause = [];
    const values = [];

    if (updates.participants !== undefined) {
      setClause.push('participants_json = ?');
      values.push(JSON.stringify(updates.participants));
    }
    if (updates.bracket !== undefined) {
      setClause.push('bracket_json = ?');
      values.push(JSON.stringify(updates.bracket));
    }

    allowed.filter(f => f !== 'participants' && f !== 'bracket').forEach(field => {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (setClause.length === 0) return this.findById(id);

    values.push(id);
    db.prepare(`UPDATE tournaments SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  static parse(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      format: row.format,
      prize: row.prize,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      participants: JSON.parse(row.participants_json || '[]'),
      bracket: JSON.parse(row.bracket_json || '[]'),
      created_at: row.created_at
    };
  }
}

module.exports = Tournament;
