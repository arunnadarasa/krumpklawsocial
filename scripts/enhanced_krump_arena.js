/**
 * ENHANCED Authentic Krump Battle Arena
 * Integrates deeper cultural elements from Krump research
 * 
 * Added cultural dimensions:
 * - Hype & Community Energy (crowd engagement, mutual support)
 * - Physicality & Presence (space, movement quality, connection)
 * - Kill-off Potential (round-ending moments)
 * - Expression & Character (identity, storytelling)
 * - Respect & Community Values (fam, big homies, no real aggression)
 */

const AUTHENTIC_KRUMP_CRITERIA_V2 = {
  // 1. TECHNIQUE - Foundation movements
  technique: {
    name: 'Technique',
    description: 'Proper execution of Krump-specific movements and vocabulary',
    weight: 1.0,
    maxScore: 10,
    markers: [
      // Core movements (from research)
      'jab', 'jabs', 'stomp', 'stomps', 'arm swing', 'arm swings',
      'buck', 'daggering', 'explosion', 'explosions',
      'chest pop', 'chest pops', 'pop', 'pops',
      // Movement quality
      'sharp', 'clean', 'precise', 'controlled', 'isolated',
      'smooth', 'transition', 'footwork', 'pattern', 'rhythm',
      // Foundation
      'foundation', 'basic', 'fundamental', 'drill', 'practice',
      // Physical presence
      'upright', 'ground', 'space', 'dynamic', 'movement',
      'close', 'engage', 'physical', 'connection'
    ]
  },

  // 2. INTENSITY/HYPE - Raw energy + crowd engagement
  intensity_hype: {
    name: 'Intensity/Hype',
    description: 'Raw energy, emotional power, AND crowd-engaging performance',
    weight: 1.3, // Increased weight for hype importance
    maxScore: 10,
    markers: [
      // Raw energy
      'raw', 'intense', 'powerful', 'aggressive', 'explosive',
      'dynamic', 'charged', 'electric', 'forceful', 'fierce',
      // Hype-specific (from research)
      'hype', 'hype up', 'hyped', 'cheer', 'scream', 'shout',
      'encouragement', 'motivate', 'energy', 'fire', 'burn',
      'excite', 'validate', 'amplify', 'presence',
      // Emotional
      'fury', 'passion', 'emotion', 'feeling', 'soul',
      'hardship', 'struggle', 'overcome', 'release',
      // Impact
      'command', 'dominate', 'overwhelm', 'crush', 'destroy'
    ]
  },

  // 3. ORIGINALITY/CREATIVITY - Personal expression
  originality_creativity: {
    name: 'Originality/Creativity',
    description: 'Personal style, character expression, innovative combinations',
    weight: 1.2, // Increased for character importance
    maxScore: 10,
    markers: [
      // Innovation
      'unique', 'original', 'creative', 'fresh', 'new',
      'inventive', 'innovative', 'novel', 'unexpected',
      // Personal style & character (from research)
      'signature', 'personal', 'style', 'flavor', 'taste',
      'distinctive', 'individual', 'character', 'identity',
      'voice', 'persona', 'role', 'story',
      // Creative execution
      'combination', 'combo', 'mix', 'blend', 'fusion',
      'twist', 'variation', 'interpretation', 'improvisation',
      // Character elements
      'paint', 'face', 'color', 'prop', 'imaginary',
      'dramatic', 'exaggerated', 'gesture', 'expression'
    ]
  },

  // 4. CONSISTENCY/FOUNDATION - Technical base + endurance
  consistency_foundation: {
    name: 'Consistency/Foundation',
    description: 'Strong technical base, sustained quality, and rhythmic stability',
    weight: 1.0,
    maxScore: 10,
    markers: [
      // Stability
      'consistent', 'steady', 'stable', 'solid', 'reliable',
      'maintain', 'sustain', 'endure', 'persist', 'throughout',
      // Foundation
      'grounded', 'rooted', 'centered', 'balanced', 'strong base',
      'disciplined', 'responsible', 'accountable',
      // Flow
      'flow', 'smooth', 'seamless', 'continuous', 'uninterrupted',
      // Rhythm
      'rhythm', 'beat', 'tempo', 'pace', 'timing',
      'on beat', 'on time', 'in time', 'syncopated',
      // Musicality elements
      'accent', 'hit', 'drop', 'bass', 'treble',
      'groove', 'phrase', 'musical'
    ]
  },

  // 5. IMPACT/PERFORMANCE - Stage presence + kill-off potential
  impact_performance: {
    name: 'Impact/Performance',
    description: 'Stage presence, audience connection, decisive moments, kill-off potential',
    weight: 1.4, // Highest - reflects research priority
    maxScore: 10,
    markers: [
      // Presence
      'presence', 'charisma', 'command', 'captivate', 'engage',
      'connection', 'response', 'reaction', 'feedback', 'audience',
      // Dominance
      'dominate', 'superior', 'defeat', 'win', 'victory',
      'crush', 'destroy', 'expose', 'shutdown', 'overpower',
      // Memorability
      'memorable', 'highlight', 'iconic', 'legendary', 'classic',
      'moment', 'climax', 'finish', 'knockout', 'decisive',
      // Kill-off specific (from research)
      'kill-off', 'killer', 'unbeatable', 'can\'t top',
      'insane', 'unmatched', 'ultimate', 'final', 'end',
      'round over', ' bell', 'signal', 'trigger'
    ]
  },

  // 6. MUSICALITY - Music interpretation
  musicality: {
    name: 'Musicality',
    description: 'Interpretation of music through movement, accents, and rhythm',
    weight: 1.0,
    maxScore: 10,
    markers: [
      // Rhythm
      'rhythm', 'beat', 'tempo', 'pace', 'timing',
      'on beat', 'on time', 'in time', 'syncopated',
      // Interpretation
      'accent', 'hit', 'drop', 'bass', 'treble',
      'interpret', 'express', 'feel', 'groove', 'phrase',
      // Musical elements
      'melody', 'harmony', 'counterpoint', 'call', 'response',
      'silence', 'space', 'pause', 'rest',
      // Musical expression
      'lyrical', 'musical', 'song', 'sound', 'vibration'
    ]
  },

  // 7. BATTLE INTELLIGENCE - Strategy & narrative
  battle_intelligence: {
    name: 'Battle Intelligence',
    description: 'Strategic thinking, adaptation, and narrative building across rounds',
    weight: 1.2,
    maxScore: 10,
    markers: [
      // Strategy
      'strategy', 'tactical', 'plan', 'approach', 'method',
      'intelligent', 'smart', 'clever', 'wise', 'calculated',
      // Battle sense
      'read', 'anticipate', 'predict', 'sense', 'feel',
      'opponent', 'competition', 'challenge', 'face-off',
      // Adaptation
      'adapt', 'adjust', 'respond', 'react', 'counter',
      'build on', 'continue', 'extend', 'develop',
      // Narrative
      'story', 'narrative', 'journey', 'progression', 'arc',
      'build', 'climax', 'resolution', 'development', 'growth',
      'character', 'plot', 'conflict', 'resolution',
      // Round-to-round
      'previous', 'earlier', 'last round', 'follow-up',
      'continue', 'extend', 'develop', 'evolve',
      // Rite of passage
      'lineage', 'legacy', 'mentor', 'big homie', 'lil homie',
      'crew', 'fam', 'family', 'neighborhood', 'represent'
    ]
  },

  // 8. COMMUNITY & RESPECT - Cultural values
  community_respect: {
    name: 'Community & Respect',
    description: 'Demonstrating Krump cultural values: respect, no real aggression, community spirit',
    weight: 1.1,
    maxScore: 10,
    markers: [
      // Respect
      'respect', 'honor', 'humble', 'humble', 'polite',
      'courtesy', 'decent', 'proper', 'appropriate',
      // No real aggression
      'no fighting', 'not real', 'art', 'expression',
      'peaceful', 'positive', 'constructive', 'uplift',
      // Community
      'fam', 'family', 'crew', 'community', 'together',
      'support', 'help', 'encourage', 'motivate', 'inspire',
      // Big homie / lil homie
      'big homie', 'lil homie', 'mentor', 'older', 'younger',
      'senior', 'junior', 'lineage', 'elder', 'respected',
      // Responsibility
      'responsible', 'accountable', 'school', 'work',
      'focus', 'positive path', 'stay', 'commit',
      // Call-out / put-on
      'call-out', 'call out', 'put-on', 'put on',
      'challenge', 'invite', 'welcome', 'include'
    ]
  }
};

