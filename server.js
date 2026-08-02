const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { initDb, run, get, all } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'media-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// ================= USER ROUTES =================

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT id, username, display_name, bio, avatar_url, cover_url, created_at FROM users';
    let params = [];
    if (search) {
      sql += ' WHERE username LIKE ? OR display_name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const users = await all(sql, params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user profile with follower/following/post counts
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.query.currentUserId;

    const user = await get(
      'SELECT id, username, display_name, bio, avatar_url, cover_url, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const postCount = await get('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId]);
    const followerCount = await get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [userId]);
    const followingCount = await get('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [userId]);

    let isFollowing = false;
    if (currentUserId && currentUserId != userId) {
      const followCheck = await get(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [currentUserId, userId]
      );
      isFollowing = !!followCheck;
    }

    res.json({
      ...user,
      stats: {
        posts: postCount.count,
        followers: followerCount.count,
        following: followingCount.count
      },
      isFollowing
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new user
app.post('/api/users', async (req, res) => {
  try {
    const { username, display_name, bio, avatar_url, cover_url } = req.body;
    if (!username || !display_name) {
      return res.status(400).json({ error: 'Username and display name are required' });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a_z0-9_]/g, '');
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
    const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';

    const result = await run(
      `INSERT INTO users (username, display_name, bio, avatar_url, cover_url) VALUES (?, ?, ?, ?, ?)`,
      [cleanUsername, display_name.trim(), bio || '', avatar_url || defaultAvatar, cover_url || defaultCover]
    );

    const newUser = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update user profile
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { display_name, bio, avatar_url, cover_url } = req.body;

    const existing = await get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    await run(
      `UPDATE users SET display_name = ?, bio = ?, avatar_url = ?, cover_url = ? WHERE id = ?`,
      [display_name, bio, avatar_url, cover_url, userId]
    );

    const updatedUser = await get('SELECT * FROM users WHERE id = ?', [userId]);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST follow/unfollow user
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { currentUserId } = req.body;

    if (!currentUserId) return res.status(400).json({ error: 'currentUserId is required' });
    if (currentUserId == targetUserId) return res.status(400).json({ error: 'You cannot follow yourself' });

    const existingFollow = await get(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [currentUserId, targetUserId]
    );

    if (existingFollow) {
      await run('DELETE FROM follows WHERE id = ?', [existingFollow.id]);
      res.json({ following: false, message: 'Unfollowed user' });
    } else {
      await run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [currentUserId, targetUserId]);
      res.json({ following: true, message: 'Followed user' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET followers of a user
app.get('/api/users/:id/followers', async (req, res) => {
  try {
    const userId = req.params.id;
    const followers = await all(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio 
       FROM follows f 
       JOIN users u ON f.follower_id = u.id 
       WHERE f.following_id = ?`,
      [userId]
    );
    res.json(followers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET list of users being followed
app.get('/api/users/:id/following', async (req, res) => {
  try {
    const userId = req.params.id;
    const following = await all(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio 
       FROM follows f 
       JOIN users u ON f.following_id = u.id 
       WHERE f.follower_id = ?`,
      [userId]
    );
    res.json(following);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= POST ROUTES =================

// GET posts feed
app.get('/api/posts', async (req, res) => {
  try {
    const { currentUserId, feedType = 'for_you', targetUserId, search } = req.query;

    let sql = `
      SELECT p.id, p.content, p.image_url, p.created_at, p.user_id,
             u.username, u.display_name, u.avatar_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;

    let conditions = [];
    let params = [];

    if (feedType === 'following' && currentUserId) {
      conditions.push(`p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)`);
      params.push(currentUserId);
    } else if (feedType === 'user' && targetUserId) {
      conditions.push(`p.user_id = ?`);
      params.push(targetUserId);
    }

    if (search) {
      conditions.push(`(p.content LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.created_at DESC';

    const posts = await all(sql, params);

    // Enrich posts with isLiked and isFollowing status for currentUserId
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        let isLiked = false;
        let isFollowingAuthor = false;

        if (currentUserId) {
          const likeCheck = await get(
            'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
            [post.id, currentUserId]
          );
          isLiked = !!likeCheck;

          if (currentUserId != post.user_id) {
            const followCheck = await get(
              'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
              [currentUserId, post.user_id]
            );
            isFollowingAuthor = !!followCheck;
          }
        }

        return {
          ...post,
          isLiked,
          isFollowingAuthor
        };
      })
    );

    res.json(enrichedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create post
app.post('/api/posts', async (req, res) => {
  try {
    const { user_id, content, image_url } = req.body;
    if (!user_id || !content) {
      return res.status(400).json({ error: 'user_id and content are required' });
    }

    const result = await run(
      `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
      [user_id, content.trim(), image_url || null]
    );

    const newPost = await get(
      `SELECT p.id, p.content, p.image_url, p.created_at, p.user_id,
              u.username, u.display_name, u.avatar_url,
              0 as likes_count, 0 as comments_count
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [result.lastID]
    );

    res.status(201).json({ ...newPost, isLiked: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { currentUserId } = req.body;

    const post = await get('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.user_id != currentUserId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST toggle like on post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = req.params.id;
    const { currentUserId } = req.body;

    if (!currentUserId) return res.status(400).json({ error: 'currentUserId is required' });

    const existingLike = await get(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, currentUserId]
    );

    if (existingLike) {
      await run('DELETE FROM likes WHERE id = ?', [existingLike.id]);
    } else {
      await run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, currentUserId]);
    }

    const likesCountResult = await get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);
    res.json({
      isLiked: !existingLike,
      likes_count: likesCountResult.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= COMMENT ROUTES =================

// GET comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await all(
      `SELECT c.id, c.post_id, c.content, c.created_at, c.user_id,
              u.username, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add comment
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const { currentUserId, content } = req.body;

    if (!currentUserId || !content) {
      return res.status(400).json({ error: 'currentUserId and content are required' });
    }

    const result = await run(
      `INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`,
      [postId, currentUserId, content.trim()]
    );

    const newComment = await get(
      `SELECT c.id, c.post_id, c.content, c.created_at, c.user_id,
              u.username, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.lastID]
    );

    const commentCountResult = await get('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [postId]);

    res.status(201).json({
      comment: newComment,
      comments_count: commentCountResult.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE comment
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const commentId = req.params.id;
    const { currentUserId } = req.body;

    const comment = await get('SELECT post_id, user_id FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.user_id != currentUserId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await run('DELETE FROM comments WHERE id = ?', [commentId]);
    const commentCountResult = await get('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [comment.post_id]);

    res.json({ message: 'Comment deleted', comments_count: commentCountResult.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FILE UPLOAD ENDPOINT
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Initialize DB and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });
