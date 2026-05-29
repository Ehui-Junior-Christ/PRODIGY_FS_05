# Prisme - Social Media Platform

![Prisme Banner](https://img.shields.io/badge/Status-Completed-success?style=for-the-badge) ![Fullstack](https://img.shields.io/badge/Stack-Fullstack-blue?style=for-the-badge) ![Prodigy InfoTech](https://img.shields.io/badge/ProdigyInfoTech-Task_05-orange?style=for-the-badge)

**Prisme** est une plateforme sociale moderne, fluide et épurée, conçue pour réinventer la manière dont nous partageons nos perspectives (les **Angles**) à travers des sujets d'intérêt spécifiques (les **Prismes**).

Ce projet a été développé en tant que **Task 05** (Projet Final) dans le cadre du stage Full-Stack Developer chez **Prodigy InfoTech**.

## 🌟 Fonctionnalités Principales

*   **Authentification Sécurisée** : Inscription avec vérification d'email (via Resend) et connexion par JWT.
*   **Les Angles (Publications)** : Partagez vos pensées avec prise en charge du texte et de l'upload de médias (Images/Vidéos). Possibilité de supprimer ses propres Angles.
*   **Les Prismes (Catégories)** : Triez et découvrez le contenu par centres d'intérêt spécifiques (ex: #Tech, #Art, #Design).
*   **Profils Utilisateurs** : Page de profil personnalisable (Photo de profil générée dynamiquement, Biographie modifiable en temps réel, nombre d'abonnés et d'abonnements).
*   **Interactions Sociales** : Système de likes et section "Tendances / Suggestions".
*   **Design Premium "Liquid Glass"** : Une interface utilisateur immersive, moderne (thème sombre), avec des animations fluides et un design 100% responsive conçu en Vanilla CSS.

## 🛠️ Stack Technique

*   **Frontend** : HTML5, CSS3 (Custom Properties, Flexbox/Grid, Animations), JavaScript (Vanilla ES6+). SPA (Single Page Application) architecturée sans framework lourd.
*   **Backend** : Node.js, Express.js.
*   **Base de Données** : SQLite via **Turso** (LibSQL) pour des performances Edge ultra-rapides.
*   **Sécurité & Services** : JWT (JSON Web Tokens) pour les sessions, Resend pour l'envoi d'emails.

## 🚀 Installation & Exécution

### Prérequis
*   Node.js (v16+)
*   Une base de données Turso ou SQLite locale
*   Un compte Resend pour l'envoi d'emails (Optionnel pour le dev local)

### Démarrage Rapide

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/Ehui-Junior-Christ/PRODIGY_FS_05.git
   cd PRODIGY_FS_05
   ```

2. **Installer les dépendances du serveur**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   Créez un fichier `.env` à la racine :
   ```env
   PORT=3000
   TURSO_DATABASE_URL=votre_url_turso
   TURSO_AUTH_TOKEN=votre_token_turso
   JWT_SECRET=une_cle_secrete_tres_complexe
   RESEND_API_KEY=votre_cle_resend
   APP_URL=http://localhost:5501
   ```

4. **Lancer le backend**
   ```bash
   node server/index.js
   ```

5. **Lancer le frontend**
   Ouvrez le dossier avec l'extension "Live Server" sur VS Code (port par défaut 5501) ou servez les fichiers statiques.

## 👨‍💻 Auteur
Développé par **Ehui Junior Christ** dans le cadre du programme de stage Full-Stack Developer chez Prodigy InfoTech.