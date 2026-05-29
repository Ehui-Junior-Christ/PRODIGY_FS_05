# Prisme - Social Media Platform

Prisme est une plateforme sociale full-stack construite pour la Task 05 du programme Full-Stack Web Development de Prodigy InfoTech. L'application permet aux utilisateurs de partager des publications appelées Angles, de les organiser par Prismes, d'interagir avec la communauté et de gérer un profil personnalisé.

## Fonctionnalites

- Authentification par e-mail et mot de passe avec JWT.
- Inscription avec verification d'e-mail lorsque le service mail est configure.
- Connexion sociale Google et Apple cote interface, avec synchronisation serveur via une route sociale dediee.
- Creation de publications avec texte, categorie et image integree.
- Fil d'actualite dynamique avec likes, commentaires et suppression de ses propres publications.
- Page profil avec avatar, couverture, bio, statistiques et affichage des publications avec leurs images.
- Systeme de follow entre utilisateurs.
- Notifications pour les likes, les nouveaux commentaires et les nouveaux abonnes.
- Messagerie en temps reel avec Socket.IO.
- Pages dediees pour l'accueil, les tendances, les notifications, le profil et les messages.
- Interface responsive en HTML, CSS et JavaScript vanilla.

## Stack Technique

- Frontend: HTML5, CSS3, JavaScript ES6.
- Backend: Node.js, Express.js.
- Base de donnees: Turso / LibSQL.
- Authentification: JSON Web Tokens, bcryptjs.
- Temps reel: Socket.IO.
- E-mails: Nodemailer.

## Installation

1. Installer les dependances:

```bash
npm install
```

2. Creer un fichier `.env` a la racine:

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
node server/index.js
```

4. Ouvrir le frontend avec Live Server ou un serveur statique sur `http://localhost:5501`.

## Description Marketing

Prisme transforme le reseau social classique en un espace d'expression organise autour des perspectives. Les utilisateurs publient des Angles, explorent des sujets via des Prismes, echangent en commentaires, suivent des profils et recoivent des notifications en temps reel sur les interactions importantes. Le projet met l'accent sur une experience claire, moderne et communautaire, ideale pour partager des idees, construire une audience et decouvrir des conversations pertinentes.

## Auteur

Developpe par Ehui Junior Christ dans le cadre de la derniere tache du stage Full-Stack Web Development chez Prodigy InfoTech.