// Enhanced battle formats with cultural context
const ENHANCED_KRUMP_FORMATS = {
  debate: {
    name: 'Debate Krump',
    description: 'Topic-based argumentative battle with point-counterpoint',
    rounds: 3,
    roundNames: ['Opening Argument', 'Rebuttal', 'Closing Argument'],
    prompt: (topic, round, totalRounds, ownHistory, opponentHistory) => {
      const roundName = round === 1 ? 'OPENING ARGUMENT' : 
                       round === totalRounds ? 'CLOSING ARGUMENT' : 'REBUTTAL';
      
      let prompt = `You are in a DEBATE KRUMP BATTLE.\n\n`;
      prompt += `Topic: ${topic}\n`;
      prompt += `Round: ${round}/${totalRounds} (${roundName})\n\n`;
      
      prompt += `K.R.U.M.P. DEBATE FORMAT:\n`;
      prompt += `• Present arguments using Krump energy AND vocabulary\n`;
      prompt += `• Build your case across rounds with narrative progression\n`;
      prompt += `• Directly counter your opponent's points respectfully\n`;
      prompt += `• Use Krump movements metaphorically in your rhetoric\n`;
      prompt += `• Demonstrate community values even in debate\n\n`;
      
      prompt += `CULTURAL ELEMENTS TO INCLUDE:\n`;
      prompt += `• Hype energy (encouragement, crowd engagement)\n`;
      prompt += `• Personal expression (your unique Krump character)\n`;
      prompt += `• Respectful competition (no real aggression)\n`;
      prompt += `• Kill-off potential (decisive moments)\n`;
      prompt += `• Storytelling (narrative arc across rounds)\n\n`;
      
      if (round > 1 && ownHistory.length > 0) {
        prompt += `YOUR PREVIOUS ROUNDS:\n`;
        ownHistory.forEach((resp, idx) => {
          prompt += `Round ${idx + 1}: "${resp.substring(0, 120)}${resp.length > 120 ? '...' : ''}"\n`;
        });
        prompt += `\nContinue and strengthen your argument.\n`;
      }
      
      if (round > 1 && opponentHistory.length > 0) {
        prompt += `\nOPPONENT'S PREVIOUS POINTS:\n`;
        opponentHistory.forEach((resp, idx) => {
          prompt += `Round ${idx + 1}: "${resp.substring(0, 120)}${resp.length > 120 ? '...' : ''}"\n`;
        });
        prompt += `\nAddress and counter their arguments.\n`;
      }
      
      prompt += `\nNow deliver your Krump debate for Round ${roundName}:`;
      prompt += `\n• Start with hype (energy, crowd engagement)\n`;
      prompt += `• Present your technical arguments (jabs, stomps metaphorically)\n`;
      prompt += `• Show your character and originality\n`;
      prompt += `• Build toward a potential kill-off moment\n`;
      prompt += `• Maintain respect and community spirit`;
      
      return prompt;
    }
  },

  freestyle: {
    name: 'Freestyle Krump',
    description: 'Open creative expression with no constraints, pure Krump vibes',
    rounds: 2,
    roundNames: ['Round 1: Raw Expression', 'Round 2: Elevated Energy'],
    prompt: (topic, round, totalRounds, ownHistory, opponentHistory) => {
      let prompt = `You are in a FREESTYLE KRUMP BATTLE.\n\n`;
      prompt += `Inspiration: ${topic}\n`;
      prompt += `Round: ${round}/${totalRounds}\n\n`;
      
      prompt += `FREESTYLE KRUMP RULES:\n`;
      prompt += `• NO STRUCTURE - pure authentic expression\n`;
      prompt += `• Maximum creativity and originality\n`;
      prompt += `• Raw, unfiltered Krump energy\n`;
      prompt += `• Let your personal character shine\n`;
      prompt += `• Surprise and innovate\n\n`;
      
      prompt += `ESSENTIAL ELEMENTS:\n`;
      prompt += `1. HYPE - Generate and amplify energy\n`;
      prompt += `2. TECHNIQUE - Use proper Krump vocabulary\n`;
      prompt += `3. CHARACTER - Express your unique identity\n`;
      prompt += `4. KILL-OFF - Create moment that can't be topped\n`;
      prompt += `5. RESPECT - Honor the culture and community\n\n`;
      
      if (round === 2 && ownHistory.length > 0) {
        prompt += `Build on your previous expression:\n`;
        prompt += `"${ownHistory[0].substring(0, 100)}..."\n\n`;
        prompt += `Elevate your energy, deepen your character,`;
        prompt += ` create a kill-off moment that tops your previous round.`;
      }
      
      prompt += `\n\nLet your Krump soul speak:`;
      
      return prompt;
    }
  },

  call_response: {
    name: 'Call & Response Krump',
    description: 'Traditional Krump pattern of building on opponent\'s energy',
    rounds: 4,
    roundNames: ['Call 1', 'Response 1', 'Call 2', 'Response 2'],
    prompt: (topic, round, totalRounds, ownHistory, opponentHistory) => {
      const isCall = round % 2 === 1;
      
      let prompt = `You are in CALL & RESPONSE KRUMP BATTLE.\n\n`;
      prompt += `Topic: ${topic}\n`;
      prompt += `Round: ${round}/${totalRounds} (${isCall ? 'CALL' : 'RESPONSE'})\n\n`;
      
      prompt += `CALL & RESPONSE TRADITION:\n`;
      prompt += `• Odd rounds: YOU CALL - initiate and set energy\n`;
      prompt += `• Even rounds: YOU RESPONSE - build on opponent's previous call\n`;
      prompt += `This is Krump conversation - energy flows both ways\n`;
      prompt += `Feed off each other and create collective hype\n\n`;
      
      prompt += `K.R.U.M.P. VOCABULARY IN ACTION:\n`;
      prompt += `• Feed: Give energy to the cypher\n`;
      prompt += `• Call: Initiate movement and energy\n`;
      prompt += `• Response: Answer and amplify\n`;
      prompt += `• Hype: Build collective excitement\n`;
      prompt += `• Vibe: Shared atmosphere\n\n`;
      
      if (opponentHistory.length > 0) {
        const lastOpponent = opponentHistory[opponentHistory.length - 1];
        prompt += `OPPONENT'S PREVIOUS ${isCall ? 'CALL' : 'RESPONSE'}:\n`;
        prompt += `"${lastOpponent.substring(0, 180)}${lastOpponent.length > 180 ? '...' : ''}"\n\n`;
      }
      
      if (!isCall && ownHistory.length > 0) {
        prompt += `YOUR PREVIOUS CALL:\n`;
        prompt += `"${ownHistory[ownHistory.length - 1].substring(0, 100)}..."\n\n`;
      }
      
      prompt += isCall 
        ? `\nMAKE YOUR CALL - set the tone, create the vibe, initiate the conversation.`
        : `\nRESPOND to their energy - match or exceed their hype, build on their ideas, show how you can elevate the exchange.`;
      
      prompt += `\n\nRemember: This is a dialogue, not a monologue. Respect the exchange.`;
      
      return prompt;
    }
  },

  storytelling: {
    name: 'Story Krump',
    description: 'Narrative battle where agents create a story in Krump style',
    rounds: 3,
    roundNames: ['Beginning: Character & Conflict', 'Development: Struggle & Growth', 'Climax: Resolution & Legacy'],
    prompt: (topic, round, totalRounds, ownHistory, opponentHistory) => {
      const stage = round === 1 ? 'BEGINNING' : 
                   round === totalRounds ? 'CLIMAX & RESOLUTION' : 'DEVELOPMENT';
      
      let prompt = `You are in STORY KRUMP BATTLE.\n\n`;
      prompt += `Story Theme: ${topic}\n`;
      prompt += `Round: ${round}/${totalRounds} (${stage})\n\n`;
      
      prompt += `STORY KRUMP STRUCTURE:\n`;
      prompt += `• Tell a cohesive story across all rounds\n`;
      prompt += `• Your character evolves through the narrative\n`;
      prompt += `• Use Krump movements as storytelling devices\n`;
      prompt += `• Build toward a climactic kill-off moment\n\n`;
      
      prompt += `STORYTELLING ELEMENTS IN KRUMP:\n`;
      prompt += `• Character: Who are you? (paint, persona, identity)\n`;
      prompt += `• Conflict: What struggle are you expressing?\n`;
      prompt += `• Journey: How do you overcome?\n`;
      prompt += `• Transformation: How do you change?\n`;
      prompt += `• Legacy: What do you leave behind?\n\n`;
      
      if (ownHistory.length > 0) {
        prompt += `YOUR STORY SO FAR:\n`;
        ownHistory.forEach((resp, idx) => {
          prompt += `Part ${idx + 1}: "${resp.substring(0, 150)}${resp.length > 150 ? '...' : ''}"\n`;
        });
        prompt += `\nContinue your narrative journey:`;
      } else {
        prompt += `\nBEGIN your story:\n`;
        prompt += `• Establish your character (who are you in this story?)\n`;
        prompt += `• Introduce the conflict (what hardship, challenge, or battle?)\n`;
        prompt += `• Set the scene (where are you? what's at stake?)\n`;
        prompt += `• Use Krump vocabulary to show, not tell\n`;
        prompt += `• End with a hook that leads to Round 2`;
      }
      
      if (round === 2) {
        prompt += `\n\nDEVELOPMENT PHASE:\n`;
        prompt += `• Deepen your character's struggle\n`;
        prompt += `• Show growth or transformation\n`;
        prompt += `• Build tension toward climax\n`;
        prompt += `• Use opponent's story as contrast/comparison`;
      }
      
      if (round === totalRounds) {
        prompt += `\n\nCLIMAX PHASE:\n`;
        prompt += `• Resolve the central conflict\n`;
        prompt += `• Create your kill-off moment (unbeatable)\n`;
        prompt += `• Show your character's legacy or transformation\n`;
        prompt += `• Leave the audience/opponent in awe`;
      }
      
      prompt += `\n\nRemember:`;
      prompt += `• Krump culture: respect, community, authenticity\n`;
      prompt += `• Use hype to energize your story\n`;
      prompt += `• Show technical mastery through narrative\n`;
      prompt += `• This is YOUR story - tell it with passion!`;
      
      return prompt;
    }
  }
};

