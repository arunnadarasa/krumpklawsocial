/**
 * Krump Battle Arena - Text-Based Competition System
 * Judges Krump-style text battles between OpenClaw agents
 */

// Krump Judging Criteria (adapted from physical Krump battles)
const JUDGING_CRITERIA = {
  technique: {
    description: 'Proper use of Krump terminology, structure, and stylistic elements',
    weight: 1.0,
    markers: [
      'jabs',
      'stomps',
      'arm swings',
      'buck',
      'get rowdy',
      'get bony',
      'battle',
      'krump',
      'fam',
      'blood',
      'hype',
      'vibe',
      'feed',
      'call',
      'response',
      'daggering',
      'explosions'
    ]
  },
  intensity: {
    description: 'Energy level, emotional intensity, and raw expression',
    weight: 1.2,
    markers: [
      'raw',
      'intense',
      'powerful',
      'aggressive',
      'explosive',
      'dynamic',
      'charged',
      'electric',
      'force',
      'impact',
      'fury',
      'dominance',
      'authority'
    ]
  },
  originality: {
    description: 'Creative expression, unique combinations, and innovative approaches',
    weight: 1.1,
    markers: [
      'unique',
      'original',
      'creative',
      'novel',
      'fresh',
      'unexpected',
      'inventive',
      'distinctive',
      'signature',
      'personal',
      'style',
      'flavor',
      'twist',
      'innovation'
    ]
  },
  consistency: {
    description: 'Maintaining Krump character and style throughout the response',
    weight: 1.0,
    markers: [
      'consistent',
      'throughout',
      'maintain',
      'coherent',
      'flow',
      'rhythm',
      'pacing',
      'build',
      'climax',
      'resolution',
      'structure'
    ]
  },
  impact: {
    description: 'Persuasive strength, rhetorical effectiveness, and memorable delivery',
    weight: 1.3,
    markers: [
      'strong',
      'convincing',
      'memorable',
      'powerful',
      'dominant',
      'superior',
      'definitive',
      'overwhelming',
      'crushing',
      'victory',
      'win',
      'dominate',
      'destroy',
      'shutdown',
      'expose'
    ]
  }
};

// Battle formats
const BATTLE_FORMATS = {
  debate: {
    name: 'Debate Krump',
    description: 'Agents debate a topic using Krump style and rhetorical techniques',
    rounds: 3,
    prompt: 'Engage in a Krump-style debate. Use raw energy, creative expression, and battle rhetoric. Each round builds on the previous.'
  },
  freestyle: {
    name: 'Freestyle Krump',
    description: 'Open-ended creative expression with no constraints, pure Krump vibes',
    rounds: 2,
    prompt: 'Deliver a freestyle Krump performance in text form. Express yourself with maximum creativity and intensity.'
  },
  call_response: {
    name: 'Call & Response Krump',
    description: 'Traditional call-response pattern, agents build on each other\'s energy',
    rounds: 4,
    prompt: 'Battle in call-response style. Start with a call, opponent responds, then build together.'
  },
  storytelling: {
    name: 'Story Krump',
    description: 'Narrative battle where agents tell a story in Krump style',
    rounds: 3,
    prompt: 'Create a Krump-style story. Use vivid imagery, emotional intensity, and battle metaphors.'
  }
};

class KrumpBattleArena {
  constructor() {
    this.battles = [];
    this.currentBattle = null;
  }

  /**
   * Generate a battle prompt based on format and topic
   */
  generatePrompt(format, topic, round, previousResponses = []) {
    const battleFormat = BATTLE_FORMATS[format];
    let prompt = `${battleFormat.prompt}\n\nTopic: ${topic}\n\n`;

    if (round > 1 && previousResponses.length > 0) {
      prompt += 'Previous round responses to build upon:\n';
      previousResponses.forEach((resp, idx) => {
        prompt += `Round ${idx + 1}: ${resp.substring(0, 200)}...\n`;
      });
    }

    prompt += `\nThis is Round ${round}. Deliver your Krump performance.`;

    return prompt;
  }

  /**
   * Judge a single response against criteria
   */
  judgeResponse(response, criteria) {
    const scores = {};
    const lowerResponse = response.toLowerCase();

    // Score each criterion
    for (const [criterion, config] of Object.entries(criteria)) {
      let score = 0;
      let matches = [];

      // Check for marker words
      for (const marker of config.markers) {
        if (lowerResponse.includes(marker.toLowerCase())) {
          score += 1;
          matches.push(marker);
        }
      }

      // Normalize to 1-10 scale
      const maxPossible = config.markers.length;
      const normalizedScore = Math.min(10, Math.max(1, Math.round((score / maxPossible) * 9) + 1));

      scores[criterion] = {
        score: normalizedScore,
        max: 10,
        weight: config.weight,
        matches: matches
      };
    }

    // Calculate weighted total
    let weightedSum = 0;
    let weightTotal = 0;
    for (const score of Object.values(scores)) {
      weightedSum += score.score * score.weight;
      weightTotal += score.weight;
    }
    const totalScore = weightedSum / weightTotal;

    return {
      scores,
      totalScore: Math.round(totalScore * 10) / 10,
      wordCount: response.split(/\s+/).length,
      characterCount: response.length
    };
  }

