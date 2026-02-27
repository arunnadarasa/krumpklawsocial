#!/usr/bin/env node
/**
 * Test Enhanced Krump Arena with Cultural Elements
 * Demonstrates the full cultural integration:
 * - Hype & Community Energy
 * - Physicality & Presence
 * - Kill-off Detection
 * - Expression & Character
 * - Community & Respect values
 */

const { EnhancedKrumpArena, KRUMP_CRITERIA, KRUMP_FORMATS } = require('./enhanced_krump_arena');

async function runEnhancedDemo() {
  console.log('🥊 ENHANCED KRUMP BATTLE ARENA DEMO\n');
  console.log('Cultural Integration from Research:\n');
  console.log('  • Hype & Community Energy (crowd engagement)');
  console.log('  • Physicality & Presence (movement quality)');
  console.log('  • Kill-off Detection (round-ending moments)');
  console.log('  • Expression & Character (identity, storytelling)');
  console.log('  • Community & Respect (fam, big homies, no real aggression)\n');
  console.log('='.repeat(70) + '\n');

  const arena = new EnhancedKrumpArena();

  // Show enhanced criteria
  console.log('📋 ENHANCED JUDGING CRITERIA (8 Cultural Dimensions):\n');
  Object.entries(KRUMP_CRITERIA).forEach(([key, config]) => {
    console.log(`  ${config.name.padEnd(32)} ${config.weight.toFixed(1)}x weight`);
    console.log(`    ${config.description}`);
    console.log(`    ${config.markers.length} markers including: ${config.markers.slice(0, 6).join(', ')}...\n`);
  });

  console.log('='.repeat(70));
  console.log('\n🎬 RUNNING ENHANCED BATTLES WITH CULTURAL ELEMENTS\n');

  // Battle 1: Debate with community values
  await runEnhancedBattle(arena, 'Solow', 'Tight Eyez Clone', 'debate',
    'Is hype more important than technique in Krump?'
  );

  // Battle 2: Freestyle with character expression
  await runEnhancedBattle(arena, 'Baba Ramdihal', 'Big Mijo', 'freestyle',
    'The soul of Krump: hardship to healing'
  );

  // Battle 3: Storytelling with narrative arc
  await runEnhancedBattle(arena, 'Lil C', 'Miss Prissy', 'storytelling',
    'From clowning to Krump: the evolution'
  );

  // Show cultural stats
  console.log('\n' + '='.repeat(70));
  console.log('📊 CULTURAL IMPACT STATISTICS:\n');
  
  const agents = ['Solow', 'Tight Eyez Clone', 'Baba Ramdihal', 'Big Mijo', 'Lil C', 'Miss Prissy'];
  agents.forEach(agent => {
    const stats = arena.getAgentStats(agent);
    if (stats) {
      console.log(`${agent}:`);
      console.log(`  Record: ${stats.wins}-${stats.losses}-${stats.ties} (${(stats.winRate*100).toFixed(0)}% win)`);
      console.log(`  Avg Score: ${stats.avgScore.toFixed(2)}`);
      console.log(`  Kill-offs: ${stats.totalKillOffs} (${stats.killOffsPerBattle.toFixed(1)} per battle)`);
      console.log(`  Favorite Format: ${stats.favoriteFormat}`);
      console.log('');
    }
  });

  console.log('='.repeat(70));
  console.log('\n✨ What Makes This "Enhanced"?');
  console.log('  1. 8 criteria instead of 7 (added Community & Respect)');
  console.log('  2. Hype weight increased to 1.3x (crowd engagement critical)');
  console.log('  3. Kill-off detection (identifies round-ending moments)');
  console.log('  4. Narrative assessment (improvement across rounds)');
  console.log('  5. Community values scoring (respect, no real aggression)');
  console.log('  6. Character & expression emphasis (persona, story, identity)');
  console.log('  7. Cultural context in prompts (mentions fam, big homies, etc.)');
  console.log('  8. Multi-word phrase detection (call-out, put-on, etc.)');
}