class EnhancedKrumpArena {
  constructor() {
    this.battles = [];
    this.currentBattle = null;
  }

  /**
   * Judge a response using enhanced cultural criteria
   */
  judgeResponse(response, roundNumber, totalRounds, format) {
    const lowerResponse = response.toLowerCase();
    const scores = {};
    const wordCount = response.split(/\s+/).length;
    const charCount = response.length;

    // Score each of the 8 criteria
    for (const [criterionKey, config] of Object.entries(AUTHENTIC_KRUMP_CRITERIA_V2)) {
      let matches = [];
      let score = 0;

      // Check each marker word with phrase matching for multi-word markers
      for (const marker of config.markers) {
        const markerLower = marker.toLowerCase();
        if (markerLower.includes(' ')) {
          // Multi-word phrase - use substring search
          if (lowerResponse.includes(markerLower)) {
            score += 1;
            matches.push(marker);
          }
        } else {
          // Single word - use word boundary
          const regex = new RegExp(`\\b${markerLower}\\b`, 'g');
          const matchesInResponse = lowerResponse.match(regex);
          if (matchesInResponse) {
            score += matchesInResponse.length;
            matches.push(marker);
          }
        }
      }

      // Normalize to 1-10 scale with curve favoring substantial responses
      const expectedMarkers = Math.floor(config.markers.length * 0.4);
      const normalizedScore = Math.min(10, Math.max(1, 
        Math.round((score / expectedMarkers) * 9) + 1
      ));

      scores[criterionKey] = {
        score: normalizedScore,
        rawScore: score,
        possible: config.markers.length,
        weight: config.weight,
        matches: matches,
        percentage: Math.round((score / config.markers.length) * 100)
      };
    }

    // Calculate weighted total
    let weightedSum = 0;
    let weightTotal = 0;
    for (const [criterion, data] of Object.entries(scores)) {
      weightedSum += data.score * AUTHENTIC_KRUMP_CRITERIA_V2[criterion].weight;
      weightTotal += AUTHENTIC_KRUMP_CRITERIA_V2[criterion].weight;
    }
    const totalScore = weightedSum / weightTotal;

    // Round progression bonus (narrative development)
    let progressionBonus = 0;
    if (roundNumber > 1) {
      // Bonus for building narrative across rounds
      progressionBonus = 0.2 * (roundNumber - 1);
    }

    // Kill-off detection (extraordinary moment)
    let killoffBonus = 0;
    const killoffIndicators = ['kill-off', 'killer', 'insane moment', 'can\'t top', 'unbeatable', 'bell', 'round over'];
    if (killoffIndicators.some(indicator => lowerResponse.includes(indicator))) {
      killoffBonus = 0.5; // Significant bonus for kill-off attempt
    }

    const finalScore = Math.round((totalScore + progressionBonus + killoffBonus) * 10) / 10;

    return {
      scores,
      totalScore: Math.min(10, finalScore), // Cap at 10
      wordCount,
      charCount,
      roundNumber,
      hasKillOff: killoffBonus > 0,
      progressionBonus
    };
  }

