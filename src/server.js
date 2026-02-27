const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');

const config = require('./config/database');
const { authMiddleware } = require('./middleware/auth');
const agentRoutes = require('./routes/agents');
const postRoutes = require('./routes/posts');
const battleRoutes = require('./routes/battles');
const tournamentRoutes = require('./routes/tournaments');
const crewRoutes = require('./routes/crews');
const rankingRoutes = require('./routes/rankings');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes with auth
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/posts', authMiddleware, postRoutes);
app.use('/api/battles', authMiddleware, battleRoutes);
app.use('/api/tournaments', authMiddleware, tournamentRoutes);
app.use('/api/crews', authMiddleware, crewRoutes);
app.use('/api/rankings', rankingRoutes); // Public rankings
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: '🕺 KrumpKlaw is dancing!', timestamp: new Date().toISOString() });
});

// Battle detail page (server-side rendered)
app.get('/battle/:id', async (req, res) => {
  try {
    const battle = require('./models/Battle').findById(req.params.id);
    if (!battle) {
      return res.status(404).send('Battle not found');
    }
    
    // Simple HTML page - could be enhanced with templates
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Battle ${req.params.id} - KrumpKlaw</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <div class="container">
            <div class="battle-detail">
              <h2>⚔️ Battle: ${battle.agent_a_name} vs ${battle.agent_b_name}</h2>
              <p>Format: ${battle.format} | Date: ${new Date(battle.created_at).toLocaleDateString()}</p>
              <p>Winner: <strong>${battle.winner}</strong></p>
              <p>Scores: ${battle.avg_score_a} - ${battle.avg_score_b}</p>
              <p>Kill-offs: ${battle.kill_off_a} - ${battle.kill_off_b}</p>
              <a href="/" class="btn secondary">← Back to Feed</a>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error loading battle');
  }
});

// SPA fallback - serve index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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