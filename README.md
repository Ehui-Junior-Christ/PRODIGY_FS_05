# Prisme - Plateforme sociale full-stack

Prisme est une application sociale full-stack developpee pour le cinquieme et dernier projet du stage Full-Stack Web Development chez Prodigy InfoTech. Elle permet de publier des idees sous forme d'Angles, de les organiser par Prismes, de suivre d'autres utilisateurs, d'interagir avec les publications et d'echanger en messagerie temps reel.

## Fonctionnalites principales

- Authentification par e-mail et mot de passe avec JWT.
- Verification d'e-mail et reinitialisation de mot de passe par e-mail lorsque Nodemailer est configure.
- Connexion sociale Google, Apple et telephone via Firebase cote interface, synchronisee avec le backend.
- Creation, modification, suppression, partage et republication d'Angles.
- Fil d'actualite dynamique avec likes, commentaires et medias integres.
- Recherche globale sur les personnes et les publications.
- Profils utilisateurs avec avatar, couverture, bio, statistiques et publications.
- Systeme d'abonnement entre utilisateurs.
- Suggestions de comptes basees sur les affinites, les abonnements et les centres d'interet.
- Notifications pour les likes, commentaires et nouveaux abonnes.
- Messagerie temps reel avec Socket.IO, recherche de personnes, avatars et conversations persistantes.
- Interface responsive en HTML, CSS et JavaScript vanilla.

## Stack technique

- Frontend: HTML5, CSS3, JavaScript ES6.
- Backend: Node.js, Express.js.
- Base de donnees: Turso / LibSQL.
- Authentification: JWT et bcryptjs.
- Temps reel: Socket.IO.
- E-mails: Nodemailer.
- Authentification sociale: Firebase cote client.

## Installation

1. Installer les dependances:

```bash
npm install
```

2. Creer un fichier `.env` a la racine du projet:

```env
PORT=3000
APP_URL=http://localhost:5501
JWT_SECRET=une_cle_secrete
TURSO_DATABASE_URL=votre_url_turso
TURSO_AUTH_TOKEN=votre_token_turso
MAIL_USER=votre_adresse_gmail
MAIL_PASS=votre_mot_de_passe_application
```

3. Lancer le serveur:

```bash
npm start
```

4. Ouvrir l'application:

- Backend et pages servies par Express: `http://localhost:3000`
- Ou frontend avec Live Server: `http://localhost:5501`

## Structure du projet

```text
.
├── index.html
├── messages.html
├── notifications.html
├── profile.html
├── trending.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── firebase-init.js
└── server/
    ├── db.js
    ├── index.js
    ├── emailService.js
    └── routes/
        ├── angles.js
        ├── auth.js
        ├── notifications.js
        └── users.js
```

## Description LinkedIn

Je suis heureux de presenter Prisme, mon cinquieme et dernier projet realise dans le cadre de mon stage Full-Stack Web Development chez Prodigy InfoTech.

Prisme est une plateforme sociale full-stack qui permet aux utilisateurs de publier des idees, de suivre des profils, d'interagir avec des publications et d'echanger en messagerie temps reel grace a Socket.IO. Le projet integre une authentification JWT, une base de donnees Turso/LibSQL, des profils personnalisables, des notifications, une recherche globale et des suggestions de comptes basees sur les affinites.

Ce projet m'a permis de consolider mes competences en backend Node.js/Express, gestion de base de donnees, authentification, temps reel, architecture d'API et experience utilisateur responsive.

## Auteur

Developpe par Ehui Junior Christ dans le cadre du stage Full-Stack Web Development chez Prodigy InfoTech.
