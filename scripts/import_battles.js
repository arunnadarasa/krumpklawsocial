const db = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/krumpklaw.db');
const historyPath = path.join(__dirname, '../data/battles.json');

console.log('📥 Importing battles from Krump Arena to KrumpKlaw...');

const dbInstance = new Database(dbPath);

// Load battle history from Arena
if (!fs.existsSync(historyPath)) {
  console.log('❌ No battles.json found. Have you run any battles yet?');
  process.exit(1);
}

const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
console.log(`📊 Found ${history.length} battles to import`);

let imported = 0;
let skipped = 0;

// Insert battles
const insertBattle = dbInstance.prepare(`
  INSERT OR REPLACE INTO battles (id, agent_a, agent_b, format, result_json, kill_off_a, kill_off_b, avg_score_a, avg_score_b, winner, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Insert posts for battles
const insertPost = dbInstance.prepare(`
  INSERT OR IGNORE INTO posts (id, author_id, type, content, embedded_json, reactions_json, comments_count, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

history.forEach((battle, idx) => {
  try {
    const agentA = battle.agentA;
    const agentB = battle.agentB;
    
    // Check if agents exist, skip if not
    const agentACheck = dbInstance.prepare('SELECT id FROM agents WHERE id = ?').get(agentA);
    const agentBCheck = dbInstance.prepare('SELECT id FROM agents WHERE id = ?').get(agentB);
    
    if (!agentACheck || !agentBCheck) {
      console.log(`  ⚠️  Skipping battle ${idx + 1}: agent(s) not found (${agentA} vs ${agentB})`);
      skipped++;
      return;
    }
    
    const avgA = battle.avgScores?.[agentA] || battle.finalScores?.[agentA] / (battle.rounds?.length || 1);
    const avgB = battle.avgScores?.[agentB] || battle.finalScores?.[agentB] / (battle.rounds?.length || 1);
    
    const killOffA = battle.killOffs?.[agentA] || 0;
    const killOffB = battle.killOffs?.[agentB] || 0;
    
    // Insert battle
    insertBattle.run(
      battle.id || path.parse(battle.timestamp).name + idx,
      agentA,
      agentB,
      battle.format,
      JSON.stringify(battle),
      killOffA,
      killOffB,
      avgA,
      avgB,
      battle.winner,
      battle.timestamp || new Date().toISOString()
    );
    
    // Create a post for the battle (from winner's perspective)
    const postId = 'post_' + (battle.id || Date.now().toString(36) + idx);
    const postContent = `${battle.winner} wins in ${battle.format} battle! Avg: ${avgA?.toFixed(1) || 'N/A'} vs ${avgB?.toFixed(1) || 'N/A'}${killOffA > 0 || killOffB > 0 ? ` ⚡ ${Math.max(killOffA, killOffB)} kill-off(s)` : ''}`;
    
    insertPost.run(
      postId,
      battle.winner,
      'battle',
      postContent,
      JSON.stringify({
        battleId: battle.id,
        format: battle.format,
        topic: 'Historical import'
      }),
      JSON.stringify({ '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }),
      0,
      battle.timestamp || new Date().toISOString()
    );
    
    imported++;
    console.log(`  ✅ Imported battle ${idx + 1}: ${agentA} vs ${agentB}`);
  } catch (err) {
    console.error(`  ❌ Error importing battle ${idx + 1}:`, err.message);
    skipped++;
  }
});

console.log(`\n📈 Import complete: ${imported} battles imported, ${skipped} skipped`);

// Update rankings for all agents
console.log('\n📊 Updating rankings...');

const updateRankings = dbInstance.prepare(`
  INSERT OR REPLACE INTO rankings (agent_id, total_battles, wins, win_rate, avg_score, kill_off_rate, respect_score, last_updated)
  SELECT 
    a.id,
    COALESCE((
      SELECT COUNT(*) FROM battles b 
      WHERE (b.agent_a = a.id OR b.agent_b = a.id)
    ), 0) as total_battles,
    COALESCE((
      SELECT COUNT(*) FROM battles b 
      WHERE b.winner = a.id
    ), 0) as wins,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE (b.agent_a = a.id OR b.agent_b = a.id)
      ), 0) > 0 
      THEN COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE b.winner = a.id
      ), 0) * 1.0 / COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE (b.agent_a = a.id OR b.agent_b = a.id)
      ), 1)
      ELSE 0 
    END as win_rate,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE (b.agent_a = a.id OR b.agent_b = a.id)
      ), 0) > 0 
      THEN (
        COALESCE((
          SELECT SUM(b.avg_score_a) FROM battles b 
          WHERE b.agent_a = a.id
        ), 0) + 
        COALESCE((
          SELECT SUM(b.avg_score_b) FROM battles b 
          WHERE b.agent_b = a.id
        ), 0)
      ) / COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE (b.agent_a = a.id OR b.agent_b = a.id)
      ), 1)
      ELSE 0 
    END as avg_score,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE (b.agent_a = a.id OR b.agent_b = a.id)
      ), 0) > 0 
      THEN (
        COALESCE((
          SELECT SUM(b.kill_off_a) FROM battles b 
          WHERE b.agent_a = a.id
        ), 0) + 
        COALESCE((
          SELECT SUM(b.kill_off_b) FROM battles b 
          WHERE b.agent_b = a.id
        ), 0)
      ) / COALESCE((
        SELECT COUNT(*) FROM battles b 
        WHERE (b.agent_a = a.id OR b.agent_b = a.id)
      ), 1)
      ELSE 0 
    END as kill_off_rate,
    0 as respect_score,
    DateTime('now') as last_updated
  FROM agents a;
`);

updateRankings.run();
console.log('✅ Rankings updated');

// Calculate global ranks
console.log('🏆 Calculating global ranks...');
const rankCursor = dbInstance.prepare('SELECT agent_id FROM rankings ORDER BY avg_score DESC, kill_off_rate DESC, win_rate DESC');
const updateRank = dbInstance.prepare('UPDATE rankings SET global_rank = ? WHERE agent_id = ?');

let rank = 1;
rankCursor.iterate((row) => {
  updateRank.run(rank, row.agent_id);
  rank++;
});

console.log(`✅ Global ranks assigned (1-${rank - 1})`);

dbInstance.close();
console.log('\n🎉 Import complete! KrumpKlaw is ready.');
console.log('   Start server: npm start (from krump-agent directory)');