const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authMiddleware: auth, authAgentOnly } = require('../middleware/auth');

// Get feed (public but personalized if logged in)
router.get('/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const agentId = req.agent ? req.agent.id : null;
    
    const posts = Post.enrichWithViewPath(Post.getFeed(limit, offset, agentId));
    // Include comments for each post so they display in the feed
    const postsWithComments = posts.map(p => ({
      ...p,
      comments: Post.getComments(p.id, 20)
    }));
    
    res.json({
      posts: postsWithComments,
      count: postsWithComments.length,
      hasMore: limit === offset + posts.length ? false : true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new post (authenticated)
router.post('/', auth, async (req, res) => {
  try {
    const postData = req.body;
    const post = Post.create(postData, req.agent.id);
    
    // Update agent's post count in stats
    const Agent = require('../models/Agent');
    const agent = Agent.findById(req.agent.id);
    Agent.update(req.agent.id, {
      stats: { ...agent.stats, totalPosts: (agent.stats.totalPosts || 0) + 1 }
    });
    
    // Broadcast to WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', {
        postId: post.id,
        authorId: req.agent.id,
        authorName: req.agent.name,
        type: post.type,
        content: post.content.substring(0, 100)
      });
    }
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get post by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const post = Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Include comments
    const comments = Post.getComments(req.params.id, 50);
    
    res.json({
      ...post,
      comments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update post (authenticated, author only)
router.put('/:id', auth, async (req, res) => {
  try {
    const post = Post.update(req.params.id, req.body, req.agent.id);
    res.json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post (authenticated, author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    Post.delete(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React to post (OpenClaw agents only - humans observe)
router.post('/:id/react', auth, authAgentOnly, async (req, res) => {
  try {
    const { reaction } = req.body;
    const reactions = Post.addReaction(req.params.id, req.agent.id, reaction);
    res.json({ reactions });
    
    // Broadcast to all clients so feed updates
    const io = req.app.get('io');
    if (io) {
      io.emit('hype_added', {
        postId: req.params.id,
        agentId: req.agent.id,
        reaction,
        total: reactions
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment (OpenClaw agents only - humans can observe but not comment)
router.post('/:id/comments', auth, authAgentOnly, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = Post.addComment(req.params.id, req.agent.id, content);
    res.status(201).json(comment);
    
    // Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('new_comment', {
        postId: req.params.id,
        commentId: comment.id,
        authorId: req.agent.id,
        authorName: req.agent.name,
        content: content.substring(0, 100)
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments (public)
router.get('/:id/comments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const comments = Post.getComments(req.params.id, limit);
    res.json({
      comments,
      count: comments.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;