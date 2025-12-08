// ----- FIREBASE CONFIG -----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "YOUR-API-KEY",
    authDomain: "YOUR-DOMAIN",
    projectId: "YOUR-ID",
    storageBucket: "YOUR-BUCKET",
    messagingSenderId: "YOUR-SENDER",
    appId: "YOUR-APP-ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const provider = new GoogleAuthProvider();


// ---------------- SIGN UP ----------------
const signupBtn = document.getElementById("signup-btn");
if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);

            await updateProfile(userCred.user, { displayName: name });

            alert("Account created! Please sign in.");
            window.location.href = "signin.html";

        } catch (err) {
            alert(err.message);
        }
    });
}


// ---------------- SIGN IN ----------------
const signinBtn = document.getElementById("signin-btn");
if (signinBtn) {
    signinBtn.addEventListener("click", async () => {
        const email = document.getElementById("signin-email").value;
        const password = document.getElementById("signin-password").value;

        try {
            await signInWithEmailAndPassword(auth, email, password);

            window.location.href = "index.html";

        } catch (err) {
            alert(err.message);
        }
    });
}


// ---------------- GOOGLE LOGIN ----------------
const googleLogin = document.getElementById("google-btn") ||
                    document.getElementById("google-signup-btn");

if (googleLogin) {
    googleLogin.addEventListener("click", async () => {
        try {
            await signInWithPopup(auth, provider);
            window.location.href = "index.html";
        } catch (err) {
            alert(err.message);
        }
    });
}


// ------------- PROTECT PAGES ---------------
onAuthStateChanged(auth, user => {
    const protectedPages = ["index.html"];

    const current = location.pathname.split("/").pop();

    if (!user && protectedPages.includes(current)) {
        window.location.href = "signin.html";
    }
});


// ------------- SIGN OUT FUNCTION -----------
export function logoutUser() {
    signOut(auth).then(() => {
        window.location.href = "signin.html";
    });
}
