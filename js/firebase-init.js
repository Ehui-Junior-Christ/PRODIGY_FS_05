(function () {
    const allowedProtocol = ["http:", "https:", "chrome-extension:"].includes(window.location.protocol);
    let storageAvailable = false;
    try {
        const key = "__prisme_firebase_storage_check__";
        window.localStorage.setItem(key, key);
        window.localStorage.removeItem(key);
        storageAvailable = true;
    } catch (error) {
        storageAvailable = false;
    }

    window.firebaseAuthUnavailableReason = null;
    if (!allowedProtocol || !storageAvailable) {
        window.firebaseAuthUnavailableReason = "Firebase Auth requiert http/https et le stockage navigateur active.";
        return;
    }

    const firebaseConfig = {
        apiKey: "AIzaSyAjVje0jwrh0bUYah8vvFFqltuREii1wnM",
        authDomain: "prisme-3bc01.firebaseapp.com",
        projectId: "prisme-3bc01",
        storageBucket: "prisme-3bc01.firebasestorage.app",
        messagingSenderId: "636821728554",
        appId: "1:636821728554:web:e85d81464c04c087d54253"
    };

    if (!window.firebase?.apps) return;

    const app = window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(firebaseConfig);
    let auth = null;
    try {
        auth = window.firebase.auth(app);
    } catch (error) {
        window.firebaseAuthUnavailableReason = error.message;
        return;
    }

    window.firebaseAuth = auth;
    window.fbAuthMethods = {
        GoogleAuthProvider: window.firebase.auth.GoogleAuthProvider,
        OAuthProvider: window.firebase.auth.OAuthProvider,
        RecaptchaVerifier: window.firebase.auth.RecaptchaVerifier,
        signInWithPopup: (authInstance, provider) => authInstance.signInWithPopup(provider),
        signInWithPhoneNumber: (authInstance, phoneNumber, verifier) =>
            authInstance.signInWithPhoneNumber(phoneNumber, verifier),
        sendPasswordResetEmail: (authInstance, email) => authInstance.sendPasswordResetEmail(email)
    };
})();
