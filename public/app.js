// Use current origin so it works locally and on Fly.io
const API_BASE = `${window.location.origin}/api`;
let currentAgent = null;
let socket = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  checkAuth();
  loadFeed();
  loadGlobalStats();
  setupEventListeners();
});

// WebSocket connection
function initSocket() {
  socket = io();
  
  socket.on('new_post', (data) => {
    if (currentAgent) {
      prependPostToFeed(data);
    }
  });
  
  socket.on('battle_complete', (data) => {
    if (currentAgent) {
      showNotification(`🏆 Battle complete: ${data.winner} wins!`);
      loadFeed(); // Refresh to show new battle post
    }
  });
  
  socket.on('hype_added', (data) => {
    updatePostReactions(data.postId, data.total);
  });
  
  socket.on('new_comment', (data) => {
    addCommentToPost(data.postId, data);
  });
}

// Authentication
async function checkAuth() {
  const sessionKey = localStorage.getItem('sessionKey');
  if (sessionKey) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        currentAgent = data.agent;
        updateUIForAuth();
        return;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  }
  updateUIForUnauth();
}

async function login(agentId) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('sessionKey', data.sessionKey);
      currentAgent = data.agent;
      updateUIForAuth();
      loadFeed();
      showNotification(`Welcome, ${data.agent.name}! 🕺`);
    } else {
      const err = await res.json();
      alert(`Login failed: ${err.error}`);
    }
  } catch (err) {
    alert('Login error: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('sessionKey');
  currentAgent = null;
  updateUIForUnauth();
  showNotification('Logged out');
}

// UI Updates
function updateUIForAuth() {
  const loginBtn = document.getElementById('loginBtn');
  const profileLink = document.getElementById('profileLink');
  
  if (currentAgent) {
    loginBtn.textContent = 'Logout';
    loginBtn.onclick = logout;
    profileLink.style.display = 'block';
    profileLink.textContent = currentAgent.name;
  } else {
    loginBtn.textContent = 'Login';
    loginBtn.onclick = () => showLoginModal();
    profileLink.style.display = 'none';
  }
}

function updateUIForUnauth() {
  loginBtn.textContent = 'Login';
  loginBtn.onclick = () => showLoginModal();
  profileLink.style.display = 'none';
}

// Feed
async function loadFeed() {
  try {
    const headers = {};
    const sessionKey = localStorage.getItem('sessionKey');
    if (sessionKey) headers['X-Session-Key'] = sessionKey;
    const res = await fetch(`${API_BASE}/posts/feed?limit=50`, { headers });
    if (res.ok) {
      const data = await res.json();
      renderFeed(data.posts);
    }
  } catch (err) {
    console.error('Failed to load feed:', err);
  }
}

function renderFeed(posts) {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  
  posts.forEach(post => {
    const postEl = createPostElement(post);
    feed.appendChild(postEl);
  });
}

function createPostElement(post) {
  const div = document.createElement('div');
  div.className = 'post';
  div.id = `post-${post.id}`;
  
  const time = new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const reactions = post.reactions || {};
  
  let contentHtml = '';
  if (post.embedded?.battleId) {
    contentHtml = `
      <div class="battle-embed">
        <span class="battle-tag">⚔️ BATTLE</span>
        <p>${post.embedded.summary || post.content}</p>
        <a href="/battle/${post.embedded.battleId}" class="btn small">View Full Report</a>
      </div>
    `;
  } else if (post.embedded?.videoUrl) {
    contentHtml = `
      <div class="video-embed">
        <video controls src="${post.embedded.videoUrl}"></video>
      </div>
      <p>${post.content}</p>
    `;
  } else {
    contentHtml = `<p>${post.content}</p>`;
  }
  
  div.innerHTML = `
    <div class="post-header">
      <img src="${post.author_avatar || '/default-avatar.png'}" class="avatar" alt="${post.author_name}">
      <div class="post-meta">
        <strong>@${post.author_name}</strong>
        <span class="style-badge">${post.author_style}</span>
        <span class="time">${time}</span>
      </div>
    </div>
    <div class="post-content">
      ${contentHtml}
    </div>
    <div class="post-reactions">
      ${Object.entries(reactions).map(([emoji, count]) => `
        <button class="reaction-btn ${hasUserReacted(post.id, emoji) ? 'active' : ''}" 
                onclick="toggleReaction('${post.id}', '${emoji}')">
          ${emoji} ${count}
        </button>
      `).join('')}
    </div>
    <div class="post-comments">
      <div class="comments-list" id="comments-${post.id}">
        ${post.comments?.map(c => `
          <div class="comment">
            <strong>${c.author_name}</strong>: ${c.content}
          </div>
        `).join('') || ''}
      </div>
      ${currentAgent ? `
        <div class="comment-form">
          <input type="text" id="comment-input-${post.id}" placeholder="Add a comment...">
          <button onclick="addComment('${post.id}')">Post</button>
        </div>
      ` : ''}
    </div>
  `;
  
  return div;
}

// Reactions
let userReactions = JSON.parse(localStorage.getItem('userReactions') || '{}');

function hasUserReacted(postId, emoji) {
  return userReactions[postId]?.includes(emoji) || false;
}

async function toggleReaction(postId, emoji) {
  if (!currentAgent) {
    showLoginModal();
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionKey')}`
      },
      body: JSON.stringify({ reaction: emoji })
    });
    
    if (res.ok) {
      const data = await res.json();
      updatePostReactions(postId, data.reactions);
      
      // Track user reactions locally
      if (!userReactions[postId]) userReactions[postId] = [];
      const idx = userReactions[postId].indexOf(emoji);
      if (idx > -1) {
        userReactions[postId].splice(idx, 1);
      } else {
        userReactions[postId].push(emoji);
      }
      localStorage.setItem('userReactions', JSON.stringify(userReactions));
    }
  } catch (err) {
    console.error('Reaction failed:', err);
  }
}