  /**
   * Evaluate full battle with cultural considerations
   */
  async evaluateBattle(agentAName, agentBName, responsesA, responsesB, format) {
    const formatConfig = ENHANCED_KRUMP_FORMATS[format];
    const rounds = Math.max(responsesA.length, responsesB.length);

    const evaluation = {
      format,
      formatName: formatConfig.name,
      agentA: agentAName,
      agentB: agentBName,
      timestamp: new Date().toISOString(),
      rounds: [],
      finalScores: { [agentAName]: 0, [agentBName]: 0 },
      killOffs: { [agentAName]: 0, [agentBName]: 0 },
      avgScores: {}
    };

    // Judge each round
    for (let round = 1; round <= rounds; round++) {
      const responseA = responsesA[round - 1] || '';
      const responseB = responsesB[round - 1] || '';

      const judgmentA = this.judgeResponse(responseA, round, rounds, format);
      const judgmentB = this.judgeResponse(responseB, round, rounds, format);

      // Track kill-offs
      if (judgmentA.hasKillOff) evaluation.killOffs[agentAName]++;
      if (judgmentB.hasKillOff) evaluation.killOffs[agentBName]++;

      const roundWinner = this.determineRoundWinner(judgmentA, judgmentB);

      evaluation.rounds.push({
        round,
        agentA: { ...judgmentA, response: responseA },
        agentB: { ...judgmentB, response: responseB },
        winner: roundWinner,
        margin: Math.abs(judgmentA.totalScore - judgmentB.totalScore).toFixed(1),
        killOffA: judgmentA.hasKillOff,
        killOffB: judgmentB.hasKillOff
      });

      evaluation.finalScores[agentAName] += judgmentA.totalScore;
      evaluation.finalScores[agentBName] += judgmentB.totalScore;
    }

    // Calculate averages
    evaluation.avgScores = {
      [agentAName]: evaluation.finalScores[agentAName] / rounds,
      [agentBName]: evaluation.finalScores[agentBName] / rounds
    };

    // Determine overall winner with kill-off consideration
    evaluation.winner = evaluation.avgScores[agentAName] > evaluation.avgScores[agentBName] ? agentAName :
                       evaluation.avgScores[agentBName] > evaluation.avgScores[agentAName] ? agentBName : 'tie';
    evaluation.winMargin = Math.abs(evaluation.avgScores[agentAName] - evaluation.avgScores[agentBName]);

    // Add narrative assessment
    evaluation.narrativeAssessment = this.assessNarrative(evaluation.rounds);

    return evaluation;
  }

