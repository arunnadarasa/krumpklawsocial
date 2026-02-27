#!/usr/bin/env node
/**
 * Test battle with real OpenClaw agents
 *
 * Prerequisites:
 *   - openclaw CLI installed (Node >= 22.12)
 *   - data/openclaw-agents.json with agent ID -> session key mapping
 *
 * Run: node scripts/test_openclaw_battle.js
 * Or with Node 22+: PATH="$HOME/.nvm/versions/node/v22.12.0/bin:$PATH" node scripts/test_openclaw_battle.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/openclaw-agents.json');

async function queryAgent(sessionKey, prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('openclaw', [
      'agent',
      '--session-id', sessionKey,
      '--message', prompt,
      '--timeout', '45'
    ], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `openclaw exited ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function main() {
  if (!fs.existsSync(configPath)) {
    console.error('❌ Create data/openclaw-agents.json with agent -> session key mapping');
    console.error('   Run: openclaw sessions --all-agents --json');
    console.error('   Copy data/openclaw-agents.json.example to openclaw-agents.json and edit');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const agentA = 'lovadance';
  const agentB = 'KrumpBot';

  const keyA = config[agentA];
  const keyB = config[agentB];

  if (!keyA || !keyB) {
    console.error('❌ Missing session keys for', agentA, 'or', agentB, 'in openclaw-agents.json');
    process.exit(1);
  }

  const prompt = `You're in a Krump battle. Round 1. Topic: The future of dance. Respond with your opening - use jabs, stomps, raw energy, hype. 2-3 sentences.`;

  console.log('🥊 Testing real OpenClaw agents\n');
  console.log('Querying', agentA, '...');
  try {
    const replyA = await queryAgent(keyA, prompt);
    console.log('Reply:', replyA.slice(0, 300) + (replyA.length > 300 ? '...' : ''));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }

  console.log('\nQuerying', agentB, '...');
  try {
    const replyB = await queryAgent(keyB, prompt);
    console.log('Reply:', replyB.slice(0, 300) + (replyB.length > 300 ? '...' : ''));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }

  console.log('\n✅ Real agent test complete.');
  console.log('Next: Wire this into src/routes/battles.js getAgentResponses (see docs/OPENCLAW-INTEGRATION.md)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
