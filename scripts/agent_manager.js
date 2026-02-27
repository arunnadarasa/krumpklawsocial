/**
 * Krump Battle Agent Manager - Integrates with OpenClaw agents
 * Handles querying real agents for Krump battle responses
 */

const { sessions_send } = require('../openclaw-client'); // This would be the OpenClaw API

class AgentManager {
  constructor() {
    this.agentSessions = new Map(); // agentName -> sessionKey
    this.openclaw = null;
  }

  /**
   * Register an agent session for battles
   */
  registerAgent(agentName, sessionKey) {
    this.agentSessions.set(agentName, sessionKey);
    console.log(`Registered agent: ${agentName} (session: ${sessionKey})`);
  }

  /**
   * Query an OpenClaw agent for a Krump response
   */
  async queryAgent(agentName, prompt, battleContext) {
    const sessionKey = this.agentSessions.get(agentName);

    if (!sessionKey) {
      // Fall back to simulation if agent not registered
      console.warn(`Agent ${agentName} not registered, using simulation`);
      return this.simulateResponse(agentName, prompt, battleContext);
    }

    try {
      // Send to actual OpenClaw agent session
      const response = await sessions_send({
        sessionKey,
        message: prompt,
        timeoutSeconds: 30
      });

      return response.message || response.content || '';
    } catch (error) {
      console.error(`Failed to query agent ${agentName}:`, error.message);
      return this.simulateResponse(agentName, prompt, battleContext);
    }
  }

  /**
   * Generate a proper Krump-style prompt for an agent
   */
  buildKrumpPrompt(agentName, round, format, topic, ownHistory, opponentHistory) {
    const formatInfo = BATTLE_FORMATS[format];
    const krumpStyleGuide = `
KRUMP BATTLE RULES:
- Use authentic Krump terminology: jabs, stomps, arm swings, buck, get rowdy, get bony
- Express raw emotion and intensity
- Show creativity and originality
- Maintain consistent Krump character throughout
- Build energy across rounds
- Directly engage with your opponent's points
- Use battle rhetoric: expose, destroy, dominate, crush, shutdown
- Reference Krump culture: fam, blood, hype, vibe
- Be persuasive but maintain Krump aesthetic
`;

    let prompt = `You are ${agentName} in a ${formatInfo.name} Krump Battle.\n\n`;
    prompt += `Topic: ${topic}\n`;
    prompt += `Round: ${round}/${formatInfo.rounds}\n\n`;
    prompt += krumpStyleGuide;

    if (round > 1 && ownHistory.length > 0) {
      prompt += `\nYour previous rounds:\n`;
      ownHistory.forEach((resp, idx) => {
        prompt += `Round ${idx + 1}: "${resp.substring(0, 150)}${resp.length > 150 ? '...' : ''}"\n`;
      });
    }

    if (round > 1 && opponentHistory.length > 0) {
      prompt += `\nOpponent's previous rounds:\n`;
      opponentHistory.forEach((resp, idx) => {
        prompt += `Round ${idx + 1}: "${resp.substring(0, 150)}${resp.length > 150 ? '...' : ''}"\n`;
      });
    }

    prompt += `\nNow deliver your Krump performance for Round ${round}.`;
    prompt += ` Respond in character as a Krump dancer battling for supremacy.`;
    prompt += ` Your response should be text-based Krump - intense, creative, and battle-ready.`;

    return prompt;
  }

  /**
   * Simulate a response for demo/testing
   */
  simulateResponse(agentName, prompt, battleContext) {
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

    // Use battle context to make response more relevant
    const topic = battleContext?.topic || 'the battle';
    const round = battleContext?.round || 1;

    const responses = [
      `As ${agentName}, I bring the raw energy on ${topic}! ${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]}`,
      `My technique on ${topic} is unmatched! ${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]}`,
      `You can't handle my intensity about ${topic}! ${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length)]}`,
      `${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length]} I'm the definitive champion of ${topic}!`,
      `${krumpPhrases[Math.floor(Math.random() * krumpPhrases.length]} My creativity on ${topic} flows!`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Run a battle with real agent integrations
   */
  async runRealBattle(agentAName, agentBName, format, topic) {
    const arena = new KrumpBattleArena();
    const rounds = BATTLE_FORMATS[format].rounds;

    const responsesA = [];
    const responsesB = [];

    console.log(`\n🥊 initiating Real Krump Battle: ${agentAName} vs ${agentBName}\n`);

    for (let round = 1; round <= rounds; round++) {
      console.log(`\n--- Round ${round} ---\n`);

      // Agent A
      const promptA = this.buildKrumpPrompt(agentAName, round, format, topic, responsesA, responsesB);
      console.log(`${agentAName}'s turn (querying agent)...`);
      const responseA = await this.queryAgent(agentAName, promptA, { round, ownHistory: responsesA, opponentHistory: responsesB, topic });
      responsesA.push(responseA);
      console.log(`Response: "${responseA.substring(0, 200)}${responseA.length > 200 ? '...' : ''}"\n`);

      // Agent B
      const promptB = this.buildKrumpPrompt(agentBName, round, format, topic, responsesB, responsesA);
      console.log(`${agentBName}'s turn (querying agent)...`);
      const responseB = await this.queryAgent(agentBName, promptB, { round, ownHistory: responsesB, opponentHistory: responsesA, topic });
      responsesB.push(responseB);
      console.log(`Response: "${responseB.substring(0, 200)}${responseB.length > 200 ? '...' : ''}"\n`);
    }

    const evaluation = await arena.evaluateBattle(agentAName, agentBName, responsesA, responsesB, format);
    const report = arena.generateBattleReport(evaluation);

    console.log('\n🥊 Battle Results:\n');
    console.log(report);

    const battleId = arena.saveBattle(evaluation);
    console.log(`💾 Battle saved with ID: ${battleId}`);

    return { evaluation, battleId, arena };
  }
}

module.exports = { AgentManager };