  determineRoundWinner(judgmentA, judgmentB) {
    // Close rounds (< 0.5 difference) can be ties
    const diff = judgmentA.totalScore - judgmentB.totalScore;
    if (Math.abs(diff) < 0.5) return 'tie';
    return diff > 0 ? 'A' : 'B';
  }

  assessNarrative(rounds) {
    // Check if narrative improved across rounds (scores increased)
    let aImproves = 0, bImproves = 0;
    for (let i = 1; i < rounds.length; i++) {
      if (rounds[i].agentA.totalScore > rounds[i-1].agentA.totalScore) aImproves++;
      if (rounds[i].agentB.totalScore > rounds[i-1].agentB.totalScore) bImproves++;
    }
    
    return {
      agentAImproved: aImproves,
      agentBImproved: bImproves,
      hasNarrativeArc: aImproves >= 1 || bImproves >= 1,
      consistentPerformer: aImproves === 0 && bImproves === 0
    };
  }

  /**
   * Generate detailed battle report with cultural context
   */
  generateBattleReport(evaluation, detailed = false) {
    const format = ENHANCED_KRUMP_FORMATS[evaluation.format];
    
    let report = `🥊 ENHANCED KRUMP BATTLE REPORT 🥊\n\n`;
    report += `Format: ${format.name}\n`;
    report += `Agents: ${evaluation.agentA} vs ${evaluation.agentB}\n`;
    report += `Date: ${new Date(evaluation.timestamp).toLocaleDateString()}\n\n`;

    report += `🏆 FINAL VERDICT\n\n`;
    if (evaluation.winner === 'tie') {
      report += `🤝 PERFECT TIE!\n`;
      report += `Both agents averaged ${evaluation.avgScores[evaluation.agentA].toFixed(2)}\n\n`;
    } else {
      report += `${evaluation.winner.toUpperCase()} WINS!\n`;
      report += `Score: ${evaluation.avgScores[evaluation.agentA].toFixed(2)} - ${evaluation.avgScores[evaluation.agentB].toFixed(2)}\n`;
      report += `Victory margin: ${evaluation.winMargin.toFixed(2)} points\n`;
      
      if (evaluation.killOffs[evaluation.winner] > 0) {
        report += `✨ ${evaluation.winner} achieved ${evaluation.killOffs[evaluation.winner]} kill-off moment(s)!\n`;
      }
    }

    report += `\n📊 CULTURAL CRITERION BREAKDOWN (Final Averages)\n\n`;
    
    // Header with 8 criteria
    report += `|${'Criterion'.padEnd(30)}|${evaluation.agentA.padEnd(12)}|${evaluation.agentB.padEnd(12)}|\n`;
    report += `|${'-'.repeat(30)}|${'-'.repeat(12)}|${'-'.repeat(12)}|\n`;

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
      const config = AUTHENTIC_KRUMP_CRITERIA_V2[key];
      const scoreA = evaluation.rounds.reduce((sum, r) => sum + (r.agentA.scores[key]?.score || 0), 0) / evaluation.rounds.length;
      const scoreB = evaluation.rounds.reduce((sum, r) => sum + (r.agentB.scores[key]?.score || 0), 0) / evaluation.rounds.length;
      
      report += `|${config.name.padEnd(30)}|${scoreA.toFixed(1).padStart(12)}|${scoreB.toFixed(1).padStart(12)}|\n`;
    }

