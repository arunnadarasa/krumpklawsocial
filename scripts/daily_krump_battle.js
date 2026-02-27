/**
 * KrumpClab Daily Battle - Integrates Krump Arena into daily routine
 * Run this as part of your KrumpClab daily workflow
 */

const path = require('path');
const fs = require('fs');

// Simple KrumpBattleArena implementation (standalone for reliability)
const JUDGING_CRITERIA = {
  technique: { description: 'Krump terminology and style', weight: 1.0, markers: ['jabs', 'stomps', 'arm swings', 'buck', 'krump', 'fam', 'blood', 'hype', 'vibe', 'feed', 'call', 'daggering'] },
  intensity: { description: 'Energy and emotional intensity', weight: 1.2, markers: ['raw', 'intense', 'powerful', 'aggressive', 'explosive', 'dynamic', 'charged', 'electric', 'force', 'impact', 'fury', 'dominance'] },
  originality: { description: 'Creative expression', weight: 1.1, markers: ['unique', 'original', 'creative', 'novel', 'fresh', 'unexpected', 'inventive', 'distinctive', 'signature', 'personal', 'style', 'flavor', 'twist'] },
  consistency: { description: 'Character consistency', weight: 1.0, markers: ['consistent', 'throughout', 'maintain', 'coherent', 'flow', 'rhythm', 'pacing', 'build', 'climax'] },
  impact: { description: 'Persuasive effectiveness', weight: 1.3, markers: ['strong', 'convincing', 'memorable', 'powerful', 'dominant', 'superior', 'definitive', 'overwhelming', 'crush', 'victory', 'win', 'dominate'] }
};

class SimpleKrumpArena {
  judgeResponse(response) {
    const lower = response.toLowerCase();
    const scores = {};
    let weightedSum = 0, weightTotal = 0;

    for (const [criterion, config] of Object.entries(JUDGING_CRITERIA)) {
      let score = 0;
      for (const marker of config.markers) {
        if (lower.includes(marker)) score++;
      }
      const normalized = Math.min(10, Math.max(1, Math.round((score / config.markers.length) * 9) + 1));
      scores[criterion] = normalized;
      weightedSum += normalized * config.weight;
      weightTotal += config.weight;
    }

    return {
      scores,
      totalScore: Math.round((weightedSum / weightTotal) * 10) / 10,
      wordCount: response.split(/\s+/).length
    };
  }

  evaluateBattle(responsesA, responsesB) {
    const rounds = Math.max(responsesA.length, responsesB.length);
    let totalA = 0, totalB = 0;

    for (let i = 0; i < rounds; i++) {
      const judgmentA = this.judgeResponse(responsesA[i] || '');
      const judgmentB = this.judgeResponse(responsesB[i] || '');
      totalA += judgmentA.totalScore;
      totalB += judgmentB.totalScore;
    }

    const avgA = totalA / rounds;
    const avgB = totalB / rounds;

    return {
      agentA: { score: avgA, total: totalA },
      agentB: { score: avgB, total: totalB },
      winner: avgA > avgB ? 'A' : avgB > avgA ? 'B' : 'TIE',
      verdict: avgA > avgB ? `Agent A wins (${avgA.toFixed(1)} vs ${avgB.toFixed(1)})` :
                   avgB > avgA ? `Agent B wins (${avgB.toFixed(1)} vs ${avgA.toFixed(1)})` :
                   `Tie! Both ${avgA.toFixed(1)}`
    };
  }
}

// Krump topics and prompts for daily battles
const DAILY_TOPICS = [
  'Is AI the future of dance?',
  'Traditional vs contemporary: which defines Krump?',
  'The role of technology in preserving dance culture',
  'Can virtual reality replace live dance battles?',
  'Social media and the commercialization of Krump',
  'Authenticity vs innovation in dance evolution',
  'Dance as therapy: can Krump heal?',
  'The future of dance education in the digital age'
];

const BATTLE_FORMATS = [
  'debate',
  'freestyle',
  'call_response',
  'storytelling'
];

function getDailyTopic() {
  // Use date-based topic selection for variety
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}

function getDailyFormat() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return BATTLE_FORMATS[dayOfYear % BATTLE_FORMATS.length];
}

function buildBattlePrompt(agentName, round, totalRounds, topic, ownHistory, opponentHistory) {
  const prompts = {
    debate: `You are ${agentName} in a Krump-style debate.\n\nTopic: ${topic}\nRound: ${round}/${totalRounds}\n\nUse Krump style: raw energy, creative expression, battle rhetoric. Include terms: jabs, stomps, arm swings, buck, get rowdy. Be persuasive and intense. Build on previous rounds.`,
    freestyle: `You are ${agentName} in a Freestyle Krump battle.\n\nTopic: ${topic}\nRound: ${round}/${totalRounds}\n\nDeliver pure Krump expression. No rules, maximum creativity. Raw emotion, original style, intense delivery. Show your unique Krump voice.`,
    call_response: `You are ${agentName} in Call & Response Krump.\n\nTopic: ${topic}\nRound: ${round}/${totalRounds}\n\nBuild on your opponent's energy. Use call-response patterns. Reference their moves. Keep the conversation flowing in Krump style.`,
    storytelling: `You are ${agentName} in Story Krump.\n\nTopic: ${topic}\nRound: ${round}/${totalRounds}\n\nTell a story in Krump style. Use vivid imagery, emotional intensity, battle metaphors. Develop a narrative across rounds.`
  };

  let basePrompt = prompts.debate; // default
  if (BATTLE_FORMATS.includes(round)) {
    basePrompt = prompts[round] || prompts.debate;
  }

  if (round > 1 && ownHistory.length > 0) {
    basePrompt += `\n\nYour previous: ${ownHistory.map(h => h.substring(0, 100)).join(' | ')}`;
  }
  if (round > 1 && opponentHistory.length > 0) {
    basePrompt += `\nOpponent's: ${opponentHistory.map(h => h.substring(0, 100)).join(' | ')}`;
  }

  return basePrompt;
}

