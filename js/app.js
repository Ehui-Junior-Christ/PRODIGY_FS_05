const STATIC_DEV_PORTS = new Set(['5500', '5501', '5173']);
const BACKEND_ORIGIN = window.location.protocol.startsWith('http') && !STATIC_DEV_PORTS.has(window.location.port)
    ? window.location.origin
    : 'http://localhost:3000';
const API_URL = `${BACKEND_ORIGIN}/api`;

// ── Theme Toggle (persistent) ─────────────────────────────
const savedTheme = localStorage.getItem('prisme_theme') || 'dark';
if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

function applyTheme(isDark) {
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('prisme_theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('prisme_theme', 'light');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        posts: [],
        trending: [],
        suggestions: [],
        user: JSON.parse(localStorage.getItem('prisme_user')) || null,
        token: localStorage.getItem('prisme_token') || null,
        openComments: new Set()
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function avatarUrl(user) {
        return user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.handle || user?.author_handle || 'user')}`;
    }

    function saveSession(data) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('prisme_token', state.token);
        localStorage.setItem('prisme_user', JSON.stringify(state.user));
        updateAuthUI();
        fetchPosts();
        if (currentView === 'profile') fetchAndRenderProfile();
    }

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const trendingList = document.getElementById('trending-list');
    const suggestionsList = document.getElementById('suggestions-list');
    
    // Auth Modal
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authModeText = document.getElementById('auth-mode-text');
    const authToggle = document.getElementById('auth-toggle');
    const btnLogout = document.getElementById('btn-logout');
    // Mobile topbar buttons
    const btnThemeToggle   = document.getElementById('btn-theme-toggle');
    const btnThemeMobile   = document.getElementById('btn-theme-toggle-mobile');
    const btnLogoutMobile  = document.getElementById('btn-logout-mobile');
    let isDark = localStorage.getItem('prisme_theme') !== 'light';
    let isLoginMode = true;

    // ── Theme handler (shared) ──────────────────────────────
    function handleThemeToggle() {
        isDark = !isDark;
        applyTheme(isDark);
        updateThemeButtons();
    }

    function updateThemeButtons() {
        const iconClass = isDark ? 'ph ph-sun' : 'ph ph-moon';
        [btnThemeToggle, btnThemeMobile].forEach((button) => {
            const icon = button?.querySelector('i');
            if (icon) icon.className = iconClass;
            if (button) button.setAttribute('aria-label', isDark ? 'Passer au thème clair' : 'Passer au thème sombre');
        });
    }
    if (btnThemeToggle)  btnThemeToggle.addEventListener('click', handleThemeToggle);
    if (btnThemeMobile)  btnThemeMobile.addEventListener('click', handleThemeToggle);
    updateThemeButtons();

    // Create Modal
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

    // Password visibility toggle
    const togglePasswordBtn = document.getElementById('toggle-password');
    const authPasswordInput = document.getElementById('auth-password');
    if (togglePasswordBtn && authPasswordInput) {
        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isPassword = authPasswordInput.type === 'password';
            authPasswordInput.type = isPassword ? 'text' : 'password';
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
            }
        });
    }

    // UI Updates
    function updateAuthUI() {
        if (state.user) {
            if(authModal) authModal.classList.remove('active');
            if(btnLogout) btnLogout.style.display = 'flex';
            if(btnLogoutMobile) btnLogoutMobile.style.display = 'flex';
        } else {
            if(authModal) authModal.classList.add('active');
            if(btnLogout) btnLogout.style.display = 'none';
            if(btnLogoutMobile) btnLogoutMobile.style.display = 'none';
        }
    }

    function doLogout() {
        state.user = null;
        state.token = null;
        localStorage.removeItem('prisme_user');
        localStorage.removeItem('prisme_token');
        updateAuthUI();
        window.location.href = 'index.html';
    }
    if(btnLogout)       btnLogout.addEventListener('click', doLogout);
    if(btnLogoutMobile) btnLogoutMobile.addEventListener('click', doLogout);

    // Fetch Data
    async function fetchPosts() {
        try {
            const headers = state.token ? { 'Authorization': `Bearer ${state.token}` } : {};
            const res = await fetch(`${API_URL}/angles`, { headers });
            if (res.ok) {
                state.posts = await res.json();
                renderPosts();
            }
        } catch (e) {
            console.error("Failed to fetch posts", e);
        }
    }

    async function fetchSidebar() {
        try {
            const [trendRes, suggRes] = await Promise.all([
                fetch(`${API_URL}/trending`),
                fetch(`${API_URL}/suggestions`)
            ]);
            if (trendRes.ok) state.trending = await trendRes.json();
            if (suggRes.ok) state.suggestions = await suggRes.json();
            renderSidebar();
        } catch (e) {
            console.error("Failed to fetch sidebar data", e);
        }
    }

    // Render Functions
    function renderPosts() {
        if (state.posts.length === 0) {
            feedContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary)">Aucun Angle pour le moment. Soyez le premier !</p>';
            return;
        }

        feedContainer.innerHTML = state.posts.map(post => `
            <article class="post" data-id="${post.id}">
                <header class="post-header" style="cursor:pointer;" onclick="navigateTo('profile', 'user=${post.author_handle}')">
                    <div class="avatar" style="background-image: url('${avatarUrl(post)}')"></div>
                    <div class="post-meta" style="flex:1;">
                        <h3>${escapeHtml(post.author)} <span style="font-weight:normal; font-size:13px; color:var(--text-secondary);">@${escapeHtml(post.author_handle)}</span> <span class="prisme-tag">dans #${escapeHtml(post.prisme || 'General')}</span></h3>
                        <p>${post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</p>
                    </div>
                    <div class="post-options-container" onclick="event.stopPropagation();">
                        <button class="options-btn" onclick="togglePostOptions(${post.id})">
                            <i class="ph ph-dots-three-outline-vertical" style="font-size:20px;"></i>
                        </button>
                        <div id="options-menu-${post.id}" class="options-menu">
                            ${state.user && state.user.handle === post.author_handle ? 
                            `<button onclick="editPost(${post.id})"><i class="ph ph-pencil-simple" style="font-size:18px;"></i> Modifier</button>
                             <button onclick="deletePost(${post.id})" style="color: #ff4757;"><i class="ph ph-trash" style="font-size:18px;"></i> Supprimer</button>` 
                            : ''}
                            <button onclick="repostAngle(${post.id})"><i class="ph ph-arrows-left-right" style="font-size:18px;"></i> Republier</button>
                            <button onclick="shareAngle(${post.id})"><i class="ph ph-share-network" style="font-size:18px;"></i> Partager</button>
                        </div>
                    </div>
                </header>
                <p class="post-content">${escapeHtml(post.content)}</p>
                ${post.media_url ? `<div style="margin-top:12px; border-radius:12px; overflow:hidden; border:1px solid var(--border-color);"><img src="${post.media_url}" style="width:100%; display:block;" alt="Media attaché"></div>` : ''}
                <div class="post-tags">
                    ${(post.tags || []).map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
                <footer class="post-actions">
                    <button class="action-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                        <i class="${post.isLiked ? 'ph-fill' : 'ph'} ph-heart" style="font-size: 20px; ${post.isLiked ? 'color: #ff4757;' : ''}"></i>
                        <span id="like-count-${post.id}">${post.likes}</span>
                    </button>
                    <button class="action-btn" onclick="toggleComments(${post.id})">
                        <i class="ph ph-chat-circle" style="font-size: 20px;"></i>
                        <span id="comment-count-${post.id}">${post.comments || 0}</span>
                    </button>
                </footer>
                <section class="comments-panel" id="comments-panel-${post.id}" style="display:${state.openComments.has(post.id) ? 'block' : 'none'}; margin-top:14px; border-top:1px solid var(--border-color); padding-top:14px;">
                    <div id="comments-list-${post.id}" style="display:flex; flex-direction:column; gap:10px;"></div>
                    <form onsubmit="submitComment(event, ${post.id})" style="display:flex; gap:10px; margin-top:12px;">
                        <input class="input-field" id="comment-input-${post.id}" placeholder="Ajouter un commentaire..." style="flex:1; margin:0;">
                        <button class="btn-primary" type="submit" style="padding:10px 14px;"><i class="ph-fill ph-paper-plane-right"></i></button>
                    </form>
                </section>
            </article>
        `).join('');

        state.openComments.forEach(id => loadComments(id));
    }

    function renderSidebar() {
        if (trendingList) trendingList.innerHTML = state.trending.map(t => `
            <li class="trending-item">
                <p class="topic">${escapeHtml(t.topic)}</p>
                <p class="count">${escapeHtml(t.count)}</p>
            </li>
        `).join('');

        if (suggestionsList) suggestionsList.innerHTML = state.suggestions.map(s => `
            <li class="suggestion-item">
                <div class="suggestion-info">
                    <div class="avatar" style="background-image: url('https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name || s.handle || 'user')}')"></div>
                    <div>
                        <p>${escapeHtml(s.name)}</p>
                        <p style="font-size: 12px; color: var(--text-secondary)">${escapeHtml(s.handle)}</p>
                    </div>
                </div>
                <button class="btn-follow">Suivre</button>
            </li>
        `).join('');
    }

    // Interactions
    window.toggleLike = async (id) => {
        if (!state.token) return alert("Veuillez vous connecter pour liker");
        
        try {
            const res = await fetch(`${API_URL}/angles/${id}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const post = state.posts.find(p => p.id === id);
                if (post) {
                    post.isLiked = data.liked;
                    post.likes += data.liked ? 1 : -1;
                    renderPosts();
                }
            }
        } catch (e) {
            console.error("Failed to like", e);
        }
    };

    async function loadComments(id) {
        const list = document.getElementById(`comments-list-${id}`);
        if (!list) return;

        list.innerHTML = '<p style="color:var(--text-secondary); font-size:13px;">Chargement des commentaires...</p>';
        try {
            const res = await fetch(`${API_URL}/angles/${id}/comments`);
            const comments = await res.json();
            if (!Array.isArray(comments) || comments.length === 0) {
                list.innerHTML = '<p style="color:var(--text-secondary); font-size:13px;">Aucun commentaire pour le moment.</p>';
                return;
            }

            list.innerHTML = comments.map(comment => `
                <div style="display:flex; gap:10px; align-items:flex-start;">
                    <div class="avatar" style="width:32px;height:32px;background-image:url('${avatarUrl(comment)}');flex-shrink:0;"></div>
                    <div style="background:var(--hover-bg); border:1px solid var(--border-color); border-radius:12px; padding:10px 12px; flex:1;">
                        <p style="font-size:13px; font-weight:600; margin:0 0 4px;">${escapeHtml(comment.author)} <span style="font-weight:400; color:var(--text-secondary);">@${escapeHtml(comment.author_handle)}</span></p>
                        <p style="font-size:14px; margin:0;">${escapeHtml(comment.content)}</p>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="color:#ff4757; font-size:13px;">Impossible de charger les commentaires.</p>';
        }
    }

    window.toggleComments = async (id) => {
        const panel = document.getElementById(`comments-panel-${id}`);
        if (!panel) return;

        if (state.openComments.has(id)) {
            state.openComments.delete(id);
            panel.style.display = 'none';
        } else {
            state.openComments.add(id);
            panel.style.display = 'block';
            await loadComments(id);
        }
    };

    window.submitComment = async (event, id) => {
        event.preventDefault();
        if (!state.token) return alert("Veuillez vous connecter pour commenter");

        const input = document.getElementById(`comment-input-${id}`);
        const content = input?.value.trim();
        if (!content) return;

        try {
            const res = await fetch(`${API_URL}/angles/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                input.value = '';
                const post = state.posts.find(p => p.id === id);
                if (post) post.comments = (Number(post.comments) || 0) + 1;
                const count = document.getElementById(`comment-count-${id}`);
                if (count) count.textContent = post?.comments || Number(count.textContent || 0) + 1;
                await loadComments(id);
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Erreur lors du commentaire");
            }
        } catch (e) {
            alert("Erreur reseau lors du commentaire");
        }
    };

    window.deletePost = async (id) => {
        if (!confirm("Voulez-vous vraiment supprimer cet Angle ?")) return;
        try {
            const res = await fetch(`${API_URL}/angles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (res.ok) {
                state.posts = state.posts.filter(p => p.id !== id);
                renderPosts();
                if (state.currentView === 'profile') {
                    // Refresh profile to update angles count
                    const userParam = new URLSearchParams(window.location.search).get('user') || state.user.handle;
                    fetchAndRenderProfile(userParam);
                }
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (e) {
            console.error("Failed to delete post", e);
        }
    };

    window.togglePostOptions = (id) => {
        // Close all other menus first
        document.querySelectorAll('.options-menu.active').forEach(menu => {
            if (menu.id !== `options-menu-${id}`) {
                menu.classList.remove('active');
            }
        });
        const menu = document.getElementById(`options-menu-${id}`);
        if (menu) menu.classList.toggle('active');
    };

    window.editPost = (id) => {
        alert("La fonctionnalité 'Modifier' sera bientôt disponible !");
        window.togglePostOptions(id);
    };

    window.repostAngle = (id) => {
        alert("La fonctionnalité 'Republier' sera bientôt disponible !");
        window.togglePostOptions(id);
    };

    window.shareAngle = (id) => {
        alert("La fonctionnalité 'Partager' sera bientôt disponible !");
        window.togglePostOptions(id);
    };

    // Close options menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.post-options-container')) {
            document.querySelectorAll('.options-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    let currentPostMedia = null;

    function openModal() {
        if (!state.user) return alert("Veuillez vous connecter");
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        postContent.value = '';
        postTags.value = '';
        prismeSelect.value = '';
        currentPostMedia = null;
        fileUpload.value = '';
        mediaUploadArea.innerHTML = `
            <i class="ph ph-image" style="font-size: 32px;"></i>
            <span>Ajouter une image ou une vidéo</span>
        `;
        mediaUploadArea.style.backgroundImage = 'none';
        mediaUploadArea.style.border = '2px dashed var(--border-color)';
    }

    createBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', hideModal);
    cancelPost.addEventListener('click', hideModal);
    mediaUploadArea.addEventListener('click', () => fileUpload.click());

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("L'image est trop volumineuse (max 2 Mo).");
                fileUpload.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (evt) => {
                currentPostMedia = evt.target.result;
                mediaUploadArea.innerHTML = '';
                mediaUploadArea.style.backgroundImage = `url(${currentPostMedia})`;
                mediaUploadArea.style.backgroundSize = 'cover';
                mediaUploadArea.style.backgroundPosition = 'center';
                mediaUploadArea.style.border = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Publish post
    submitPost.addEventListener('click', async () => {
        const content = postContent.value.trim();
        const prisme = prismeSelect.options[prismeSelect.selectedIndex].value || prismeSelect.options[prismeSelect.selectedIndex].text.replace('#', '');
        const tags = postTags.value.split(',').map(t => t.trim()).filter(t => t);

        if (!content) return;

        submitPost.textContent = 'Publication...';
        submitPost.disabled = true;

        try {
            const res = await fetch(`${API_URL}/angles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({ content, prisme, tags, mediaUrl: currentPostMedia })
            });

            if (res.ok) {
                hideModal();
                await fetchPosts();
            } else {
                alert("Erreur lors de la publication");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur réseau");
        } finally {
            submitPost.textContent = 'Publier l\'Angle';
            submitPost.disabled = false;
        }
    });

    // Auth Logic
    function syncAuthMode() {
        const nameGroup = document.getElementById('auth-name-group');
        const handleGroup = document.getElementById('auth-handle-group');
        const termsGroup = document.getElementById('auth-terms-group');
        const forgotLink = document.getElementById('auth-forgot-pw');
        const verificationMsg = document.getElementById('auth-verification-msg');
        const submitButton = document.getElementById('btn-auth-submit');

        if (authModeText) authModeText.textContent = isLoginMode ? "Bon retour" : "Créer un compte";
        if (authToggle) authToggle.textContent = isLoginMode ? "Créer un nouveau compte" : "J'ai déjà un compte";
        if (submitButton) submitButton.textContent = isLoginMode ? "Se connecter" : "Créer le compte";
        if (nameGroup) nameGroup.style.display = isLoginMode ? 'none' : 'block';
        if (handleGroup) handleGroup.style.display = isLoginMode ? 'none' : 'block';
        if (termsGroup) termsGroup.style.display = isLoginMode ? 'none' : 'block';
        if (forgotLink) forgotLink.style.display = isLoginMode ? 'block' : 'none';
        if (verificationMsg) verificationMsg.style.display = 'none';
    }

    if (authToggle) {
        authToggle.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            syncAuthMode();
        });
    }
    syncAuthMode();

    // Auth Submission (Email & Password via custom API)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value.trim();
        const handle = document.getElementById('auth-handle').value.trim();
        const termsAccepted = document.getElementById('auth-terms').checked;

        if (!isLoginMode && !termsAccepted) {
            return alert("Vous devez accepter les conditions d'utilisation.");
        }

        const btnSubmit = document.getElementById('btn-auth-submit');
        const originalText = btnSubmit.textContent;
        btnSubmit.textContent = 'Patientez...';
        btnSubmit.disabled = true;

        try {
            if (isLoginMode) {
                // Login API
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    state.token = data.token;
                    state.user = data.user;
                    localStorage.setItem('prisme_token', state.token);
                    localStorage.setItem('prisme_user', JSON.stringify(state.user));
                    updateAuthUI();
                    fetchPosts();
                } else {
                    alert(data.error || "Erreur de connexion");
                }
            } else {
                // Register API
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, handle, email, password, termsAccepted })
                });
                const data = await res.json();

                if (res.ok) {
                    document.getElementById('auth-verification-msg').style.display = 'block';
                    alert("Compte créé ! Un e-mail de validation vous a été envoyé.");
                    authToggle.click(); // Switch back to login
                } else {
                    alert(data.error || "Erreur d'inscription");
                }
            }
        } catch (error) {
            console.error(error);
            alert("Erreur de communication avec le serveur.");
        } finally {
            btnSubmit.textContent = originalText;
            btnSubmit.disabled = false;
        }
    });

    async function completeSocialLogin(provider, firebaseUser) {
        const res = await fetch(`${API_URL}/auth/social`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                name: firebaseUser.displayName,
                email: firebaseUser.email,
                avatar_url: firebaseUser.photoURL
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Connexion sociale impossible");
        saveSession(data);
    }

    // Google Login
    const btnGoogleLogin = document.getElementById('btn-google-login');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            if(!window.firebaseAuth || !window.fbAuthMethods) return alert("Firebase non configuré.");
            try {
                const provider = new window.fbAuthMethods.GoogleAuthProvider();
                const result = await window.fbAuthMethods.signInWithPopup(window.firebaseAuth, provider);
                await completeSocialLogin('google', result.user);
                return;
                
                // Enregistrement auto dans Turso
                await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: user.displayName, 
                        handle: "google_" + user.uid.slice(0,6), 
                        email: user.email, 
                        password: 'firebase_managed', 
                        termsAccepted: true 
                    })
                }).catch(() => {}); // ignore si existe déjà
                
                authModal.style.display = 'none';
            } catch(e) {
                alert("Erreur Google: " + e.message);
            }
        });
    }

    const btnAppleLogin = document.getElementById('btn-apple-login');
    if (btnAppleLogin) {
        btnAppleLogin.addEventListener('click', async () => {
            if(!window.firebaseAuth || !window.fbAuthMethods) return alert("Firebase non configure.");
            try {
                const provider = new window.fbAuthMethods.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');
                const result = await window.fbAuthMethods.signInWithPopup(window.firebaseAuth, provider);
                await completeSocialLogin('apple', result.user);
            } catch(e) {
                alert("Erreur Apple: " + e.message);
            }
        });
    }

    // Phone SMS Logic
    setTimeout(() => {
        if(window.fbAuthMethods && window.firebaseAuth && document.getElementById('btn-send-sms')) {
            window.recaptchaVerifier = new window.fbAuthMethods.RecaptchaVerifier(window.firebaseAuth, 'recaptcha-container', {
                'size': 'invisible' // ou 'normal'
            });

            document.getElementById('btn-send-sms').addEventListener('click', async () => {
                const phoneNumber = document.getElementById('auth-phone').value;
                if (!phoneNumber) return alert("Entrez un numéro de téléphone valide avec l'indicatif (ex: +33600000000)");
                
                try {
                    const confirmationResult = await window.fbAuthMethods.signInWithPhoneNumber(window.firebaseAuth, phoneNumber, window.recaptchaVerifier);
                    window.confirmationResult = confirmationResult;
                    
                    document.getElementById('btn-send-sms').style.display = 'none';
                    document.getElementById('auth-sms-code').style.display = 'block';
                    alert("Un SMS contenant un code à 6 chiffres a été envoyé au " + phoneNumber);
                } catch(e) {
                    console.error(e);
                    alert("Erreur SMS: " + e.message);
                    window.recaptchaVerifier.render().then(function(widgetId) {
                      grecaptcha.reset(widgetId);
                    });
                }
            });
        }
    }, 1500);

    // =============================================
    // ROUTEUR SPA — Navigation entre les vues
    // =============================================
    const views = {
        home:          { el: document.getElementById('view-home'),          title: 'Accueil' },
        trending:      { el: document.getElementById('view-trending'),      title: 'Tendances' },
        notifications: { el: document.getElementById('view-notifications'), title: 'Notifications' },
        profile:       { el: document.getElementById('view-profile'),       title: 'Mon Profil' },
        messages:      { el: document.getElementById('view-messages'),      title: 'Messages' },
    };
    const topbarTitle = document.getElementById('topbar-title');
    let currentView = 'home';

    function navigateTo(viewName, params = '') {
        const qs = params ? `?${params}` : '';
        if (viewName === 'home') window.location.href = 'index.html' + qs;
        else window.location.href = `${viewName}.html${qs}`;
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            const target = li.dataset.view;
            if (target) navigateTo(target);
        });
    });

    // Detect current view based on filename
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const currentViewName = filename === 'index.html' ? 'home' : filename.replace('.html', '');
    currentView = currentViewName;

    function initCurrentView() {
        if (!views[currentViewName] || !views[currentViewName].el) return;

        // Hide all views first
        Object.values(views).forEach(v => {
            if(v.el) v.el.style.display = 'none';
        });

        // Show current view
        const displayMode = currentViewName === 'messages' ? 'flex' : 'block';
        views[currentViewName].el.style.display = displayMode;
        if(topbarTitle) topbarTitle.textContent = views[currentViewName].title;

        // Update active nav link
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.dataset.view === currentViewName);
        });

        // Trigger fetch functions based on view
        if (currentViewName === 'trending')      fetchAndRenderTrending();
        if (currentViewName === 'notifications') fetchAndRenderNotifications();
        if (currentViewName === 'profile')       fetchAndRenderProfile();
        if (currentViewName === 'messages')      initMessages();
    }

    // ── Tendances (depuis la BDD) ──────────────────────────────────────
    async function fetchAndRenderTrending() {
        const list = document.getElementById('trending-full-list');
        if (!list) return;
        list.innerHTML = '<p style="color:var(--text-secondary); padding:16px;">Chargement...</p>';
        try {
            const res = await fetch(`${API_URL}/trending`);
            const data = await res.json();
            state.trending = data;
            if (data.length === 0) {
                list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:24px;">Aucun sujet pour le moment.</p>';
                return;
            }
            list.innerHTML = data.map((t, i) => `
                <div class="post" style="display:flex; align-items:center; gap:16px; cursor:pointer;" onclick="navigateTo('home')">
                    <span style="font-size:20px; font-weight:700; color:var(--text-secondary); min-width:28px;">${i+1}</span>
                    <div>
                        <p style="font-weight:600; font-size:16px;">${escapeHtml(t.topic)}</p>
                        <p style="font-size:13px; color:var(--text-secondary);">${escapeHtml(t.count)}</p>
                    </div>
                    <i class="ph ph-trend-up" style="margin-left:auto; font-size:20px; color:var(--text-secondary);"></i>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:24px;">Erreur de chargement.</p>';
        }
    }

    // ── Notifications (depuis la BDD) ──────────────────────────────────
    async function fetchAndRenderNotifications() {
        const container = document.getElementById('view-notifications');
        if (!container || !state.token) {
            if (container) container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:48px;">Connectez-vous pour voir vos notifications.</p>';
            return;
        }
        container.innerHTML = '<p style="color:var(--text-secondary); padding:24px;">Chargement...</p>';
        try {
            const res = await fetch(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:48px;">Aucune notification pour le moment.</p>';
                return;
            }

            const timeAgo = (dateStr) => {
                const diff = Date.now() - new Date(dateStr).getTime();
                const min = Math.floor(diff / 60000);
                if (min < 1) return 'À l\'instant';
                if (min < 60) return `Il y a ${min} min`;
                const h = Math.floor(min / 60);
                if (h < 24) return `Il y a ${h}h`;
                return `Il y a ${Math.floor(h / 24)} jour(s)`;
            };

            container.innerHTML = `<div class="feed" style="padding:24px; display:flex; flex-direction:column; gap:12px;">
                ${data.map(n => {
                    const isLike = n.type === 'like';
                    const isComment = n.type === 'comment';
                    const icon = isLike ? 'ph-fill ph-heart' : (isComment ? 'ph-fill ph-chat-circle' : 'ph-fill ph-user-plus');
                    const iconColor = isLike ? '#ff4757' : 'var(--accent-color)';
                    const actorName = escapeHtml(n.actor_name);
                    const actorHandle = encodeURIComponent(n.actor_handle || '');
                    let text = isLike
                        ? `<strong>${n.actor_name}</strong> a aimé votre Angle sur <span class="prisme-tag">"${(n.angle_content || '').substring(0, 40)}..."</span>`
                        : `<strong>${n.actor_name}</strong> a commencé à vous suivre`;
                    if (isComment) {
                        text = `<strong>${escapeHtml(n.actor_name)}</strong> a commente votre Angle : <span class="prisme-tag">"${escapeHtml((n.comment_content || '').substring(0, 40))}..."</span>`;
                    }
                    return `
                        <div class="post" style="display:flex; align-items:center; gap:16px; cursor:pointer;" onclick="navigateTo('profile', 'user=${n.actor_handle}')">
                            <div class="avatar" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_handle}');flex-shrink:0;"></div>
                            <div style="flex:1;">${text}<p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${timeAgo(n.created_at)}</p></div>
                            <i class="${icon}" style="font-size:22px; color:${iconColor}; flex-shrink:0;"></i>
                        </div>
                    `;
                }).join('')}
            </div>`;
        } catch (e) {
            container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:48px;">Erreur de chargement.</p>';
        }
    }

    // ── Profil (depuis la BDD) ─────────────────────────────────────────
    async function fetchAndRenderProfile() {
        const profileView = document.getElementById('view-profile');
        const urlParams = new URLSearchParams(window.location.search);
        const targetHandle = urlParams.get('user');

        if (!targetHandle && (!state.user || !state.token)) {
            if(profileView) profileView.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:48px;">Connectez-vous pour voir votre profil.</p>';
            return;
        }

        const nameEl = document.getElementById('profile-name');
        const handleEl = document.getElementById('profile-handle');
        const avatarEl = document.getElementById('profile-avatar');
        const coverEl = document.getElementById('profile-cover');
        const btnEditProfile = document.getElementById('btn-edit-profile');
        const btnFollowProfile = document.getElementById('btn-follow-profile');

        try {
            let res;
            let headers = {};
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

            if (targetHandle) {
                res = await fetch(`${API_URL}/users/${targetHandle}`, { headers });
            } else {
                res = await fetch(`${API_URL}/users/me`, { headers });
            }

            if (res.ok) {
                const user = await res.json();
                if (nameEl) nameEl.textContent = user.name;
                if (handleEl) handleEl.textContent = '@' + user.handle;
                if (avatarEl) {
                    avatarEl.style.backgroundImage = user.avatar_url ? `url('${user.avatar_url}')` : `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.handle}')`;
                }
                if (coverEl) {
                    coverEl.style.backgroundImage = user.cover_url ? `url('${user.cover_url}')` : `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`;
                }

                document.getElementById('profile-angles').textContent = user.angles_count || 0;
                document.getElementById('profile-followers').textContent = user.followers_count || 0;
                document.getElementById('profile-following').textContent = user.following_count || 0;
                const bioDisplay = document.getElementById('profile-bio');
                if (bioDisplay) bioDisplay.textContent = user.bio || '';

                // Handle Buttons
                const isOwnProfile = state.user && state.user.handle === user.handle;
                if (btnEditProfile) btnEditProfile.style.display = isOwnProfile ? 'block' : 'none';
                if (btnFollowProfile) {
                    if (isOwnProfile || !state.token) {
                        btnFollowProfile.style.display = 'none';
                    } else {
                        btnFollowProfile.style.display = 'block';
                        btnFollowProfile.textContent = user.isFollowing ? 'Abonné' : 'Suivre';
                        btnFollowProfile.className = user.isFollowing ? 'btn-secondary' : 'btn-primary';
                        
                        // Prevent multiple listeners
                        const newBtn = btnFollowProfile.cloneNode(true);
                        btnFollowProfile.parentNode.replaceChild(newBtn, btnFollowProfile);
                        
                        newBtn.addEventListener('click', async () => {
                            const followRes = await fetch(`${API_URL}/users/${user.id}/follow`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${state.token}` }
                            });
                            if (followRes.ok) {
                                const followData = await followRes.json();
                                newBtn.textContent = followData.following ? 'Abonné' : 'Suivre';
                                newBtn.className = followData.following ? 'btn-secondary' : 'btn-primary';
                                
                                // Update count dynamically
                                const followersEl = document.getElementById('profile-followers');
                                let currentCount = parseInt(followersEl.textContent) || 0;
                                followersEl.textContent = followData.following ? currentCount + 1 : Math.max(0, currentCount - 1);
                            }
                        });
                    }
                }

                // Charger ses angles
                const anglesRes = await fetch(`${API_URL}/users/${user.handle}/angles`);
                const angles = await anglesRes.json();
                const profileFeed = document.getElementById('profile-feed');
                if (profileFeed) {
                    if (!Array.isArray(angles) || angles.length === 0) {
                        profileFeed.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:24px;">Aucun Angle publié pour le moment.</p>';
                    } else {
                        profileFeed.innerHTML = angles.map(post => `
                            <article class="post">
                                <p class="post-content">${escapeHtml(post.content)}</p>
                                ${post.media_url ? `<div style="margin-top:12px; border-radius:12px; overflow:hidden; border:1px solid var(--border-color);"><img src="${post.media_url}" style="width:100%; display:block;" alt="Media attache"></div>` : ''}
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px;">
                                    <span class="prisme-tag">${post.prisme ? '#' + escapeHtml(post.prisme) : ''}</span>
                                    <span style="font-size:13px; color:var(--text-secondary);">
                                        <i class="ph-fill ph-heart" style="color:#ff4757;"></i> ${post.likes} · ${new Date(post.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            </article>
                        `).join('');
                    }
                }
            }
        } catch (e) {
            console.error('Erreur chargement profil', e);
        }
    }

    // =============================================
    // ÉDITION DU PROFIL
    // =============================================
    const btnEditProfile = document.getElementById('btn-edit-profile');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeEditProfileModal = document.getElementById('close-edit-profile-modal');
    const cancelEditProfile = document.getElementById('cancel-edit-profile');
    const saveEditProfile = document.getElementById('save-edit-profile');
    
    let currentEditAvatar = null;
    let currentEditCover = null;

    const avatarUpload = document.getElementById('edit-avatar-upload');
    const coverUpload = document.getElementById('edit-cover-upload');
    const avatarPreview = document.getElementById('edit-avatar-preview');
    const coverPreview = document.getElementById('edit-cover-preview');

    // Make previews clickable to trigger upload
    if (avatarPreview && avatarUpload) {
        avatarPreview.addEventListener('click', () => avatarUpload.click());
    }
    if (coverPreview && coverUpload) {
        coverPreview.addEventListener('click', () => coverUpload.click());
    }
    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    if (btnChangeAvatar && avatarUpload) {
        btnChangeAvatar.addEventListener('click', () => avatarUpload.click());
    }

    if (avatarUpload) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    currentEditAvatar = ev.target.result;
                    if(avatarPreview) avatarPreview.style.backgroundImage = `url(${currentEditAvatar})`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (coverUpload) {
        coverUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    currentEditCover = ev.target.result;
                    if(coverPreview) coverPreview.style.backgroundImage = `url(${currentEditCover})`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            if (!state.user) return;
            document.getElementById('edit-profile-name').value = state.user.name || '';
            document.getElementById('edit-profile-handle').value = state.user.handle || '';
            const bioEl = document.getElementById('edit-profile-bio');
            if (bioEl) bioEl.value = state.user.bio || '';

            currentEditAvatar = state.user.avatar_url || null;
            currentEditCover = state.user.cover_url || null;
            
            if (avatarPreview) avatarPreview.style.backgroundImage = currentEditAvatar ? `url(${currentEditAvatar})` : `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${state.user.handle}')`;
            if (coverPreview) coverPreview.style.backgroundImage = currentEditCover ? `url(${currentEditCover})` : `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`;

            editProfileModal.classList.add('active');
        });
    }

    const closeEditModal = () => editProfileModal.classList.remove('active');
    if (closeEditProfileModal) closeEditProfileModal.addEventListener('click', closeEditModal);
    if (cancelEditProfile) cancelEditProfile.addEventListener('click', closeEditModal);

    if (saveEditProfile) {
        saveEditProfile.addEventListener('click', async () => {
            if (!state.token) return;
            const newName = document.getElementById('edit-profile-name').value.trim();
            const newHandle = document.getElementById('edit-profile-handle').value.trim();
            const bioEl = document.getElementById('edit-profile-bio');
            const newBio = bioEl ? bioEl.value.trim() : null;

            if (!newName || !newHandle) {
                alert("Le nom et le handle sont obligatoires.");
                return;
            }

            try {
                const res = await fetch(`${API_URL}/users/me`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}` 
                    },
                    body: JSON.stringify({ 
                        name: newName, 
                        handle: newHandle, 
                        avatar_url: currentEditAvatar, 
                        cover_url: currentEditCover,
                        bio: newBio
                    })
                });
                
                const data = await res.json();
                if (res.ok) {
                    state.user.name = data.user.name;
                    state.user.handle = data.user.handle;
                    state.user.avatar_url = data.user.avatar_url;
                    state.user.cover_url = data.user.cover_url;
                    state.user.bio = data.user.bio;
                    if (data.token) {
                        state.token = data.token;
                        localStorage.setItem('prisme_token', data.token);
                    }
                    localStorage.setItem('prisme_user', JSON.stringify(state.user));
                    closeEditModal();
                    fetchAndRenderProfile();
                } else {
                    alert(data.error || "Erreur lors de la mise à jour.");
                }
            } catch (e) {
                alert("Erreur de connexion au serveur.");
            }
        });
    }

    // Rendre navigateTo accessible globalement (pour les onclick inline)
    window.navigateTo = navigateTo;

    // Initial render
    updateAuthUI();
    initCurrentView();
    if (currentView === 'home') {
        fetchPosts();
    }
    fetchSidebar(); // Sidebar is visible on all pages (trending & suggestions)

    async function initMessages() {
        const container = document.getElementById('view-messages');
        if (!container) return;
        
        if (!state.token || !state.user) {
            container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:48px;">Connectez-vous pour voir vos messages.</p>';
            return;
        }

        // Initialize UI with sidebar and chat area
        container.innerHTML = `
            <div class="messages-inner" style="display:flex; height:calc(100dvh - 73px); width:100%;">
                <div class="messages-sidebar-col" style="width:280px; border-right:1px solid var(--border-color); display:flex; flex-direction:column; flex-shrink:0;">
                    <div style="padding:16px; border-bottom:1px solid var(--border-color);">
                        <h2 style="font-size:18px; margin-bottom:12px;">Messages</h2>
                        <div class="search-bar" style="width:100%;"><i class="ph ph-magnifying-glass"></i><input type="text" id="chat-search" placeholder="Chercher @handle…" style="width:100%;"></div>
                    </div>
                    <div id="conv-list" style="overflow-y:auto; flex:1;">
                        <p style="color:var(--text-secondary); padding:16px; text-align:center;">Chargement...</p>
                    </div>
                </div>
                <div id="chat-area" style="flex:1; display:flex; flex-direction:column; background:var(--bg-color); min-height:0;">
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); padding:24px; text-align:center;">
                        <div>
                            <i class="ph ph-chat-circle-dots" style="font-size:48px; opacity:0.3; display:block; margin-bottom:12px;"></i>
                            Sélectionnez ou cherchez une conversation
                        </div>
                    </div>
                </div>
            </div>
        `;

        const convList = document.getElementById('conv-list');
        const chatArea = document.getElementById('chat-area');
        const searchInput = document.getElementById('chat-search');

        let activeReceiverHandle = null;
        let socket = null;

        // Connect Socket.io
        if (typeof io !== 'undefined') {
            socket = io(BACKEND_ORIGIN);
            socket.on('connect', () => {
                socket.emit('register', state.user.id);
            });
            
            socket.on('new_message', (msg) => {
                // If we are talking to the sender/receiver, append message
                const isFromMe = msg.sender_id === state.user.id;
                const otherHandle = isFromMe ? activeReceiverHandle : msg.sender_handle;
                
                if (activeReceiverHandle === otherHandle) {
                    appendMessageToUI(msg, isFromMe);
                    scrollToBottom();
                }
                loadConversations(); // refresh sidebar
            });
        }

        async function loadConversations() {
            try {
                const res = await fetch(`${API_URL}/conversations`, {
                    headers: { 'Authorization': `Bearer ${state.token}` }
                });
                const data = await res.json();
                convList.innerHTML = '';
                if (data.length === 0) {
                    convList.innerHTML = '<p style="color:var(--text-secondary); padding:16px; text-align:center; font-size:14px;">Aucune conversation.</p>';
                } else {
                    data.forEach(u => {
                        const div = document.createElement('div');
                        div.className = `msg-conv ${u.handle === activeReceiverHandle ? 'active-conv' : ''}`;
                        div.style.cssText = `display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer;border-bottom:1px solid var(--border-color); ${u.handle === activeReceiverHandle ? 'background:var(--hover-bg);' : ''}`;
                        div.innerHTML = `
                            <div class="avatar" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${u.handle}');flex-shrink:0;"></div>
                            <div style="overflow:hidden;">
                                <p style="font-weight:600;">${u.name}</p>
                                <p style="font-size:13px;color:var(--text-secondary);">@${u.handle}</p>
                            </div>
                        `;
                        div.onclick = () => openChat(u.handle, u.name);
                        convList.appendChild(div);
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }

        async function openChat(handle, name) {
            activeReceiverHandle = handle;
            loadConversations(); // refresh active state
            
            chatArea.innerHTML = `
                <div style="padding:16px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:12px; backdrop-filter:blur(10px);">
                    <div class="avatar" style="width:40px;height:40px;background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}');background-size:cover;border-radius:50%;"></div>
                    <div>
                        <p style="font-weight:600;">${name || handle}</p>
                        <p style="font-size:12px; color:var(--text-secondary);">@${handle}</p>
                    </div>
                </div>
                <div id="chat-messages" style="flex:1;padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;">
                    <div style="text-align:center; color:var(--text-secondary);">Chargement...</div>
                </div>
                <div style="padding:16px;border-top:1px solid var(--border-color);display:flex;gap:12px;align-items:center;">
                    <input type="text" id="chat-input" placeholder="Écrire un message..." class="input-field" style="flex:1;">
                    <button id="chat-send" class="btn-primary" style="padding:10px 16px;"><i class="ph-fill ph-paper-plane-right"></i></button>
                </div>
            `;

            document.getElementById('chat-send').onclick = sendMessage;
            document.getElementById('chat-input').onkeypress = (e) => {
                if (e.key === 'Enter') sendMessage();
            };

            // Fetch history
            try {
                const res = await fetch(`${API_URL}/messages/${handle}`, {
                    headers: { 'Authorization': `Bearer ${state.token}` }
                });
                const messages = await res.json();
                document.getElementById('chat-messages').innerHTML = '';
                if(messages.length === 0) {
                    document.getElementById('chat-messages').innerHTML = '<div style="text-align:center; color:var(--text-secondary); margin-top: auto; margin-bottom:auto;">Dites bonjour ! 👋</div>';
                } else {
                    messages.forEach(m => {
                        appendMessageToUI(m, m.sender_id === state.user.id);
                    });
                }
                scrollToBottom();
            } catch (e) {
                console.error(e);
            }
        }

        function appendMessageToUI(msg, isFromMe) {
            const container = document.getElementById('chat-messages');
            if(!container) return;
            // Remove "Dites bonjour" if present
            if(container.innerHTML.includes('Dites bonjour')) container.innerHTML = '';
            
            const div = document.createElement('div');
            div.style.cssText = isFromMe 
                ? 'align-self:flex-end;max-width:70%;background:var(--accent-color);color:#000;padding:12px 16px;border-radius:16px 16px 4px 16px;'
                : 'align-self:flex-start;max-width:70%;background:var(--panel-bg);border:1px solid var(--border-color);padding:12px 16px;border-radius:16px 16px 16px 4px; color:var(--text-primary);';
            div.innerHTML = `<p style="font-size:14px; margin:0;">${escapeHtml(msg.content)}</p>`;
            container.appendChild(div);
        }

        function scrollToBottom() {
            const container = document.getElementById('chat-messages');
            if(container) container.scrollTop = container.scrollHeight;
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const content = input.value.trim();
            if (!content || !activeReceiverHandle || !socket) return;

            socket.emit('send_message', {
                senderId: state.user.id,
                senderHandle: state.user.handle,
                receiverHandle: activeReceiverHandle,
                content: content
            });

            input.value = '';
        }

        // Search logic to start new chat
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const handle = searchInput.value.trim().replace('@', '');
                if (handle) openChat(handle, handle);
            }
        });

        loadConversations();
    }
});



