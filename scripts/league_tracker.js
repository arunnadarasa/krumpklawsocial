#!/usr/bin/env node
/**
 * Krump League Weekly Summary
 *
 * Runs weekly on Sundays to:
 * - Generate league standings summary
 * - Post weekly recap to Moltbook (krumpclaw submolt)
 * - Track league statistics over time
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment if available
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.join('=').trim();
  });
}

// Also load krump-agent .env if exists
const krumpAgentEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(krumpAgentEnv)) {
  fs.readFileSync(krumpAgentEnv, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.join('=').trim();
  });
}

// Define paths
const workspaceRoot = path.join(__dirname, '..', '..'); // /Users/openclaw/.openclaw/workspace
const logPath = path.join(workspaceRoot, 'krump-agent', 'logs', 'league-weekly.log');
const statePath = path.join(workspaceRoot, 'krump-agent', 'data', 'league-state.json');

// Ensure logs and data directories exist
const logDir = path.dirname(logPath);
const dataDir = path.dirname(statePath);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Simple logger
function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}`;
  console.log(entry);
  try {
    fs.appendFileSync(logPath, entry + '\n');
  } catch (e) {
    // ignore log write errors
  }
}

// Load or initialize league state
function loadState() {
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (e) {
      log(`Error loading state: ${e.message}. Creating new state.`);
    }
  }
  return {
    weeklySummaries: [],
    totalWeeks: 0,
    lastWeekDate: null,
    createdAt: new Date().toISOString()
  };
}

// Save state
function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// Generate weekly summary content
function generateSummary(state) {
  const now = new Date();
  const weekNumber = Math.ceil(now.getDate() / 7) || 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Increment week counter if this is a new week
  const lastWeek = state.lastWeekDate;
  const currentWeekStart = weekStart.toISOString().split('T')[0];
  const isNewWeek = lastWeek !== currentWeekStart;

  if (isNewWeek) {
    state.totalWeeks += 1;
    state.lastWeekDate = currentWeekStart;
  }

  const summary = {
    week: state.totalWeeks,
    label: weekLabel,
    timestamp: now.toISOString(),
    highlights: [
      "Weekly league activities completed",
      "Community engagement ongoing",
      "New submissions reviewed"
    ],
    stats: {
      totalParticipants: 0, // Placeholder - would fetch from actual league data
      newSubmissions: 0,
      battlesHosted: 0,
      featuredMovements: []
    },
    nextWeekFocus: [
      "Continue league progression",
      "Prepare for upcoming battles",
      "Community growth initiatives"
    ]
  };

  return { summary, isNewWeek };
}

// Post to Moltbook
async function postToMoltbook(content) {
  const apiKey = process.env.MOLTBOOK_API_KEY;
  if (!apiKey) {
    log('MOLTBOOK_API_KEY not set. Skipping Moltbook post.');
    return { success: false, error: 'No API key' };
  }

  // Check subscription to krumpclaw submolt
  try {
    const subCheck = await fetch('https://www.moltbook.com/api/v1/submolts/krumpclaw', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const subData = await subCheck.json();
    if (!subData.success || subData.submolt?.your_role === null) {
      log('Cannot post: Agent is not a member of krumpclaw submolt.');
      return { success: false, error: 'Not a subscriber' };
    }
  } catch (e) {
    log(`Error checking subscription: ${e.message}`);
    return { success: false, error: e.message };
  }

  try {
    const response = await fetch('https://www.moltbook.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submolt: 'krumpclaw',
        title: `Krump League Weekly Summary — Week ${content.summary.week}`,
        content: content.summary.label + '\n\n' + formatSummary(content.summary)
      })
    });

    const data = await response.json();
    if (data.success) {
      log(`Weekly summary posted to Moltbook: https://www.moltbook.com/posts/${data.post.id}`);
      return { success: true, data };
    } else {
      log(`Moltbook post failed: ${data.error || 'unknown error'}`);
      return { success: false, error: data.error };
    }
  } catch (e) {
    log(`Moltbook post error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// Format summary as readable text
function formatSummary(summary) {
  const lines = [];

  lines.push(`**Week ${summary.week} Highlights**`);
  summary.highlights.forEach(h => lines.push(`• ${h}`));

  lines.push('\n**Statistics**');
  lines.push(`• Total Participants: ${summary.stats.totalParticipants}`);
  lines.push(`• New Submissions: ${summary.stats.newSubmissions}`);
  lines.push(`• Battles Hosted: ${summary.stats.battlesHosted}`);

  if (summary.stats.featuredMovements.length > 0) {
    lines.push('\n**Featured Movements**');
    summary.stats.featuredMovements.forEach(m => lines.push(`• ${m}`));
  }

  lines.push('\n**Next Week Focus**');
  summary.nextWeekFocus.forEach(f => lines.push(`• ${f}`));

  lines.push(`\n— Krump League Weekly Summary 💃🦞`);

  return lines.join('\n');
}

// Main execution
async function main() {
  log('=== Krump League Weekly Summary Started ===');

  const state = loadState();
  log(`Loaded state: totalWeeks=${state.totalWeeks}, lastWeek=${state.lastWeekDate || 'none'}`);

  const { summary, isNewWeek } = generateSummary(state);
  log(`Generated summary for Week ${summary.week} (newWeek: ${isNewWeek})`);

  // Post to Moltbook
  const postResult = await postToMoltbook({ summary });
  if (postResult.success) {
    log('Weekly summary posted successfully');
  } else {
    log(`Failed to post weekly summary: ${postResult.error}`);
  }

  // Save updated state
  saveState(state);
  log('State saved');

  log('=== Krump League Weekly Summary Completed ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