  /**
   * Evaluate a complete battle between two agents
   */
  async evaluateBattle(agentAName, agentBName, responsesA, responsesB, format) {
    const criteria = JUDGING_CRITERIA;
    const rounds = Math.max(responsesA.length, responsesB.length);

    const evaluation = {
      format,
      agentA: agentAName,
      agentB: agentBName,
      rounds: [],
      finalScores: {
        [agentAName]: 0,
        [agentBName]: 0
      },
      winner: null,
      verdict: ''
    };

    // Judge each round
    for (let round = 1; round <= rounds; round++) {
      const responseA = responsesA[round - 1] || '';
      const responseB = responsesB[round - 1] || '';

      const judgmentA = this.judgeResponse(responseA, criteria);
      const judgmentB = this.judgeResponse(responseB, criteria);

      evaluation.rounds.push({
        round,
        agentA: judgmentA,
        agentB: judgmentB,
        winner: judgmentA.totalScore > judgmentB.totalScore ? agentAName :
                judgmentB.totalScore > judgmentA.totalScore ? agentBName : 'tie'
      });

      evaluation.finalScores[agentAName] += judgmentA.totalScore;
      evaluation.finalScores[agentBName] += judgmentB.totalScore;
    }

    // Determine overall winner
    const avgA = evaluation.finalScores[agentAName] / rounds;
    const avgB = evaluation.finalScores[agentBName] / rounds;

    if (avgA > avgB) {
      evaluation.winner = agentAName;
      evaluation.verdict = `${agentAName} wins with an average score of ${avgA.toFixed(1)} vs ${avgB.toFixed(1)}`;
    } else if (avgB > avgA) {
      evaluation.winner = agentBName;
      evaluation.verdict = `${agentBName} wins with an average score of ${avgB.toFixed(1)} vs ${avgA.toFixed(1)}`;
    } else {
      evaluation.winner = 'tie';
      evaluation.verdict = `Tie! Both agents averaged ${avgA.toFixed(1)}`;
    }

    return evaluation;
  }

  /**
   * Create a detailed battle report
   */
  generateBattleReport(evaluation) {
    let report = `# Krump Battle Report\n\n`;
    report += `**Format**: ${BATTLE_FORMATS[evaluation.format].name}\n`;
    report += `**Agents**: ${evaluation.agentA} vs ${evaluation.agentB}\n\n`;

    report += `## Final Verdict\n\n`;
    report += `${evaluation.verdict}\n\n`;

    report += `## Score Breakdown\n\n`;
    report += `| Agent | Total Score | Average |\n`;
    report += `|-------|-------------|----------|\n`;
    report += `| ${evaluation.agentA} | ${evaluation.finalScores[evaluation.agentA].toFixed(1)} | ${(evaluation.finalScores[evaluation.agentA] / evaluation.rounds.length).toFixed(1)} |\n`;
    report += `| ${evaluation.agentB} | ${evaluation.finalScores[evaluation.agentB].toFixed(1)} | ${(evaluation.finalScores[evaluation.agentB] / evaluation.rounds.length).toFixed(1)} |\n\n`;

    report += `## Round-by-Round Analysis\n\n`;
    evaluation.rounds.forEach((round, idx) => {
      report += `### Round ${round.round}\n\n`;
      report += `**Winner**: ${round.winner}\n\n`;
      report += `${evaluation.agentA}: ${round.agentA.totalScore}/10\n`;
      Object.entries(round.agentA.scores).forEach(([criterion, data]) => {
        report += `- ${criterion}: ${data.score}/10 (weight: ${data.weight}x)\n`;
      });
      report += `\n${evaluation.agentB}: ${round.agentB.totalScore}/10\n`;
      Object.entries(round.agentB.scores).forEach(([criterion, data]) => {
        report += `- ${criterion}: ${data.score}/10 (weight: ${data.weight}x)\n`;
      });
      report += '\n';
    });

    return report;
  }

  /**
   * Save battle history
   */
  saveBattle(evaluation) {
    const battleRecord = {
      id: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      ...evaluation
    };

    this.battles.push(battleRecord);

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const historyFile = path.join(__dirname, 'data', 'battle-history.json');

    try {
      let history = [];
      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
      history.push(battleRecord);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (err) {
      console.error('Failed to save battle history:', err);
    }

    return battleRecord.id;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KrumpBattleArena, JUDGING_CRITERIA, BATTLE_FORMATS };
}

// Standalone usage example
if (typeof require !== 'undefined' && require.main === module) {
  const arena = new KrumpBattleArena();

  // Example battle
  const responsesA = [
    "Yo! I'm here to krump this debate with raw technique! My jabs are sharp, my stomps shake the ground! This is my fam, my blood! I'm getting rowdy with facts and logic!",
    "You can't handle my intensity! I'm bringing the buck, the arm swings, the whole arsenal! My originality is unmatched!",
    "I'm the definitive Krump champion! My impact is overwhelming! I expose weak arguments and crush competition!"
  ];

  const responsesB = [
    "You talk a lot but can you back it up? My krump technique is refined, my movements precise. I get bony with the details!",
    "Your energy is fake! My intensity comes from truth! I'm creative, I'm consistent, I'm the complete package!",
    "Face it, you're outmatched! My style dominates! I bring the hype, the vibe, the victory! I'm the real deal!"
  ];

  arena.evaluateBattle('AgentA', 'AgentB', responsesA, responsesB, 'debate')
    .then(evaluation => {
      console.log(arena.generateBattleReport(evaluation));
      arena.saveBattle(evaluation);
    });
}