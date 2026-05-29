document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        posts: [
            {
                id: 1,
                author: 'Elena Rostova',
                prisme: 'Tech',
                content: 'L\'IA ne remplacera pas les ingénieurs, mais les ingénieurs qui utilisent l\'IA remplaceront ceux qui ne le font pas. C\'est un changement de paradigme fondamental dans notre façon de concevoir des systèmes complexes.',
                tags: ['IA', 'Ingénierie', 'Futur'],
                likes: 42,
                comments: 12,
                isLiked: false
            },
            {
                id: 2,
                author: 'Marc Dubois',
                prisme: 'Art',
                content: 'La beauté du minimalisme réside dans ce qui est omis, pas dans ce qui est ajouté. Le vide parle souvent plus fort que le plein.',
                tags: ['Design', 'Minimalisme', 'Art'],
                likes: 128,
                comments: 34,
                isLiked: true
            }
        ],
        trending: [
            { topic: '#DesignEngineering', count: '1.2k Angles' },
            { topic: '#Web3', count: '854 Angles' },
            { topic: '#Minimalisme', count: '432 Angles' }
        ],
        suggestions: [
            { name: 'Sarah Connor', handle: '@s_connor' },
            { name: 'David Chen', handle: '@dchen_dev' }
        ]
    };

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const trendingList = document.getElementById('trending-list');
    const suggestionsList = document.getElementById('suggestions-list');
    const createBtn = document.getElementById('btn-create-prisme');
    const modal = document.getElementById('create-modal');
    const closeModal = document.getElementById('close-modal');
    const cancelPost = document.getElementById('cancel-post');
    const submitPost = document.getElementById('submit-post');
    const postContent = document.getElementById('post-content');
    const postTags = document.getElementById('post-tags');
    const prismeSelect = document.getElementById('prisme-select');
    const mediaUploadArea = document.getElementById('media-upload-area');
    const fileUpload = document.getElementById('file-upload');

    // Render Functions
    function renderPosts() {
        feedContainer.innerHTML = state.posts.map(post => `
            <article class="post" data-id="${post.id}">
                <header class="post-header">
                    <div class="avatar" style="background-image: url('https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}')"></div>
                    <div class="post-meta">
                        <h3>${post.author} <span class="prisme-tag">dans #${post.prisme}</span></h3>
                        <p>Il y a 2 heures</p>
                    </div>
                </header>
                <p class="post-content">${post.content}</p>
                <div class="post-tags">
                    ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
                <footer class="post-actions">
                    <button class="action-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${post.isLiked ? '#ff4757' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        ${post.likes}
                    </button>
                    <button class="action-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        ${post.comments}
                    </button>
                </footer>
            </article>
        `).join('');
    }

    function renderSidebar() {
        trendingList.innerHTML = state.trending.map(t => `
            <li class="trending-item">
                <p class="topic">${t.topic}</p>
                <p class="count">${t.count}</p>
            </li>
        `).join('');

        suggestionsList.innerHTML = state.suggestions.map(s => `
            <li class="suggestion-item">
                <div class="suggestion-info">
                    <div class="avatar" style="background-image: url('https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}')"></div>
                    <div>
                        <p>${s.name}</p>
                        <p style="font-size: 12px; color: var(--text-secondary)">${s.handle}</p>
                    </div>
                </div>
                <button class="btn-follow">Suivre</button>
            </li>
        `).join('');
    }

    // Interactions
    window.toggleLike = (id) => {
        const post = state.posts.find(p => p.id === id);
        if (post) {
            post.isLiked = !post.isLiked;
            post.likes += post.isLiked ? 1 : -1;
            renderPosts();
        }
    };

    // Modal logic
    function openModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Reset inputs
        postContent.value = '';
        postTags.value = '';
        prismeSelect.value = '';
    }

    createBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', hideModal);
    cancelPost.addEventListener('click', hideModal);
    
    // File upload trigger
    mediaUploadArea.addEventListener('click', () => fileUpload.click());

    // Publish post
    submitPost.addEventListener('click', () => {
        const content = postContent.value.trim();
        const prisme = prismeSelect.options[prismeSelect.selectedIndex].text.replace('#', '') || 'Général';
        const tags = postTags.value.split(',').map(t => t.trim()).filter(t => t);

        if (!content) return;

        const newPost = {
            id: Date.now(),
            author: 'Vous',
            prisme: prisme,
            content: content,
            tags: tags,
            likes: 0,
            comments: 0,
            isLiked: false
        };

        state.posts.unshift(newPost);
        renderPosts();
        hideModal();
    });

    // Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Initial render
    renderPosts();
    renderSidebar();
});
