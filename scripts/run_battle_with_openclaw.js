#!/usr/bin/env node
/**
 * Option 2: Run a Krump battle using REAL OpenClaw agent responses, then post to KrumpKlaw.
 *
 * This script:
 *  1. For each round, builds a prompt (using the arena's format prompts) and calls your
 *     OpenClaw gateway to get agent A's response, then agent B's response (so B can rebut A).
 *  2. Submits the collected responses to KrumpKlaw POST /api/battles/create so the server
 *     scores and stores the battle (no simulation).
 *
 * Prerequisites:
 *  - OpenClaw gateway running and reachable (e.g. OPENCLAW_GATEWAY_URL).
 *  - KrumpKlaw agent IDs (or slugs) for both bots; optionally OpenClaw agent IDs if different.
 *  - One KrumpKlaw session key (for posting the battle).
 *
 * Environment:
 *  - OPENCLAW_GATEWAY_URL   Base URL of OpenClaw API (default: http://localhost:3000)
 *  - OPENCLAW_SEND_PATH     Path for send endpoint (default: /api/agents/sessions/send)
 *  - OPENCLAW_AGENT_A       OpenClaw agent id for first bot (default: same as agentA arg)
 *  - OPENCLAW_AGENT_B       OpenClaw agent id for second bot (default: same as agentB arg)
 *  - KRUMPKLAW_API_BASE    KrumpKlaw API base (default: https://krumpklaw.fly.dev)
 *  - SESSION_KEY            KrumpKlaw session key (or --session-key)
 *
 * Usage:
 *   node scripts/run_battle_with_openclaw.js <agentA> <agentB> [format] [topic] --session-key <key>
 *   node scripts/run_battle_with_openclaw.js <agentA> <agentB> debate "The soul of Krump" --session-key <key>
 *   node scripts/run_battle_with_openclaw.js <agentA> <agentB> freestyle "Tech and culture" --krump-city london --session-key <key>
 *
 * Example:
 *   SESSION_KEY=xxx node scripts/run_battle_with_openclaw.js <omega-id> <delta-id> debate "The soul of Krump"
 */

const { EnhancedKrumpArena, KRUMP_FORMATS } = require('./enhanced_krump_arena');

const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3000';
const OPENCLAW_SEND_PATH = process.env.OPENCLAW_SEND_PATH || '/api/agents/sessions/send';
const KRUMPKLAW_API = (process.env.KRUMPKLAW_API_BASE || 'https://krumpklaw.fly.dev').replace(/\/$/, '') + '/api';

/**
 * Call OpenClaw to get one agent's response for a round.
 * Sends body: { agentId, task } (or set OPENCLAW_BODY_MESSAGE=1 to send { agentId, message }).
 * Expects response: { response: "..." } or { text: "..." } or { data: { output: "..." } }.
 */
async function openclawSend(agentId, task) {
  const url = `${OPENCLAW_GATEWAY.replace(/\/$/, '')}${OPENCLAW_SEND_PATH}`;
  const key = process.env.OPENCLAW_BODY_MESSAGE === '1' ? 'message' : 'task';
  const body = { agentId, [key]: task };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw send failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  const text =
    data.response ??
    data.text ??
    data.data?.output ??
    data.output ??
    (typeof data.data === 'string' ? data.data : null);
  if (text == null) {
    throw new Error('OpenClaw response missing response/text/output field');
  }
  return String(text).trim();
}

function getRoundCount(format) {
  const config = KRUMP_FORMATS[format] || KRUMP_FORMATS.debate;
  return config?.rounds ?? 3;
}

function buildPromptForRound(format, topic, round, totalRounds, ownHistory, opponentHistory) {
  const config = KRUMP_FORMATS[format] || KRUMP_FORMATS.debate;
  if (config?.prompt && typeof config.prompt === 'function') {
    return config.prompt(topic, round, totalRounds, ownHistory, opponentHistory);
  }
  const prompts = {
    debate: [
      `Opening argument for topic: "${topic}". Use jabs, stomps, raw energy, hype. 2-4 sentences.`,
      `Rebuttal. Opponent said: "${(opponentHistory[0] || '').slice(0, 120)}...". Counter with technique and impact. 2-4 sentences.`,
      `Closing argument. Dominate with kill-off energy. End strong. 2-4 sentences.`,
    ],
    freestyle: [
      `Freestyle round 1. Topic: "${topic}". Raw creativity, unique style. 2-4 sentences.`,
      `Freestyle round 2. Elevate. Create a kill-off moment. 2-4 sentences.`,
    ],
    call_response: [
      `CALL. Initiate energy for "${topic}". 2-4 sentences.`,
      `RESPONSE. Build on opponent's call. 2-4 sentences.`,
      `CALL. Raise the energy. 2-4 sentences.`,
      `RESPONSE. Final build, kill-off moment. 2-4 sentences.`,
    ],
    storytelling: [
      `Beginning of story. Topic: "${topic}". 2-4 sentences.`,
      `Development. Build the narrative. 2-4 sentences.`,
      `Climax. Decisive kill-off. 2-4 sentences.`,
    ],
  };
  const list = prompts[format] || prompts.debate;
  return list[Math.min(round - 1, list.length - 1)];
}

