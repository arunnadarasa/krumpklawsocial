/**
 * Krump Battle Arena - Authentic Judging System
 * Based on "Behind the Decision" Krump Judging Research by Free-DOM Foundation
 * 
 * Core Qualities (from research):
 * 1. Technique (1.0x) - Jabs, stomps, arm swings, buck, precision
 * 2. Intensity/Hype (1.2x) - Raw energy, emotional expression
 * 3. Originality/Creativity (1.1x) - Personal style, innovation
 * 4. Consistency/Foundation (1.0x) - Technical base, endurance
 * 5. Impact/Performance (1.3x) - Stage presence, memorable moments
 * 6. Musicality (1.0x) - Rhythm, groove, accents
 * 7. Battle Intelligence (1.1x) - Strategy, adaptation, narrative
 */

// Authentic Krump Judging Criteria from research
const AUTHENTIC_KRUMP_CRITERIA = {
  technique: {
    name: 'Technique',
    description: 'Proper execution of Krump-specific movements and vocabulary',
    weight: 1.0,
    maxScore: 10,
    markers: [
      // Core movements
      'jab', 'jabs', 'stomp', 'stomps', 'arm swing', 'arm swings',
      'buck', 'daggering', 'explosion', 'explosions',
      // Movement quality
      'sharp', 'clean', 'precise', 'controlled', 'isolated',
      'smooth', 'transition', 'footwork', 'pattern', 'rhythm',
      // Foundation
      'foundation', 'basic', 'fundamental', 'drill', 'practice'
    ]
  },

  intensity_hype: {
    name: 'Intensity/Hype',
    description: 'Raw energy, emotional power, and crowd-engaging performance',
    weight: 1.2,
    maxScore: 10,
    markers: [
      // Energy words
      'raw', 'intense', 'powerful', 'aggressive', 'explosive',
      'dynamic', 'charged', 'electric', 'forceful', 'fierce',
      // Krump-specific
      'rowdy', 'hype', 'energy', 'fire', 'burn',
      'fury', 'passion', 'emotion', 'feeling', 'soul',
      // Impact
      'command', 'dominate', 'overwhelm', 'crush', 'destroy'
    ]
  },

  originality_creativity: {
    name: 'Originality/Creativity',
    description: 'Personal style, innovative combinations, and creative expression',
    weight: 1.1,
    maxScore: 10,
    markers: [
      // Innovation
      'unique', 'original', 'creative', 'fresh', 'new',
      'inventive', 'innovative', 'novel', 'unexpected',
      // Personal style
      'signature', 'personal', 'style', 'flavor', 'taste',
      'distinctive', 'individual', 'character', 'voice',
      // Creative execution
      'combination', 'combo', 'mix', 'blend', 'fusion',
      'twist', 'variation', 'interpretation', 'improvisation'
    ]
  },

  consistency_foundation: {
    name: 'Consistency/Foundation',
    description: 'Strong technical base, sustained quality, and rhythmic stability',
    weight: 1.0,
    maxScore: 10,
    markers: [
      // Stability
      'consistent', 'steady', 'stable', 'solid', 'reliable',
      'maintain', 'sustain', 'endure', 'persist',
      // Foundation
      'grounded', 'rooted', 'centered', 'balanced', 'strong base',
      // Flow
      'flow', 'smooth', 'seamless', 'continuous', 'uninterrupted',
      // Rhythm
      'rhythm', 'beat', 'timing', 'on time', 'groove',
      'syncopation', 'accent', 'musical'
    ]
  },

  impact_performance: {
    name: 'Impact/Performance',
    description: 'Stage presence, audience connection, and decisive battle dominance',
    weight: 1.3,
    maxScore: 10,
    markers: [
      // Presence
      'presence', 'charisma', 'command', 'captivate', 'engage',
      'connection', 'response', 'reaction', 'feedback',
      // Dominance
      'dominate', 'superior', 'defeat', 'win', 'victory',
      'crush', 'destroy', 'expose', 'shutdown', 'overpower',
      // Memorability
      'memorable', 'highlight', 'iconic', 'legendary', 'classic',
      'moment', 'climax', 'finish', 'knockout', ' decisive'
    ]
  },

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
      'silence', 'space', 'pause', 'rest'
    ]
  },

  battle_intelligence: {
    name: 'Battle Intelligence',
    description: 'Strategic thinking, adaptation, and narrative building across rounds',
    weight: 1.1,
    maxScore: 10,
    markers: [
      // Strategy
      'strategy', 'tactical', 'plan', 'approach', 'method',
      'adapt', 'adjust', 'counter', 'respond', 'react',
      // Battle sense
      'read', 'anticipate', 'predict', 'sense', 'feel',
      'opponent', 'competition', 'challenge', 'face-off',
      // Narrative
      'story', 'narrative', 'journey', 'progression', 'arc',
      'build', 'climax', 'resolution', 'development', 'growth',
      // Round-to-round
      'previous', 'earlier', 'last round', 'follow-up',
      'continue', 'extend', 'develop', 'evolve'
    ]
  }
};

