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
                        <i class="${post.isLiked ? 'ph-fill' : 'ph'} ph-heart" style="font-size: 20px; ${post.isLiked ? 'color: #ff4757;' : ''}"></i>
                        <span id="like-count-${post.id}">${post.likes}</span>
                    </button>
                    <button class="action-btn">
                        <i class="ph ph-chat-circle" style="font-size: 20px;"></i>
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

    // Toggle Password Visibility
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('auth-password');
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Changer l'icone
            const icon = togglePasswordBtn.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('ph-eye');
                icon.classList.add('ph-eye-slash');
            } else {
                icon.classList.remove('ph-eye-slash');
                icon.classList.add('ph-eye');
            }
        });
    }

    // Toggle Email / Phone
    const btnPhoneToggle = document.getElementById('btn-phone-toggle');
    const emailGroup = document.getElementById('auth-email-group');
    const phoneGroup = document.getElementById('auth-phone-group');
    let isPhoneMode = false;

    if (btnPhoneToggle) {
        btnPhoneToggle.addEventListener('click', () => {
            isPhoneMode = !isPhoneMode;
            if (isPhoneMode) {
                emailGroup.style.display = 'none';
                phoneGroup.style.display = 'flex';
                btnPhoneToggle.textContent = 'Email';
                document.getElementById('btn-auth-submit').textContent = 'Valider le code SMS';
            } else {
                emailGroup.style.display = 'block';
                phoneGroup.style.display = 'none';
                btnPhoneToggle.textContent = 'Téléphone (SMS)';
                document.getElementById('btn-auth-submit').textContent = 'Valider avec Email';
            }
        });
    }

    // Auth Submission (Email or SMS Code)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if(!window.firebaseAuth || !window.fbAuthMethods) {
            return alert("Firebase n'est pas encore initialisé. Veuillez ajouter le firebaseConfig dans index.html");
        }

        const auth = window.firebaseAuth;

        // Si on est en mode Téléphone, la soumission du form valide le code SMS
        if (isPhoneMode) {
            const smsCode = document.getElementById('auth-sms-code').value;
            if (!smsCode || !window.confirmationResult) return alert("Veuillez entrer le code SMS");
            try {
                const result = await window.confirmationResult.confirm(smsCode);
                const user = result.user;
                // Enregistrer dans Turso (Handle/Name optionnel via Phone)
                const name = document.getElementById('auth-name').value || "Utilisateur_" + user.phoneNumber.slice(-4);
                const handle = document.getElementById('auth-handle').value || "user_" + user.phoneNumber.slice(-4);
                await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, handle, email: user.phoneNumber, password: 'firebase_managed', termsAccepted: true })
                }).catch(() => {}); // ignore si existe déjà
                
                authModal.style.display = 'none';
                return; // l'écouteur onAuthStateChanged fera le reste
            } catch (error) {
                return alert("Code SMS invalide ou expiré.");
            }
        }

        // --- Mode Email ---
        const { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } = window.fbAuthMethods;

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

    // Google Login
    const btnGoogleLogin = document.getElementById('btn-google-login');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            if(!window.firebaseAuth || !window.fbAuthMethods) return alert("Firebase non configuré.");
            try {
                const provider = new window.fbAuthMethods.GoogleAuthProvider();
                const result = await window.fbAuthMethods.signInWithPopup(window.firebaseAuth, provider);
                const user = result.user;
                
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

    function navigateTo(viewName) {
        if (!views[viewName]) return;
        if (views[currentView]?.el) views[currentView].el.style.display = 'none';

        const displayMode = viewName === 'messages' ? 'flex' : 'block';
        views[viewName].el.style.display = displayMode;
        topbarTitle.textContent = views[viewName].title;
        currentView = viewName;

        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.dataset.view === viewName);
        });

        if (viewName === 'trending')      fetchAndRenderTrending();
        if (viewName === 'notifications') fetchAndRenderNotifications();
        if (viewName === 'profile')       fetchAndRenderProfile();
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            const target = li.dataset.view;
            if (target) navigateTo(target);
        });
    });

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
                        <p style="font-weight:600; font-size:16px;">${t.topic}</p>
                        <p style="font-size:13px; color:var(--text-secondary);">${t.count}</p>
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
                    const icon = isLike ? 'ph-fill ph-heart' : 'ph-fill ph-user-plus';
                    const iconColor = isLike ? '#ff4757' : 'var(--accent-color)';
                    const text = isLike
                        ? `<strong>${n.actor_name}</strong> a aimé votre Angle sur <span class="prisme-tag">"${(n.angle_content || '').substring(0, 40)}..."</span>`
                        : `<strong>${n.actor_name}</strong> a commencé à vous suivre`;
                    return `
                        <div class="post" style="display:flex; align-items:center; gap:16px;">
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
        if (!state.user || !state.token) return;

        // Mettre à jour les infos de base immédiatement
        const nameEl = document.getElementById('profile-name');
        const handleEl = document.getElementById('profile-handle');
        const avatarEl = document.getElementById('profile-avatar');

        try {
            // Charger les données complètes depuis le backend
            const res = await fetch(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (res.ok) {
                const user = await res.json();
                if (nameEl) nameEl.textContent = user.name;
                if (handleEl) handleEl.textContent = '@' + user.handle;
                if (avatarEl) avatarEl.style.backgroundImage = `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.handle}')`;

                document.getElementById('profile-angles').textContent = user.angles_count || 0;
                document.getElementById('profile-followers').textContent = user.followers_count || 0;
                document.getElementById('profile-following').textContent = user.following_count || 0;

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
                                <p class="post-content">${post.content}</p>
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px;">
                                    <span class="prisme-tag">${post.prisme ? '#' + post.prisme : ''}</span>
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
    
    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            if (!state.user) return;
            document.getElementById('edit-profile-name').value = state.user.name || '';
            document.getElementById('edit-profile-handle').value = state.user.handle || '';
            editProfileModal.style.display = 'flex';
        });
    }

    const closeEditModal = () => editProfileModal.style.display = 'none';
    if (closeEditProfileModal) closeEditProfileModal.addEventListener('click', closeEditModal);
    if (cancelEditProfile) cancelEditProfile.addEventListener('click', closeEditModal);

    if (saveEditProfile) {
        saveEditProfile.addEventListener('click', async () => {
            if (!state.token) return;
            const newName = document.getElementById('edit-profile-name').value.trim();
            const newHandle = document.getElementById('edit-profile-handle').value.trim();
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
                    body: JSON.stringify({ name: newName, handle: newHandle })
                });
                
                const data = await res.json();
                if (res.ok) {
                    state.user.name = data.user.name;
                    state.user.handle = data.user.handle;
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
    fetchPosts();
    fetchSidebar();
});