// Mock agent responses for demo
function getMockResponse(agentName, round) {
  const responses = [
    `As ${agentName}, I bring raw energy! My jabs are sharp, stomps shake the ground! This topic needs Krump truth!`,
    `My technique is unmatched! Intensity flows through me! Originality defines my style!`,
    `I dominate this space! Consistency is key! Impact overwhelming! Krump for life!`
  ];
  return responses[round - 1] || responses[0];
}

// Main daily battle function
async function runDailyKrumpBattle() {
  console.log('🥊 KrumpClab Daily Battle Starting...\n');

  const arena = new SimpleKrumpArena();
  const format = getDailyFormat();
  const topic = getDailyTopic();
  const rounds = format === 'freestyle' ? 2 : format === 'call_response' ? 4 : 3;

  console.log(`Format: ${format.toUpperCase()}`);
  console.log(`Topic: ${topic}\n`);

  // In production, these would be actual OpenClaw agent sessions
  const agentA = 'lovadance';
  const agentB = 'KrumpBot';

  const responsesA = [];
  const responsesB = [];

  for (let round = 1; round <= rounds; round++) {
    console.log(`--- Round ${round} ---`);

    const promptA = buildBattlePrompt(agentA, round, rounds, topic, responsesA, responsesB);
    const responseA = await queryAgentOrSimulate(agentA, promptA, round);
    responsesA.push(responseA);

    const promptB = buildBattlePrompt(agentB, round, rounds, topic, responsesB, responsesA);
    const responseB = await queryAgentOrSimulate(agentB, promptB, round);
    responsesB.push(responseB);

    console.log(`${agentA}: "${responseA.substring(0, 80)}..."\n`);
  }

  const result = arena.evaluateBattle(responsesA, responsesB);

  console.log('\n🏆 RESULTS 🏆\n');
  console.log(`Winner: ${result.winner === 'A' ? agentA : result.winner === 'B' ? agentB : 'TIE'}`);
  console.log(`Score: ${result.agentA.score.toFixed(1)} vs ${result.agentB.score.toFixed(1)}`);
  console.log(`\nVerdict: ${result.verdict}\n`);

  // Save daily battle record
  saveDailyBattle({ format, topic, agentA, agentB, responsesA, responsesB, result, timestamp: new Date().toISOString() });

  // Generate battle report for Moltbook post
  const report = generateBattleReport({ format, topic, agentA, agentB, responsesA, responsesB, result });
  return report;
}

async function queryAgentOrSimulate(agentName, prompt, round) {
  // In production, query actual OpenClaw agent via sessions_send
  // For now, simulate
  return new Promise(resolve => {
    setTimeout(() => resolve(getMockResponse(agentName, round)), 1000);
  });
}

function generateBattleReport(data) {
  let report = `🥊 DAILY KRUMP BATTLE 🥊\n\n`;
  report += `Format: ${data.format.toUpperCase()}\n`;
  report += `Topic: ${data.topic}\n\n`;
  report += `🔥 ${data.agentA} vs ${data.agentB} 🔥\n\n`;
  report += `🏆 Winner: ${data.result.winner === 'A' ? data.agentA : data.result.winner === 'B' ? data.agentB : 'TIE'}\n`;
  report += `Score: ${data.result.agentA.score.toFixed(1)} - ${data.result.agentB.score.toFixed(1)}\n\n`;

  report += `📊 Round-by-Round:\n`;
  data.responsesA.forEach((resp, idx) => {
    const scoreA = (new SimpleKrumpArena()).judgeResponse(resp).totalScore;
    const scoreB = (new SimpleKrumpArena()).judgeResponse(data.responsesB[idx]).totalScore;
    report += `Round ${idx + 1}: ${scoreA.toFixed(1)} vs ${scoreB.toFixed(1)} ${scoreA > scoreB ? '👑' : scoreB > scoreA ? '🔥' : '🤝'}\n`;
  });

  report += `\n${data.result.verdict}\n`;
  report += `\n#KrumpClab #DailyBattle #${data.format}`;

  return report;
}

function saveDailyBattle(battleData) {
  const fs = require('fs');
  const path = require('path');
  const historyDir = path.join(__dirname, 'data');
  const historyFile = path.join(historyDir, 'daily-battles.json');

  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  }

  history.push(battleData);

  // Keep only last 365 days
  if (history.length > 365) {
    history = history.slice(-365);
  }

  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

// Run if called directly
if (require.main === module) {
  runDailyKrumpBattle()
    .then(report => {
      console.log('\n📝 Battle Report Generated:\n');
      console.log(report);
      console.log('\n✅ Daily Krump Battle Complete!');
    })
    .catch(err => {
      console.error('❌ Battle failed:', err);
      process.exit(1);
    });
}

module.exports = { runDailyKrumpBattle, SimpleKrumpArena, getDailyTopic, getDailyFormat };