const QRCode = require('qrcode');

async function generateQRCode(storeId) {
  try {
    // Generate QR code data URL
    const qrData = {
      store_id: storeId,
      timestamp: new Date().toISOString(),
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 8,
    });

    return {
      qr_code: qrCodeDataUrl,
      store_id: storeId,
    };
  } catch (error) {
    console.error('QR generation failed:', error);
    throw error;
  }
}

module.exports = { generateQRCode };
