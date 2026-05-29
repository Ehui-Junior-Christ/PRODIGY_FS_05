import re, os

PAGES = {
    'trending.html':      ('Tendances',     'Decouvrez les sujets tendance sur Prisme.'),
    'notifications.html': ('Notifications', 'Vos notifications Prisme — likes, abonnements, commentaires.'),
    'profile.html':       ('Mon Profil',    'Gerez votre profil Prisme et consultez vos Angles publies.'),
    'messages.html':      ('Messages',      'Vos conversations privees sur Prisme.'),
}

CLEAN_HEAD_TPL = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#050505">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="description" content="{desc}">
    <title>{title} — Prisme</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Phosphor Icons -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <!-- Socket.io -->
    <script src="http://localhost:3000/socket.io/socket.io.js"></script>
</head>"""

BASE = r'c:\Users\junio\Desktop\Prodigy\PRODIGY_FS_05'

for fname, (title, desc) in PAGES.items():
    path = os.path.join(BASE, fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_head = CLEAN_HEAD_TPL.format(title=title, desc=desc)
    content = re.sub(r'<!DOCTYPE html>.*?</head>', new_head, content, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {fname}')

print('Done.')
