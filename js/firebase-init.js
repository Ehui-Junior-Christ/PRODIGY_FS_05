(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyAjVje0jwrh0bUYah8vvFFqltuREii1wnM",
        authDomain: "prisme-3bc01.firebaseapp.com",
        projectId: "prisme-3bc01",
        storageBucket: "prisme-3bc01.firebasestorage.app",
        messagingSenderId: "636821728554",
        appId: "1:636821728554:web:6d6e6085f6e297f2d54253"
    };

    if (!window.firebase?.apps) return;

    const app = window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(firebaseConfig);
    const auth = window.firebase.auth(app);

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
