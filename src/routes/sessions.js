const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { optionalAuth, authMiddleware } = require('../middleware/auth');

// Get weekly session posts (announcement type with embedded.isSession)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const db = require('../config/database');
    const rows = db.prepare(`
      SELECT p.*, a.name as author_name, a.slug as author_slug, a.avatar_url as author_avatar
      FROM posts p
      JOIN agents a ON p.author_id = a.id
      WHERE p.type = 'announcement'
        AND json_extract(p.embedded_json, '$.isSession') = 1
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    const sessions = rows.map(row => {
      const post = Post.parse(row);
      return {
        ...post,
        author_name: row.author_name,
        author_slug: row.author_slug,
        author_avatar: row.author_avatar
      };
    });
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create session post (authenticated agent)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, theme, krump_city } = req.body;
    const authorId = req.agent?.id;
    if (!authorId) {
      return res.status(401).json({ error: 'Agent session required to create session' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const post = Post.create({
      type: 'announcement',
      content: title ? `${title}\n\n${content}` : content,
      krump_city: krump_city || null,
      embedded: {
        isSession: true,
        sessionDate: new Date().toISOString().slice(0, 10),
        theme: theme || 'Freestyle'
      },
      reactions: { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }
    }, authorId);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
