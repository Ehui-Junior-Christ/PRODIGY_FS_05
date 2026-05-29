import re

PAGES = [
    r'c:\Users\junio\Desktop\Prodigy\PRODIGY_FS_05\index.html',
    r'c:\Users\junio\Desktop\Prodigy\PRODIGY_FS_05\trending.html',
    r'c:\Users\junio\Desktop\Prodigy\PRODIGY_FS_05\notifications.html',
    r'c:\Users\junio\Desktop\Prodigy\PRODIGY_FS_05\messages.html',
]

MODAL_REGEX = re.compile(r'<!-- Modal: Edit Profile -->.*?</div>\s*\n\s*</div>', re.DOTALL)

NEW_MODAL = '''<!-- Modal: Edit Profile -->
    <div class="modal-overlay" id="edit-profile-modal" style="display:none;">
        <div class="modal" style="max-width: 480px;">
            <header class="modal-header">
                <h2>Éditer le profil</h2>
                <button class="close-btn" id="close-edit-profile-modal">
                    <i class="ph ph-x" style="font-size: 24px;"></i>
                </button>
            </header>
            <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
                <!-- Cover Photo -->
                <div>
                    <label style="font-size:13px; color:var(--text-secondary); margin-bottom:6px; display:block;">Photo de couverture</label>
                    <div id="edit-cover-preview" style="height:120px; border-radius:12px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); background-size:cover; background-position:center; cursor:pointer; display:flex; align-items:center; justify-content:center; border:2px dashed var(--border-color); position:relative; overflow:hidden; transition: opacity 0.2s;">
                        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; color:var(--text-secondary); z-index:1;">
                            <i class="ph ph-camera" style="font-size:28px;"></i>
                            <span style="font-size:12px;">Changer la couverture</span>
                        </div>
                    </div>
                    <input type="file" id="edit-cover-upload" accept="image/*" hidden>
                </div>
                <!-- Avatar -->
                <div>
                    <label style="font-size:13px; color:var(--text-secondary); margin-bottom:6px; display:block;">Photo de profil</label>
                    <div style="display:flex; align-items:center; gap:16px;">
                        <div id="edit-avatar-preview" style="width:72px; height:72px; border-radius:50%; background-size:cover; background-position:center; background-image:url(\'https://api.dicebear.com/7.x/avataaars/svg?seed=user\'); border:2px solid var(--border-color); cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
                            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;" class="avatar-hover-overlay">
                                <i class="ph ph-camera" style="font-size:20px; color:#fff;"></i>
                            </div>
                        </div>
                        <div style="flex:1;">
                            <button class="btn-secondary" id="btn-change-avatar" style="font-size:13px; padding:8px 16px;">
                                <i class="ph ph-upload-simple" style="margin-right:4px;"></i> Choisir une photo
                            </button>
                            <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">JPG, PNG ou GIF. Max 2 Mo.</p>
                        </div>
                        <input type="file" id="edit-avatar-upload" accept="image/*" hidden>
                    </div>
                </div>
                <!-- Name -->
                <div class="form-group">
                    <label style="font-size:13px; color:var(--text-secondary); margin-bottom:4px; display:block;">Nom</label>
                    <input type="text" id="edit-profile-name" class="input-field" placeholder="Votre nom complet">
                </div>
                <!-- Handle -->
                <div class="form-group">
                    <label style="font-size:13px; color:var(--text-secondary); margin-bottom:4px; display:block;">Handle (Pseudo)</label>
                    <input type="text" id="edit-profile-handle" class="input-field" placeholder="utilisateur (sans @)">
                </div>
                <!-- Bio -->
                <div class="form-group">
                    <label style="font-size:13px; color:var(--text-secondary); margin-bottom:4px; display:block;">Bio</label>
                    <textarea id="edit-profile-bio" class="input-field" rows="3" placeholder="Décrivez-vous en quelques mots..." style="resize:vertical;"></textarea>
                </div>
            </div>
            <footer class="modal-footer">
                <button class="btn-secondary" id="cancel-edit-profile">Annuler</button>
                <button class="btn-primary" id="save-edit-profile">Enregistrer</button>
            </footer>
        </div>
    </div>'''

for path in PAGES:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = MODAL_REGEX.sub(NEW_MODAL, content)

    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated: {path}')
    else:
        print(f'No match found in: {path}')
