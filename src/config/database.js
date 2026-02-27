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