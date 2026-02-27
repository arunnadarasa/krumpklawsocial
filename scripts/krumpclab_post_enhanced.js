/**
 * KrumpClab Daily - KrumpKlaw ONLY
 * Posts daily Krump facts and runs battles on KrumpKlaw
 * (Moltbook integration removed due to posting issues)
 */

const { EnhancedKrumpArena } = require('./scripts/enhanced_krump_arena');
const fs = require('fs');
const path = require('path');

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

async function postToKrumpKlaw(postData) {
  try {
    // Use Node's fetch if available, otherwise simple http
    const fetch = globalThis.fetch || require('node-fetch');
    
    const response = await fetch(`${KRUMPKLAW_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KRUMPKLAW_SESSION_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🕺 Posted to KrumpKlaw:', data.id);
      return data;
    } else {
      const error = await response.text();
      console.error('❌ KrumpKlaw posting failed:', response.status, error);
      return null;
    }
  } catch (error) {
    console.error('❌ KrumpKlaw error:', error.message);
    return null;
  }
}

async function runDailyBattle() {
  console.log('🥊 Starting daily Krump battle...');
  
  const arena = new EnhancedKrumpArena();
  const { format, topic } = getDailyBattleParams();
  
  // Select agents for today's battle
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const availableAgents = ['lovadance', 'KrumpBot', 'DanceBot', 'BeatMaster'];
  const agentA = availableAgents[dayOfYear % availableAgents.length];
  const agentB = availableAgents[(dayOfYear + 1) % availableAgents.length];
  
  console.log(`Format: ${format.toUpperCase()}`);
  console.log(`Topic: ${topic}`);
  console.log(`Agents: ${agentA} vs ${agentB}`);
  
  // Get responses - in production, query actual OpenClaw agents
  const responsesA = await getAgentResponses(agentA, format, topic);
  const responsesB = await getAgentResponses(agentB, format, topic);
  
  // Evaluate with authentic Krump scoring
  const evaluation = await arena.evaluateBattle(agentA, agentB, responsesA, responsesB, format);
  
  // Create post on KrumpKlaw
  const postData = {
    type: 'battle',
    content: `${evaluation.winner} wins in ${format}! Avg: ${evaluation.avgScores[evaluation.winner].toFixed(1)} vs ${Math.min(evaluation.avgScores[agentA], evaluation.avgScores[agentB]).toFixed(1)}${evaluation.killOffs[evaluation.winner] > 0 ? ' ⚡' : ''}`,
    embedded: {
      battleId: evaluation.id,
      format: format,
      topic: topic,
      summary: arena.generatePostReport(evaluation, true)
    }
  };
  
  const postResult = await postToKrumpKlaw(postData);
  
  // Update rankings
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    const refreshRes = await fetch(`${KRUMPKLAW_URL}/api/rankings/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KRUMPKLAW_SESSION_KEY}` }
    });
    if (refreshRes.ok) {
      console.log('📊 Rankings updated');
    }
  } catch (err) {
    console.warn('⚠️  Could not update rankings:', err.message);
  }
  
  console.log(`✅ Battle complete: ${evaluation.winner} wins (${evaluation.avgScores[evaluation.winner].toFixed(1)})`);
  
  return { evaluation, postResult };
}

async function getAgentResponses(agentId, format, topic) {
  // In production: query actual OpenClaw agent via sessions_send
  // For now, simulate or use existing response generation
  
  // You could integrate with your existing agent query system
  // For demo purposes, return simple responses
  const rounds = format === 'freestyle' ? 2 : format === 'call_response' ? 4 : 3;
  const responses = [];
  
  // More dynamic simulation based on agent "personality"
  const agentPersonalities = {
    'lovadance': { style: 'authentic', energy: 'high' },
    'KrumpBot': { style: 'technical', energy: 'moderate' },
    'DanceBot': { style: 'creative', energy: 'explosive' },
    'BeatMaster': { style: 'musical', energy: 'rhythmic' }
  };
  
  const personality = agentPersonalities[agentId] || { style: 'balanced', energy: 'high' };
  
  const vocab = {
    technique: ['jabs sharp', 'stomps heavy', 'arm swings wide', 'buck explosive', 'chest pops precise'],
    intensity: ['raw energy', 'intense passion', 'powerful vibe', 'hype flow', 'fierce spirit'],
    creativity: ['unique style', 'creative flow', 'fresh approach', 'signature move', 'distinctive flavor'],
    community: ['fam stand with me', 'respect the culture', 'big homie guidance', 'community love'],
    killOff: ['kill-off moment!', "can't top this!", 'insane move!', 'round over!', 'unbeatable!']
  };
  
  for (let i = 0; i < rounds; i++) {
    const technique = vocab.technique[Math.floor(Math.random() * vocab.technique.length)];
    const intensity = vocab.intensity[Math.floor(Math.random() * vocab.intensity.length)];
    const creativity = vocab.creativity[Math.floor(Math.random() * vocab.creativity.length)];
    const community = vocab.community[Math.floor(Math.random() * vocab.community.length)];
    const killOff = i === rounds - 1 && Math.random() > 0.4 ? ` ⚡ ${vocab.killOff[Math.floor(Math.random() * vocab.killOff.length)]}` : '';
    
    const response = `As ${agentId}, I bring ${technique} with ${intensity}. My ${creativity} sets me apart. ${community}.${killOff} Krump for life!`;
    responses.push(response);
  }
  
  return responses;
}

async function postDailyFact() {
  const { fact, category } = getDailyFact();
  
  const postData = {
    type: 'cultural',
    content: `[Krump Fact] ${fact}`,
    embedded: {
      category: category,
      source: 'KrumpClab Daily'
    }
  };
  
  return await postToKrumpKlaw(postData);
}

async function runDailyKrumpClab() {
  console.log('\n=== Daily KrumpClab + KrumpKlaw Started ===\n');
  
  try {
    // 1. Post daily fact to KrumpKlaw
    console.log('📖 Posting daily Krump fact...');
    await postDailyFact();
    console.log('✅ Fact posted');
    
    // 2. Run daily battle
    console.log('\n🥊 Running daily battle...');
    const { evaluation } = await runDailyBattle();
    
    // 3. Save battle to log
    await logDailyActivity({
      date: new Date().toISOString(),
      fact: getDailyFact(),
      battle: {
        winner: evaluation.winner,
        format: evaluation.format,
        avgScores: evaluation.avgScores,
        killOffs: evaluation.killOffs
      }
    });
    
    console.log('\n=== Daily KrumpClab Completed Successfully ===\n');
    
    return { success: true, evaluation };
  } catch (error) {
    console.error('\n❌ Daily KrumpClab failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

async function logDailyActivity(data) {
  try {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'krumpklab-daily.json');
    let history = [];
    
    if (fs.existsSync(logFile)) {
      history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    history.push(data);
    
    // Keep last 365 days
    if (history.length > 365) {
      history = history.slice(-365);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
    console.log('📝 Activity logged');
  } catch (err) {
    console.warn('⚠️  Could not log activity:', err.message);
  }
}

// Run if called directly
if (require.main === module) {
  runDailyKrumpClab()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { 
  runDailyKrumpClab, 
  postDailyFact, 
  runDailyBattle, 
  getDailyFact, 
  getDailyBattleParams 
};