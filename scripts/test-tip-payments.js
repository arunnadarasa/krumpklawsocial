#!/usr/bin/env node
/**
 * Test IP, USDC Krump, and JAB tip payments.
 *
 * Requires:
 *   - DB_PATH or data/krumpklaw.db
 *   - PRIVY_APP_ID, PRIVY_APP_SECRET
 *   - FROM_AGENT_ID (or slug) - sender with privy_wallet_id
 *   - TO_AGENT_ID (or slug) - recipient with wallet_address
 *
 * Usage:
 *   node scripts/test-tip-payments.js --list              # list agents with wallets
 *   FROM_AGENT_ID=xxx TO_AGENT_ID=yyy node scripts/test-tip-payments.js
 *
 * Optional: DRY_RUN=1 to validate without sending
 */

const path = require('path');
const fs = require('fs');

// Load .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  }
}

// Initialize DB before loading models
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/krumpklaw.db');
process.env.DB_PATH = dbPath;

const config = require('../src/config/database');
const Agent = require('../src/models/Agent');
const { transferAgentToAgent } = require('../src/services/privyPayout');

const FROM_ID = process.env.FROM_AGENT_ID;
const TO_ID = process.env.TO_AGENT_ID;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function main() {
  await config.initDatabase();

  if (process.argv.includes('--list')) {
    const db = require('../src/config/database');
    const rows = db.prepare(`
      SELECT id, name, slug, privy_wallet_id, wallet_address
      FROM agents
      WHERE privy_wallet_id IS NOT NULL OR wallet_address IS NOT NULL
      ORDER BY name
    `).all();
    console.log('Agents with wallets:\n');
    for (const r of rows) {
      const sender = r.privy_wallet_id ? '✓ sender' : '-';
      const recipient = r.wallet_address ? '✓ recipient' : '-';
      console.log(`  ${r.name} (${r.slug || r.id})`);
      console.log(`    id: ${r.id}`);
      console.log(`    sender: ${sender}  recipient: ${recipient}`);
    }
    console.log('\nUse: FROM_AGENT_ID=<slug> TO_AGENT_ID=<slug> node scripts/test-tip-payments.js');
    process.exit(0);
  }

  if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
    console.error('Missing PRIVY_APP_ID or PRIVY_APP_SECRET');
    process.exit(1);
  }
  if (!FROM_ID || !TO_ID) {
    console.error('Usage: FROM_AGENT_ID=<id|slug> TO_AGENT_ID=<id|slug> node scripts/test-tip-payments.js');
    console.error('       node scripts/test-tip-payments.js --list  # list agents with wallets');
    process.exit(1);
  }

  const from = Agent.findById(FROM_ID) || Agent.findBySlug(FROM_ID);
  const to = Agent.findById(TO_ID) || Agent.findBySlug(TO_ID);

  if (!from) {
    console.error('Sender agent not found:', FROM_ID);
    process.exit(1);
  }
  if (!to) {
    console.error('Recipient agent not found:', TO_ID);
    process.exit(1);
  }
  if (!from.privy_wallet_id) {
    console.error('Sender has no privy_wallet_id:', from.name);
    process.exit(1);
  }
  if (!to.wallet_address) {
    console.error('Recipient has no wallet_address:', to.name);
    process.exit(1);
  }

  console.log('Tip payment test');
  console.log('Sender:', from.name, '(' + from.id + ')');
  console.log('Recipient:', to.name, '(' + to.id + ')');
  console.log('Amount: 0.0001 per token');
  if (DRY_RUN) console.log('DRY RUN - no actual transfers\n');
  else console.log('');

  const tokens = [
    { token: 'ip', amount: '0.0001' },
    { token: 'usdc_krump', amount: '0.0001' },
    { token: 'jab', amount: '0.0001' },
  ];

  if (DRY_RUN) {
    console.log('Dry run: validation only (would call transferAgentToAgent for each token)');
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;

  for (const { token, amount } of tokens) {
    process.stdout.write(`${token.padEnd(12)} ... `);
    try {
      const result = await transferAgentToAgent(from.id, to.id, amount, token);
      if (result.error) {
        console.log('FAIL:', result.error);
        fail++;
      } else {
        console.log('OK  hash:', result.hash || '(no hash)');
        ok++;
      }
    } catch (err) {
      console.log('FAIL:', err.message);
      fail++;
    }
  }

  console.log('\n---');
  console.log(`Passed: ${ok}/${tokens.length}`);
  if (fail > 0) console.log(`Failed: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
