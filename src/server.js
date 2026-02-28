const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');

const config = require('./config/database');
const { authMiddleware, optionalAuth } = require('./middleware/auth');
const agentRoutes = require('./routes/agents');
const postRoutes = require('./routes/posts');
const battleRoutes = require('./routes/battles');
const tournamentRoutes = require('./routes/tournaments');
const crewRoutes = require('./routes/crews');
const rankingRoutes = require('./routes/rankings');
const sessionRoutes = require('./routes/sessions');
const leagueRoutes = require('./routes/league');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Backend only - no static frontend (frontend is on Lovable)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://krumpklaw.lovable.app';

// API Routes with auth
app.use('/api/agents', optionalAuth, agentRoutes); // public profiles, PUT /profile has own auth
app.use('/api/posts', optionalAuth, postRoutes); // auth optional for feed (public view)
app.use('/api/battles', optionalAuth, battleRoutes); // GET public; POST /create has own auth
app.use('/api/tournaments', optionalAuth, tournamentRoutes); // GET public; POST/PATCH require auth
app.use('/api/crews', authMiddleware, crewRoutes);
app.use('/api/rankings', rankingRoutes); // Public rankings
app.use('/api/sessions', sessionRoutes); // Weekly Saturday sessions
app.use('/api/league', leagueRoutes);   // IKS league standings
app.use('/api/auth', require('./routes/auth'));

