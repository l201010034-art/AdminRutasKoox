// js/analytics.js

let chartFlotaInstance = null;
let chartVelocidadInstance = null;
let chartTiemposInstance = null; // Instancia nueva
let datosTelemetriaCache = []; 

function inicializarAnalitica() {
    console.log("📊 Inicializando Analítica...");

    // 1. Escuchar GPS (Existente)
    firestoreFlota.collection('live_locations').onSnapshot((snapshot) => {
        const flotaLista = [];
        snapshot.forEach(doc => flotaLista.push({ id: doc.id, ...doc.data() }));
        procesarDatosFlota(flotaLista);
    });

    // 2. NUEVO: Escuchar Tiempos de Rutas (Turnos Terminados)
    // Limitamos a los últimos 50 turnos para no saturar
    firestoreFlota.collection('turnos_terminados')
        .orderBy('turnoFin', 'desc')
        .limit(50)
        .onSnapshot(procesarTiemposTurnos);
}

// --- PROCESAMIENTO DE GPS (Existente) ---
function procesarDatosFlota(listaGPS) {
    const rutasConteo = {};
    const rutasVelocidad = {};
    const listaCompleta = [];

    listaGPS.forEach(gps => {
        const nombreRuta = gps.routeId || 'Sin Asignar';
        const velocidad = parseFloat(gps.speed || 0);
        const unidad = gps.unitId || gps.id;
        const estado = gps.status || 'Unknown';
        
        // Manejo seguro de fecha
        let fecha = "---";
        if (gps.lastUpdate && gps.lastUpdate.toDate) {
            fecha = gps.lastUpdate.toDate().getTime();
        }

        // Conteo y Velocidad
        if (!rutasConteo[nombreRuta]) rutasConteo[nombreRuta] = 0;
        rutasConteo[nombreRuta]++;

        if (!rutasVelocidad[nombreRuta]) rutasVelocidad[nombreRuta] = [];
        rutasVelocidad[nombreRuta].push(velocidad);

        listaCompleta.push({
            id: unidad,
            ruta: nombreRuta,
            velocidad: velocidad.toFixed(2),
            estado: estado,
            lat: gps.lat,
            lng: gps.lng,
            timestamp: fecha
        });
    });

    datosTelemetriaCache = listaCompleta;

    const rutasNombres = Object.keys(rutasConteo);
    const velocidadesPromedio = rutasNombres.map(r => {
        const vels = rutasVelocidad[r];
        return (vels.reduce((a, b) => a + b, 0) / vels.length).toFixed(1);
    });

    renderizarChartFlota(rutasNombres, Object.values(rutasConteo));
    renderizarChartVelocidad(rutasNombres, velocidadesPromedio);
    actualizarTablaTelemetria(listaCompleta);
}

// --- NUEVO: PROCESAMIENTO DE TIEMPOS ---
function procesarTiemposTurnos(snapshot) {
    const tiemposPorRuta = {}; // { "koox-01": [45, 50, 48], ... }

    snapshot.forEach(doc => {
        const data = doc.data();
        // Validamos que tenga inicio y fin
        if (data.turnoInicio && data.turnoFin && data.routeId) {
            const inicio = data.turnoInicio.toDate();
            const fin = data.turnoFin.toDate();
            
            // Calculamos diferencia en minutos
            const duracionMinutos = (fin - inicio) / 1000 / 60;
            
            // Filtramos datos locos (ej: turnos de 1 minuto o de 24 horas)
            if (duracionMinutos > 5 && duracionMinutos < 600) {
                const ruta = data.routeId;
                if (!tiemposPorRuta[ruta]) tiemposPorRuta[ruta] = [];
                tiemposPorRuta[ruta].push(duracionMinutos);
            }
        }
    });

    // Calcular promedios
    const labels = Object.keys(tiemposPorRuta);
    const data = labels.map(ruta => {
        const tiempos = tiemposPorRuta[ruta];
        const suma = tiempos.reduce((a, b) => a + b, 0);
        return (suma / tiempos.length).toFixed(0); // Minutos enteros
    });

    renderizarChartTiempos(labels, data);
}

// --- RENDERIZADORES ---

function renderizarChartFlota(labels, data) {
    const ctx = document.getElementById('chart-flota');
    if (!ctx) return;
    
    if (chartFlotaInstance) chartFlotaInstance.destroy();

    chartFlotaInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Unidades Activas',
                data: data,
                backgroundColor: '#0056b3',
                borderRadius: 5
            }]
        },
        options: { responsive: true }
    });
}

function renderizarChartVelocidad(labels, data) {
    const ctx = document.getElementById('chart-velocidad');
    if (!ctx) return;

    if (chartVelocidadInstance) chartVelocidadInstance.destroy();

    chartVelocidadInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Velocidad Promedio (km/h)',
                data: data,
                borderColor: '#ff9900',
                backgroundColor: 'rgba(255, 153, 0, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true }
    });
}

function renderizarChartTiempos(labels, data) {
    const ctx = document.getElementById('chart-tiempos');
    if (!ctx) return;

    if (chartTiemposInstance) chartTiemposInstance.destroy();

    chartTiemposInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar', // Puede ser 'bar' horizontal si prefieres
        data: {
            labels: labels,
            datasets: [{
                label: 'Tiempo Promedio por Turno (Minutos)',
                data: data,
                backgroundColor: '#10b981', // Verde
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Hace la gráfica horizontal para leer mejor las rutas
            scales: {
                x: { beginAtZero: true, title: { display: true, text: 'Minutos' } }
            }
        }
    });
}

function actualizarTablaTelemetria(datos) {
    const tbody = document.getElementById('tabla-telemetria-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    datos.forEach(d => {
        const hora = d.timestamp !== "---" ? new Date(d.timestamp).toLocaleTimeString() : "---";
        const fila = `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;"><b>${d.id}</b></td>
                <td style="padding:10px;"><span class="badge-success">${d.ruta}</span></td>
                <td style="padding:10px;">${d.velocidad}</td>
                <td style="padding:10px;">${d.estado}</td>
                <td style="padding:10px; color:#999; font-size:0.8rem;">${hora}</td>
            </tr>
        `;
        tbody.innerHTML += fila;
    });
}


window.descargarReporteCSV = function() {
    if (!datosTelemetriaCache.length) {
        alert("No hay datos para exportar aún.");
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Unidad,Ruta,Velocidad,Estado,Lat,Lng,Fecha\n";
    datosTelemetriaCache.forEach(d => {
        csvContent += `${d.id},"${d.ruta}",${d.velocidad},"${d.estado}",${d.lat},${d.lng},"${d.timestamp}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "telemetria_rutaskoox_" + Date.now() + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};