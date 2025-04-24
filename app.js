// Configurar PDF.js con la URL del worker actualizada
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.1.91/build/pdf.worker.mjs";

// Referencias a elementos del DOM
const upload = document.getElementById("upload");
// const previewBtn = document.getElementById("preview");
const downloadBtn = document.getElementById("download");
const textInput = document.getElementById("text");
const colorInput = document.getElementById("color");
const sizeInput = document.getElementById("size");
const rotationInput = document.getElementById("rotation");
const opacityInput = document.getElementById("opacity");
const spacingXInput = document.getElementById("spacingX");
const spacingYInput = document.getElementById("spacingY");

const sizeValue = document.getElementById("size-value");
const rotationValue = document.getElementById("rotation-value");
const opacityValue = document.getElementById("opacity-value");
const spacingXValue = document.getElementById("spacingX-value");
const spacingYValue = document.getElementById("spacingY-value");

const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pageNum = document.getElementById("page_num");
const pageCount = document.getElementById("page_count");

const closeBtn = document.getElementById("close-congratulations-modal");
const congratulationsModal = document.getElementById("congratulations-modal");

// Variables para PDF.js
let pdfDoc = null;
let currentPage = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;

// Variables para PDF-lib
let currentPdfBytes;
let originalPdfBytes;
let processedPdfBytes;

// Función de debounce para retrasar la ejecución de la función
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Función para procesar el PDF con debounce
const debouncedProcessPdf = debounce(processPdfAndDisplay, 500);

// Actualizar valores de los sliders y aplicar debounce al procesamiento
[
    [sizeInput, sizeValue, "px"],
    [rotationInput, rotationValue, "°"],
    [opacityInput, opacityValue, "%"],
    [spacingXInput, spacingXValue, "px"],
    [spacingYInput, spacingYValue, "px"]
].forEach(([input, output, unit]) => {
    input.addEventListener("input", () => {
        // Actualizar el valor mostrado inmediatamente
        output.textContent = input.value + unit;

        // Reprocesar el PDF con debounce
        if (originalPdfBytes) {
            debouncedProcessPdf();
        }
    });
});

// Aplicar debounce a los cambios de texto
textInput.addEventListener("input", () => {
    if (originalPdfBytes) {
        debouncedProcessPdf();
    }
});

// Aplicar debounce a los cambios de color
colorInput.addEventListener("input", () => {
    if (originalPdfBytes) {
        debouncedProcessPdf();
    }
});