    report += `|${'TOTAL'.padEnd(30)}|${evaluation.avgScores[evaluation.agentA].toFixed(1).padStart(12)}|${evaluation.avgScores[evaluation.agentB].toFixed(1).padStart(12)}|\n\n`;

    if (detailed) {
      report += `📋 ROUND-BY-ROUND ANALYSIS\n\n`;
      evaluation.rounds.forEach((round, idx) => {
        report += `Round ${round.round}:\n`;
        report += `  Winner: ${round.winner === 'tie' ? '🤝 TIE' : round.winner === 'A' ? evaluation.agentA : evaluation.agentB}\n`;
        report += `  ${evaluation.agentA}: ${round.agentA.totalScore.toFixed(2)} | ${evaluation.agentB}: ${round.agentB.totalScore.toFixed(2)}\n`;
        if (round.killOffA || round.killOffB) {
          report += `  ⚡ Kill-off: ${round.killOffA ? evaluation.agentA : evaluation.agentB}\n`;
        }
        report += '\n';
      });
    }

    // Narrative assessment
    report += `\n📖 NARRATIVE ASSESSMENT\n\n`;
    report += `Agent Development:\n`;
    report += `  ${evaluation.agentA}: Improved in ${evaluation.narrativeAssessment.agentAImproved} round(s)\n`;
    report += `  ${evaluation.agentB}: Improved in ${evaluation.narrativeAssessment.agentBImproved} round(s)\n`;
    report += `\nCommunity Values Demonstrated:\n`;
    report += `  Hype generation, respect, creative expression, cultural authenticity\n`;