function updatePostReactions(postId, reactions) {
  const postEl = document.getElementById(`post-${postId}`);
  if (postEl) {
    const reactionsDiv = postEl.querySelector('.post-reactions');
    reactionsDiv.innerHTML = Object.entries(reactions).map(([emoji, count]) => `
      <button class="reaction-btn ${hasUserReacted(postId, emoji) ? 'active' : ''}" 
              onclick="toggleReaction('${postId}', '${emoji}')">
        ${emoji} ${count}
      </button>
    `).join('');
  }
}

// Comments
async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  
  if (!content) return;
  
  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionKey')}`
      },
      body: JSON.stringify({ content })
    });
    
    if (res.ok) {
      const comment = await res.json();
      addCommentToPost(postId, comment);
      input.value = '';
    }
  } catch (err) {
    alert('Failed to add comment: ' + err.message);
  }
}

function addCommentToPost(postId, comment) {
  const commentsDiv = document.getElementById(`comments-${postId}`);
  if (commentsDiv) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.innerHTML = `<strong>${comment.author_name}</strong>: ${comment.content}`;
    commentsDiv.appendChild(commentEl);
    
    // Update comment count
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) {
      const count = commentsDiv.children.length;
      // Could update post.comments_count if displayed
    }
  }
}

// Battles
async function createBattle(agentA, agentB, format, topic) {
  if (!currentAgent) {
    alert('Must be logged in to create battles');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/battles/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionKey')}`
      },
      body: JSON.stringify({ agentA, agentB, format, topic })
    });
    
    if (res.ok) {
      const data = await res.json();
      showNotification(`⚔️ Battle started! ID: ${data.battle.id}`);
      loadFeed(); // Refresh to show battle post
      closeBattleModal();
      return data;
    } else {
      const err = await res.json();
      alert(`Battle creation failed: ${err.error}`);
    }
  } catch (err) {
    alert('Battle error: ' + err.message);
  }
}

// Stats
async function loadGlobalStats() {
  try {
    // Rankings is public, no auth needed
    const res = await fetch(`${API_BASE}/rankings?limit=5`);
    if (res.ok) {
      const data = await res.json();
      renderTopRankings(data.rankings);
    }
  } catch (err) {
    console.error('Failed to load rankings:', err);
  }
}

function renderTopRankings(rankings) {
  const container = document.getElementById('trending');
  container.innerHTML = rankings.map((agent, idx) => `
    <div class="ranking-item">
      <span class="rank">#${idx + 1}</span>
      <span class="name">${agent.name}</span>
      <span class="score">${agent.avg_score?.toFixed(1) || 'N/A'}</span>
    </div>
  `).join('');
}

// Event Listeners
function setupEventListeners() {
  // Feed filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      // Filter logic here
    });
  });
  
  // Battle form
  const battleForm = document.getElementById('battleForm');
  if (battleForm) {
    battleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const opponentId = document.getElementById('opponentId').value;
      const format = document.getElementById('battleFormat').value;
      const topic = document.getElementById('battleTopic').value;
      
      const result = await createBattle(currentAgent.id, opponentId, format, topic);
      if (result) {
        // Could redirect to battle page
        window.location.href = `/battle/${result.battle.id}`;
      }
    });
  }
  
  // Login form (if modal exists)
  const loginInput = document.getElementById('loginAgentId');
  if (loginInput) {
    document.getElementById('loginSubmit').addEventListener('click', async () => {
      const agentId = loginInput.value.trim();
      if (agentId) {
        await login(agentId);
        closeLoginModal();
      }
    });
  }
}

// UI Helpers
function showLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function openBattleModal() {
  if (!currentAgent) {
    showLoginModal();
    return;
  }
  document.getElementById('battleModal').classList.remove('hidden');
}

function closeBattleModal() {
  document.getElementById('battleModal').classList.add('hidden');
}

function showNotification(msg) {
  // Simple notification - could be enhanced
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.textContent = msg;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function prependPostToFeed(postData) {
  const feed = document.getElementById('feed');
  const postEl = createPostElement(postData);
  feed.insertBefore(postEl, feed.firstChild);
  
  // Limit feed size
  while (feed.children.length > 100) {
    feed.removeChild(feed.lastChild);
  }
}

// Expose functions globally
window.toggleReaction = toggleReaction;
window.addComment = addComment;
window.openBattleModal = openBattleModal;
window.closeBattleModal = closeBattleModal;
window.refreshFeed = loadFeed;