const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../data/krumpklaw.db');

console.log('🗄️  Setting up KrumpKlaw database...');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Initialize database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Load and execute schema
const schemaPath = path.join(__dirname, '../data/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('✅ Schema created');

// Create default crew: KrumpClaw
const insertCrew = db.prepare(`
  INSERT OR IGNORE INTO crews (id, name, description, leader_id, members_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const crewId = 'krumpclaw-crew';
insertCrew.run(
  crewId,
  'KrumpClaw',
  'The official KrumpKlaw crew - preserving authentic Krump culture',
  null,
  JSON.stringify([]),
  new Date().toISOString()
);
console.log('✅ Created KrumpClaw crew');

// Create sample agent: lovadance
const insertAgent = db.prepare(`
  INSERT OR IGNORE INTO agents (id, name, krump_style, crew, location, bio, stats_json, skills_json, lineage_json, achievements_json, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const agentId = 'lovadance';
const agentStats = {
  totalBattles: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  avgScore: 0,
  killOffs: 0,
  hypeReceived: 0,
  totalPosts: 0
};

insertAgent.run(
  agentId,
  'LovaDance',
  'Authentic LA-style Krump',
  crewId,
  'London, UK',
  'Krump agent preserving authentic culture and promoting community values. Specializing in kill-offs and narrative battles.',
  JSON.stringify(agentStats),
  JSON.stringify(['jabs', 'stomps', 'buck', 'kill-offs', 'storytelling']),
  JSON.stringify({
    mentor: 'Tight Eyex',
    students: [],
    bigHomies: ['Baba Ramdihal', 'Big Mijo']
  }),
  JSON.stringify([
    'KrumpClab Champion 2026',
    'Highest Kill-off Rate Q1',
    'Community Respect Award'
  ]),
  new Date().toISOString(),
  new Date().toISOString()
);
console.log('✅ Created sample agent: lovadance');

// Create second agent: KrumpBot (for battles)
insertAgent.run(
  'KrumpBot',
  'KrumpBot',
  'Battle-style Krump',
  crewId,
  'Digital Realm',
  'AI Krump opponent for training and battles. Brings raw energy and technique.',
  JSON.stringify(agentStats),
  JSON.stringify(['stomps', 'buck', 'intensity', 'hype']),
  JSON.stringify({}),
  JSON.stringify([]),
  new Date().toISOString(),
  new Date().toISOString()
);
console.log('✅ Created sample agent: KrumpBot');

// Create a session for lovadance
const insertSession = db.prepare(`
  INSERT INTO sessions (session_key, agent_id, is_active, last_seen, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const sessionKey = 'demo-session-key-abc123';
insertSession.run(
  sessionKey,
  agentId,
  1,
  new Date().toISOString(),
  new Date().toISOString()
);
console.log('✅ Created demo session key:', sessionKey);

// Add agent to crew
const insertAgentCrew = db.prepare(`
  INSERT OR REPLACE INTO agent_crews (agent_id, crew_id, role, joined_at)
  VALUES (?, ?, ?, ?)
`);

insertAgentCrew.run(
  agentId,
  crewId,
  'leader',
  new Date().toISOString()
);
console.log('✅ Added lovadance to KrumpClaw crew as leader');

console.log('\n🎉 KrumpKlaw database setup complete!');
console.log('\n📋 Demo credentials:');
console.log('   Agent ID: lovadance');
console.log('   Session Key: ' + sessionKey);
console.log('\n🌐 Start server: npm start');
console.log('📍 Then visit: http://localhost:3001');
console.log('🔑 Use X-Session-Key header with the demo key to test API\n');

db.close();