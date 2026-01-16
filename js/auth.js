// js/auth.js

// Referencias al HTML
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const btnLogout = document.getElementById('btn-logout');
const errorMsg = document.getElementById('login-error');

// 1. MONITOREO DE ESTADO (Verificar que AMBOS estén conectados)
// authFlota y authUsuarios ya vienen cargados desde firebase-config.js
authFlota.onAuthStateChanged(userB => {
    // Verificamos también el usuario A
    const userA = authUsuarios.currentUser;

    if (userB) {
        // Si está en B pero no en A, es raro, pero dejamos pasar al dashboard
        if (!userA) {
            console.warn("⚠️ Advertencia: Logueado en Flota pero NO en Alertas.");
        }

        console.log("✅ Sesión Activa detectada.");
        mostrarDashboard();
    } else {
        mostrarLogin();
    }
});

function mostrarDashboard() {
    loginScreen.classList.add('oculto');
    dashboardScreen.classList.remove('oculto');
    // Iniciamos la lógica del panel (definida en admin-core.js)
    if (typeof iniciarSistemaAdmin === 'function') iniciarSistemaAdmin();
}

function mostrarLogin() {
    loginScreen.classList.remove('oculto');
    dashboardScreen.classList.add('oculto');
}

// 2. PROCESO DE LOGIN "PASO A PASO"
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    errorMsg.style.display = 'none';
    errorMsg.style.color = 'red';
    errorMsg.innerText = "Conectando...";

    try {
        // PASO A: Intentar Login en Proyecto ALERTAS
        console.log("1. Intentando login en Alertas (Proyecto A)...");
        await authUsuarios.signInWithEmailAndPassword(email, pass);
        console.log("✅ Login A exitoso.");

        // PASO B: Intentar Login en Proyecto GESTIÓN
        console.log("2. Intentando login en Gestión (Proyecto B)...");
        await authFlota.signInWithEmailAndPassword(email, pass);
        console.log("✅ Login B exitoso.");

        // Si ambos pasan
        console.log("🎉 ACCESO TOTAL CONCEDIDO");

    } catch (error) {
        console.error("❌ Error Crítico:", error);
        
        // Identificar dónde falló
        let mensaje = "Error desconocido";
        
        if (error.code === 'auth/user-not-found') {
            mensaje = "El usuario no existe. ¿Seguro que lo creaste en AMBOS proyectos?";
        } else if (error.code === 'auth/wrong-password') {
            mensaje = "Contraseña incorrecta.";
        } else {
            mensaje = error.message; 
        }

        // Mostrar en pantalla qué falló
        errorMsg.style.display = 'block';
        errorMsg.innerText = "Fallo de Autenticación: " + mensaje;
        
        // Por seguridad, cerramos cualquier sesión parcial
        authUsuarios.signOut();
        authFlota.signOut();
    }
});

// 3. LOGOUT COMPLETO
btnLogout.addEventListener('click', async () => {
    console.log("Cerrando todas las sesiones...");
    await authUsuarios.signOut();
    await authFlota.signOut();
    window.location.reload();
});