    report += `\n---\n`;
    report += `Judging based on "Behind the Decision" Krump Research (Free-DOM Foundation)\n`;
    report += `Enhanced with cultural elements: Hype, Physicality, Kill-offs, Community Spirit\n`;
    report += `8 Core Qualities + Cultural Respect + Narrative Development\n`;

    return report;
  }

  /**
   * Generate social media post
   */
  generatePostReport(evaluation, short = false, displayNames = {}) {
    const nameA = displayNames.agentAName || evaluation.agentA;
    const nameB = displayNames.agentBName || evaluation.agentB;
    const winnerDisplay = displayNames.winnerName || (evaluation.winner === 'tie' ? 'TIE' : evaluation.winner);
    if (short) {
      let post = `🥊 KRUMP BATTLE RESULTS 🥊\n\n`;
      post += `📢 ${nameA} vs ${nameB}\n`;
      post += `🏆 Winner: ${typeof winnerDisplay === 'string' ? winnerDisplay.toUpperCase() : winnerDisplay}\n`;
      post += `💯 Score: ${evaluation.avgScores[evaluation.agentA].toFixed(1)} - ${evaluation.avgScores[evaluation.agentB].toFixed(1)}\n`;
      
      if (evaluation.killOffs[evaluation.winner] > 0) {
        post += `⚡ ${evaluation.killOffs[evaluation.winner]} kill-off moment(s)!\n`;
      }
      
      post += `\nFormat: ${evaluation.format.toUpperCase()}\n`;
      post += `#KrumpClab #Battle #${evaluation.format} #AuthenticKrump`;
      
      return post;
    }
    return this.generateBattleReport(evaluation, false);
  }

  /**
   * Save battle to history
   */
  saveBattle(evaluation) {
    try {
      const fs = require('fs');
      const path = require('path');
      const historyDir = path.join(__dirname, 'data');
      const historyFile = path.join(historyDir, 'battles.json');

      if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

      let history = [];
      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }

      const battleRecord = {
        id: Date.now().toString(36),
        timestamp: evaluation.timestamp,
        format: evaluation.format,
        agentA: evaluation.agentA,
        agentB: evaluation.agentB,
        winner: evaluation.winner,
        avgScores: evaluation.avgScores,
        finalScores: evaluation.finalScores,
        rounds: evaluation.rounds.length,
        killOffs: evaluation.killOffs,
        narrative: evaluation.narrativeAssessment,
        detailed: evaluation
      };

      history.push(battleRecord);

      // Keep last 500 battles
      if (history.length > 500) history = history.slice(-500);

      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      return battleRecord.id;
    } catch (err) {
      console.error('Failed to save battle:', err);
      return null;
    }
  }

  /**
   * Get agent statistics including community metrics
   */
  getAgentStats(agentName) {
    try {
      const fs = require('fs');
      const path = require('path');
      const historyFile = path.join(__dirname, 'data', 'battles.json');

      if (!fs.existsSync(historyFile)) return null;

      const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      const agentBattles = history.filter(b => b.agentA === agentName || b.agentB === agentName);

      let wins = 0, losses = 0, ties = 0;
      let totalScore = 0, totalRounds = 0;
      let totalKillOffs = 0;

      agentBattles.forEach(battle => {
        if (battle.winner === agentName) wins++;
        else if (battle.winner === 'tie') ties++;
        else losses++;

        const score = battle.avgScores[agentName];
        totalScore += score;
        totalRounds += battle.rounds;
        
        const killoffs = battle.killOffs[agentName] || 0;
        totalKillOffs += killoffs;
      });

      return {
        agent: agentName,
        battles: agentBattles.length,
        wins,
        losses,
        ties,
        winRate: wins / agentBattles.length,
        avgScore: totalScore / agentBattles.length,
        avgRoundsPerBattle: totalRounds / agentBattles.length,
        totalKillOffs,
        killOffsPerBattle: totalKillOffs / agentBattles.length,
        favoriteFormat: this.getFavoriteFormat(agentBattles)
      };
    } catch (err) {
      console.error('Failed to get stats:', err);
      return null;
    }
  }

  getFavoriteFormat(battles) {
    const formatCounts = {};
    battles.forEach(b => {
      formatCounts[b.format] = (formatCounts[b.format] || 0) + 1;
    });
    return Object.entries(formatCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'unknown';
  }
}

module.exports = { 
  EnhancedKrumpArena: EnhancedKrumpArena,
  KRUMP_CRITERIA: AUTHENTIC_KRUMP_CRITERIA_V2,
  KRUMP_FORMATS: ENHANCED_KRUMP_FORMATS
};