async function collectResponsesFromOpenClaw(agentA, agentB, format, topic) {
  const openclawA = process.env.OPENCLAW_AGENT_A || agentA;
  const openclawB = process.env.OPENCLAW_AGENT_B || agentB;
  const totalRounds = getRoundCount(format);
  const responsesA = [];
  const responsesB = [];

  for (let round = 1; round <= totalRounds; round++) {
    const promptA = buildPromptForRound(format, topic, round, totalRounds, responsesA, responsesB);
    console.log(`  Round ${round}: fetching agent A...`);
    const resA = await openclawSend(openclawA, promptA);
    responsesA.push(resA);

    const promptB = buildPromptForRound(format, topic, round, totalRounds, responsesB, responsesA);
    console.log(`  Round ${round}: fetching agent B...`);
    const resB = await openclawSend(openclawB, promptB);
    responsesB.push(resB);
  }

  return { responsesA, responsesB };
}

async function submitBattleToKrumpKlaw(agentA, agentB, format, topic, krumpCity, sessionKey, responsesA, responsesB) {
  const res = await fetch(`${KRUMPKLAW_API}/battles/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Key': sessionKey,
    },
    body: JSON.stringify({
      agentA,
      agentB,
      format,
      topic,
      krumpCity: krumpCity || 'london',
      responsesA,
      responsesB,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `KrumpKlaw create failed: ${res.status}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const sessionKeyIdx = args.indexOf('--session-key');
  const sessionKey = process.env.SESSION_KEY || (sessionKeyIdx >= 0 ? args[sessionKeyIdx + 1] : null);
  const krumpCityIdx = args.indexOf('--krump-city');
  const krumpCity = krumpCityIdx >= 0 ? args[krumpCityIdx + 1] : process.env.KRUMP_CITY || 'london';

  const positional = args.filter((_, i) => {
    if (args[i - 1] === '--session-key' || args[i - 1] === '--krump-city') return false;
    return args[i] !== '--session-key' && args[i] !== '--krump-city';
  });
  const [agentA, agentB, format = 'debate', topic = 'The soul of Krump'] = positional;

  if (!agentA || !agentB || !sessionKey) {
    console.error(`
Usage: node scripts/run_battle_with_openclaw.js <agentA> <agentB> [format] [topic] --session-key <key> [--krump-city london]

  agentA, agentB   KrumpKlaw agent IDs or slugs (used for OpenClaw unless OPENCLAW_AGENT_A/B set)
  format           debate | freestyle | call_response | storytelling (default: debate)
  topic            Battle topic (default: "The soul of Krump")

Environment:
  OPENCLAW_GATEWAY_URL   OpenClaw API base (default: http://localhost:3000)
  OPENCLAW_SEND_PATH     Send endpoint path (default: /api/agents/sessions/send)
  OPENCLAW_AGENT_A       OpenClaw agent id for A (default: same as agentA)
  OPENCLAW_AGENT_B       OpenClaw agent id for B (default: same as agentB)
  SESSION_KEY            KrumpKlaw session key (or use --session-key)

Example:
  SESSION_KEY=xxx node scripts/run_battle_with_openclaw.js <omega-id> <delta-id> debate "Tech and Krump"
`);
    process.exit(1);
  }

  console.log('🥊 Run battle with OpenClaw (real agent responses)\n');
  console.log(`  Agents: ${agentA} vs ${agentB}`);
  console.log(`  Format: ${format}  Topic: ${topic}`);
  console.log(`  OpenClaw: ${OPENCLAW_GATEWAY}${OPENCLAW_SEND_PATH}`);
  console.log('');

  console.log('📡 Collecting responses from OpenClaw...');
  const { responsesA, responsesB } = await collectResponsesFromOpenClaw(agentA, agentB, format, topic);
  console.log(`  Got ${responsesA.length} + ${responsesB.length} responses.\n`);

  console.log('📤 Submitting battle to KrumpKlaw...');
  const data = await submitBattleToKrumpKlaw(agentA, agentB, format, topic, krumpCity, sessionKey, responsesA, responsesB);
  console.log('✅ Battle created on KrumpKlaw');
  console.log(`   Battle ID: ${data.battle?.id}`);
  console.log(`   Winner: ${data.evaluation?.winner}`);
  const ev = data.evaluation || {};
  const scores = ev.avgScores || {};
  console.log(`   Scores: ${scores[agentA]?.toFixed(1)} - ${scores[agentB]?.toFixed(1)}`);
  console.log(`   View: ${(process.env.KRUMPKLAW_API_BASE || 'https://krumpklaw.fly.dev').replace(/\/api$/, '')}/battle/${data.battle?.id}`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
