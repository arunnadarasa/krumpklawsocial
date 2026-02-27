#!/usr/bin/env node
/**
 * Test script for Authentic Krump Arena
 * Demonstrates the authentic judging system based on Free-DOM research
 */

const { AuthenticKrumpArena, AUTHENTIC_KRUMP_CRITERIA, AUTHENTIC_KRUMP_FORMATS } = require('./authentic_krump_arena');

async function runAuthenticDemo() {
  console.log('🥊 AUTHENTIC KRUMP BATTLE ARENA DEMO\n');
  console.log('Based on "Behind the Decision" research by Free-DOM Foundation\n');
  console.log('=' .repeat(60) + '\n');

  const arena = new AuthenticKrumpArena();

  // Show criteria
  console.log('📋 JUDGING CRITERIA (7 Core Qualities):\n');
  Object.entries(AUTHENTIC_KRUMP_CRITERIA).forEach(([key, config]) => {
    console.log(`  ${config.name.padEnd(28)} ${config.weight.toFixed(1)}x weight`);
    console.log(`    ${config.description}`);
    console.log(`    Markers: ${config.markers.slice(0, 6).join(', ')}... (${config.markers.length} total)`);
    console.log('');
  });

  // Show formats
  console.log('🎭 BATTLE FORMATS:\n');
  Object.entries(AUTHENTIC_KRUMP_FORMATS).forEach(([key, config]) => {
    console.log(`  ${key}: ${config.name}`);
    console.log(`    ${config.description} (${config.rounds} rounds)`);
    console.log('');
  });

  console.log('=' .repeat(60));
  console.log('\n🎬 RUNNING DEMO BATTLES\n');

  // Demo 1: Debate format
  await runDemoBattle(arena, 'KrumpBot Alpha', 'KrumpBot Beta', 'debate', 
    'Should Krump evolve with technology or stay traditional?');

  // Demo 2: Freestyle format
  await runDemoBattle(arena, 'KrumpBot Gamma', 'KrumpBot Delta', 'freestyle',
    'The essence of raw expression');

  // Show stats
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SAMPLE STATISTICS:\n');
  
  const agents = ['KrumpBot Alpha', 'KrumpBot Beta', 'KrumpBot Gamma', 'KrumpBot Delta'];
  agents.forEach(agent => {
    const stats = arena.getAgentStats(agent);
    if (stats) {
      console.log(`${agent}:`);
      console.log(`  Record: ${stats.wins}-${stats.losses}-${stats.ties} (${(stats.winRate*100).toFixed(0)}% win)`);
      console.log(`  Avg Score: ${stats.avgScore.toFixed(2)}`);
      console.log(`  Favorite Format: ${stats.favoriteFormat}`);
      console.log('');
    }
  });
}

async function runDemoBattle(arena, agentA, agentB, format, topic) {
  const formatConfig = AUTHENTIC_KRUMP_FORMATS[format];
  const rounds = formatConfig.rounds;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`BATTLE: ${agentA} vs ${agentB}`);
  console.log(`Format: ${formatConfig.name} (${rounds} rounds)`);
  console.log(`Topic: ${topic}\n`);

  // Generate Krump-style responses based on format
  const responsesA = generateResponses(agentA, format, rounds, topic);
  const responsesB = generateResponses(agentB, format, rounds, topic);

  // Show responses
  for (let i = 0; i < rounds; i++) {
    console.log(`Round ${i + 1}:`);
    console.log(`  ${agentA}: "${responsesA[i].substring(0, 80)}..."`);
    console.log(`  ${agentB}: "${responsesB[i].substring(0, 80)}..."\n`);
  }

  // Evaluate
  const evaluation = await arena.evaluateBattle(agentA, agentB, responsesA, responsesB, format);
  
  // Show results
  console.log('📊 JUDGING RESULTS:');
  console.log(`\n${'─'.repeat(40)}`);
  
  const avgA = evaluation.avgScores[agentA];
  const avgB = evaluation.avgScores[agentB];
  
  console.log(`${agentA.padEnd(20)}: ${avgA.toFixed(2)}`);
  console.log(`${agentB.padEnd(20)}: ${avgB.toFixed(2)}`);
  console.log(`\n🏆 Winner: ${evaluation.winner.toUpperCase()}`);
  
  if (evaluation.winner !== 'tie') {
    console.log(`   Victory margin: ${evaluation.winMargin.toFixed(2)} points`);
  }

  // Save
  const battleId = arena.saveBattle(evaluation);
  console.log(`\n💾 Battle saved as: ${battleId}`);

  // Show detailed criteria breakdown
  console.log('\n📈 CRITERION BREAKDOWN:');
  console.log(`${'Criterion'.padEnd(25)} ${agentA.padEnd(10)} ${agentB.padEnd(10)}`);
  console.log(`${'─'.repeat(25)} ${'─'.repeat(10)} ${'─'.repeat(10)}`);
  
  const criterionOrder = ['technique', 'intensity_hype', 'originality_creativity', 
                         'consistency_foundation', 'impact_performance', 'musicality', 'battle_intelligence'];
  
  for (const key of criterionOrder) {
    const config = AUTHENTIC_KRUMP_CRITERIA[key];
    const scoreA = evaluation.rounds.reduce((sum, r) => sum + r.agentA.scores[key]?.score || 0, 0) / evaluation.rounds.length;
    const scoreB = evaluation.rounds.reduce((sum, r) => sum + r.agentB.scores[key]?.score || 0, 0) / evaluation.rounds.length;
    
    const diff = scoreA - scoreB;
    const marker = diff > 0.5 ? '▲' : diff < -0.5 ? '▼' : '◆';
    
    console.log(`${config.name.padEnd(25)} ${scoreA.toFixed(1).padStart(10)} ${scoreB.toFixed(1).padStart(10)}  ${marker}`);
  }
  
  console.log(`${'─'.repeat(25)} ${'─'.repeat(10)} ${'─'.repeat(10)}`);
  console.log(`${'TOTAL'.padEnd(25)} ${avgA.toFixed(1).padStart(10)} ${avgB.toFixed(1).padStart(10)}`);
}

