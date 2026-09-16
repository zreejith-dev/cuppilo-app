// Renders a QR code into a container element. Uses the `qrcode` package
// (real, published lib: https://www.npmjs.com/package/qrcode) loaded from a
// CDN in index.html as a global `QRCode`. No custom QR encoding logic here —
// don't reinvent that.

export function renderQrCode(containerEl, payload) {
  containerEl.innerHTML = '';
  const canvas = document.createElement('canvas');
  containerEl.appendChild(canvas);

  // `QRCode.toCanvas` is the real API of the `qrcode` UMD build.
  window.QRCode.toCanvas(canvas, payload, { width: 180, margin: 1 }, (err) => {
    if (err) {
      console.error('QR render failed:', err);
      containerEl.textContent = payload; // fallback: show the raw code as text
    }
  });
}
