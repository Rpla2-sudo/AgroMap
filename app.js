document.addEventListener('DOMContentLoaded', () => {
    
    let ultimoDiseñoGenerado = [];

    // --- 1. INICIALIZAR EL MAPA DE LEAFLET Y CONFIGURAR EL DIBUJO DEL POLÍGONO ---
    const map = L.map('mapa', { preferCanvas: true }).setView([12.385000, -86.628667], 18);

    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    let puntosPoligono = [];
    let poligonoActual = L.polygon([], { color: '#10b981', weight: 3, fillOpacity: 0.3 }).addTo(map);
    let marcadores = [];

    // Botón para limpiar el dibujo
    const btnLimpiarMapa = L.control({position: 'topright'});
    btnLimpiarMapa.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        div.innerHTML = `<button style="padding: 6px 12px; cursor: pointer; font-weight: 600; color: #ef4444; border: none; border-radius: 4px; background-color: white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);">
                            Borrar Dibujo
                         </button>`;
        div.onclick = function(e) {
            e.stopPropagation();
            puntosPoligono = [];
            poligonoActual.setLatLngs([]);
            marcadores.forEach(m => map.removeLayer(m));
            marcadores = [];
            document.getElementById('inputAreaTotal').value = ''; 
        }
        return div;
    };
    btnLimpiarMapa.addTo(map);

    map.on('click', function(e) {
        if (puntosPoligono.length >= 4) {
            alert("Ya marcaste los 4 vértices del terreno. Haz clic en 'Borrar Dibujo' si quieres empezar de nuevo.");
            return;
        }

        puntosPoligono.push(e.latlng);

        const marcador = L.circleMarker(e.latlng, {
            radius: 5, color: 'white', weight: 2, fillColor: '#ef4444', fillOpacity: 1
        }).addTo(map);
        marcadores.push(marcador);

        poligonoActual.setLatLngs(puntosPoligono);

        if (puntosPoligono.length === 4) {
            const coordsTurf = puntosPoligono.map(p => [p.lng, p.lat]);
            coordsTurf.push([puntosPoligono[0].lng, puntosPoligono[0].lat]); 

            const poligonoTurf = turf.polygon([coordsTurf]);
            const areaMetrosCuadrados = turf.area(poligonoTurf);

            const inputArea = document.getElementById('inputAreaTotal');
            inputArea.value = areaMetrosCuadrados.toFixed(2);
            
            inputArea.classList.add('ring-4', 'ring-green-400', 'bg-green-100');
            setTimeout(() => {
                inputArea.classList.remove('ring-4', 'ring-green-400', 'bg-green-100');
            }, 1000);
        }
    });

    // --- 2. LÓGICA DE ALEATORIZACIÓN (FISHER-YATES) ---
    function barajarArray(array) {
        let arrayBarajado = [...array];
        for (let i = arrayBarajado.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arrayBarajado[i], arrayBarajado[j]] = [arrayBarajado[j], arrayBarajado[i]];
        }
        return arrayBarajado;
    }

    function generarDBCA(tratamientos, numBloques) {
        let libroDeCampo = [];
        let numeroParcela = 101; 

        for (let b = 1; b <= numBloques; b++) {
            let tratamientosAsignados = barajarArray(tratamientos);
            tratamientosAsignados.forEach(tratamiento => {
                libroDeCampo.push({
                    parcela: numeroParcela,
                    bloque: b,
                    tratamiento: tratamiento.trim()
                });
                numeroParcela++;
            });
            numeroParcela = (b + 1) * 100 + 1; 
        }
        return libroDeCampo;
    }

    // --- 3. DIBUJAR EL CROQUIS VISUAL ---
    const paletaColores = [
        'bg-green-100 text-green-800 border-green-200',
        'bg-purple-100 text-purple-800 border-purple-200',
        'bg-orange-100 text-orange-800 border-orange-200',
        'bg-blue-100 text-blue-800 border-blue-200',
        'bg-pink-100 text-pink-800 border-pink-200',
        'bg-teal-100 text-teal-800 border-teal-200'
    ];

    function renderizarCroquis(diseño, numBloques, tratamientos) {
        const contenedor = document.getElementById('croquisVisual');
        contenedor.innerHTML = ''; 
        document.getElementById('tituloCroquis').classList.remove('hidden');

        const mapaColores = {};
        tratamientos.forEach((trat, index) => {
            mapaColores[trat.trim()] = paletaColores[index % paletaColores.length];
        });

        for (let b = 1; b <= numBloques; b++) {
            const parcelasDelBloque = diseño.filter(p => p.bloque === b);
            
            const fila = document.createElement('div');
            fila.className = 'flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-100';
            
            const etiquetaBloque = document.createElement('div');
            etiquetaBloque.className = 'w-20 font-semibold text-sm text-gray-500';
            etiquetaBloque.textContent = `Bloque ${b}`;
            fila.appendChild(etiquetaBloque);

            const gridParcelas = document.createElement('div');
            gridParcelas.className = 'flex flex-1 gap-2';

            parcelasDelBloque.forEach(p => {
                const caja = document.createElement('div');
                const clasesColor = mapaColores[p.tratamiento];
                caja.className = `flex-1 flex flex-col items-center justify-center p-3 rounded-lg border ${clasesColor} shadow-sm transition-transform hover:scale-105`;
                
                caja.innerHTML = `
                    <span class="text-xs font-bold opacity-50 mb-1">P-${p.parcela}</span>
                    <span class="font-medium text-sm text-center leading-tight">${p.tratamiento}</span>
                `;
                gridParcelas.appendChild(caja);
            });

            fila.appendChild(gridParcelas);
            contenedor.appendChild(fila);
        }
    }

    // --- 4. EVENTOS DE LOS BOTONES ---
    document.getElementById('btnGenerar').addEventListener('click', () => {
        const tratamientosRaw = document.getElementById('inputTratamientos').value;
        const numBloques = parseInt(document.getElementById('inputBloques').value);
        const tratamientos = tratamientosRaw.split(',').filter(t => t.trim() !== '');

        ultimoDiseñoGenerado = generarDBCA(tratamientos, numBloques);
        document.getElementById('consola').textContent = JSON.stringify(ultimoDiseñoGenerado, null, 2);
        renderizarCroquis(ultimoDiseñoGenerado, numBloques, tratamientos);

        document.getElementById('btnExportar').classList.remove('hidden');
        document.getElementById('btnExportarPDF').classList.remove('hidden');
    });

    document.getElementById('btnExportar').addEventListener('click', () => {
        if (ultimoDiseñoGenerado.length === 0) return;

        const hojaExcel = XLSX.utils.json_to_sheet(ultimoDiseñoGenerado);
        XLSX.utils.sheet_add_aoa(hojaExcel, [["Parcela", "Bloque", "Tratamiento"]], { origin: "A1" });

        const libroExcel = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libroExcel, hojaExcel, "Libro de Campo");
        XLSX.writeFile(libroExcel, "Croquis_Campo_DBCA.xlsx");
    });

    

    // --- 5. LÓGICA DE LA CALCULADORA AGRONÓMICA ---
    document.getElementById('btnCalcular').addEventListener('click', () => {
        
        const tratamientosRaw = document.getElementById('inputTratamientos').value;
        const numBloques = parseInt(document.getElementById('inputBloques').value);
        const numTratamientos = tratamientosRaw.split(',').filter(t => t.trim() !== '').length; 
        const totalParcelas = numBloques * numTratamientos;

        const areaDisponiblePoligono = parseFloat(document.getElementById('inputAreaTotal').value);
        const plantasParcela = parseInt(document.getElementById('inputPlantas').value);
        const distSurcos = parseFloat(document.getElementById('inputDistSurcos').value);
        const distPlantas = parseFloat(document.getElementById('inputDistPlantas').value);

        const areaPorPlanta = distSurcos * distPlantas; 
        
        const areaParcelaReal = plantasParcela * areaPorPlanta; 

        const lado = Math.sqrt(areaParcelaReal);

        const areaTotalRequerida = areaParcelaReal * totalParcelas;

        document.getElementById('resArea').textContent = areaParcelaReal.toFixed(2);
        document.getElementById('resDimensiones').textContent = `${lado.toFixed(2)} x ${lado.toFixed(2)}`;
        
        const elementoUso = document.getElementById('resUtiles');
        
        elementoUso.parentElement.innerHTML = `<strong>Uso del Terreno:</strong> <span id="resUtiles"></span>`;
        
        if (areaTotalRequerida <= areaDisponiblePoligono) {
            document.getElementById('resUtiles').innerHTML = `<span class="text-emerald-700">¡Cabe perfecto! Necesitas <b>${areaTotalRequerida.toFixed(2)} m²</b> de los ${areaDisponiblePoligono.toFixed(2)} m² totales. Te sobrará espacio para caminos.</span>`;
        } else {
            document.getElementById('resUtiles').innerHTML = `<span class="text-red-600 font-bold">⚠️ ¡No cabe! El experimento exige ${areaTotalRequerida.toFixed(2)} m², pero solo marcaste ${areaDisponiblePoligono.toFixed(2)} m² en el mapa.</span>`;
        }

        document.getElementById('resultadosCalculadora').classList.remove('hidden');
    });

    // --- 6. EVENTO PARA EXPORTAR REPORTE EN PDF CON IMAGEN ---
    document.getElementById('btnExportarPDF').addEventListener('click', async () => {
        if (ultimoDiseñoGenerado.length === 0) return;

        const btnPDF = document.getElementById('btnExportarPDF');
        const textoOriginal = btnPDF.innerText;
        btnPDF.innerText = "Generando Reporte...";
        btnPDF.classList.add('opacity-75', 'cursor-not-allowed');

        try {
            if (puntosPoligono.length === 4) {
                map.fitBounds(poligonoActual.getBounds(), { padding: [30, 30], animate: false });
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const elementoMapa = document.getElementById('mapa');
            const canvasMapa = await html2canvas(elementoMapa, { useCORS: true });
            const imagenMapaBase64 = canvasMapa.toDataURL('image/png');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.setTextColor(31, 41, 55); 
            doc.text("Reporte de Diseño Experimental (DBCA)", 14, 20);

            doc.setFontSize(12);
            doc.setTextColor(75, 85, 99);
            doc.text("Georreferenciación del Terreno:", 14, 32);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            if (puntosPoligono.length === 4) {
                puntosPoligono.forEach((punto, index) => {
                    const lat = punto.lat.toFixed(6);
                    const lng = punto.lng.toFixed(6);
                    doc.text(`Vértice ${index + 1}: Latitud ${lat}, Longitud ${lng}`, 14, 42 + (index * 6));
                });
            } else {
                doc.text("Nota: No se marcaron los 4 vértices en el mapa satelital.", 14, 42);
            }

            doc.addImage(imagenMapaBase64, 'PNG', 110, 32, 85, 45);

            doc.setFontSize(12);
            doc.setTextColor(75, 85, 99);
            doc.text("Distribución del Libro de Campo:", 14, 85);

            const datosTabla = ultimoDiseñoGenerado.map(d => [d.parcela, d.bloque, d.tratamiento]);
            
            doc.autoTable({
                startY: 90,
                head: [['Parcela', 'Bloque', 'Tratamiento']],
                body: datosTabla,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] }, 
                styles: { fontSize: 10, cellPadding: 3 }
            });

            doc.save("Reporte_Agronomico_Georreferenciado.pdf");

        } catch (error) {
            console.error("Error al generar el PDF:", error);
            alert("Hubo un error al capturar el mapa. Revisa la consola.");
        } finally {
            
            btnPDF.innerText = textoOriginal;
            btnPDF.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    });
});