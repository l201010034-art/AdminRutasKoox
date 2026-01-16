// js/firebase-config.js

// --- 1. CONFIGURACIÓN PROYECTO A: ALERTAS (Mantenimiento) ---
const configUsuarios = {
    apiKey: "AIzaSyDozEdN4_g7u-D6XcJdysuns8-iLbfMS5I",
    authDomain: "rutaskoox-alertas.firebaseapp.com",
    databaseURL: "https://rutaskoox-alertas-default-rtdb.firebaseio.com/",
    projectId: "rutaskoox-alertas",
    appId: "1:332778953247:web:4460fef290b88fb1b1932a"
};

// --- 2. CONFIGURACIÓN PROYECTO B: GESTIÓN (Flota) ---
const configFlota = {
    apiKey: "AIzaSyDcaVTGa3j1YZjbd1D52wNNc1qk7VnrorY",
    authDomain: "rutaskoox-gestion.firebaseapp.com",
    projectId: "rutaskoox-gestion",
    storageBucket: "rutaskoox-gestion.firebasestorage.app",
    messagingSenderId: "255575956265",
    appId: "1:255575956265:web:c6f7487ced40a4f6f87538",
    measurementId: "G-81656MC0ZC"
};

// --- 3. INICIALIZACIÓN ---

// App Principal (Usuarios)
if (!firebase.apps.length) {
    firebase.initializeApp(configUsuarios);
}
const appUsuarios = firebase.app(); 

// App Secundaria (Flota)
let appFlota;
try {
    appFlota = firebase.app("AppFlota");
} catch (e) {
    appFlota = firebase.initializeApp(configFlota, "AppFlota");
}

// --- 4. EXPORTAR REFERENCIAS (AHORA CON FIRESTORE) ---

const authUsuarios = appUsuarios.auth(); 
const authFlota = appFlota.auth();       

// Base de datos de Usuarios (Sigue siendo Realtime DB para el switch mantenimiento?)
// Si tus usuarios también están en Firestore, avísame. Asumo que el switch sigue en RTDB.
const dbMantenimiento = appUsuarios.database(); 

// 🔴 CAMBIO CLAVE: Usamos Firestore para la Flota
const firestoreFlota = appFlota.firestore(); 

// Firestore de Usuarios (Reportes)
const firestore = appUsuarios.firestore();

console.log("🔥 Configuración Híbrida: FIRESTORE Activado para Gestión");