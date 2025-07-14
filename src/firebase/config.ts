import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBy1tBbaPzDs0WE3n5X2j-FmAVGcSYsmJc",
  authDomain: "gestioninventarioyventas.firebaseapp.com",
  projectId: "gestioninventarioyventas",
  storageBucket: "gestioninventarioyventas.firebasestorage.app",
  messagingSenderId: "7920232772",
  appId: "1:7920232772:web:226925078009847a3a0f11",
  measurementId: "G-1BV9FGJZ99"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;