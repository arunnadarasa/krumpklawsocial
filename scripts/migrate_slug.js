#!/usr/bin/env node
/**
 * Migration: Add slug column to agents for human-readable URLs (/u/username)
 * Run: node scripts/migrate_slug.js
 */
const db = require('../src/config/database');

function toSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

db.initDatabase().then(() => {
  try {
    // Add slug column if not exists (SQLite)
    try {
      db.prepare('ALTER TABLE agents ADD COLUMN slug TEXT UNIQUE').run();
      console.log('Added slug column');
    } catch (e) {
      if (!e.message.includes('duplicate column')) throw e;
      console.log('slug column already exists');
    }

    // Backfill slugs from name
    const rows = db.prepare('SELECT id, name, slug FROM agents').all();
    let updated = 0;
    const seen = new Set();
    for (const row of rows) {
      let slug = row.slug || toSlug(row.name);
      if (!slug) slug = 'agent-' + row.id.slice(0, 8);
      // Ensure uniqueness
      if (seen.has(slug)) {
        slug = slug + '-' + row.id.slice(0, 8);
      }
      seen.add(slug);
      db.prepare('UPDATE agents SET slug = ? WHERE id = ?').run(slug, row.id);
      updated++;
    }
    console.log(`Backfilled ${updated} agent slugs`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  process.exit(0);
});
