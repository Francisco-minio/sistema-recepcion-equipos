import { useRef, useState, useEffect, useCallback } from 'react';
import './FirmaPanel.css';

/**
 * Panel de firma digital sobre canvas.
 * Funciona con mouse y con touch (tablets / celulares en el mostrador).
 * Expone la firma como dataURL PNG via onCambio.
 */
export default function FirmaPanel({ onCambio, etiqueta = 'Firma del cliente' }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const ultimoPunto = useRef(null);
  const tieneFirmaRef = useRef(false);
  const [tieneFirma, setTieneFirma] = useState(false);

  const obtenerContexto = () => canvasRef.current.getContext('2d');

  const ajustarTamano = useCallback(() => {
    const canvas = canvasRef.current;
    const contenedor = canvas.parentElement;
    const ratio = window.devicePixelRatio || 1;

    // Preserva el dibujo existente al redimensionar (ej. al rotar pantalla)
    const imagenPrevia = canvas.width > 0 ? canvas.toDataURL() : null;

    canvas.width = contenedor.clientWidth * ratio;
    canvas.height = 180 * ratio;
    canvas.style.width = '100%';
    canvas.style.height = '180px';

    const ctx = obtenerContexto();
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c2128';

    if (imagenPrevia && tieneFirmaRef.current) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / ratio, canvas.height / ratio);
      img.src = imagenPrevia;
    }
  }, []);

  useEffect(() => {
    ajustarTamano();
    window.addEventListener('resize', ajustarTamano);
    return () => window.removeEventListener('resize', ajustarTamano);
  }, [ajustarTamano]);

  const obtenerPunto = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const iniciarTrazo = (e) => {
    e.preventDefault();
    dibujando.current = true;
    ultimoPunto.current = obtenerPunto(e);
  };

  const trazar = (e) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const ctx = obtenerContexto();
    const punto = obtenerPunto(e);
    ctx.beginPath();
    ctx.moveTo(ultimoPunto.current.x, ultimoPunto.current.y);
    ctx.lineTo(punto.x, punto.y);
    ctx.stroke();
    ultimoPunto.current = punto;
    if (!tieneFirma) {
      tieneFirmaRef.current = true;
      setTieneFirma(true);
    }
  };

  const terminarTrazo = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    emitirCambio();
  };

  const emitirCambio = () => {
    const canvas = canvasRef.current;
    const vacio = esCanvasVacio(canvas);
    onCambio(vacio ? null : canvas.toDataURL('image/png'));
  };

  const esCanvasVacio = (canvas) => {
    const ctx = canvas.getContext('2d');
    const datos = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < datos.length; i += 4) {
      if (datos[i] !== 0) return false;
    }
    return true;
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = obtenerContexto();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tieneFirmaRef.current = false;
    setTieneFirma(false);
    onCambio(null);
  };

  return (
    <div className="firma-panel">
      <div className="firma-panel-header">
        <span className="firma-panel-etiqueta">{etiqueta}</span>
        <button type="button" className="firma-panel-limpiar" onClick={limpiar}>
          Limpiar
        </button>
      </div>
      <div className="firma-panel-lienzo">
        <canvas
          ref={canvasRef}
          onMouseDown={iniciarTrazo}
          onMouseMove={trazar}
          onMouseUp={terminarTrazo}
          onMouseLeave={terminarTrazo}
          onTouchStart={iniciarTrazo}
          onTouchMove={trazar}
          onTouchEnd={terminarTrazo}
        />
        {!tieneFirma && (
          <span className="firma-panel-placeholder">Firme aqui con el mouse, dedo o lapiz</span>
        )}
        <div className="firma-panel-linea" />
      </div>
    </div>
  );
}
