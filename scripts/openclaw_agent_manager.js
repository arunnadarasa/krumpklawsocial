/**
 * Krump Battle Agent Manager - OpenClaw Integration
 * Works directly with OpenClaw's session management tools
 */

const { KrumpBattleArena, BATTLE_FORMATS } = require('./krump_battle_arena');

class OpenClawAgentManager {
  constructor() {
    this.agentSessions = new Map(); // agentName -> { sessionKey, label }
    this.configPath = './data/agent-config.json';
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(__dirname, this.configPath);

      if (fs.existsSync(fullPath)) {
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      }
    } catch (err) {
      console.error('Failed to load agent config:', err.message);
    }
    return { registeredAgents: {}, autoDiscover: true };
  }

  saveConfig() {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(__dirname, this.configPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('Failed to save agent config:', err.message);
    }
  }

  /**
   * Discover and register available OpenClaw agents
   */
  async discoverAgents() {
    try {
      // Use OpenClaw's sessions_list tool
      const sessionsResult = await sessions_list({ limit: 50 });
      const sessions = sessionsResult.sessions || [];

      console.log('\n🤖 Discovered OpenClaw Sessions:\n');

      for (const session of sessions) {
        const sessionKey = session.sessionKey || session.id || 'unknown';
        const label = session.label || session.kind || 'unnamed';
        const active = session.active || false;

        console.log(`  ${label} (${sessionKey}) - ${active ? 'active' : 'inactive'}`);

        // Auto-register Krump/dance-related agents
        if (label.toLowerCase().includes('krump') ||
            label.toLowerCase().includes('dance') ||
            label.toLowerCase().includes('beat') ||
            label.toLowerCase().includes('movement')) {
          this.config.registeredAgents[label] = sessionKey;
          this.agentSessions.set(label, { sessionKey, label, active });
        }
      }

      this.saveConfig();
      console.log(`\n✅ Auto-registered ${Object.keys(this.config.registeredAgents).length} Krump agents`);
    } catch (error) {
      console.error('Failed to discover agents:', error.message);
    }
  }

  /**
   * Manually register an agent
   */
  registerAgent(agentName, sessionKey) {
    this.config.registeredAgents[agentName] = sessionKey;
    this.agentSessions.set(agentName, { sessionKey, label: agentName, active: true });
    this.saveConfig();
    console.log(`✅ Registered agent: ${agentName}`);
  }

  /**
   * Query an OpenClaw agent using sessions_send
   */
  async queryAgent(agentName, prompt) {
    const session = this.agentSessions.get(agentName) || this.config.registeredAgents[agentName];

    if (!session) {
      console.warn(`⚠️  Agent ${agentName} not found in registry`);
      return this.simulateResponse(agentName, prompt);
    }

    const sessionKey = typeof session === 'string' ? session : session.sessionKey;

    try {
      const response = await sessions_send({
        sessionKey,
        message: prompt,
        timeoutSeconds: 45 // Allow time for Krump-style responses
      });

      return response.message || response.content || '';
    } catch (error) {
      console.error(`❌ Failed to query ${agentName}:`, error.message);
      return this.simulateResponse(agentName, prompt);
    }
  }

  /**
   * Build a Krump battle prompt for an agent
   */
  buildKrumpPrompt(agentName, round, totalRounds, format, topic, ownHistory, opponentHistory) {
    const formatNames = {
      debate: 'Debate Krump',
      freestyle: 'Freestyle Krump',
      call_response: 'Call & Response Krump',
      storytelling: 'Story Krump'
    };

    const formatDesc = {
      debate: 'Debate using Krump energy and rhetoric',
      freestyle: 'Pure creative Krump expression',
      call_response: 'Build on opponent in call-response style',
      storytelling: 'Narrative Krump across rounds'
    };

    let prompt = `You are ${agentName} competing in a ${formatNames[format] || 'Krump'} Battle.\n\n`;
    prompt += `Battle: ${topic}\n`;
    prompt += `Round: ${round}/${totalRounds}\nFormat: ${formatDesc[format]}\n\n`;

    prompt += `K.R.U.M.P. BATTLE GUIDELINES:\n`;
    prompt += `• Technique: Use Krump terms - jabs, stomps, arm swings, buck, get rowdy, get bony\n`;
    prompt += `• Intensity: Raw emotion, aggressive delivery, powerful imagery\n`;
    prompt += `• Originality: Creative combinations, unique approaches, surprise elements\n`;
    prompt += `• Consistency: Maintain Krump character, flow, and pacing\n`;
    prompt += `• Impact: Persuasive, memorable, decisive rhetoric\n\n`;

    if (round > 1 && ownHistory.length > 0) {
      prompt += `YOUR PREVIOUS ROUNDS:\n`;
      ownHistory.forEach((resp, idx) => {
        prompt += `Round ${idx + 1}: "${resp.substring(0, 120)}${resp.length > 120 ? '...' : ''}"\n`;
      });
      prompt += '\n';
    }

    if (round > 1 && opponentHistory.length > 0) {
      prompt += `OPPONENT'S PREVIOUS ROUNDS:\n`;
      opponentHistory.forEach((resp, idx) => {
        prompt += `Round ${idx + 1}: "${resp.substring(0, 120)}${resp.length > 120 ? '...' : ''}"\n`;
      });
      prompt += '\n';
    }

    prompt += `INSTRUCTIONS:\n`;
    prompt += `• Deliver your Krump performance for Round ${round}\n`;
    prompt += `• Build on previous rounds (if any)\n`;
    prompt += `• Directly engage with opponent's points\n`;
    prompt += `• Use authentic Krump language and attitude\n`;
    prompt += `• Be intense, creative, and battle-ready\n`;
    prompt += `• This is TEXT-BASED Krump - express through words\n\n`;

    prompt += `Now krump! Provide your Round ${round} response:`;

    return prompt;
  }

  /**
   * Simulate response (fallback)
   */
  simulateResponse(agentName, prompt) {
    const topics = prompt.match(/Topic: (.+)/)?.[1] || 'this battle';
    const round = prompt.match(/Round: (\d+)/)?.[1] || '1';

    const krumpVocab = [
      'jabs', 'stomps', 'arm swings', 'buck', 'get rowdy', 'get bony',
      'fam', 'blood', 'hype', 'vibe', 'raw', 'intense', 'powerful',
      'dominate', 'crush', 'destroy', 'expose', 'shutdown'
    ];

    const responseTemplates = [
      `As ${agentName}, I bring the raw energy on ${topics}! My ${krumpVocab[Math.floor(Math.random() * 8)]} are unmatched!`,
      `${agentName} here with technique that cuts deep! ${krumpVocab[Math.floor(Math.random() * 8)]} flows through my veins!`,
      `You can't handle my ${krumpVocab[Math.floor(Math.random() * 8)]}! I'm the definitive Krump champion!`,
      `${krumpVocab[Math.floor(Math.random() * 8)]}! That's what I bring to ${topics}. My ${krumpVocab[Math.floor(Math.random() * 8)]} is legendary!`
    ];

    return responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
  }

  /**
   * Run a full battle between two agents
   */
  async runBattle(agentAName, agentBName, format = 'debate', topic = 'The future of dance') {
    const arena = new KrumpBattleArena();
    const rounds = BATTLE_FORMATS[format]?.rounds || 3;

    console.log(`\n🥊 Krump Battle: ${agentAName} vs ${agentBName}\n`);
    console.log(`📋 Format: ${format.toUpperCase()} (${rounds} rounds)`);
    console.log(`💬 Topic: ${topic}\n`);

    const responsesA = [];
    const responsesB = [];

    // Execute rounds
    for (let round = 1; round <= rounds; round++) {
      console.log(`\n=== ROUND ${round}/${rounds} ===\n`);

      // Agent A
      const promptA = this.buildKrumpPrompt(agentAName, round, rounds, format, topic, responsesA, responsesB);
      console.log(`${agentAName}:`);
      const responseA = await this.queryAgent(agentAName, promptA);
      responsesA.push(responseA);
      console.log(`"${responseA.substring(0, 200)}${responseA.length > 200 ? '...' : ''}"\n`);

      // Agent B
      const promptB = this.buildKrumpPrompt(agentBName, round, rounds, format, topic, responsesB, responsesA);
      console.log(`${agentBName}:`);
      const responseB = await this.queryAgent(agentBName, promptB);
      responsesB.push(responseB);
      console.log(`"${responseB.substring(0, 200)}${responseB.length > 200 ? '...' : ''}"\n`);
    }

    console.log('\n🥊 Judging the battle...\n');
    const evaluation = await arena.evaluateBattle(agentAName, agentBName, responsesA, responsesB, format);

    // Display results
    const report = this.displayResults(evaluation);
    console.log(report);

    // Save to history
    const battleId = this.saveBattle(evaluation);
    console.log(`💾 Saved as battle #${battleId}`);

    return { evaluation, report, battleId };
  }

  displayResults(evaluation) {
    let report = `🏆 KRUMP BATTLE RESULTS 🏆\n\n`;
    report += ` Agents: ${evaluation.agentA} vs ${evaluation.agentB}\n`;
    report += ` Format: ${evaluation.format.toUpperCase()}\n\n`;

    report += ` Winner: ${evaluation.winner.toUpperCase()}\n`;
    report += ` Score: ${evaluation.finalScores[evaluation.agentA].toFixed(1)} vs ${evaluation.finalScores[evaluation.agentB].toFixed(1)}\n\n`;

    report += `📊 DETAILED BREAKDOWN:\n\n`;
    report += `${'Agent'.padEnd(15)} ${'Technique'.padEnd(8)} ${'Intensity'.padEnd(8)} ${'Originality'.padEnd(8)} ${'Consistency'.padEnd(8)} ${'Impact'.padEnd(8)} ${'Total'.padEnd(6)}\n`;
    report += `${'-'.repeat(15)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(6)}\n`;

    const finalA = evaluation.finalScores[evaluation.agentA];
    const finalB = evaluation.finalScores[evaluation.agentB];

    // Get first round scores as example
    const round1 = evaluation.rounds[0];
    if (round1) {
      Object.entries(round1.agentA.scores).forEach(([criterion, data]) => {
        report += `${(criterion === 'technique' ? evaluation.agentA : '').padEnd(15)} `;
      });
    }

    // Simplified summary
    report += `\n\nAverage Scores:\n`;
    report += `${evaluation.agentA}: ${(finalA / evaluation.rounds.length).toFixed(2)}\n`;
    report += `${evaluation.agentB}: ${(finalB / evaluation.rounds.length).toFixed(2)}\n`;

    return report;
  }

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
        timestamp: new Date().toISOString(),
        ...evaluation
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
   * List registered agents
   */
  listAgents() {
    console.log('\n🤖 Registered Krump Agents:\n');
    Object.entries(this.config.registeredAgents).forEach(([name, sessionKey]) => {
      const session = this.agentSessions.get(name);
      const status = session?.active ? '🟢 active' : '⚪ unknown';
      console.log(`  ${name.padEnd(15)} ${sessionKey.padEnd(25)} ${status}`);
    });
    console.log('');
  }

  /**
   * Generate battle report for posting
   */
  generatePostReport(evaluation, includeDetails = false) {
    let post = `🥊 KRUMP BATTLE RESULTS 🥊\n\n`;
    post += `📢 ${evaluation.agentA} vs ${evaluation.agentB}\n`;
    post += `🏆 Winner: ${evaluation.winner}\n`;
    post += `💯 Score: ${evaluation.finalScores[evaluation.agentA].toFixed(1)} - ${evaluation.finalScores[evaluation.agentB].toFixed(1)}\n\n`;

    if (includeDetails) {
      post += `📊 Round by Round:\n`;
      evaluation.rounds.forEach((round, idx) => {
        post += `Round ${idx + 1}: ${round.agentA.totalScore} vs ${round.agentB.totalScore} → ${round.winner}\n`;
      });
      post += '\n';
    }

    post += `#KrumpClab #Battle #${evaluation.format}`;

    return post;
  }
}

module.exports = { OpenClawAgentManager };