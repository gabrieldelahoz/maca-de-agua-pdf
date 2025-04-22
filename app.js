const upload = document.getElementById("upload");
const previewBtn = document.getElementById("preview");
const downloadBtn = document.getElementById("download");
const textInput = document.getElementById("text");
const colorInput = document.getElementById("color");
const sizeInput = document.getElementById("size");
const rotationInput = document.getElementById("rotation");
const opacityInput = document.getElementById("opacity");
const spacingXInput = document.getElementById("spacingX");
const spacingYInput = document.getElementById("spacingY");
const iframe = document.getElementById("pdf-preview");

const sizeValue = document.getElementById("size-value");
const rotationValue = document.getElementById("rotation-value");
const opacityValue = document.getElementById("opacity-value");
const spacingXValue = document.getElementById("spacingX-value");
const spacingYValue = document.getElementById("spacingY-value");

[
    [sizeInput, sizeValue, "px"],
    [rotationInput, rotationValue, "°"],
    [opacityInput, opacityValue, "%"],
    [spacingXInput, spacingXValue, "px"],
    [spacingYInput, spacingYValue, "px"]
].forEach(([input, output, unit]) => {
    input.addEventListener("input", () => {
        output.textContent = input.value + unit;
    });
});

let currentPdfBytes;
let originalPdfBytes;

async function procesarPDF() {
    const file = upload.files[0];
    if (!file) return alert("Por favor, selecciona un PDF.");

    if (!originalPdfBytes) {
        originalPdfBytes = await file.arrayBuffer();
    }

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
        const textWidth = font.widthOfTextAtSize(text, size);
        const textHeight = font.heightAtSize(size);

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
}

previewBtn.addEventListener("click", async () => {
    const pdfBytes = await procesarPDF();
    currentPdfBytes = pdfBytes;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
});

downloadBtn.addEventListener("click", () => {
    if (!currentPdfBytes) return alert("Primero genera la vista previa.");
    const blob = new Blob([currentPdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pdf_con_marca_de_agua.pdf";
    link.click();
});

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return PDFLib.rgb(r, g, b);
}