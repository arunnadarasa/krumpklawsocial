#!/usr/bin/env node
/**
 * Krump-Agent Feedback Heartbeat
 *
 * Runs periodically (via cron) to check agent health, project status,
 * and surface any issues that need attention.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const workspaceRoot = path.join(__dirname, '..'); // /Users/openclaw/.openclaw/workspace
const krumpAgentRoot = path.join(workspaceRoot, 'krump-agent');
const logsDir = path.join(krumpAgentRoot, 'logs');
const heartbeatLogPath = path.join(logsDir, 'heartbeat.log');
const colosseumStatePath = path.join(workspaceRoot, 'memory', 'colosseum-state.json');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level}] ${message}`;
  console.log(entry);
  try {
    fs.appendFileSync(heartbeatLogPath, entry + '\n');
  } catch (e) {
    // ignore
  }
}

// Check Colosseum project state
function checkColosseumState() {
  if (!fs.existsSync(colosseumStatePath)) {
    return { status: 'no_state', message: 'Colosseum state file not found' };
  }

  try {
    const content = fs.readFileSync(colosseumStatePath, 'utf8');
    const state = JSON.parse(content);

    if (state.stage === 'done') {
      return { status: 'completed', stage: state.stage, projectId: state.projectId };
    } else if (state.stage === 'submit') {
      return { status: 'awaiting_submission', stage: state.stage, projectId: state.projectId };
    } else if (state.stage === 'active' || state.stage === 'building') {
      return { status: 'in_progress', stage: state.stage, projectId: state.projectId };
    } else {
      return { status: 'unknown', stage: state.stage };
    }
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

// Check for recent activity (log rotation check)
function checkLogHealth() {
  try {
    const stats = fs.statSync(heartbeatLogPath);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    if (ageHours > 48) {
      return { healthy: false, message: `Heartbeat log hasn't updated in ${ageHours.toFixed(1)}h` };
    }
    return { healthy: true, lastUpdate: ageHours };
  } catch (e) {
    return { healthy: false, message: 'Cannot access heartbeat log: ' + e.message };
  }
}

// Check Node.js environment
function checkNodeEnv() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    return { healthy: true, version };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}

// Main heartbeat logic
async function runHeartbeat() {
  log('=== Krump-Agent Heartbeat Started ===');

  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check Colosseum state
  const colosseumCheck = checkColosseumState();
  results.checks.colosseum = colosseumCheck;
  if (colosseumCheck.status === 'error') {
    log(`Colosseum check failed: ${colosseumCheck.error}`, 'WARN');
  } else {
    log(`Colosseum state: ${colosseumCheck.status} (stage: ${colosseumCheck.stage || 'n/a'})`);
  }

  // Check log health
  const logCheck = checkLogHealth();
  results.checks.logHealth = logCheck;
  if (!logCheck.healthy) {
    log(`Log health issue: ${logCheck.message}`, 'WARN');
  } else {
    log(`Log health OK (last update ${logCheck.lastUpdate.toFixed(1)}h ago)`);
  }

  // Check Node.js
  const nodeCheck = checkNodeEnv();
  results.checks.node = nodeCheck;
  if (!nodeCheck.healthy) {
    log(`Node check failed: ${nodeCheck.error}`, 'WARN');
  } else {
    log(`Node.js: ${nodeCheck.version}`);
  }

  // Summarize
  const issues = [];
  if (colosseumCheck.status === 'error') issues.push('colosseum_state');
  if (!logCheck.healthy) issues.push('log_health');
  if (!nodeCheck.healthy) issues.push('node_env');

  if (issues.length === 0) {
    log('All checks passed. Agent appears healthy.');
  } else {
    log(`Issues detected: ${issues.join(', ')}`, 'WARN');
  }

  results.summary = { issues, healthy: issues.length === 0 };
  log('=== Krump-Agent Heartbeat Completed ===');

  // Could write results to a state file for monitoring
  const statePath = path.join(krumpAgentRoot, 'logs', 'last-heartbeat.json');
  try {
    fs.writeFileSync(statePath, JSON.stringify(results, null, 2));
  } catch (e) {
    log('Failed to write state file: ' + e.message, 'ERROR');
  }

  process.exit(results.summary.healthy ? 0 : 1);
}

runHeartbeat().catch(err => {
  console.error('Heartbeat fatal error:', err);
  process.exit(1);
});
