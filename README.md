# ⚡ Pulse — Mini Social Media Application

**Pulse** is a modern, feature-rich full-stack mini social media application built with **Node.js**, **Express.js**, **SQLite**, and **Vanilla HTML/CSS/JavaScript**. It features a high-end dark glassmorphism UI, user profiles, posts & comments, like/follow mechanics, real-time search, and a built-in user switcher for testing multi-user interactions.

---

## ✨ Key Features

### 👤 1. User Profiles & Account Management
- **Profile Customization**: Custom avatar, cover banner, display name, handle, bio, and joined date.
- **Profile Stats**: Live counters for Posts, Followers, and Following.
- **Edit Profile Modal**: Modify display name, bio, avatar URL, and cover URL directly.
- **1-Click User Switcher**: Top navbar dropdown allows switching between pre-seeded demo personas (`@alex_dev`, `@sarah_design`, `@marcus_tech`, `@elena_creative`) or registering a new account.

### 📝 2. Posts & Feed Management
- **Rich Post Composer**: Publish text posts with hashtag support, attach image URLs, or upload images directly.
- **Feed Views**: Switch between **For You** (global feed) and **Following** (posts from followed accounts).
- **Post Ownership**: Authors can delete their own posts.

### 💬 3. Comments Thread
- **Interactive Comment Drawer**: View comments for any post in a modal summary.
- **Comment Creation & Deletion**: Add comments with commenter avatars and timestamps; delete owned comments.

### ❤️ 4. Like & Follow System
- **Animated Like Counter**: One-click heart toggle with animated scale keyframes and instant server-side counter updates.
- **Follow Mechanics**: Follow or unfollow users from profile cards or suggested user widgets with instant feed filtering updates.

### 🔍 5. Real-Time Search & Trending
- **Global Search**: Filter posts and user handles in real time.
- **Trending Topics**: Quick-click hashtags (`#webdev`, `#expressjs`, `#sqlite`, `#javascript`) to filter the main feed.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (`sqlite3`) with automatic table initialization & seed data |
| **File Uploads** | Multer |
| **Frontend** | HTML5, Vanilla CSS3 (Glassmorphism, Custom Variables, CSS Grid/Flexbox), JavaScript ES6+ (SPA Architecture) |
| **Icons & Fonts** | FontAwesome 6, Google Fonts (Plus Jakarta Sans) |

---

## 🗄️ Database Schema

The SQLite database (`social_media.db`) comprises 5 interrelated tables:

- **`users`**: `id`, `username`, `display_name`, `bio`, `avatar_url`, `cover_url`, `created_at`
- **`posts`**: `id`, `user_id`, `content`, `image_url`, `created_at`
- **`comments`**: `id`, `post_id`, `user_id`, `content`, `created_at`
- **`likes`**: `id`, `post_id`, `user_id`, `created_at` *(UNIQUE post_id + user_id)*
- **`follows`**: `id`, `follower_id`, `following_id`, `created_at` *(UNIQUE follower_id + following_id)*

---

## 📡 API Reference

### User Routes
- `GET /api/users` - Fetch all users (optional `?search=`)
- `GET /api/users/:id` - Get user profile with stats & follow status (optional `?currentUserId=`)
- `POST /api/users` - Create a new user account
- `PUT /api/users/:id` - Update profile details
- `POST /api/users/:id/follow` - Toggle follow/unfollow user
- `GET /api/users/:id/followers` - List followers of a user
- `GET /api/users/:id/following` - List users being followed

### Post Routes
- `GET /api/posts` - Fetch posts (`?feedType=for_you|following|user`, `?currentUserId=`, `?search=`)
- `POST /api/posts` - Create a new post
- `DELETE /api/posts/:id` - Delete a post
- `POST /api/posts/:id/like` - Toggle like/unlike on a post

### Comment Routes
- `GET /api/posts/:id/comments` - Fetch comments for a post
- `POST /api/posts/:id/comments` - Add a comment
- `DELETE /api/comments/:id` - Delete a comment

### Media Upload
- `POST /api/upload` - Upload image file (returns `/uploads/filename`)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)

### Installation & Running

1. **Clone or Navigate to Project Directory**:
   ```bash
   cd projects/social-media-app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
social-media-app/
├── database.js      # SQLite schema setup & seed data generator
├── server.js        # Express REST API routes & Multer configuration
├── package.json     # Project metadata and dependencies
├── public/          # Static frontend assets
│   ├── index.html   # Main SPA HTML structure
│   ├── styles.css   # Dark glassmorphic design system
│   └── app.js       # Client SPA controller & API client
└── uploads/         # Directory for user-uploaded post images
```
