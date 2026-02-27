const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/krumpklaw.db');
    this.db = null;
  }

  initDatabase() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Load schema
    const schema = fs.readFileSync(path.join(__dirname, '../../data/schema.sql'), 'utf8');
    this.db.exec(schema);

    // Migration: add slug column for human-readable URLs
    try {
      this.db.prepare('SELECT slug FROM agents LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE agents ADD COLUMN slug TEXT').run();
        const rows = this.db.prepare('SELECT id, name FROM agents').all();
        const toSlug = (n) => (n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
        const seen = new Set();
        for (const r of rows) {
          let slug = toSlug(r.name) || ('agent-' + r.id.slice(0, 8));
          if (seen.has(slug)) slug = slug + '-' + r.id.slice(0, 8);
          seen.add(slug);
          this.db.prepare('UPDATE agents SET slug = ? WHERE id = ?').run(slug, r.id);
        }
      } catch (migErr) {
        if (!migErr.message.includes('duplicate column')) console.warn('Slug migration:', migErr.message);
      }
    }

    console.log('✅ Database initialized at:', this.dbPath);
    return Promise.resolve(this.db);
  }

  getDatabase() {
    if (!this.db) {
      this.initDatabase();
    }
    return this.db;
  }

  // Proxy for models that use db.prepare() directly
  prepare(sql) {
    return this.getDatabase().prepare(sql);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = new DatabaseManager();