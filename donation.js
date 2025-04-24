// Elementos del DOM
const openModalButton = document.getElementById('open-qr-modal');
const qrModal = document.getElementById('qr-modal');
const closeButton = document.getElementById('close-qr-modal');
const qrCanvas = document.getElementById('qr-code');

// URL para el código QR (puedes cambiarla por la que necesites)
const qrValue = "00020101021126250021Cl 15 # 7a-4 La Playa5204729953031705802CO5920IVAN ULLOQUE ATENCIA6012BARRANQUILLA6221021030068085030703CEL64300002ES0120IVAN ULLOQUE ATENCIA92290012co.com.nequi0109P2P.NEQUI630407E5";

// Función para generar el código QR
function generateQRCode() {
    QRCode.toCanvas(qrCanvas, qrValue, {
        width: 250,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function (error) {
        if (error) console.error('Error al generar el código QR:', error);
    });
}

// Función para abrir la modal
function openQrModal() {
    qrModal.style.display = 'flex';
    generateQRCode();
}

// Función para cerrar la modal
function closeQrModal() {
    qrModal.style.display = 'none';
}

// Event listeners
openModalButton.addEventListener('click', openQrModal);
closeButton.addEventListener('click', closeQrModal);

// Cerrar la modal haciendo clic fuera del contenido
window.addEventListener('click', function (event) {
    if (event.target === qrModal) {
        closeQrModal();
    }
});

// Cerrar la modal con la tecla Escape
window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && qrModal.style.display === 'flex') {
        closeQrModal();
    }
});