/* ==========================================================================
   PULSE SOCIAL APP - FRONTEND CLIENT CONTROLLER (VANILLA JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // APP STATE
  let currentUser = null;
  let allUsers = [];
  let currentFeedTab = 'for_you'; // 'for_you' | 'following'
  let currentView = 'feed'; // 'feed' | 'profile'
  let activeProfileUserId = null;
  let attachedImageUrl = null;
  let activeCommentPostId = null;
  let searchQuery = '';

  // DOM ELEMENTS
  const userSwitcherSelect = document.getElementById('user-switcher-select');
  const globalSearchInput = document.getElementById('global-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const searchBanner = document.getElementById('search-banner');
  const searchQueryText = document.getElementById('search-query-text');
  const resetSearchBannerBtn = document.getElementById('reset-search-banner-btn');

  // Sidebar Elements
  const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarUserHandle = document.getElementById('sidebar-user-handle');
  const navMyProfileBtn = document.getElementById('nav-my-profile-btn');
  const navCreateUserBtn = document.getElementById('nav-create-user-btn');
  const navCreatePostBtn = document.getElementById('nav-create-post-btn');
  const sidebarNavLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-feed]');

  // Feed Elements
  const feedView = document.getElementById('feed-view');
  const profileView = document.getElementById('profile-view');
  const feedTabBtns = document.querySelectorAll('.feed-tabs .tab-btn');
  const postsContainer = document.getElementById('posts-container');

  // Composer Elements
  const composerUserAvatar = document.getElementById('composer-user-avatar');
  const composerText = document.getElementById('composer-text');
  const composerFileInput = document.getElementById('composer-file-input');
  const composerUrlBtn = document.getElementById('composer-url-btn');
  const imageUrlInputBar = document.getElementById('image-url-input-bar');
  const composerUrlInput = document.getElementById('composer-url-input');
  const confirmUrlBtn = document.getElementById('confirm-url-btn');
  const composerMediaPreview = document.getElementById('composer-media-preview');
  const previewImgElement = document.getElementById('preview-img-element');
  const removePreviewBtn = document.getElementById('remove-preview-btn');
  const publishPostBtn = document.getElementById('publish-post-btn');

  // Profile View Elements
  const backToFeedBtn = document.getElementById('back-to-feed-btn');
  const profileCoverImg = document.getElementById('profile-cover-img');
  const profileAvatarImg = document.getElementById('profile-avatar-img');
  const profileDisplayName = document.getElementById('profile-display-name');
  const profileUsername = document.getElementById('profile-username');
  const profileBioText = document.getElementById('profile-bio-text');
  const profileJoinedDate = document.getElementById('profile-joined-date');
  const profileButtonsContainer = document.getElementById('profile-buttons-container');
  const statPostsCount = document.getElementById('stat-posts-count');
  const statFollowersCount = document.getElementById('stat-followers-count');
  const statFollowingCount = document.getElementById('stat-following-count');
  const statFollowersBtn = document.getElementById('stat-followers-btn');
  const statFollowingBtn = document.getElementById('stat-following-btn');
  const profilePostsContainer = document.getElementById('profile-posts-container');

  // Right Sidebar
  const suggestedUsersList = document.getElementById('suggested-users-list');
  const trendingItems = document.querySelectorAll('.trending-item');

  // Modals
  const commentsModal = document.getElementById('comments-modal');
  const closeCommentsModal = document.getElementById('close-comments-modal');
  const commentsPostSummary = document.getElementById('comments-post-summary');
  const commentsListContainer = document.getElementById('comments-list-container');
  const commentUserAvatar = document.getElementById('comment-user-avatar');
  const newCommentInput = document.getElementById('new-comment-input');
  const submitCommentBtn = document.getElementById('submit-comment-btn');

  const editProfileModal = document.getElementById('edit-profile-modal');
  const closeEditProfileModal = document.getElementById('close-edit-profile-modal');
  const cancelEditProfileBtn = document.getElementById('cancel-edit-profile-btn');
  const editProfileForm = document.getElementById('edit-profile-form');

  const createUserModal = document.getElementById('create-user-modal');
  const closeCreateUserModal = document.getElementById('close-create-user-modal');
  const cancelCreateUserBtn = document.getElementById('cancel-create-user-btn');
  const createUserForm = document.getElementById('create-user-form');

  const usersListModal = document.getElementById('users-list-modal');
  const usersListModalTitle = document.getElementById('users-list-modal-title');
  const closeUsersListModal = document.getElementById('close-users-list-modal');
  const modalUsersContainer = document.getElementById('modal-users-container');

  // INITIALIZE APP
  async function initApp() {
    await fetchUsers();
    setupEventListeners();
  }

  // FETCH USERS & SETUP SWITCHER
  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      allUsers = await res.json();
      
      if (allUsers.length > 0) {
        // Set default current user to first user or previous selection
        if (!currentUser) {
          currentUser = allUsers[0];
        } else {
          const match = allUsers.find(u => u.id === currentUser.id);
          if (match) currentUser = match;
        }
        renderUserSwitcher();
        updateCurrentUserUI();
        renderSuggestedUsers();
        loadFeed();
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Failed to connect to backend server', 'error');
    }
  }

  // RENDER USER SWITCHER DROPDOWN
  function renderUserSwitcher() {
    userSwitcherSelect.innerHTML = '';
    allUsers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.display_name} (@${u.username})`;
      if (currentUser && u.id === currentUser.id) {
        opt.selected = true;
      }
      userSwitcherSelect.appendChild(opt);
    });
  }

  // UPDATE CURRENT USER HEADER & SIDEBAR INFO
  function updateCurrentUserUI() {
    if (!currentUser) return;
    sidebarUserAvatar.src = currentUser.avatar_url;
    sidebarUserName.textContent = currentUser.display_name;
    sidebarUserHandle.textContent = `@${currentUser.username}`;
    composerUserAvatar.src = currentUser.avatar_url;
    commentUserAvatar.src = currentUser.avatar_url;
  }

  // SWITCH USER HANDLER
  userSwitcherSelect.addEventListener('change', async (e) => {
    const selectedId = parseInt(e.target.value);
    const found = allUsers.find(u => u.id === selectedId);
    if (found) {
      currentUser = found;
      updateCurrentUserUI();
      renderSuggestedUsers();
      showToast(`Switched active user to ${currentUser.display_name}`);
      if (currentView === 'profile' && activeProfileUserId) {
        loadProfile(activeProfileUserId);
      } else {
        loadFeed();
      }
    }
  });

  // FEED & VIEW NAVIGATION
  function switchView(viewName) {
    currentView = viewName;
    if (viewName === 'feed') {
      feedView.classList.remove('hidden');
      profileView.classList.add('hidden');
    } else {
      feedView.classList.add('hidden');
      profileView.classList.remove('hidden');
    }
  }

  sidebarNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      sidebarNavLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentFeedTab = link.getAttribute('data-feed');

      feedTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-feed-tab') === currentFeedTab);
      });

      switchView('feed');
      loadFeed();
    });
  });

  feedTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      feedTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFeedTab = btn.getAttribute('data-feed-tab');

      sidebarNavLinks.forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-feed') === currentFeedTab);
      });

      switchView('feed');
      loadFeed();
    });
  });

  navMyProfileBtn.addEventListener('click', () => {
    if (currentUser) {
      loadProfile(currentUser.id);
    }
  });

  backToFeedBtn.addEventListener('click', () => {
    switchView('feed');
  });

  document.getElementById('brand-logo').addEventListener('click', () => {
    searchQuery = '';
    globalSearchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchBanner.classList.add('hidden');
    currentFeedTab = 'for_you';
    switchView('feed');
    loadFeed();
  });

  // SEARCH FUNCTIONALITY
  globalSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearSearchBtn.classList.toggle('hidden', val === '');
  });

  globalSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeSearch(globalSearchInput.value.trim());
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    globalSearchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    executeSearch('');
  });

  resetSearchBannerBtn.addEventListener('click', () => {
    globalSearchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    executeSearch('');
  });

  function executeSearch(query) {
    searchQuery = query;
    if (searchQuery) {
      searchQueryText.textContent = searchQuery;
      searchBanner.classList.remove('hidden');
    } else {
      searchBanner.classList.add('hidden');
    }
    switchView('feed');
    loadFeed();
  }

  // TRENDING TAGS CLICK
  trendingItems.forEach(item => {
    item.addEventListener('click', () => {
      const tag = item.getAttribute('data-tag');
      globalSearchInput.value = `#${tag}`;
      clearSearchBtn.classList.remove('hidden');
      executeSearch(`#${tag}`);
    });
  });

  // LOAD FEED POSTS FROM API
  async function loadFeed() {
    postsContainer.innerHTML = `
      <div class="loading-spinner-wrapper">
        <div class="spinner"></div>
        <p>Loading posts...</p>
      </div>
    `;

    try {
      let url = `/api/posts?feedType=${currentFeedTab}`;
      if (currentUser) url += `&currentUserId=${currentUser.id}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const posts = await res.json();
      renderPosts(posts, postsContainer);
    } catch (err) {
      console.error('Error loading feed posts:', err);
      postsContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load posts.</p></div>`;
    }
  }

  // RENDER POSTS UTILITY
  function renderPosts(posts, targetContainer) {
    if (!posts || posts.length === 0) {
      targetContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-ghost"></i>
          <p>No posts found ${currentFeedTab === 'following' ? 'from accounts you follow' : ''}.</p>
        </div>
      `;
      return;
    }

    targetContainer.innerHTML = '';
    posts.forEach(post => {
      const postCard = document.createElement('div');
      postCard.className = 'post-card';
      postCard.setAttribute('data-post-id', post.id);

      const formattedTime = formatTimestamp(post.created_at);
      const isOwner = currentUser && currentUser.id === post.user_id;

      postCard.innerHTML = `
        <div class="post-header">
          <div class="post-author-info" data-user-id="${post.user_id}">
            <img src="${post.avatar_url}" alt="${post.display_name}" class="user-avatar-img">
            <div class="post-author-names">
              <span class="post-author-name">${escapeHTML(post.display_name)}</span>
              <div class="post-meta">
                <span>@${escapeHTML(post.username)}</span> • <span>${formattedTime}</span>
              </div>
            </div>
          </div>
          <div class="post-header-actions">
            ${isOwner ? `<button class="btn btn-sm btn-danger delete-post-btn" data-post-id="${post.id}"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
        </div>

        <div class="post-content">${formatPostText(post.content)}</div>

        ${post.image_url ? `
          <div class="post-media">
            <img src="${post.image_url}" alt="Post Image" loading="lazy">
          </div>
        ` : ''}

        <div class="post-actions-bar">
          <button class="action-btn like-btn ${post.isLiked ? 'liked' : ''}" data-post-id="${post.id}">
            <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            <span class="like-count">${post.likes_count}</span>
          </button>

          <button class="action-btn comment-btn" data-post-id="${post.id}">
            <i class="fa-regular fa-comment"></i>
            <span class="comment-count">${post.comments_count}</span>
          </button>
        </div>
      `;

      // Author click to open profile
      postCard.querySelector('.post-author-info').addEventListener('click', () => {
        loadProfile(post.user_id);
      });

      // Delete post listener
      const deleteBtn = postCard.querySelector('.delete-post-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deletePost(post.id);
        });
      }

      // Like button listener
      const likeBtn = postCard.querySelector('.like-btn');
      likeBtn.addEventListener('click', () => {
        toggleLike(post.id, likeBtn);
      });

      // Comment button listener
      const commentBtn = postCard.querySelector('.comment-btn');
      commentBtn.addEventListener('click', () => {
        openCommentsModal(post);
      });

      targetContainer.appendChild(postCard);
    });
  }

  // POST CREATION LOGIC
  composerUrlBtn.addEventListener('click', () => {
    imageUrlInputBar.classList.toggle('hidden');
  });

  confirmUrlBtn.addEventListener('click', () => {
    const url = composerUrlInput.value.trim();
    if (url) {
      attachedImageUrl = url;
      previewImgElement.src = attachedImageUrl;
      composerMediaPreview.classList.remove('hidden');
      imageUrlInputBar.classList.add('hidden');
    }
  });

  composerFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      showToast('Uploading image...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.imageUrl) {
        attachedImageUrl = data.imageUrl;
        previewImgElement.src = attachedImageUrl;
        composerMediaPreview.classList.remove('hidden');
        showToast('Image attached!');
      }
    } catch (err) {
      console.error('File upload error:', err);
      showToast('Image upload failed', 'error');
    }
  });

  removePreviewBtn.addEventListener('click', () => {
    attachedImageUrl = null;
    composerMediaPreview.classList.add('hidden');
    previewImgElement.src = '';
    composerFileInput.value = '';
    composerUrlInput.value = '';
  });

  navCreatePostBtn.addEventListener('click', () => {
    switchView('feed');
    composerText.focus();
    composerText.scrollIntoView({ behavior: 'smooth' });
  });

  publishPostBtn.addEventListener('click', async () => {
    const content = composerText.value.trim();
    if (!content) {
      showToast('Please enter post text content', 'error');
      return;
    }
    if (!currentUser) {
      showToast('No active user selected', 'error');
      return;
    }

    try {
      publishPostBtn.disabled = true;
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          content,
          image_url: attachedImageUrl
        })
      });

      if (res.ok) {
        composerText.value = '';
        attachedImageUrl = null;
        composerMediaPreview.classList.add('hidden');
        previewImgElement.src = '';
        imageUrlInputBar.classList.add('hidden');
        showToast('Post published successfully! 🎉');
        loadFeed();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to publish post', 'error');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      showToast('Failed to connect to backend', 'error');
    } finally {
      publishPostBtn.disabled = false;
    }
  });

  // DELETE POST
  async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id })
      });
      if (res.ok) {
        showToast('Post deleted');
        if (currentView === 'profile') {
          loadProfile(activeProfileUserId);
        } else {
          loadFeed();
        }
      }
    } catch (err) {
      console.error('Delete post error:', err);
      showToast('Failed to delete post', 'error');
    }
  }

  // TOGGLE LIKE
  async function toggleLike(postId, btnElement) {
    if (!currentUser) {
      showToast('Please select an active user', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id })
      });
      const data = await res.json();

      const heartIcon = btnElement.querySelector('i');
      const countSpan = btnElement.querySelector('.like-count');

      countSpan.textContent = data.likes_count;
      if (data.isLiked) {
        btnElement.classList.add('liked');
        heartIcon.className = 'fa-solid fa-heart';
      } else {
        btnElement.classList.remove('liked');
        heartIcon.className = 'fa-regular fa-heart';
      }
    } catch (err) {
      console.error('Toggle like error:', err);
    }
  }

  // TOGGLE FOLLOW
  async function toggleFollow(targetUserId, buttonElement) {
    if (!currentUser) {
      showToast('Please select an active user', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id })
      });
      const data = await res.json();

      if (data.following) {
        buttonElement.className = 'btn btn-sm btn-secondary';
        buttonElement.innerHTML = '<i class="fa-solid fa-user-check"></i> Following';
        showToast('Followed user');
      } else {
        buttonElement.className = 'btn btn-sm btn-primary';
        buttonElement.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
        showToast('Unfollowed user');
      }

      // Refresh sidebar and profile stats if in profile view
      renderSuggestedUsers();
      if (currentView === 'profile' && activeProfileUserId == targetUserId) {
        loadProfile(targetUserId);
      }
    } catch (err) {
      console.error('Toggle follow error:', err);
      showToast('Failed to toggle follow', 'error');
    }
  }

  // COMMENTS MODAL LOGIC
  async function openCommentsModal(post) {
    activeCommentPostId = post.id;
    commentsPostSummary.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <img src="${post.avatar_url}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">
        <strong>${escapeHTML(post.display_name)}</strong>
        <span style="color:var(--text-muted); font-size:0.78rem;">@${escapeHTML(post.username)}</span>
      </div>
      <div>${formatPostText(post.content)}</div>
    `;

    newCommentInput.value = '';
    commentsModal.classList.remove('hidden');
    loadComments(post.id);
  }

  async function loadComments(postId) {
    commentsListContainer.innerHTML = `<div class="loading-spinner-wrapper"><div class="spinner"></div></div>`;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const comments = await res.json();

      if (!comments || comments.length === 0) {
        commentsListContainer.innerHTML = `<div class="empty-state"><p>No comments yet. Be the first to comment!</p></div>`;
        return;
      }

      commentsListContainer.innerHTML = '';
      comments.forEach(c => {
        const isOwner = currentUser && currentUser.id === c.user_id;
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `
          <img src="${c.avatar_url}" alt="${c.display_name}" class="user-avatar-img avatar-sm">
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author">${escapeHTML(c.display_name)} <span style="font-weight:400; color:var(--text-muted);">@${escapeHTML(c.username)}</span></span>
              <div style="display:flex; gap:8px; align-items:center;">
                <span class="comment-date">${formatTimestamp(c.created_at)}</span>
                ${isOwner ? `<button class="comment-delete-btn" data-comment-id="${c.id}"><i class="fa-solid fa-trash"></i></button>` : ''}
              </div>
            </div>
            <p class="comment-text">${escapeHTML(c.content)}</p>
          </div>
        `;

        const delBtn = item.querySelector('.comment-delete-btn');
        if (delBtn) {
          delBtn.addEventListener('click', () => deleteComment(c.id, postId));
        }

        commentsListContainer.appendChild(item);
      });
    } catch (err) {
      console.error('Load comments error:', err);
    }
  }

  submitCommentBtn.addEventListener('click', async () => {
    const text = newCommentInput.value.trim();
    if (!text || !activeCommentPostId || !currentUser) return;

    try {
      const res = await fetch(`/api/posts/${activeCommentPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.id,
          content: text
        })
      });

      if (res.ok) {
        newCommentInput.value = '';
        loadComments(activeCommentPostId);
        loadFeed(); // Refresh comment counter in feed
        showToast('Comment added');
      }
    } catch (err) {
      console.error('Submit comment error:', err);
    }
  });

  newCommentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitCommentBtn.click();
  });

  closeCommentsModal.addEventListener('click', () => {
    commentsModal.classList.add('hidden');
  });

  async function deleteComment(commentId, postId) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id })
      });
      if (res.ok) {
        loadComments(postId);
        loadFeed();
        showToast('Comment deleted');
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  }

  // PROFILE VIEW LOGIC
  async function loadProfile(userId) {
    activeProfileUserId = userId;
    switchView('profile');

    profilePostsContainer.innerHTML = `<div class="loading-spinner-wrapper"><div class="spinner"></div></div>`;

    try {
      let url = `/api/users/${userId}`;
      if (currentUser) url += `?currentUserId=${currentUser.id}`;

      const res = await fetch(url);
      const user = await res.json();

      profileCoverImg.src = user.cover_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';
      profileAvatarImg.src = user.avatar_url;
      profileDisplayName.textContent = user.display_name;
      profileUsername.textContent = `@${user.username}`;
      profileBioText.textContent = user.bio || 'No bio provided.';
      profileJoinedDate.textContent = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently';

      statPostsCount.textContent = user.stats.posts;
      statFollowersCount.textContent = user.stats.followers;
      statFollowingCount.textContent = user.stats.following;

      // Render profile action buttons
      profileButtonsContainer.innerHTML = '';
      if (currentUser && currentUser.id === user.id) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-glass btn-sm';
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Profile';
        editBtn.addEventListener('click', () => openEditProfileModal(user));
        profileButtonsContainer.appendChild(editBtn);
      } else {
        const followBtn = document.createElement('button');
        if (user.isFollowing) {
          followBtn.className = 'btn btn-sm btn-secondary';
          followBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Following';
        } else {
          followBtn.className = 'btn btn-sm btn-primary';
          followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
        }
        followBtn.addEventListener('click', () => toggleFollow(user.id, followBtn));
        profileButtonsContainer.appendChild(followBtn);
      }

      // Fetch profile posts
      const postsRes = await fetch(`/api/posts?feedType=user&targetUserId=${userId}&currentUserId=${currentUser ? currentUser.id : ''}`);
      const posts = await postsRes.json();
      renderPosts(posts, profilePostsContainer);

    } catch (err) {
      console.error('Load profile error:', err);
    }
  }

  // EDIT PROFILE MODAL LOGIC
  function openEditProfileModal(user) {
    document.getElementById('edit-display-name').value = user.display_name;
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-avatar-url').value = user.avatar_url || '';
    document.getElementById('edit-cover-url').value = user.cover_url || '';
    editProfileModal.classList.remove('hidden');
  }

  closeEditProfileModal.addEventListener('click', () => editProfileModal.classList.add('hidden'));
  cancelEditProfileBtn.addEventListener('click', () => editProfileModal.classList.add('hidden'));

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const display_name = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const avatar_url = document.getElementById('edit-avatar-url').value.trim();
    const cover_url = document.getElementById('edit-cover-url').value.trim();

    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name, bio, avatar_url, cover_url })
      });

      if (res.ok) {
        editProfileModal.classList.add('hidden');
        showToast('Profile updated!');
        await fetchUsers(); // Refresh users dropdown & sidebar UI
        loadProfile(currentUser.id);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      showToast('Failed to update profile', 'error');
    }
  });

  // CREATE USER MODAL LOGIC
  navCreateUserBtn.addEventListener('click', () => createUserModal.classList.remove('hidden'));
  closeCreateUserModal.addEventListener('click', () => createUserModal.classList.add('hidden'));
  cancelCreateUserBtn.addEventListener('click', () => createUserModal.classList.add('hidden'));

  createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-username').value.trim();
    const display_name = document.getElementById('new-display-name').value.trim();
    const bio = document.getElementById('new-bio').value.trim();

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, display_name, bio })
      });

      if (res.ok) {
        const newUser = await res.json();
        createUserModal.classList.add('hidden');
        createUserForm.reset();
        showToast(`Account @${newUser.username} created!`);
        await fetchUsers();
        // Switch to newly created user
        currentUser = newUser;
        renderUserSwitcher();
        updateCurrentUserUI();
        loadFeed();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to create user', 'error');
      }
    } catch (err) {
      console.error('Create user error:', err);
      showToast('Error creating user account', 'error');
    }
  });

  // FOLLOWERS / FOLLOWING LIST MODAL
  statFollowersBtn.addEventListener('click', () => {
    if (activeProfileUserId) openUsersListModal(activeProfileUserId, 'followers');
  });

  statFollowingBtn.addEventListener('click', () => {
    if (activeProfileUserId) openUsersListModal(activeProfileUserId, 'following');
  });

  closeUsersListModal.addEventListener('click', () => usersListModal.classList.add('hidden'));

  async function openUsersListModal(userId, type) {
    usersListModalTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
    modalUsersContainer.innerHTML = `<div class="loading-spinner-wrapper"><div class="spinner"></div></div>`;
    usersListModal.classList.remove('hidden');

    try {
      const res = await fetch(`/api/users/${userId}/${type}`);
      const users = await res.json();

      if (!users || users.length === 0) {
        modalUsersContainer.innerHTML = `<div class="empty-state"><p>No ${type} found.</p></div>`;
        return;
      }

      modalUsersContainer.innerHTML = '';
      users.forEach(u => {
        const item = document.createElement('div');
        item.className = 'suggested-user-item';
        item.style.padding = '8px 0';

        item.innerHTML = `
          <div class="suggested-user-info">
            <img src="${u.avatar_url}" class="user-avatar-img avatar-sm">
            <div class="suggested-user-names">
              <span class="suggested-name">${escapeHTML(u.display_name)}</span>
              <span class="suggested-handle">@${escapeHTML(u.username)}</span>
            </div>
          </div>
        `;

        item.querySelector('.suggested-user-info').addEventListener('click', () => {
          usersListModal.classList.add('hidden');
          loadProfile(u.id);
        });

        modalUsersContainer.appendChild(item);
      });
    } catch (err) {
      console.error('Load users list error:', err);
    }
  }

  // RIGHT SIDEBAR SUGGESTED USERS
  function renderSuggestedUsers() {
    suggestedUsersList.innerHTML = '';
    const suggestions = allUsers.filter(u => !currentUser || u.id !== currentUser.id).slice(0, 4);

    suggestions.forEach(user => {
      const item = document.createElement('div');
      item.className = 'suggested-user-item';
      item.innerHTML = `
        <div class="suggested-user-info">
          <img src="${user.avatar_url}" alt="${user.display_name}" class="user-avatar-img avatar-sm">
          <div class="suggested-user-names">
            <span class="suggested-name">${escapeHTML(user.display_name)}</span>
            <span class="suggested-handle">@${escapeHTML(user.username)}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-glass follow-btn-sm" data-user-id="${user.id}">
          <i class="fa-solid fa-user-plus"></i>
        </button>
      `;

      item.querySelector('.suggested-user-info').addEventListener('click', () => {
        loadProfile(user.id);
      });

      const followBtn = item.querySelector('.follow-btn-sm');
      followBtn.addEventListener('click', () => {
        toggleFollow(user.id, followBtn);
      });

      suggestedUsersList.appendChild(item);
    });
  }

  // UTILITY HELPER FUNCTIONS
  function formatTimestamp(timestampStr) {
    if (!timestampStr) return 'Just now';
    const date = new Date(timestampStr);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function formatPostText(text) {
    const safeText = escapeHTML(text);
    // Highlight hashtags
    return safeText.replace(/#(\w+)/g, '<span style="color:var(--accent-cyan); font-weight:600; cursor:pointer;">#$1</span>');
  }

  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.borderColor = 'var(--accent-rose)';
      toast.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:var(--accent-rose)"></i> ${message}`;
    } else {
      toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--accent-success)"></i> ${message}`;
    }

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // START APP
  initApp();
});