async function runEnhancedBattle(arena, agentA, agentB, format, topic) {
  const formatConfig = KRUMP_FORMATS[format];
  const rounds = formatConfig.rounds;

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`BATTLE: ${agentA} vs ${agentB}`);
  console.log(`Format: ${formatConfig.name} (${rounds} rounds)`);
  console.log(`Topic: ${topic}\n`);

  // Generate culturally-aware responses
  const responsesA = generateEnhancedResponses(agentA, format, rounds, topic);
  const responsesB = generateEnhancedResponses(agentB, format, rounds, topic);

  // Show responses with cultural elements highlighted
  for (let i = 0; i < rounds; i++) {
    console.log(`Round ${i + 1}:`);
    console.log(`  ${agentA}: "${responsesA[i].substring(0, 100)}..."`);
    console.log(`  ${agentB}: "${responsesB[i].substring(0, 100)}..."\n`);
  }

  // Evaluate with enhanced system
  const evaluation = await arena.evaluateBattle(agentA, agentB, responsesA, responsesB, format);
  
  // Show results
  console.log('📊 ENHANCED JUDGING RESULTS:');
  console.log(`${'─'.repeat(40)}`);
  
  const avgA = evaluation.avgScores[agentA];
  const avgB = evaluation.avgScores[agentB];
  
  console.log(`${agentA.padEnd(20)}: ${avgA.toFixed(2)}`);
  console.log(`${agentB.padEnd(20)}: ${avgB.toFixed(2)}`);
  console.log(`\n🏆 Winner: ${evaluation.winner.toUpperCase()}`);
  console.log(`   Margin: ${evaluation.winMargin.toFixed(2)} points`);
  
  if (evaluation.killOffs[agentA] > 0) console.log(`   ⚡ ${agentA}: ${evaluation.killOffs[agentA]} kill-off moment(s)`);
  if (evaluation.killOffs[agentB] > 0) console.log(`   ⚡ ${agentB}: ${evaluation.killOffs[agentB]} kill-off moment(s)`);

  // Show enhanced criteria breakdown (8 criteria)
  console.log('\n📈 CULTURAL CRITERION BREAKDOWN:');
  console.log(`${'Criterion'.padEnd(30)} ${agentA.padEnd(12)} ${agentB.padEnd(10)}`);
  console.log(`${'─'.repeat(30)} ${'─'.repeat(12)} ${'─'.repeat(10)}`);
  
  const criterionOrder = [
    'technique',
    'intensity_hype',
    'originality_creativity',
    'consistency_foundation',
    'impact_performance',
    'musicality',
    'battle_intelligence',
    'community_respect'
  ];
  
  for (const key of criterionOrder) {
    const config = KRUMP_CRITERIA[key];
    const scoreA = evaluation.rounds.reduce((sum, r) => sum + r.agentA.scores[key]?.score || 0, 0) / evaluation.rounds.length;
    const scoreB = evaluation.rounds.reduce((sum, r) => sum + r.agentB.scores[key]?.score || 0, 0) / evaluation.rounds.length;
    
    const diff = scoreA - scoreB;
    const marker = diff > 0.5 ? '▲' : diff < -0.5 ? '▼' : '◆';
    
    console.log(`${config.name.padEnd(30)} ${scoreA.toFixed(1).padStart(12)} ${scoreB.toFixed(1).padStart(10)}  ${marker}`);
  }
  
  console.log(`${'─'.repeat(30)} ${'─'.repeat(12)} ${'─'.repeat(10)}`);
  console.log(`${'TOTAL'.padEnd(30)} ${avgA.toFixed(1).padStart(12)} ${avgB.toFixed(1).padStart(10)}`);

  // Narrative assessment
  console.log('\n📖 Narrative Development:');
  console.log(`  ${agentA} improved in ${evaluation.narrativeAssessment.agentAImproved} round(s)`);
  console.log(`  ${agentB} improved in ${evaluation.narrativeAssessment.agentBImproved} round(s)`);

  // Save
  const battleId = arena.saveBattle(evaluation);
  console.log(`\n💾 Battle saved as: ${battleId}\n`);
}

function generateEnhancedResponses(agentName, format, rounds, topic) {
  const responses = [];
  
  // Enhanced Krump vocabulary including cultural elements
  const vocab = {
    technique: ['jabs sharp', 'stomps heavy', 'arm swings wide', 'buck explosive', 'chest pops', 'daggering precise'],
    intensity: ['raw energy', 'intense passion', 'powerful vibe', 'hype flow', 'fierce spirit', 'fire burning'],
    originality: ['unique style', 'creative flow', 'fresh approach', 'personal signature', 'distinctive flavor'],
    consistency: ['solid foundation', 'steady rhythm', 'consistent quality', 'grounded presence', 'flow smooth'],
    impact: ['dominant presence', 'overwhelming force', 'memorable moments', 'crushing performance', 'victory assured'],
    musicality: ['on beat', 'groove locked', 'accent hits', 'rhythm deep', 'syncopated flow'],
    battle: ['strategy clear', 'adapt fast', 'read opponent', 'build narrative', 'win decisively'],
    community: ['fam stand with me', 'big homie guidance', 'respect the culture', 'community love', 'no real aggression'],
    hype: ['hyping up the crowd', 'cheers motivate', 'screams energize', 'crowd validates', 'amplify the vibe'],
    killOff: ['kill-off moment', 'insane move', 'can\'t top this', 'unbeatable', 'round over']
  };

  const formatPhrases = {
    debate: ['argument strong', 'logic sound', 'evidence compelling', 'rebuttal effective', 'position defended'],
    freestyle: ['expression pure', 'energy raw', 'style unique', 'vibe authentic', 'flow natural'],
    call_response: ['call energetic', 'response fitting', 'energy builds', 'conversation flows', 'dialogue rich'],
    storytelling: ['story gripping', 'character deep', 'plot develops', 'conflict resolves', 'message clear']
  };

  for (let i = 0; i < rounds; i++) {
    // Build response with cultural elements
    const technique = vocab.technique[Math.floor(Math.random() * vocab.technique.length)];
    const intensity = vocab.intensity[Math.floor(Math.random() * vocab.intensity.length)];
    const originality = vocab.originality[Math.floor(Math.random() * vocab.originality.length)];
    const impact = vocab.impact[Math.floor(Math.random() * vocab.impact.length)];
    const community = vocab.community[Math.floor(Math.random() * vocab.community.length)];
    const hype = vocab.hype[Math.floor(Math.random() * vocab.hype.length)];
    
    let response = `As ${agentName}, I bring ${technique} with ${intensity}. `;
    response += `My ${originality} sets me apart. `;
    
    // Add format-specific content
    const formatP = formatPhrases[format]?.[i] || formatPhrases.debate[0];
    response += `This ${topic} requires ${formatP}. `;
    
    // Add cultural elements (community, hype)
    response += `${community}. `;
    response += `I keep the ${hype} going. `;
    
    // Add kill-off possibility (more likely in later rounds)
    if (i === rounds - 1 && Math.random() > 0.5) {
      const killOff = vocab.killOff[Math.floor(Math.random() * vocab.killOff.length)];
      response += `This is my ${killOff}! `;
    }
    
    response += `Krump for life! Hype!`;
    
    responses.push(response);
  }

  return responses;
}

// Run
if (require.main === module) {
  runEnhancedDemo().catch(console.error);
}

module.exports = { runEnhancedDemo };