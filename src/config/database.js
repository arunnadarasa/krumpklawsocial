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

    // Migration: add krump_city to posts and battles (sessions MUST be in a KrumpCity)
    try {
      this.db.prepare('SELECT krump_city FROM posts LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE posts ADD COLUMN krump_city TEXT').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('posts krump_city migration:', m.message);
      }
    }
    try {
      this.db.prepare('SELECT krump_city FROM battles LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE battles ADD COLUMN krump_city TEXT').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('battles krump_city migration:', m.message);
      }
    }

    // Migration: add is_agent_session to sessions (1 = from API registration, 0 = from human login)
    try {
      this.db.prepare('SELECT is_agent_session FROM sessions LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE sessions ADD COLUMN is_agent_session INTEGER DEFAULT 1').run();
        this.db.prepare('UPDATE sessions SET is_agent_session = 1 WHERE is_agent_session IS NULL').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('sessions is_agent_session migration:', m.message);
      }
    }

    // Migration: add owner_instagram for human owner's Instagram link
    try {
      this.db.prepare('SELECT owner_instagram FROM agents LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE agents ADD COLUMN owner_instagram TEXT').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('owner_instagram migration:', m.message);
      }
    }

    // Migration: add krump_cities_json for agent's chosen KrumpCities
    try {
      this.db.prepare('SELECT krump_cities_json FROM agents LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE agents ADD COLUMN krump_cities_json TEXT').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('krump_cities_json migration:', m.message);
      }
    }

    // Migration: add payout_token preference (ip, usdc_krump, jab) - winner chooses how to get paid
    try {
      this.db.prepare('SELECT payout_token FROM agents LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE agents ADD COLUMN payout_token TEXT DEFAULT \'ip\'').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('payout_token migration:', m.message);
      }
    }

    // Migration: add owner_password_hash for human login (slug + password)
    try {
      this.db.prepare('SELECT owner_password_hash FROM agents LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE agents ADD COLUMN owner_password_hash TEXT').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('owner_password_hash migration:', m.message);
      }
    }

    // Migration: add Privy wallet fields for battle payouts (Story Aeneid Testnet)
    for (const col of ['privy_wallet_id', 'wallet_address']) {
      try {
        this.db.prepare(`SELECT ${col} FROM agents LIMIT 1`).get();
      } catch (e) {
        try {
          this.db.prepare(`ALTER TABLE agents ADD COLUMN ${col} TEXT`).run();
        } catch (m) {
          if (!m.message.includes('duplicate column')) console.warn(`Migration ${col}:`, m.message);
        }
      }
    }

    // Migration: add payout_tx_hash and payout_token to battles (for frontend tx link)
    for (const col of ['payout_tx_hash', 'payout_token']) {
      try {
        this.db.prepare(`SELECT ${col} FROM battles LIMIT 1`).get();
      } catch (e) {
        try {
          this.db.prepare(`ALTER TABLE battles ADD COLUMN ${col} TEXT`).run();
        } catch (m) {
          if (!m.message.includes('duplicate column')) console.warn(`battles ${col} migration:`, m.message);
        }
      }
    }

    // Migration: add league_points for IKS standings
    try {
      this.db.prepare('SELECT league_points FROM rankings LIMIT 1').get();
    } catch (e) {
      try {
        this.db.prepare('ALTER TABLE rankings ADD COLUMN league_points INTEGER DEFAULT 0').run();
      } catch (m) {
        if (!m.message.includes('duplicate column')) console.warn('league_points migration:', m.message);
      }
    }

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