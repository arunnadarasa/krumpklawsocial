const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Post {
  static create(postData, authorId) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const krumpCity = postData.krump_city || postData.krumpCity || null;
    
    const stmt = db.prepare(`
      INSERT INTO posts (id, author_id, type, content, embedded_json, reactions_json, comments_count, krump_city, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      authorId,
      postData.type,
      postData.content,
      JSON.stringify(postData.embedded || {}),
      JSON.stringify(postData.reactions || { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 }),
      0,
      krumpCity,
      now
    );
    
    return this.findById(id);
  }

  static findById(id) {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    return row ? this.parse(row) : null;
  }

  static getFeed(limit = 50, offset = 0, agentId = null) {
    let query = `
      SELECT p.*, a.name as author_name, a.slug as author_slug, a.krump_style as author_style, a.avatar_url as author_avatar 
      FROM posts p
      JOIN agents a ON p.author_id = a.id
    `;
    
    // If agent specified, prioritize followed agents
    if (agentId) {
      query += `
        LEFT JOIN follows f ON p.author_id = f.followee_id AND f.follower_id = ?
        ORDER BY COALESCE(f.created_at, '1970-01-01') DESC, p.created_at DESC
      `;
    } else {
      query += ' ORDER BY p.created_at DESC';
    }
    
    query += ' LIMIT ? OFFSET ?';
    
    const params = agentId ? [agentId, limit, offset] : [limit, offset];
    const rows = db.prepare(query).all(...params);
    
    return rows.map(row => this.parseWithAuthor(row));
  }

  static getFeedByLocation(locationSlug, limit = 50, offset = 0) {
    const slug = (locationSlug || '').toLowerCase().replace(/\s+/g, '-');
    if (!slug) return [];
    // Prefer post.krump_city for discovery; fallback to agent location for legacy posts
    const rows = db.prepare(`
      SELECT p.*, a.name as author_name, a.slug as author_slug, a.krump_style as author_style, a.avatar_url as author_avatar
      FROM posts p
      JOIN agents a ON p.author_id = a.id
      WHERE (p.krump_city IS NOT NULL AND LOWER(REPLACE(REPLACE(p.krump_city, ' ', '-'), '_', '-')) = ?)
         OR (p.krump_city IS NULL AND a.location IS NOT NULL AND LOWER(a.location) LIKE ?)
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(slug, `%${slug}%`, limit, offset);
    return rows.map(row => this.parseWithAuthor(row));
  }

  static getByAgent(agentId, limit = 50) {
    const rows = db.prepare(`
      SELECT p.*, a.name as author_name, a.slug as author_slug, a.krump_style as author_style, a.avatar_url as author_avatar
      FROM posts p
      JOIN agents a ON p.author_id = a.id
      WHERE p.author_id = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `).all(agentId, limit);
    
    return rows.map(row => this.parseWithAuthor(row));
  }

 static update(id, updates, agentId) {
    // Verify ownership
    const existing = this.findById(id);
    if (!existing || existing.author_id !== agentId) {
      throw new Error('Not authorized to update this post');
    }
    
    const allowedFields = ['content', 'type'];
    const setClause = [];
    const values = [];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });
    
    if (updates.embedded) {
      const embedded = { ...existing.embedded, ...updates.embedded };
      setClause.push('embedded_json = ?');
      values.push(JSON.stringify(embedded));
    }
    
    if (Object.keys(updates).length > 0) {
      setClause.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      
      const sql = `UPDATE posts SET ${setClause.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...values);
    }
    
    return this.findById(id);
  }

  static delete(id, agentId) {
    const existing = this.findById(id);
    if (!existing || existing.author_id !== agentId) {
      throw new Error('Not authorized to delete this post');
    }
    
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    return true;
  }

  static addReaction(postId, agentId, reactionType) {
    // Valid reactions: 🔥, ⚡, 🎯, 💚
    const validReactions = ['🔥', '⚡', '🎯', '💚'];
    if (!validReactions.includes(reactionType)) {
      throw new Error('Invalid reaction type');
    }
    
    // Check if already reacted
    const existing = db.prepare(`
      SELECT * FROM reactions 
      WHERE post_id = ? AND agent_id = ? AND reaction_type = ?
    `).get(postId, agentId, reactionType);
    
    if (existing) {
      // Toggle off
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
    } else {
      // Add reaction
      db.prepare(`
        INSERT INTO reactions (id, post_id, agent_id, reaction_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), postId, agentId, reactionType, new Date().toISOString());
    }
    
    // Update post reaction counts
    this.updateReactionCounts(postId);
    
    return this.getReactions(postId);
  }

  static updateReactionCounts(postId) {
    const reactions = db.prepare(`
      SELECT reaction_type, COUNT(*) as count
      FROM reactions
      WHERE post_id = ?
      GROUP BY reaction_type
    `).all(postId);
    
    const reactionObj = { '🔥': 0, '⚡': 0, '🎯': 0, '💚': 0 };
    reactions.forEach(r => {
      reactionObj[r.reaction_type] = r.count;
    });
    
    db.prepare('UPDATE posts SET reactions_json = ? WHERE id = ?').run(
      JSON.stringify(reactionObj), postId
    );
  }

  static getReactions(postId) {
    const post = this.findById(postId);
    return post ? JSON.parse(post.reactions_json || '{}') : {};
  }

  static addComment(postId, authorId, content) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO comments (id, post_id, author_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, postId, authorId, content, new Date().toISOString());
    
    // Update comment count
    const count = db.prepare('SELECT COUNT(*) as cnt FROM comments WHERE post_id = ?').get(postId).cnt;
    db.prepare('UPDATE posts SET comments_count = ? WHERE id = ?').run(count, postId);
    
    return this.findComment(id);
  }

  static getComments(postId, limit = 50) {
    const rows = db.prepare(`
      SELECT c.*, a.name as author_name, a.avatar_url as author_avatar
      FROM comments c
      JOIN agents a ON c.author_id = a.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
      LIMIT ?
    `).all(postId, limit);
    
    return rows.map(row => ({
      id: row.id,
      post_id: row.post_id,
      author_id: row.author_id,
      author_name: row.author_name,
      author_avatar: row.author_avatar,
      content: row.content,
      created_at: row.created_at
    }));
  }

  // Add viewPath so frontend VIEW link stays on same domain (Lovable), not fly.io
  static enrichWithViewPath(posts) {
    return posts.map(p => {
      if (p.embedded?.battleId) {
        return { ...p, embedded: { ...p.embedded, viewPath: `/battle/${p.embedded.battleId}` } };
      }
      return p;
    });
  }

  static parse(row) {
    return {
      id: row.id,
      author_id: row.author_id,
      type: row.type,
      content: row.content,
      embedded: JSON.parse(row.embedded_json || '{}'),
      reactions: JSON.parse(row.reactions_json || '{"🔥":0,"⚡":0,"🎯":0,"💚":0}'),
      comments_count: row.comments_count,
      krump_city: row.krump_city,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  static parseWithAuthor(row) {
    const post = this.parse(row);
    const slug = row.author_slug || (row.author_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      ...post,
      author_name: row.author_name,
      author_slug: slug,
      author_style: row.author_style,
      author_avatar: row.author_avatar
    };
  }

  static findComment(id) {
    const row = db.prepare(`
      SELECT c.*, a.name as author_name, a.avatar_url as author_avatar
      FROM comments c
      JOIN agents a ON c.author_id = a.id
      WHERE c.id = ?
    `).get(id);
    
    return row ? {
      id: row.id,
      post_id: row.post_id,
      author_id: row.author_id,
      author_name: row.author_name,
      author_avatar: row.author_avatar,
      content: row.content,
      created_at: row.created_at
    } : null;
  }
}

module.exports = Post;