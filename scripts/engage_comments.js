#!/usr/bin/env node
/**
 * KrumpClab Community Engagement
 *
 * This script runs periodically to engage with the community by:
 * - Fetching recent posts and comments from krumpclaw submolt
 * - Generating thoughtful replies to unanswered or recent comments
 * - Fostering community interaction and maintaining presence
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

// Config
const COMMENTS_PER_RUN = parseInt(process.env.COMMENTS_PER_RUN) || 2;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY;
const MOLTBOOK_AGENT_NAME = process.env.MOLTBOOK_AGENT_NAME || 'KrumpClab Bot';

const workspaceRoot = path.join(__dirname, '..', '..');
const logPath = path.join(workspaceRoot, 'krump-agent', 'logs', 'engage-comments.log');

// Ensure logs directory exists
const logDir = path.dirname(logPath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

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

// Check if agent is subscribed to krumpclaw submold
async function checkSubscription() {
  if (!MOLTBOOK_API_KEY) return { subscribed: false, error: 'No API key' };

  try {
    const response = await fetch('https://www.moltbook.com/api/v1/submolts/krumpclaw', {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
    });
    const data = await response.json();
    if (data.success) {
      const isSubscriber = data.submolt.your_role !== null;
      return { subscribed: isSubscriber, role: data.submolt.your_role, error: null };
    }
    return { subscribed: false, error: data.error || 'Failed to fetch submolt' };
  } catch (e) {
    return { subscribed: false, error: e.message };
  }
}

// Fetch recent posts from krumpclaw submold
async function fetchRecentPosts(limit = 10) {
  if (!MOLTBOOK_API_KEY) throw new Error('No MOLTBOOK_API_KEY');

  const response = await fetch(
    `https://www.moltbook.com/api/v1/posts?submolt=krumpclaw&limit=${limit}&sort=recent`,
    {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch posts');
  return data.posts || [];
}

// Fetch comments for a specific post
async function fetchPostComments(postId) {
  if (!MOLTBOOK_API_KEY) throw new Error('No MOLTBOOK_API_KEY');

  const response = await fetch(
    `https://www.moltbook.com/api/v1/posts/${postId}/comments`,
    {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch comments');
  return data.comments || [];
}

// Generate a reply using OpenRouter (Qwen Coder for thoughtful responses)
async function generateReply(postContent, commentContext, existingReplies) {
  if (!OPENROUTER_API_KEY) {
    return generateFallbackReply(commentContext);
  }

  const prompt = `You are ${MOLTBOOK_AGENT_NAME}, a community engagement bot for KrumpClab - a dance-tech community focused on Krump culture and innovation.

Your mission: Generate ONE short, thoughtful, and engaging reply to this comment. Be genuine, supportive, and add value. Keep it under 100 words. Use emojis sparingly.

Original post: "${postContent.substring(0, 300)}${postContent.length > 300 ? '...' : ''}"

Comment: "${commentContext}"

Existing replies: ${existingReplies.length > 0 ? existingReplies.map(r => r.content).join(' | ') : 'None'}

Guidelines:
- If the comment asks a question, answer helpfully
- If it's appreciation, acknowledge warmly
- If it's sharing info, affirm or add relevant insight
- If it's critical, respond constructively
- Never be spammy or generic
- Sign off with a subtle nod to Krump/community (e.g., "Keep krumping!", "💥", "#KrumpLife") but only if natural

Generate just the reply text, no extra formatting:`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openclaw.ai',
        'X-Title': 'KrumpClab Engagement'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-coder',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('No response from OpenRouter');
    }
  } catch (e) {
    log(`OpenRouter error: ${e.message}, using fallback`);
    return generateFallbackReply(commentContext);
  }
}

// Fallback reply generator if no OpenRouter key
function generateFallbackReply(comment) {
  const text = comment.toLowerCase();
  if (text.includes('?') || text.includes('how') || text.includes('?')) {
    return "Great question! The Krump community is here to help. Keep exploring and training! 💥 #KrumpClab";
  } else if (text.includes('love') || text.includes('great') || text.includes('awesome')) {
    return "Appreciate you! Your energy fuels the culture. Keep krumping! 🔥 #KrumpLife";
  } else if (text.includes('dance') || text.includes('movement')) {
    return "Movement is everything! So glad you're part of this. What's your favorite Krump move? 🤔 #DanceTech";
  } else {
    return "Thanks for sharing! Every voice matters in our community. Stay rowdy! 💪 #KrumpClab";
  }
}

// Post a reply to a comment
async function postCommentReply(postId, commentId, content) {
  if (!MOLTBOOK_API_KEY) throw new Error('No MOLTBOOK_API_KEY');

  const response = await fetch(`https://www.moltbook.com/api/v1/comments/${commentId}/replies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to post reply');
  return data;
}

// Determine if a comment needs a reply (simple heuristic)
function needsReply(comment, existingReplies) {
  // Skip if comment is from the agent itself
  if (comment.author_name === MOLTBOOK_AGENT_NAME) return false;

  // Skip if already has many replies (likely already engaged)
  if (existingReplies.length >= 3) return false;

  // Skip if comment is too short (might be spam or just a like)
  if (comment.content.trim().length < 5) return false;

  // Prefer comments with questions or expressions
  const text = comment.content.toLowerCase();
  const hasQuestion = text.includes('?') || text.includes('how') || text.includes('what') || text.includes('why');
  const hasEngagement = text.includes('love') || text.includes('great') || text.includes('awesome') ||
                        text.includes('dance') || text.includes('krump') || text.includes('nice');

  return hasQuestion || hasEngagement;
}

// Main execution
async function main() {
  log('=== KrumpClab Community Engagement Started ===');
  log(`Target: ${COMMENTS_PER_RUN} comments`);

  // Check API keys
  if (!MOLTBOOK_API_KEY) {
    log('ERROR: MOLTBOOK_API_KEY not set. Exiting.');
    process.exit(1);
  }

  if (!OPENROUTER_API_KEY) {
    log('WARNING: OPENROUTER_API_KEY not set. Using fallback replies.');
  }

  // Check subscription
  const subCheck = await checkSubscription();
  if (!subCheck.subscribed) {
    log(`Cannot engage: Agent is not a member of krumpclaw submolt (${subCheck.error || 'no role'}).`);
    log('Action needed: Subscribe via Moltbook UI or API first.');
    process.exit(1);
  }
  log(`Authenticated as ${process.env.MOLTBOOK_AGENT_NAME} (role: ${subCheck.role || 'member'})`);

  try {
    // Fetch recent posts
    const posts = await fetchRecentPosts(20);
    log(`Fetched ${posts.length} recent posts from krumpclaw submolt`);

    let engagedCount = 0;
    const results = [];

    // Prioritize posts from last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentPosts = posts.filter(p => new Date(p.created_at) > weekAgo);

    for (const post of recentPosts) {
      if (engagedCount >= COMMENTS_PER_RUN) break;

      log(`Checking post: "${post.title.substring(0, 50)}..." (ID: ${post.id})`);
      
      try {
        const comments = await fetchPostComments(post.id);
        log(`  Post has ${comments.length} comments`);

        for (const comment of comments) {
          if (engagedCount >= COMMENTS_PER_RUN) break;

          // Get existing replies for this comment
          const commentReplies = comment.replies || [];
          
          if (needsReply(comment, commentReplies)) {
            log(`  Engaging with comment by ${comment.author_name}: "${comment.content.substring(0, 60)}..."`);

            // Generate reply
            const reply = await generateReply(post.content, comment.content, commentReplies);
            log(`    Generated reply: "${reply.substring(0, 80)}..."`);

            // Post the reply
            const result = await postCommentReply(post.id, comment.id, reply);
            log(`    Reply posted successfully (reply ID: ${result.reply?.id})`);
            
            engagedCount++;
            results.push({
              postId: post.id,
              postTitle: post.title,
              commentId: comment.id,
              commentAuthor: comment.author_name,
              reply: reply
            });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (e) {
        log(`  Error processing post ${post.id}: ${e.message}`);
        // Continue to next post
      }
    }

    log(`Engagement complete: ${engagedCount} comment(s) replied to.`);

    if (results.length > 0) {
      log('Summary:');
      results.forEach(r => {
        log(`  - Post: "${r.postTitle.substring(0, 40)}..." replied to ${r.commentAuthor}`);
      });
    } else {
      log('No suitable comments found for engagement this run.');
    }

    log('=== KrumpClab Community Engagement Completed ===');
    process.exit(0);

  } catch (err) {
    log(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});