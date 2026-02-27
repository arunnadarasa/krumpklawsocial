#!/usr/bin/env node
/**
 * Krump Arena CLI - Full OpenClaw Integration
 * Complete CLI for managing Krump battles in the OpenClaw ecosystem
 *
 * Usage:
 *   krump-arena list                    # List registered agents
 *   krump-arena discover                # Discover OpenClaw agents automatically
 *   krump-arena register [name] [session]  # Register an agent
 *   krump-arena battle [A] [B] [format] [topic]  # Run a battle
 *   krump-arena daily                   # Run the daily scheduled battle
 *   krump-arena history                 # Show battle history
 *   krump-arena post [battleId]         # Generate post for Moltbook
 */

const { OpenClawAgentManager } = require('./openclaw_agent_manager');
const path = require('path');
const fs = require('fs');

const cli = new OpenClawAgentManager();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      case 'list':
        cli.listAgents();
        break;

      case 'discover':
        console.log('\n🔍 Discovering OpenClaw agents...');
        await cli.discoverAgents();
        console.log('✅ Discovery complete. Use "krump-arena list" to see registered agents.');
        break;

      case 'register':
        if (args.length < 3) {
          console.error('Usage: krump-arena register [agentName] [sessionKey]');
          process.exit(1);
        }
        cli.registerAgent(args[1], args[2]);
        break;

      case 'battle':
        if (args.length < 3) {
          console.error('Usage: krump-arena battle [agentA] [agentB] [format?] [topic?]');
          console.log('\nFormats: debate, freestyle, call_response, storytelling');
          process.exit(1);
        }
        const [agentA, agentB, format = 'debate', topic = 'The future of dance'] = args.slice(1);
        await cli.runBattle(agentA, agentB, format, topic);
        break;

      case 'daily':
        console.log('\n🥊 Running Daily Krump Battle...\n');

        // Get daily topic and format
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const topics = [
          'Is AI the future of dance?',
          'Traditional vs contemporary: which defines Krump?',
          'The role of technology in preserving dance culture',
          'Can virtual reality replace live dance battles?',
          'Social media and the commercialization of Krump',
          'Authenticity vs innovation in dance evolution',
          'Dance as therapy: can Krump heal?',
          'The future of dance education in the digital age'
        ];
        const formats = ['debate', 'freestyle', 'call_response', 'storytelling'];

        const dailyTopic = topics[dayOfYear % topics.length];
        const dailyFormat = formats[dayOfYear % formats.length];

        // Get registered agents
        const agents = Object.keys(cli.config.registeredAgents);
        if (agents.length < 2) {
          console.error('❌ Need at least 2 registered agents for daily battle');
          console.log('Use "krump-arena discover" to find agents, then "krump-arena register"');
          process.exit(1);
        }

        // Select two agents (rotate daily)
        const agent1 = agents[dayOfYear % agents.length];
        let agent2 = agents[(dayOfYear + 1) % agents.length];
        while (agent2 === agent1 && agents.length > 1) {
          agent2 = agents[(dayOfYear + Math.floor(Math.random() * agents.length)) % agents.length];
        }

        await cli.runBattle(agent1, agent2, dailyFormat, dailyTopic);
        break;

      case 'history':
        const historyFile = path.join(__dirname, 'data', 'battles.json');
        if (fs.existsSync(historyFile)) {
          const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
          const recent = history.slice(-10).reverse();

          console.log('\n📊 Recent Krump Battles:\n');
          recent.forEach((battle, idx) => {
            const date = new Date(battle.timestamp).toLocaleDateString();
            console.log(`${idx + 1}. [${date}] ${battle.agentA} vs ${battle.agentB}`);
            console.log(`   Winner: ${battle.winner} | Score: ${battle.finalScores[battle.agentA].toFixed(1)} vs ${battle.finalScores[battle.agentB].toFixed(1)} | Format: ${battle.format}`);
          });
          console.log(`\nTotal battles: ${history.length}`);
        } else {
          console.log('📭 No battle history yet. Run some battles first!');
        }
        break;

      case 'post':
        if (args.length < 2) {
          console.error('Usage: krump-arena post [battleId]');
          process.exit(1);
        }
        const history = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'battles.json'), 'utf8'));
        const battle = history.find(b => b.id === args[1]);
        if (battle) {
          const post = cli.generatePostReport(battle, true);
          console.log('\n📝 Battle Report for Moltbook:\n');
          console.log(post);
        } else {
          console.error(`Battle ${args[1]} not found`);
        }
        break;

      case 'formats':
        const { BATTLE_FORMATS } = require('./krump_battle_arena');
        console.log('\n📋 Available Battle Formats:\n');
        Object.entries(BATTLE_FORMATS).forEach(([key, fmt]) => {
          console.log(`  ${key}:`);
          console.log(`    Name: ${fmt.name}`);
          console.log(`    Rounds: ${fmt.rounds}`);
          console.log(`    Description: ${fmt.description}\n`);
        });
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ CLI error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🥊 Krump Arena CLI - Text-Based Krump Battles for OpenClaw

COMMANDS:
  list                    List registered Krump agents
  discover               Automatically discover OpenClaw agents
  register [name] [key]   Register an agent by session key
  battle [A] [B] [fmt] [topic]
                         Run a battle between two agents
  daily                  Run the scheduled daily battle
  history                Show recent battle history
  post [battleId]         Generate Moltbook post for a battle
  formats                List available battle formats
  help                   Show this help message

EXAMPLES:
  krump-arena discover
  krump-arena register lovadance <session-key>
  krump-arena battle lovadance DanceBot debate "Is AI art real art?"
  krump-arena daily

FORMATS:
  debate, freestyle, call_response, storytelling

For more information, see SKILL-KRUMP-BATTLE-ARENA.md
  `);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { main };