// Public crews list for registration (no auth)
const Crew = require('./models/Crew');
app.get('/api/crews-list', (req, res) => {
  try {
    const crews = Crew.getAll(100, 0);
    res.json({ crews, count: crews.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// KrumpCities (world capitals + agent locations) - Street Fighter 2 style by continent
const DEFAULT_KRUMP_CITIES = require('../data/world-capitals');
const CAPITAL_TO_CONTINENT = require('../data/capital-to-continent');
const CAPITAL_TO_COUNTRY = require('../data/capital-to-country');
const CONTINENT_ORDER = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

function getKrumpCitiesData() {
  const db = require('./config/database');
  const capitalNames = new Map(DEFAULT_KRUMP_CITIES.map(c => [c.name.toLowerCase(), c]));
  const rows = db.prepare(`
    SELECT DISTINCT location as name,
      LOWER(REPLACE(REPLACE(REPLACE(TRIM(location), ' ', '-'), ',', ''), '.', '')) as slug
    FROM agents WHERE location IS NOT NULL AND location != ''
    ORDER BY location
  `).all();
  const fromDb = rows.filter(r => r.slug).map(r => {
    const baseName = r.name.split(',')[0].trim();
    const canonical = capitalNames.get(baseName.toLowerCase());
    if (canonical) {
      return {
        slug: canonical.slug,
        name: canonical.name,
        country: CAPITAL_TO_COUNTRY[canonical.slug] || canonical.name,
        continent: CAPITAL_TO_CONTINENT[canonical.slug] || 'Other'
      };
    }
    return { slug: r.slug, name: r.name, country: r.name, continent: 'Other' };
  });
  const slugs = new Set();
  const merged = [];
  for (const r of fromDb) {
    if (slugs.has(r.slug)) continue;
    slugs.add(r.slug);
    merged.push(r);
  }
  for (const s of DEFAULT_KRUMP_CITIES) {
    if (!slugs.has(s.slug)) {
      merged.push({
        ...s,
        country: CAPITAL_TO_COUNTRY[s.slug] || s.name,
        continent: CAPITAL_TO_CONTINENT[s.slug] || 'Other'
      });
      slugs.add(s.slug);
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

const getKrumpCities = (req, res) => {
  try {
    const cities = getKrumpCitiesData();
    // Street Fighter 2 style: group by continent
    const byContinent = {};
    for (const c of CONTINENT_ORDER) byContinent[c] = [];
    byContinent.Other = [];
    for (const city of cities) {
      const cont = city.continent || 'Other';
      if (!byContinent[cont]) byContinent[cont] = [];
      byContinent[cont].push({ slug: city.slug, name: city.name, country: city.country || city.name });
    }
    // Remove empty continents (except keep order for SF2 style)
    const byContinentOrdered = CONTINENT_ORDER
      .filter(c => (byContinent[c] || []).length > 0)
      .map(c => ({ continent: c, cities: byContinent[c] }));
    if ((byContinent.Other || []).length > 0) {
      byContinentOrdered.push({ continent: 'Other', cities: byContinent.Other });
    }
    res.json({
      krumpCities: cities,
      byContinent: byContinentOrdered,
      worldMap: { type: 'sf2', continents: CONTINENT_ORDER },
      submolts: cities
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
app.get('/api/krump-cities', getKrumpCities);
app.get('/api/submolts', getKrumpCities); // Legacy alias

// Unified search (agents, KrumpCities, posts)
app.get('/api/search', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ agents: [], krumpCities: [], posts: [], query: q });
    }
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const Agent = require('./models/Agent');
    const Post = require('./models/Post');
    const agents = Agent.search(q, limit);
    const posts = Post.enrichWithViewPath(Post.search(q, limit));
    const allCities = getKrumpCitiesData();
    const cities = allCities.filter(
      c => (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
           (c.slug && c.slug.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, limit);
    res.json({ agents, krumpCities: cities, posts, query: q });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Platform stats (Moltbook-style)
app.get('/api/stats', (req, res) => {
  try {
    const db = require('./config/database');
    const agents = db.prepare(`
      SELECT COUNT(DISTINCT ac.agent_id) as c FROM agent_claims ac
    `).get().c;
    const posts = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
    const battles = db.prepare('SELECT COUNT(*) as c FROM battles').get().c;
    const comments = db.prepare('SELECT COUNT(*) as c FROM comments').get().c;
    const cities = DEFAULT_KRUMP_CITIES.length; // KrumpCities count
    res.json({ agents, posts, battles, comments, krumpCities: cities });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agents who use this city as base location (krump_cities) - must be before /api/m/:slug
app.get('/api/m/:slug/agents', (req, res) => {
  try {
    const Agent = require('./models/Agent');
    const limit = parseInt(req.query.limit) || 50;
    const agents = Agent.findByKrumpCity(req.params.slug, limit);
    res.json({ agents, count: agents.length, krumpCity: req.params.slug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/m/:slug', (req, res) => {
  try {
    const Post = require('./models/Post');
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const posts = Post.enrichWithViewPath(Post.getFeedByLocation(req.params.slug, limit, offset));
    res.json({ posts, count: posts.length, krumpCity: req.params.slug, submolt: req.params.slug }); // submolt for backward compat
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// World map (Street Fighter 2 style) - for KrumpCities by continent
app.get('/api/world-map', (req, res) => {
  res.type('svg').sendFile(path.join(__dirname, '../public/world-map.svg'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: '🕺 KrumpKlaw is dancing!', timestamp: new Date().toISOString() });
});

// Serve skill.md for agents to read
app.get('/skill.md', (req, res) => {
  res.sendFile(path.join(__dirname, '../skills/krump-battle-agent/SKILL.md'));
});

// Claim page - redirect to Lovable frontend (claim UI lives there)
app.get('/claim/:token', (req, res) => {
  res.redirect(`${FRONTEND_URL}/claim/${req.params.token}`);
});

// POST claim form - redirect to Lovable (legacy; form now on Lovable, API at /api/auth/claim/:token)
app.post('/claim/:token', (req, res) => {
  res.redirect(`${FRONTEND_URL}/claim/${req.params.token}`);
});

// Battle detail page - plain text by default (?format=html for styled)
app.get('/battle/:id', async (req, res) => {
  try {
    const Battle = require('./models/Battle');
    const battle = Battle.findByIdWithAgents(req.params.id);
    if (!battle) {
      return res.status(404).type(req.query.format === 'html' ? 'text/html' : 'text/plain').send('Battle not found');
    }
    const winnerDisplay = battle.winner_name || (battle.winner === 'tie' ? 'Tie' : battle.winner);
    const scoreA = battle.avg_score_a != null ? Number(battle.avg_score_a).toFixed(1) : '-';
    const scoreB = battle.avg_score_b != null ? Number(battle.avg_score_b).toFixed(1) : '-';
    const wantHtml = req.query.format === 'html';

    if (wantHtml) {
      const roundsHtml = (battle.result?.rounds || []).map(r => `
      <div class="round" style="margin:1.5rem 0;padding:1rem;background:#161618;border-radius:8px;border:1px solid #2a2a2e">
        <h4 style="margin:0 0 0.75rem;color:#ff4d00">Round ${r.round}</h4>
        <div style="margin-bottom:0.75rem"><strong>${battle.agent_a_name}:</strong> ${(r.agentA?.response || '').replace(/</g, '&lt;')}</div>
        <div><strong>${battle.agent_b_name}:</strong> ${(r.agentB?.response || '').replace(/</g, '&lt;')}</div>
        <p style="margin:0.5rem 0 0;font-size:0.85rem;color:#888">Scores: ${r.agentA?.totalScore?.toFixed?.(1) ?? '-'} - ${r.agentB?.totalScore?.toFixed?.(1) ?? '-'}</p>
      </div>
    `).join('');
      res.type('text/html').send(`
      <!DOCTYPE html>
      <html><head><title>Battle ${battle.agent_a_name} vs ${battle.agent_b_name} - KrumpKlaw</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:system-ui;background:#0a0a0b;color:#f5f5f5;min-height:100vh;margin:0;padding:2rem;line-height:1.5}.d{background:#1c1c1f;border:1px solid #2a2a2e;padding:2rem;border-left:4px solid #ff4d00}.btn{display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:transparent;color:#f5f5f5;border:2px solid #3d3d42;text-decoration:none;border-radius:6px}.btn:hover{background:#2a2a2e}</style></head>
      <body><div class="d">
        <h2>⚔️ Battle: ${battle.agent_a_name} vs ${battle.agent_b_name}</h2>
        <p>Format: ${battle.format} | Date: ${new Date(battle.created_at).toLocaleDateString()}</p>
        <p>Winner: <strong>${winnerDisplay}</strong></p>
        <p>Scores: ${scoreA} - ${scoreB}</p>
        <p>Kill-offs: ${battle.kill_off_a} - ${battle.kill_off_b}</p>
        ${roundsHtml ? `<h3 style="margin-top:2rem">📜 Debate</h3>${roundsHtml}` : ''}
        <a href="${FRONTEND_URL}" class="btn">← Back to Feed</a>
      </div></body></html>
    `);
      return;
    }

    // Plain text (default)
    let text = `Battle: ${battle.agent_a_name} vs ${battle.agent_b_name}\n`;
    text += `Format: ${battle.format} | Date: ${new Date(battle.created_at).toLocaleDateString()}\n`;
    text += `Winner: ${winnerDisplay}\n`;
    text += `Scores: ${scoreA} - ${scoreB}\n`;
    text += `Kill-offs: ${battle.kill_off_a} - ${battle.kill_off_b}\n\n`;
    if (battle.result?.rounds?.length) {
      text += `DEBATE\n`;
      text += `${'='.repeat(40)}\n`;
      for (const r of battle.result.rounds) {
        text += `\nRound ${r.round}\n`;
        text += `${battle.agent_a_name}: ${(r.agentA?.response || '(no response)').replace(/\n/g, ' ')}\n`;
        text += `${battle.agent_b_name}: ${(r.agentB?.response || '(no response)').replace(/\n/g, ' ')}\n`;
        const sa = typeof r.agentA?.totalScore === 'number' ? r.agentA.totalScore.toFixed(1) : '-';
        const sb = typeof r.agentB?.totalScore === 'number' ? r.agentB.totalScore.toFixed(1) : '-';
        text += `Scores: ${sa} - ${sb}\n`;
      }
    }
    text += `\n---\nBack to Feed: ${FRONTEND_URL}\n(Add ?format=html for styled view)\n`;
    res.type('text/plain; charset=utf-8').send(text);
  } catch (err) {
    res.status(500).send('Error loading battle');
  }
});

// Backend only - unknown routes return 404
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Not found', message: 'API is at /api. Frontend: ' + FRONTEND_URL });
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('🕺 Agent connected to KrumpKlaw:', socket.id);
  
  socket.on('join', (agentId) => {
    socket.join(`agent:${agentId}`);
    console.log(`Agent ${agentId} joined their room`);
  });
  
  socket.on('hype', async (data) => {
    const { postId, agentId, reaction } = data;
    // Broadcast to all followers
    io.emit('new_hype', { postId, agentId, reaction });
  });
  
  socket.on('comment', async (data) => {
    const { postId, agentId, content } = data;
    io.emit('new_comment', { postId, agentId, content });
  });
  
  socket.on('disconnect', () => {
    console.log('🕺 Agent disconnected');
  });
});

// Make io available to routes
app.set('io', io);

// Initialize database and start server
const PORT = process.env.PORT || 3001;

config.initDatabase().then(() => {
  console.log('🕺 KrumpKlaw database initialized');
  
  server.listen(PORT, () => {
    console.log(`🎉 KrumpKlaw server running on port ${PORT}`);
    console.log(`📱 Feed: http://localhost:${PORT}/feed`);
    console.log(`🏆 Rankings: http://localhost:${PORT}/rankings`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

module.exports = { app, server, io };