// Renderiza la página actual del PDF
function renderPage(num) {
    pageRendering = true;

    pdfDoc.getPage(num).then(function (page) {
        // Obtener el tamaño original de la página PDF
        const originalViewport = page.getViewport({ scale: 1.0 });

        // Obtener el ancho disponible para el canvas
        const container = document.querySelector(".canvas-container");
        const containerWidth = container.clientWidth - 20; // 20px para padding

        // Calcular la escala para que se ajuste al ancho disponible
        const scaleFactor = containerWidth / originalViewport.width;
        scale = Math.min(2.0, Math.max(0.5, scaleFactor)); // Limitar escala entre 0.5 y 2.0

        // Crear nuevo viewport con la escala calculada
        const viewport = page.getViewport({ scale: scale });

        // Ajustar dimensiones del canvas
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        const renderTask = page.render(renderContext);

        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    pageNum.textContent = num;
}

// Pone en cola la renderización de la página
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Navegar a la página anterior
function onPrevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    queueRenderPage(currentPage);
}

// Navegar a la página siguiente
function onNextPage() {
    if (currentPage >= pdfDoc.numPages) return;
    currentPage++;
    queueRenderPage(currentPage);
}

// Procesar PDF con la marca de agua
async function procesarPDF() {
    if (!originalPdfBytes) {
        return null;
    }

    try {
        const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        const color = hexToRgb(colorInput.value);
        const size = parseInt(sizeInput.value);
        const rotation = parseInt(rotationInput.value);
        const opacity = parseInt(opacityInput.value) / 100;
        const spacingX = parseInt(spacingXInput.value);
        const spacingY = parseInt(spacingYInput.value);

        const text = textInput.value;

        for (const page of pdfDoc.getPages()) {
            const { width, height } = page.getSize();

            for (let y = -spacingY; y < height + spacingY; y += spacingY) {
                for (let x = -spacingX; x < width + spacingX; x += spacingX) {
                    page.drawText(text, {
                        x,
                        y,
                        size,
                        font,
                        color,
                        rotate: PDFLib.degrees(rotation),
                        opacity,
                    });
                }
            }
        }

        return await pdfDoc.save();
    } catch (error) {
        console.error("Error al procesar el PDF:", error);
        alert("Ocurrió un error al procesar el PDF. Por favor, intenta con otro archivo.");
        return null;
    }
}

// Función para procesar y mostrar el PDF
async function processPdfAndDisplay() {
    // Mostrar algún indicador de carga
    canvas.style.opacity = "0.5";

    try {
        const pdfBytes = await procesarPDF();
        if (pdfBytes) {
            processedPdfBytes = pdfBytes;
            await loadAndDisplayPDF(pdfBytes);
        }
    } catch (error) {
        console.error("Error al procesar el PDF:", error);
    } finally {
        // Quitar el indicador de carga
        canvas.style.opacity = "1";
    }
}

// Cargar y mostrar el PDF procesado
async function loadAndDisplayPDF(pdfBytes) {
    try {
        // Convertir ArrayBuffer a Uint8Array para PDF.js
        const uint8Array = new Uint8Array(pdfBytes);

        // Cargar PDF con PDF.js
        pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        pageCount.textContent = pdfDoc.numPages;

        // Reiniciar a la primera página y renderizar
        currentPage = 1;
        renderPage(currentPage);

        // Habilitar los botones de navegación
        prevBtn.disabled = false;
        nextBtn.disabled = false;

        // Guardar los bytes procesados para la descarga
        currentPdfBytes = pdfBytes;
    } catch (error) {
        console.error("Error al cargar el PDF:", error);
        alert("Error al cargar el PDF. Por favor, intenta con otro archivo.");
    }
}

// Funcion para abrir el modal
function openCongratulationsModal() {
    congratulationsModal.style.display = "flex";
}

// Funcion para cerrar el modal
function closeCongratulationsModal() {
    congratulationsModal.style.display = "none";
}

// Evento para cerrar el modal al hacer clic fuera de él
window.addEventListener("click", function (event) {
    if (event.target === congratulationsModal) {
        closeCongratulationsModal();
    }
});

// Evento para cerrar el modal al presionar la tecla Escape
window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && congratulationsModal.style.display === "flex") {
        closeCongratulationsModal();
    }
});

// Evento para la carga de un nuevo archivo
upload.addEventListener("change", async () => {
    const file = upload.files[0];
    if (!file) return;

    try {
        // Leer el archivo como ArrayBuffer
        originalPdfBytes = await file.arrayBuffer();

        // Procesar y mostrar el PDF automáticamente
        await processPdfAndDisplay();
    } catch (error) {
        console.error("Error al cargar el archivo:", error);
        alert("Error al cargar el archivo PDF.");
    }
});

// El botón de vista previa ahora solo reprocesa el PDF actual
// previewBtn.addEventListener("click", async () => {
//     if (!originalPdfBytes) {
//         alert("Por favor, selecciona un PDF primero.");
//         return;
//     }

//     await processPdfAndDisplay();
// });

// Evento para el botón de descarga
downloadBtn.addEventListener("click", () => {
    if (!currentPdfBytes) {
        alert("No hay un PDF procesado para descargar. Por favor, carga un PDF primero.");
        return;
    }

    const blob = new Blob([currentPdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pdf_con_marca_de_agua.pdf";
    link.click();

    openCongratulationsModal();
});

// Evento para cerrar el modal de agradecimiento
closeBtn.addEventListener("click", closeCongratulationsModal);

// Eventos para los botones de navegación
prevBtn.addEventListener("click", onPrevPage);
nextBtn.addEventListener("click", onNextPage);

// Convertir color hexadecimal a formato RGB para PDF-lib
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return PDFLib.rgb(r, g, b);
}

// Manejar el cambio de tamaño de la ventana con debounce
const debouncedResize = debounce(() => {
    if (pdfDoc) {
        renderPage(currentPage);
    }
}, 200);

window.addEventListener("resize", debouncedResize);

// Deshabilitar botones de navegación inicialmente
prevBtn.disabled = true;
nextBtn.disabled = true;