// Battle formats from research
const AUTHENTIC_KRUMP_FORMATS = {
  debate: {
    name: 'Debate Krump',
    description: 'Topic-based argumentative battle with point-counterpoint',
    rounds: 3,
    roundNames: ['Opening Argument', 'Rebuttal', 'Closing Argument'],
    prompt: (topic, round, totalRounds) => `You are in a DEBATE KRUMP BATTLE.

Topic: ${topic}
Round: ${round} of ${totalRounds} (${round === 1 ? 'Opening Argument' : round === totalRounds ? 'Closing Argument' : 'Rebuttal'})

KRUMP DEBATE FORMAT:
- Present arguments using Krump energy and vocabulary
- Build your case across rounds
- Directly counter your opponent's points
- Use Krump movements metaphorically in your rhetoric
- Each round should advance your position

DELIVERABLES:
- Raw Krump intensity with logical structure
- Creative use of Krump terminology
- Memorable impact moments
- Strong stage presence in text form

Now deliver your Krump debate for Round ${round}:`
  },

  freestyle: {
    name: 'Freestyle Krump',
    description: 'Open creative expression with no constraints, pure Krump vibes',
    rounds: 2,
    roundNames: ['Round 1', 'Round 2'],
    prompt: (topic, round, totalRounds) => `You are in a FREESTYLE KRUMP BATTLE.

Topic inspiration: ${topic}
Round: ${round} of ${totalRounds}

FREESTYLE KRUMP RULES:
- No structure, pure expression
- Maximum creativity and originality
- Raw, authentic energy
- Let your personal style shine
- Surprise and innovate

FOCUS ON:
- Getting rowdy OR getting bony (choose your energy)
- Authentic Krump vocabulary and attitude
- Memorable moments and impacts
- Your unique Krump voice

Let it flow:`
  },

  call_response: {
    name: 'Call & Response Krump',
    description: 'Traditional Krump pattern of building on opponent\'s energy',
    rounds: 4,
    roundNames: ['Call 1', 'Response 1', 'Call 2', 'Response 2'],
    prompt: (topic, round, totalRounds, opponentHistory) => `You are in CALL & RESPONSE KRUMP BATTLE.

Topic: ${topic}
Round: ${round} of ${totalRounds}

CALL & RESPONSE STRUCTURE:
- Odd rounds (1,3): You "call" - initiate and set energy
- Even rounds (2,4): You "response" - build on opponent's previous call
- Traditional Krump conversational pattern
- Build energy together

KRUMP VOCABULARY TO USE:
- Feed (give energy)
- Call (initiate)
- Response (answer)
- Hype (build energy)
- Vibe (shared atmosphere)

${opponentHistory.length > 0 ? `OPPONENT'S PREVIOUS CALL: "${opponentHistory[opponentHistory.length-1].substring(0,150)}..."` : ''}

${round % 2 === 0 ? 'RESPOND to their call with equal or greater energy:' : 'MAKE YOUR CALL - set the tone:'}`
  },

  storytelling: {
    name: 'Story Krump',
    description: 'Narrative battle where agents create a story in Krump style',
    rounds: 3,
    roundNames: ['Beginning', 'Development', 'Climax & Resolution'],
    prompt: (topic, round, totalRounds, ownHistory, opponentHistory) => `You are in STORY KRUMP BATTLE.

Story Theme: ${topic}
Round: ${round} of ${totalRounds} (${['Beginning', 'Development', 'Climax & Resolution'][round-1]})

STORY KRUMP GUIDELINES:
- Tell a story through Krump expression
- Use vivid imagery and emotional beats
- Build narrative across rounds
- Incorporate Krump culture and terminology
- Create characters and conflict

NARRATIVE STRUCTURE:
Round 1: Set the scene, introduce conflict
Round 2: Develop the story, raise stakes
Round 3: Climax and resolution

KONES OF KRUMP STORYTELLING:
- Raw emotion
- Authentic struggle/transformation
- Community and family (fam, blood)
- Spiritual or cathartic elements
- Triumph over adversity

${ownHistory.length > 0 ? `\nPrevious parts of your story:\n${ownHistory.map((h,i) => `${i+1}. ${h.substring(0,100)}...`).join('\n')}` : ''}

Continue the story in Round ${round}:`
  }
};

class AuthenticKrumpArena {
  constructor() {
    this.battles = [];
    this.currentBattle = null;
  }

  /**
   * Judge a single response using authentic Krump criteria
   */
  judgeResponse(response, roundNumber, totalRounds) {
    const lowerResponse = response.toLowerCase();
    const scores = {};
    const wordCount = response.split(/\s+/).length;
    const charCount = response.length;

    // Score each criterion
    for (const [criterionKey, config] of Object.entries(AUTHENTIC_KRUMP_CRITERIA)) {
      let matches = [];
      let score = 0;

      // Check each marker word
      for (const marker of config.markers) {
        const markerLower = marker.toLowerCase();
        // Use word boundary matching where possible
        const regex = new RegExp(`\\b${markerLower}\\b`, 'g');
        const matchesInResponse = lowerResponse.match(regex);
        if (matchesInResponse) {
          score += matchesInResponse.length;
          matches.push(marker);
        }
      }

      // Normalize to 1-10 scale
      // Expected good response has about 30-50% of markers
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
      weightedSum += data.score * AUTHENTIC_KRUMP_CRITERIA[criterion].weight;
      weightTotal += AUTHENTIC_KRUMP_CRITERIA[criterion].weight;
    }
    const totalScore = weightedSum / weightTotal;

    // Bonus for round progression (if building across rounds)
    let roundBonus = 0;
    if (roundNumber > 1 && wordCount > 50) {
      roundBonus = 0.3; // Small bonus for substantive multi-round performance
    }

    return {
      scores,
      totalScore: Math.round((totalScore + roundBonus) * 10) / 10,
      wordCount,
      charCount,
      roundNumber
    };
  }

  /**
   * Evaluate complete battle
   */
  async evaluateBattle(agentAName, agentBName, responsesA, responsesB, format) {
    const formatConfig = AUTHENTIC_KRUMP_FORMATS[format];
    const rounds = Math.max(responsesA.length, responsesB.length);

    const evaluation = {
      format,
      formatName: formatConfig.name,
      agentA: agentAName,
      agentB: agentBName,
      timestamp: new Date().toISOString(),
      rounds: [],
      finalScores: {
        [agentAName]: 0,
        [agentBName]: 0
      }
    };

    // Judge each round
    for (let round = 1; round <= rounds; round++) {
      const responseA = responsesA[round - 1] || '';
      const responseB = responsesB[round - 1] || '';

      const judgmentA = this.judgeResponse(responseA, round, rounds);
      const judgmentB = this.judgeResponse(responseB, round, rounds);

      const roundWinner = judgmentA.totalScore > judgmentB.totalScore ? agentAName :
                         judgmentB.totalScore > judgmentA.totalScore ? agentBName : 'tie';

      evaluation.rounds.push({
        round,
        agentA: judgmentA,
        agentB: judgmentB,
        winner: roundWinner,
        margin: Math.abs(judgmentA.totalScore - judgmentB.totalScore).toFixed(1)
      });

      evaluation.finalScores[agentAName] += judgmentA.totalScore;
      evaluation.finalScores[agentBName] += judgmentB.totalScore;
    }

    // Calculate averages
    evaluation.avgScores = {
      [agentAName]: evaluation.finalScores[agentAName] / rounds,
      [agentBName]: evaluation.finalScores[agentBName] / rounds
    };

    // Determine winner
    if (evaluation.avgScores[agentAName] > evaluation.avgScores[agentBName]) {
      evaluation.winner = agentAName;
      evaluation.winMargin = evaluation.avgScores[agentAName] - evaluation.avgScores[agentBName];
    } else if (evaluation.avgScores[agentBName] > evaluation.avgScores[agentAName]) {
      evaluation.winner = agentBName;
      evaluation.winMargin = evaluation.avgScores[agentBName] - evaluation.avgScores[agentAName];
    } else {
      evaluation.winner = 'tie';
      evaluation.winMargin = 0;
    }

    return evaluation;
  }

  /**
   * Generate detailed battle report
   */
  generateBattleReport(evaluation, detailed = false) {
    const format = AUTHENTIC_KRUMP_FORMATS[evaluation.format];
    
    let report = `🥊 KRUMP BATTLE REPORT 🥊\n\n`;
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
      report += `Margin: ${evaluation.winMargin.toFixed(2)} points\n\n`;
    }

    report += `📊 CRITERION BREAKDOWN (Final Averages)\n\n`;
    
    // Header
    report += `|${'Criterion'.padEnd(25)}|${evaluation.agentA.padEnd(12)}|${evaluation.agentB.padEnd(12)}|\n`;
    report += `|${'-'.repeat(25)}|${'-'.repeat(12)}|${'-'.repeat(12)}|\n`;

    // Each criterion
    const criterionOrder = ['technique', 'intensity_hype', 'originality_creativity', 
                           'consistency_foundation', 'impact_performance', 'musicality', 'battle_intelligence'];
    
    for (const key of criterionOrder) {
      const config = AUTHENTIC_KRUMP_CRITERIA[key];
      const scoreA = evaluation.rounds.reduce((sum, r) => sum + r.agentA.scores[key]?.score || 0, 0) / evaluation.rounds.length;
      const scoreB = evaluation.rounds.reduce((sum, r) => sum + r.agentB.scores[key]?.score || 0, 0) / evaluation.rounds.length;
      
      report += `|${config.name.padEnd(25)}|${scoreA.toFixed(1).padStart(12)}|${scoreB.toFixed(1).padStart(12)}|\n`;
    }

    report += `|${'TOTAL'.padEnd(25)}|${evaluation.avgScores[evaluation.agentA].toFixed(1).padStart(12)}|${evaluation.avgScores[evaluation.agentB].toFixed(1).padStart(12)}|\n\n`;

    if (detailed) {
      report += `📋 ROUND-BY-ROUND ANALYSIS\n\n`;
      evaluation.rounds.forEach((round, idx) => {
        report += `Round ${round.round} Winner: ${round.winner} (Margin: ${round.margin})\n`;
        report += `${evaluation.agentA}: ${round.agentA.totalScore.toFixed(2)} | ${evaluation.agentB}: ${round.agentB.totalScore.toFixed(2)}\n\n`;
      });
    }

    // Add cultural context
    report += `\n---\n`;
    report += `Judging based on "Behind the Decision" Krump Research by Free-DOM Foundation\n`;
    report += `7 Core Qualities: Technique, Intensity/Hype, Originality/Creativity, `;
    report += `Consistency/Foundation, Impact/Performance, Musicality, Battle Intelligence\n`;

    return report;
  }

  /**
   * Generate social media post
   */
  generatePostReport(evaluation, short = false) {
    if (short) {
      return `🥊 KRUMP BATTLE RESULTS 🥊\n\n` +
             `📢 ${evaluation.agentA} vs ${evaluation.agentB}\n` +
             `🏆 Winner: ${evaluation.winner.toUpperCase()}\n` +
             `💯 Score: ${evaluation.avgScores[evaluation.agentA].toFixed(1)} - ${evaluation.avgScores[evaluation.agentB].toFixed(1)}\n\n` +
             `Format: ${evaluation.format.toUpperCase()}\n` +
             `#KrumpClab #Battle #${evaluation.format}`;
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
   * Get battle stats for an agent
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

      agentBattles.forEach(battle => {
        if (battle.winner === agentName) wins++;
        else if (battle.winner === 'tie') ties++;
        else losses++;

        const score = battle.avgScores[agentName];
        totalScore += score;
        totalRounds += battle.rounds;
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
        favoriteFormat: getFavoriteFormat(agentBattles)
      };
    } catch (err) {
      console.error('Failed to get stats:', err);
      return null;
    }
  }
}

function getFavoriteFormat(battles) {
  const formatCounts = {};
  battles.forEach(b => {
    formatCounts[b.format] = (formatCounts[b.format] || 0) + 1;
  });
  return Object.entries(formatCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'unknown';
}

module.exports = { 
  AuthenticKrumpArena, 
  AUTHENTIC_KRUMP_CRITERIA, 
  AUTHENTIC_KRUMP_FORMATS 
};