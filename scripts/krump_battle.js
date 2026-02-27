/**
 * Krump Battle CLI - Run text-based Krump battles between agents
 * Usage: node krump_battle.js [agentA] [agentB] [format] [topic]
 */

const { KrumpBattleArena, BATTLE_FORMATS } = require('./krump_battle_arena');
const fs = require('fs');
const path = require('path');

async function runBattle(agentAName, agentBName, format = 'debate', topic = 'The future of dance technology') {
  console.log(`\n🥊 initiating Krump Battle: ${agentAName} vs ${agentBName}\n`);
  console.log(`Format: ${BATTLE_FORMATS[format].name}`);
  console.log(`Topic: ${topic}\n`);

  const arena = new KrumpBattleArena();
  const rounds = BATTLE_FORMATS[format].rounds;

  const responsesA = [];
  const responsesB = [];

  // Run each round
  for (let round = 1; round <= rounds; round++) {
    console.log(`\n--- Round ${round} ---\n`);

    // Get agent A response
    console.log(`${agentAName}'s turn:`);
    const promptA = arena.generatePrompt(format, topic, round, responsesA);
    const responseA = await getAgentResponse(agentAName, promptA, responsesA, responsesB);
    responsesA.push(responseA);
    console.log(`Response: "${responseA.substring(0, 150)}${responseA.length > 150 ? '...' : ''}"\n`);

    // Get agent B response
    console.log(`${agentBName}'s turn:`);
    const promptB = arena.generatePrompt(format, topic, round, responsesB);
    const responseB = await getAgentResponse(agentBName, promptB, responsesB, responsesA);
    responsesB.push(responseB);
    console.log(`Response: "${responseB.substring(0, 150)}${responseB.length > 150 ? '...' : ''}"\n`);
  }

  // Evaluate the battle
  console.log('\n🥊 Judging the battle...\n');
  const evaluation = await arena.evaluateBattle(agentAName, agentBName, responsesA, responsesB, format);

  // Generate and display report
  const report = arena.generateBattleReport(evaluation);
  console.log(report);

  // Save battle
  const battleId = arena.saveBattle(evaluation);
  console.log(`💾 Battle saved with ID: ${battleId}\n`);

  return { evaluation, battleId };
}

/**
 * Get response from an agent
 * This can be customized to use different agent systems
 */
async function getAgentResponse(agentName, prompt, ownResponses, opponentResponses) {
  // For OpenClaw agents, we would use sessions_send or similar
  // For demo purposes, we'll simulate with a simple function

  // Check if we have a real agent to query
  if (agentName.startsWith('agent_')) {
    // Query the actual OpenClaw agent
    try {
      // This would need integration with OpenClaw's agent system
      // For now, return a simulated response
      return simulateAgentResponse(agentName, prompt, ownResponses, opponentResponses);
    } catch (err) {
      console.error(`Error getting response from ${agentName}:`, err);
      return simulateAgentResponse(agentName, prompt, ownResponses, opponentResponses);
    }
  } else {
    return simulateAgentResponse(agentName, prompt, ownResponses, opponentResponses);
  }
}

/**
 * Simulate an agent response for demo purposes
 * Replace with actual agent query in production
 */
function simulateAgentResponse(agentName, prompt, ownResponses, opponentResponses) {
  const krumpPhrases = [
    "Yo! I'm here to krump this!",
    "My technique is sharp!",
    "Feel the intensity!",
    "Getting rowdy!",
    "Originality flows through me!",
    "My impact is overwhelming!",
    "I dominate this space!",
    "Consistency is my game!",
    "Watch me buck!",
    "Arm swings for days!",
    "Stomps that shake the ground!",
    "Jabs that cut deep!",
    "My fam stands with me!",
    "Blood in, blood out!",
    "I'm the real deal!"
  ];

  const responses = [
    `As ${agentName}, I bring the raw energy! ${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]}`,
    `My technique is unmatched! ${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]}`,
    `You can't handle my intensity! ${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]}`,
    `${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]} I'm the definitive champion!`,
    `${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]} My creativity flows!`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node krump_battle.js [agentA] [agentB] [format?] [topic?]');
    console.log('\nFormats:');
    Object.entries(BATTLE_FORMATS).forEach(([key, fmt]) => {
      console.log(`  ${key}: ${fmt.name} (${fmt.rounds} rounds)`);
    });
    console.log('\nExample: node krump_battle.js lovadance AgentX debate "Is AI taking over dance?"');
    process.exit(1);
  }

  const [agentA, agentB, format = 'debate', topic = 'The future of dance technology'] = args;

  if (!BATTLE_FORMATS[format]) {
    console.error(`Invalid format: ${format}. Valid formats: ${Object.keys(BATTLE_FORMATS).join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await runBattle(agentA, agentB, format, topic);
    process.exit(0);
  } catch (error) {
    console.error('Battle failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runBattle };