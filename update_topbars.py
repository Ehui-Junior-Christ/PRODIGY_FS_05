import os, re

PAGES = ['trending.html', 'notifications.html', 'profile.html', 'messages.html']

TOPBAR_REGEX = re.compile(r'<header class="topbar">.*?</header>', re.DOTALL)

TOPBAR_NEW = """<header class="topbar">
            <h1 id="topbar-title">Accueil</h1>
            <div style="display:flex; align-items:center; gap:12px; margin-left:auto;">
                <div class="search-bar">
                    <i class="ph ph-magnifying-glass" style="font-size: 20px; color: var(--text-secondary);"></i>
                    <input type="text" id="search-input" placeholder="Rechercher...">
                </div>
                <!-- Mobile-only action buttons -->
                <button class="topbar-icon-btn" id="btn-theme-toggle-mobile" title="Changer le theme">
                    <i class="ph ph-sun" style="font-size:20px;"></i>
                </button>
                <button class="topbar-icon-btn" id="btn-logout-mobile" style="display:none;" title="Deconnexion">
                    <i class="ph ph-sign-out" style="font-size:20px;"></i>
                </button>
            </div>
        </header>"""

for p in PAGES:
    path = os.path.join(r'c:\Users\junio\Desktop\Prodigy\PRODIGY_FS_05', p)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = TOPBAR_REGEX.sub(TOPBAR_NEW, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
