// js/admin-core.js

function iniciarSistemaAdmin() {
    console.log("🚀 Sistema Admin Iniciado");
    
    // A. ESCUCHAR SWITCH DE MANTENIMIENTO (Proyecto A - Usuarios)
    const toggleMant = document.getElementById('mantenimiento-toggle');
    const labelMant = document.getElementById('mantenimiento-label');
    const statusBadge = document.getElementById('system-status-badge');

    // Leemos la configuración del Proyecto A
    dbMantenimiento.ref('config/mantenimiento_activo').on('value', (snapshot) => {
        const estado = snapshot.val();
        
        // Actualizar UI visualmente
        if (toggleMant) toggleMant.checked = estado; 
        
        if (estado) {
            labelMant.innerText = "⚠️ MANTENIMIENTO ACTIVO (APP BLOQUEADA)";
            labelMant.style.color = "red";
            statusBadge.className = "badge-danger";
            statusBadge.innerText = "Mantenimiento";
        } else {
            labelMant.innerText = "✅ Sistema Operativo Normal";
            labelMant.style.color = "green";
            statusBadge.className = "badge-success";
            statusBadge.innerText = "Operativo";
        }
    });

    // Enviar cambio a Firebase Proyecto A al hacer clic
    if (toggleMant) {
        toggleMant.addEventListener('change', (e) => {
            const nuevoEstado = e.target.checked;
            const confirmacion = confirm(nuevoEstado ? 
                "¿ESTÁS SEGURO? Esto bloqueará la app para TODOS los usuarios." : 
                "¿Reactivar el sistema para el público?");

            if (confirmacion) {
                dbMantenimiento.ref('config/mantenimiento_activo').set(nuevoEstado)
                    .then(() => alert("Estado actualizado correctamente."))
                    .catch(err => {
                        alert("Error: " + err.message);
                        e.target.checked = !nuevoEstado; // Revertir si falla
                    });
            } else {
                e.target.checked = !nuevoEstado; // Revertir si cancela
            }
        });
    }

    // B. CARGAR MÉTRICAS BÁSICAS (Opcional)
    // cargarMetricas();
}

// C. NAVEGACIÓN ENTRE VISTAS
window.cambiarVista = function(idVista) {
    // 1. Ocultar todas
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('oculto'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // 2. Mostrar elegida
    document.getElementById(idVista).classList.remove('oculto');
    
    // 3. Activar botón
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // 4. Si es la vista de mapa, inicializamos o redibujamos
    if (idVista === 'vista-flota') {
        if (typeof inicializarMapaFlota === 'function') {
            inicializarMapaFlota(); 
        }
        // Redibujar Leaflet por si cambió el tamaño del div
        if (window.mapaFlota) {
            setTimeout(() => window.mapaFlota.invalidateSize(), 200);
        }
    }
    if (idVista === 'vista-analitica') {
        if (typeof inicializarAnalitica === 'function') {
            inicializarAnalitica();
        }
    }
};