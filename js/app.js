const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        posts: [],
        trending: [],
        suggestions: [],
        user: JSON.parse(localStorage.getItem('prisme_user')) || null,
        token: localStorage.getItem('prisme_token') || null
    };

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
    let isLoginMode = true;

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

    // UI Updates
    function updateAuthUI() {
        if (state.user) {
            authModal.classList.remove('active');
            btnLogout.style.display = 'flex';
        } else {
            authModal.classList.add('active');
            btnLogout.style.display = 'none';
        }
    }

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
                <header class="post-header">
                    <div class="avatar" style="background-image: url('https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}')"></div>
                    <div class="post-meta">
                        <h3>${post.author} <span class="prisme-tag">dans #${post.prisme}</span></h3>
                        <p>${new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                </header>
                <p class="post-content">${post.content}</p>
                <div class="post-tags">
                    ${(post.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
                <footer class="post-actions">
                    <button class="action-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${post.isLiked ? '#ff4757' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span id="like-count-${post.id}">${post.likes}</span>
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

    // Modal logic
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
    }

    createBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', hideModal);
    cancelPost.addEventListener('click', hideModal);
    mediaUploadArea.addEventListener('click', () => fileUpload.click());

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
                body: JSON.stringify({ content, prisme, tags })
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
    authToggle.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authModeText.textContent = isLoginMode ? "Connexion" : "Inscription";
        authToggle.textContent = isLoginMode ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter";
        document.getElementById('auth-name-group').style.display = isLoginMode ? 'none' : 'block';
        document.getElementById('auth-handle-group').style.display = isLoginMode ? 'none' : 'block';
        document.getElementById('auth-terms-group').style.display = isLoginMode ? 'none' : 'block';
        document.getElementById('auth-forgot-pw').style.display = isLoginMode ? 'block' : 'none';
        document.getElementById('auth-verification-msg').style.display = 'none';
    });

    // Écouteur d'état Firebase
    setTimeout(() => {
        if(window.fbAuthMethods && window.firebaseAuth) {
            window.fbAuthMethods.onAuthStateChanged(window.firebaseAuth, async (user) => {
                if (user) {
                    if (!user.emailVerified) {
                        state.user = null;
                        state.token = null;
                        updateAuthUI();
                        return;
                    }
                    state.token = await user.getIdToken();
                    state.user = { email: user.email, name: user.displayName || user.email.split('@')[0] };
                    localStorage.setItem('prisme_token', state.token);
                    localStorage.setItem('prisme_user', JSON.stringify(state.user));
                    updateAuthUI();
                    fetchPosts();
                } else {
                    state.user = null;
                    state.token = null;
                    localStorage.removeItem('prisme_user');
                    localStorage.removeItem('prisme_token');
                    updateAuthUI();
                }
            });
        }
    }, 1000);

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if(!window.firebaseAuth || !window.fbAuthMethods) {
            return alert("Firebase n'est pas encore initialisé. Veuillez ajouter le firebaseConfig dans index.html");
        }

        const { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } = window.fbAuthMethods;
        const auth = window.firebaseAuth;

        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value;
        const handle = document.getElementById('auth-handle').value;
        const termsAccepted = document.getElementById('auth-terms').checked;

        if (!isLoginMode && !termsAccepted) {
            return alert("Vous devez accepter les conditions d'utilisation.");
        }

        try {
            if (isLoginMode) {
                // Login Firebase
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                if (!userCredential.user.emailVerified) {
                    await window.fbAuthMethods.signOut(auth);
                    alert("Veuillez vérifier votre email avant de vous connecter. Vérifiez vos spams.");
                    return;
                }
            } else {
                // Register Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCredential.user);
                
                // Enregistrer dans notre DB Turso
                await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, handle, email, password: 'firebase_managed', termsAccepted })
                });

                document.getElementById('auth-verification-msg').style.display = 'block';
                await window.fbAuthMethods.signOut(auth);
                alert("Compte créé ! Un e-mail de validation (lien) vous a été envoyé. Veuillez cliquer dessus pour valider votre compte.");
                authToggle.click(); // Switch back to login
            }
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') alert("Cet email est déjà utilisé.");
            else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') alert("Identifiants incorrects.");
            else alert("Erreur d'authentification : " + error.message);
        }
    });

    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(window.firebaseAuth && window.fbAuthMethods) {
                await window.fbAuthMethods.signOut(window.firebaseAuth);
            }
        });
    }

    // Theme Toggle
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const root = document.documentElement;
            const currentBg = getComputedStyle(root).getPropertyValue('--bg-color').trim();
            if (currentBg === '#0a0a0a') {
                root.style.setProperty('--bg-color', '#ffffff');
                root.style.setProperty('--panel-bg', 'rgba(240, 240, 240, 0.6)');
                root.style.setProperty('--border-color', '#e0e0e0');
                root.style.setProperty('--text-primary', '#111111');
                root.style.setProperty('--text-secondary', '#666666');
                root.style.setProperty('--accent-color', '#000000');
                root.style.setProperty('--hover-bg', 'rgba(0, 0, 0, 0.05)');
            } else {
                root.style.setProperty('--bg-color', '#0a0a0a');
                root.style.setProperty('--panel-bg', 'rgba(20, 20, 20, 0.6)');
                root.style.setProperty('--border-color', '#2a2a2a');
                root.style.setProperty('--text-primary', '#f0f0f0');
                root.style.setProperty('--text-secondary', '#888888');
                root.style.setProperty('--accent-color', '#ffffff');
                root.style.setProperty('--hover-bg', 'rgba(255, 255, 255, 0.05)');
            }
        });
    }

    // Forgot password
    const btnForgotPw = document.getElementById('auth-forgot-pw');
    if (btnForgotPw) {
        btnForgotPw.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            if (!email) return alert("Veuillez saisir votre adresse email dans le champ Email d'abord.");
            
            if(!window.firebaseAuth || !window.fbAuthMethods) return alert("Firebase non configuré.");
            
            try {
                await window.fbAuthMethods.sendPasswordResetEmail(window.firebaseAuth, email);
                alert("Un lien de réinitialisation de mot de passe a été envoyé à " + email + ".");
            } catch(e) {
                alert("Erreur: " + e.message);
            }
        });
    }

    // Initial render
    updateAuthUI();
    fetchPosts();
    fetchSidebar();
});