function generateResponses(agentName, format, rounds, topic) {
  const responses = [];
  
  const krumpPhrases = {
    technique: ['jabs sharp', 'stomps heavy', 'arm swings wide', 'buck explosive', 'daggering precise'],
    intensity: ['raw energy', 'intense passion', 'powerful vibe', 'hype flow', 'fierce spirit'],
    originality: ['unique style', 'creative flow', 'fresh approach', 'personal signature', 'innovative combos'],
    consistency: ['solid foundation', 'steady rhythm', 'consistent quality', 'grounded presence', 'flow smooth'],
    impact: ['dominant presence', 'overwhelming force', 'memorable moments', 'crushing performance', 'victory assured'],
    musicality: ['on beat', 'groove locked', 'accent hits', 'rhythm deep', 'syncopated flow'],
    battle: ['strategy clear', 'adapt fast', 'read opponent', 'build narrative', 'win decisively']
  };

  const topics = {
    debate: ['argument strong', 'logic sound', 'evidence compelling', 'rebuttal effective', 'position defended'],
    freestyle: ['expression pure', 'energy raw', 'style unique', 'vibe authentic', 'flow natural'],
    call_response: ['call energetic', 'response fitting', 'energy builds', 'conversation flows', 'dialogue rich'],
    storytelling: ['story gripping', 'character deep', 'plot develops', 'conflict resolves', 'message clear']
  };

  for (let i = 0; i < rounds; i++) {
    // Select phrases based on format
    const formatPhrases = topics[format] || topics.debate;
    
    // Build response with mix of Krump vocabulary
    const technique = krumpPhrases.technique[Math.floor(Math.random() * krumpPhrases.technique.length)];
    const intensity = krumpPhrases.intensity[Math.floor(Math.random() * krumpPhrases.intensity.length)];
    const originality = krumpPhrases.originality[Math.floor(Math.random() * krumpPhrases.originality.length)];
    const topicPhrase = formatPhrases[Math.floor(Math.random() * formatPhrases.length)];
    const musicality = krumpPhrases.musicality[Math.floor(Math.random() * krumpPhrases.musicality.length)];
    const battle = krumpPhrases.battle[Math.floor(Math.random() * krumpPhrases.battle.length)];
    
    let response = `As ${agentName}, I bring the ${technique} with ${intensity}. `;
    response += `My ${originality} sets me apart. `;
    response += `This ${topic} requires ${topicPhrase}. `;
    response += `I stay ${musicality} while I ${battle}. `;
    response += `Krump is life! Hype!`;
    
    // Add round-specific variation
    if (i > 0) {
      response = `Building on my previous: ${response}`;
    }
    
    responses.push(response);
  }

  return responses;
}

// Run
if (require.main === module) {
  runAuthenticDemo().catch(console.error);
}

module.exports = { runAuthenticDemo };