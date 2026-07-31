import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBQ-sJ_eF1kJ10uwQsc6xh7kDJB7gG0WMw",
  authDomain: "menpoe-contanova.firebaseapp.com",
  projectId: "menpoe-contanova",
  storageBucket: "menpoe-contanova.firebasestorage.app",
  messagingSenderId: "951340632679",
  appId: "1:951340632679:web:2fb0404ab682cf0f17a2c2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const EMAIL = "admin@contanova.com";
const PASSWORD = "ContaNova2026!";

createUserWithEmailAndPassword(auth, EMAIL, PASSWORD)
  .then((uc) => {
    console.log("✅ Usuario creado exitosamente:");
    console.log("   Email:    ", EMAIL);
    console.log("   Password: ", PASSWORD);
    console.log("   UID:      ", uc.user.uid);
    process.exit(0);
  })
  .catch((err) => {
    if (err.code === "auth/email-already-in-use") {
      console.log("ℹ️  El usuario ya existe en Firebase Auth:");
      console.log("   Email:    ", EMAIL);
      console.log("   Password: ", PASSWORD);
      process.exit(0);
    }
    console.error("❌ Error:", err.code, err.message);
    process.exit(1);
  });
