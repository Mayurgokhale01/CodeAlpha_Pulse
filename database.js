const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'social_media.db');
const db = new sqlite3.Database(dbPath);

// Helper function to run SQL queries returning a Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper function to query a single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Helper function to query multiple rows
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize tables and seed initial data
async function initDb() {
  // Enable foreign keys
  await run('PRAGMA foreign_keys = ON');

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts table
  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Comments table
  await run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Likes table
  await run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Follows table
  await run(`
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Check if seeding is required
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding initial database data...');
    await seedData();
  }
}

async function seedData() {
  // Seed Users
  const u1 = await run(
    `INSERT INTO users (username, display_name, bio, avatar_url, cover_url) VALUES (?, ?, ?, ?, ?)`,
    [
      'alex_dev',
      'Alex Rivera',
      'Full-stack software architect & tech enthusiast. Building cool stuff with JavaScript & Node! 🚀',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const u2 = await run(
    `INSERT INTO users (username, display_name, bio, avatar_url, cover_url) VALUES (?, ?, ?, ?, ?)`,
    [
      'sarah_design',
      'Sarah Chen',
      'UI/UX designer, visual artist, and coffee addict. Creating delightful digital experiences 🎨✨',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const u3 = await run(
    `INSERT INTO users (username, display_name, bio, avatar_url, cover_url) VALUES (?, ?, ?, ?, ?)`,
    [
      'marcus_tech',
      'Marcus Brody',
      'Cybersecurity consultant & open source lover. AI & Cloud infrastructure explorer 🛡️💻',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const u4 = await run(
    `INSERT INTO users (username, display_name, bio, avatar_url, cover_url) VALUES (?, ?, ?, ?, ?)`,
    [
      'elena_creative',
      'Elena Rostova',
      'Photographer & traveler. Documenting stories from around the globe 📷🌍',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const alexId = u1.lastID;
  const sarahId = u2.lastID;
  const marcusId = u3.lastID;
  const elenaId = u4.lastID;

  // Seed Follows
  await run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [alexId, sarahId]);
  await run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [alexId, marcusId]);
  await run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [sarahId, alexId]);
  await run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [sarahId, elenaId]);
  await run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [marcusId, alexId]);
  await run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [elenaId, sarahId]);

  // Seed Posts
  const p1 = await run(
    `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
    [
      alexId,
      'Just launched my new open-source mini social media platform built with Express.js and SQLite! Clean architecture, fast REST APIs, and zero friction. What do you think? 💻🚀 #webdev #express #coding',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const p2 = await run(
    `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
    [
      sarahId,
      'Exploring dark glassmorphic design systems today. Clean contrast, subtle blurs, and vibrant accent colors make interfaces feel magical! ✨ What is your favorite design trend this year?',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const p3 = await run(
    `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
    [
      elenaId,
      'Golden hour captured during my hike in the mountains yesterday. Nature never fails to inspire my creative energy 🏔️🌅',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80'
    ]
  );

  const p4 = await run(
    `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
    [
      marcusId,
      'Reminder for all developers: always sanitize user input and use parameterized queries in your SQL databases! Security starts at the architectural level 🛡️',
      null
    ]
  );

  // Seed Likes
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p1.lastID, sarahId]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p1.lastID, marcusId]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p1.lastID, elenaId]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p2.lastID, alexId]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p2.lastID, elenaId]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p3.lastID, alexId]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [p3.lastID, sarahId]);

  // Seed Comments
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    p1.lastID,
    sarahId,
    'This looks super sleek Alex! Love the minimalist code structure.'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    p1.lastID,
    marcusId,
    'Solid work! SQLite is remarkably fast for full-stack prototypes.'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    p2.lastID,
    alexId,
    'Glassmorphism with dark themes is definitely top-tier. Great visual work Sarah!'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    p3.lastID,
    elenaId,
    'Breathtaking photo! Which camera lens did you use for this shot?'
  ]);

  console.log('Database seeded successfully!');
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
