// js/map-fleet.js (VERSIÓN PRODUCCIÓN)

let mapaFlota = null;
const marcadoresChoferes = {}; 
let datosConductoresCache = {}; 
let unsubscribeGPS = null;
let unsubscribeReportes = null;
let layerGroupReportes = null; 

// Configuración
const COLECCION_REPORTES = 'alertas'; // Colección de reportes ciudadanos

// Iconos
const iconoBusAdmin = L.divIcon({
    className: 'custom-bus-icon',
    html: '<div style="background:#0056b3; color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 3px 5px rgba(0,0,0,0.3);"><i class="ri-bus-fill"></i></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const iconoReporte = L.divIcon({
    className: 'custom-report-icon',
    html: '<div style="background:#ef4444; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2); animation: pulse 2s infinite;"><i class="ri-alarm-warning-fill"></i></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
});

function inicializarMapaFlota() {
    if (mapaFlota) return; 

    mapaFlota = L.map('map-admin').setView([19.8301, -90.5349], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20
    }).addTo(mapaFlota);

    layerGroupReportes = L.layerGroup().addTo(mapaFlota);

    // 1. Cargar Conductores
    firestoreFlota.collection('conductores').onSnapshot(snap => {
        const temp = {};
        snap.forEach(doc => temp[doc.id] = doc.data());
        datosConductoresCache = temp;
    });

    // 2. Cargar GPS
    unsubscribeGPS = firestoreFlota.collection('live_locations').onSnapshot(snapshot => {
        actualizarContadorBuses(snapshot.size);
        snapshot.forEach(doc => {
            const pos = doc.data();
            if (!pos.lat || !pos.lng) return;

            const ruta = pos.routeId || 'Sin Ruta';
            const velocidad = parseFloat(pos.speed || 0).toFixed(1);
            const unidad = pos.unitId || doc.id;
            const driverInfo = datosConductoresCache[pos.driverId] || {};
            const nombreChofer = driverInfo.nombre || "Chofer " + (pos.driverId ? pos.driverId.substring(0,4) : 'Unknown');

            const contenidoPopup = `
                <div style="text-align:center; min-width:140px;">
                    <b style="color:#0056b3;">Unidad ${unidad}</b><br>
                    <span class="badge-success">${ruta}</span><br>
                    <small>${nombreChofer}</small><br>
                    <hr style="margin:5px 0; border-color:#eee;">
                    <b>${velocidad} km/h</b>
                </div>`;

            if (marcadoresChoferes[unidad]) {
                marcadoresChoferes[unidad].setLatLng([pos.lat, pos.lng]).setPopupContent(contenidoPopup);
            } else {
                marcadoresChoferes[unidad] = L.marker([pos.lat, pos.lng], {icon: iconoBusAdmin})
                    .addTo(mapaFlota).bindPopup(contenidoPopup);
            }
        });
    });

    // 3. Alertas de Ruta (Realtime DB)
    dbMantenimiento.ref('alertas').on('value', (snapshot) => {
        renderizarAlertasCriticas(snapshot.val());
    });
}

// --- Toggle Reportes ---
window.toggleCapaReportes = function(mostrar) {
    if (!mapaFlota || !layerGroupReportes) return;

    if (mostrar) {
        unsubscribeReportes = firestore.collection(COLECCION_REPORTES).onSnapshot(snapshot => {
            layerGroupReportes.clearLayers();
            let contadorMapa = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.lat && data.lng) {
                    let fecha = '--:--';
                    if (data.timestamp && data.timestamp.toDate) {
                        fecha = new Date(data.timestamp.toDate()).toLocaleTimeString();
                    }

                    const popupReporte = `
                        <div style="text-align:center; min-width:150px;">
                            <strong style="color:#ef4444; font-size:1.1em;">🚨 ${data.tipo || 'Alerta'}</strong><br>
                            <small>${fecha}</small><br>
                            <p style="margin:5px 0; font-style:italic;">"${data.comentario || ''}"</p>
                            <hr style="margin:5px 0; border:0; border-top:1px solid #eee;">
                            <button onclick="resolverReporte('${doc.id}')" 
                                style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; width:100%;">
                                ✅ Resolver
                            </button>
                        </div>
                    `;

                    L.marker([data.lat, data.lng], {icon: iconoReporte})
                        .addTo(layerGroupReportes)
                        .bindPopup(popupReporte);
                    contadorMapa++;
                }
            });
            
            const el = document.getElementById('count-reports');
            if(el) el.innerText = contadorMapa;
        });
    } else {
        if (unsubscribeReportes) unsubscribeReportes();
        layerGroupReportes.clearLayers();
    }
};

window.resolverReporte = function(idDoc) {
    if(!confirm("¿Marcar alerta como atendida?")) return;
    firestore.collection(COLECCION_REPORTES).doc(idDoc).delete().catch(e => console.error(e));
};

// --- Alertas Flotantes ---
function renderizarAlertasCriticas(alertasData) {
    const contenedor = document.getElementById('panel-alertas-criticas');
    if (!alertasData) { contenedor.style.display = 'none'; return; }

    const ahora = Date.now();
    const lista = Object.keys(alertasData).map(k => ({ruta:k, ...alertasData[k]}));
    const activas = lista.filter(a => a.expiraEn > ahora);

    if (activas.length === 0) { contenedor.style.display = 'none'; return; }

    let html = '';
    activas.forEach(a => {
        const min = Math.ceil((a.expiraEn - ahora)/60000);
        html += `
            <div class="alerta-card-flotante">
                <div class="alerta-header"><i class="ri-alarm-warning-fill"></i> ${a.ruta}</div>
                <div class="alerta-body">${a.mensaje}</div>
                <div class="alerta-footer">Expira en ${min} min <button onclick="borrarAlertaRuta('${a.ruta}')" class="btn-borrar-alerta">Resolver</button></div>
            </div>`;
    });
    contenedor.innerHTML = html;
    contenedor.style.display = 'block';
}

window.borrarAlertaRuta = function(rutaKey) {
    if(confirm(`¿Resolver alerta de ${rutaKey}?`)) {
        dbMantenimiento.ref('alertas').child(rutaKey).remove();
    }
};

function actualizarContadorBuses(n) {
    const el = document.getElementById('count-buses');
    if(el) el.innerText = n;
}

const estilos = document.createElement('style');
estilos.innerHTML = `
    .badge-success { background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:4px; font-size:0.8em; font-weight:bold; }
    .alerta-card-flotante { background: white; border-left: 5px solid #ef4444; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); margin-bottom: 10px; overflow: hidden; animation: slideIn 0.3s ease-out; }
    .alerta-header { background: #fee2e2; color: #991b1b; padding: 8px 12px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
    .alerta-body { padding: 10px 12px; font-size: 0.9rem; }
    .alerta-footer { padding: 8px 12px; background: #f8fafc; font-size: 0.75rem; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
    .btn-borrar-alerta { background: #cbd5e1; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
    .btn-borrar-alerta:hover { background: #94a3b8; color: white; }
    @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
`;
document.head.appendChild(estilos);