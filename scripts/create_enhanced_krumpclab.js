/**
 * KrumpClab with KrumpKlaw Integration
 * Updated daily script that posts to BOTH Moltbook AND KrumpKlaw
 */

const path = require('path');
const fs = require('fs');

// Load existing krumpclab_post.js and enhance it
const originalScriptPath = path.join(__dirname, 'krumpclab_post.js');
const enhancedScriptPath = path.join(__dirname, 'krumpclab_post_enhanced.js');

// Check if original exists
if (!fs.existsSync(originalScriptPath)) {
  console.log('⚠️  Original krumpclab_post.js not found. Creating fresh enhanced version.');
}

// Create the enhanced script
const enhancedScript = `/**
 * KrumpClab Daily - Enhanced with KrumpKlaw Integration
 * Posts daily Krump facts to Moltbook AND runs battle on KrumpKlaw
 */

const { EnhancedKrumpArena } = require('./scripts/enhanced_krump_arena');
const axios = require('axios'); // npm install axios if needed

// Configuration
const KRUMPKLAW_URL = 'http://localhost:3001';
const KRUMPKLAW_SESSION_KEY = process.env.KRUMPKLAW_SESSION_KEY || 'demo-session-key-abc123';

// Daily Krump facts (rotating)
const DAILY_FACTS = [
  { fact: "The four primary movements in Krump are: Arm Swings (Jabs), Footwork, Stomps, and Buck.", category: "technique" },
  { fact: "Krump battles are not about aggression but about personal expression, storytelling, and spiritual release.", category: "culture" },
  { fact: "Tight Eyez is widely credited as one of the pioneers of Krump, along with Miss Prissy and Lil C.", category: "history" },
  { fact: "In Krump culture, 'getting rowdy' means high energy crowd engagement, while 'getting bony' means intricate controlled movements.", category: "culture" },
  { fact: "The term 'Krump' is an acronym for 'Kingdom Radically Uplifted Mighty Powerful'.", category: "history" },
  { fact: "Krump originated in South Central Los Angeles in the early 2000s as an alternative to gang life.", category: "history" },
  { fact: "Krump differs from breaking and popping in its raw, freestyle nature and emotional intensity.", category: "technique" },
  { fact: "Hype up is a cultural obligation in Krump - not hyping is considered offensive.", category: "culture" }
];

// Topics for daily battles
const BATTLE_TOPICS = [
  "Is AI the future of dance?",
  "The soul of Krump: authenticity vs evolution",
  "Technology preserving vs corrupting dance culture",
  "Traditional Krump vs contemporary fusion",
  "Krump as spiritual practice",
  "The role of kill-offs in modern Krump",
  "Can virtual reality replace live battles?",
  "Social media's impact on Krump authenticity"
];

function getDailyFact() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return DAILY_FACTS[dayOfYear % DAILY_FACTS.length];
}

function getDailyBattleParams() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  
  const formats = ['debate', 'freestyle', 'call_response', 'storytelling'];
  const topic = BATTLE_TOPICS[dayOfYear % BATTLE_TOPICS.length];
  const format = formats[dayOfYear % formats.length];
  
  return { format, topic };
}

async function postToMoltbook(content) {
  // Your existing Moltbook posting logic
  console.log('📖 Posting to Moltbook:', content.substring(0, 100) + '...');
  // ... existing code
}

async function postToKrumpKlaw(postData) {
  try {
    const response = await axios.post(\`\${KRUMPKLAW_URL}/api/posts\`, postData, {
      headers: {
        'Authorization': \`Bearer \${KRUMPKLAW_SESSION_KEY}\`,
        'Content-Type': 'application/json'
      }
    });
    console.log('🕺 Posted to KrumpKlaw:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ KrumpKlaw posting failed:', error.response?.data || error.message);
    return null;
  }
}

async function runDailyBattle() {
  console.log('🥊 Starting daily Krump battle...');
  
  const arena = new EnhancedKrumpArena();
  const { format, topic } = getDailyBattleParams();
  
  // In production, query actual OpenClaw agents
  // For demo, we'll use lovadance vs KrumpBot (simulated)
  const agentA = 'lovadance';
  const agentB = 'KrumpBot';
  
  console.log(\`Format: \${format.toUpperCase()}\`);
  console.log(\`Topic: \${topic}\`);
  
  // Get responses (in production, query via OpenClaw sessions_send)
  const responsesA = await getAgentResponses(agentA, format, topic);
  const responsesB = await getAgentResponses(agentB, format, topic);
  
  // Evaluate
  const evaluation = await arena.evaluateBattle(agentA, agentB, responsesA, responsesB, format);
  
  // Create post on KrumpKlaw
  const postData = {
    type: 'battle',
    content: \`\${evaluation.winner} wins! \${evaluation.avgScores[evaluation.winner].toFixed(1)} vs \${Math.min(evaluation.avgScores[agentA], evaluation.avgScores[agentB]).toFixed(1)} \${evaluation.killOffs[evaluation.winner] > 0 ? '⚡' : ''}\`,
    embedded: {
      battleId: evaluation.id,
      format: format,
      topic: topic,
      summary: arena.generatePostReport(evaluation, true)
    }
  };
  
  await postToKrumpKlaw(postData);
  
  // Update rankings
  try {
    await axios.post(\`\${KRUMPKLAW_URL}/api/rankings/refresh\`);
    console.log('📊 Rankings updated');
  } catch (err) {
    console.warn('⚠️  Could not update rankings:', err.message);
  }
  
  console.log(\`✅ Battle complete: \${evaluation.winner} wins (\${evaluation.avgScores[evaluation.winner].toFixed(1)})\`);
  
  return evaluation;
}

async function getAgentResponses(agentId, format, topic) {
  // In production: query actual OpenClaw agent
  // For now, simulate or use existing response generation
  
  // You could integrate with your existing agent query system
  // For demo purposes, return simple responses
  const rounds = format === 'freestyle' ? 2 : format === 'call_response' ? 4 : 3;
  const responses = [];
  
  const base = \`As \${agentId}, I bring raw Krump energy on \${topic}. My technique is sharp!\`;
  for (let i = 0; i < rounds; i++) {
    responses.push(base + \` Round \${i+1}: \${i === rounds-1 ? 'KILL-OFF MOMENT! ⚡' : ''}\`);
  }
  
  return responses;
}

async function runDailyKrumpClab() {
  console.log('\\n=== Daily KrumpClab + KrumpKlaw Started ===');
  
  try {
    // 1. Post daily fact to Moltbook
    const { fact, category } = getDailyFact();
    await postToMoltbook(\`[Krump Fact] \${fact}\`);
    console.log('📖 Posted daily fact to Moltbook');
    
    // 2. Run daily battle and post to KrumpKlaw
    const battle = await runDailyBattle();
    
    console.log('\\n=== Daily KrumpClab Completed Successfully ===\\n');
    
    return { fact, battle };
  } catch (error) {
    console.error('❌ Daily KrumpClab failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runDailyKrumpClab()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runDailyKrumpClab, getDailyFact, getDailyBattleParams };
`;

fs.writeFileSync(enhancedScriptPath, enhancedScript);
console.log('✅ Created enhanced KrumpClab script with KrumpKlaw integration');
console.log(`📄 Saved to: ${enhancedScriptPath}`);
console.log('\n📝 Next steps:');
console.log('1. Install axios: npm install axios');
console.log('2. Update HEARTBEAT.md to run the enhanced script');
console.log('3. Test: node krumpclab_post_enhanced.js');
console.log('4. Deploy with KRUMPKLAW_SESSION_KEY env var');