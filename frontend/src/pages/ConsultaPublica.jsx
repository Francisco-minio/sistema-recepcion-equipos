import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ConsultaPublica.css';

const ESTADOS_MAP = {
  ingresado: { label: 'Recibido', paso: 1, color: '#0284c7', desc: 'Su equipo fue ingresado a recepción y está en fila de revisión.' },
  en_diagnostico: { label: 'En Diagnóstico', paso: 2, color: '#eab308', desc: 'El técnico se encuentra revisando su equipo.' },
  esperando_aprobacion: { label: 'Presupuesto Listo', paso: 3, color: '#f97316', desc: 'El diagnóstico está listo. Esperando su aprobación del presupuesto.' },
  en_reparacion: { label: 'En Reparación', paso: 3, color: '#8b5cf6', desc: 'Su equipo está siendo reparado por el técnico.' },
  reparado: { label: 'Listo para Retiro', paso: 4, color: '#22c55e', desc: '¡Buenas noticias! Su equipo está listo para ser retirado en nuestra sucursal.' },
  no_reparable: { label: 'Listo para Retiro (Sin reparación)', paso: 4, color: '#ef4444', desc: 'El equipo no pudo ser reparado. Se encuentra listo para retiro.' },
  entregado: { label: 'Entregado', paso: 5, color: '#64748b', desc: 'El equipo ya fue entregado conforme.' },
  cancelado: { label: 'Cancelado', paso: 0, color: '#94a3b8', desc: 'La orden de servicio fue cancelada.' }
};

export default function ConsultaPublica() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [numeroOrden, setNumeroOrden] = useState(searchParams.get('numero') || '');
  const [rut, setRut] = useState(searchParams.get('rut') || '');
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscarOrden = (num, r) => {
    if (!num) return;
    setCargando(true);
    setError(null);

    axios.get('/api/publico/consulta', { params: { numero: num, rut: r } })
      .then(({ data }) => {
        setOrden(data);
      })
      .catch((err) => {
        setOrden(null);
        setError(err.response?.data?.error || 'No se pudo encontrar la orden de servicio. Verifique el número ingresado.');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    const num = searchParams.get('numero');
    const r = searchParams.get('rut');
    if (num) {
      buscarOrden(num, r);
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!numeroOrden.trim()) return;
    setSearchParams({ numero: numeroOrden.trim(), rut: rut.trim() });
    buscarOrden(numeroOrden.trim(), rut.trim());
  };

  const estadoInfo = orden ? (ESTADOS_MAP[orden.estado] || { label: orden.estado, paso: 1, color: '#0284c7', desc: '' }) : null;

  return (
    <div className="consulta-publica-container">
      <header className="consulta-header">
        <div className="consulta-brand">
          <div className="brand-badge">🛠️ Servicio Técnico</div>
          <h1>Seguimiento de Equipo</h1>
          <p>Consulte el avance y estado de su reparación en tiempo real</p>
        </div>
      </header>

      <main className="consulta-body">
        <div className="consulta-card search-card">
          <h2>Buscar Orden de Servicio</h2>
          <form onSubmit={handleSubmit} className="consulta-form">
            <div className="form-group">
              <label htmlFor="numeroOrden">Número de Orden</label>
              <input
                id="numeroOrden"
                type="text"
                placeholder="Ej: OS-2026-000001"
                value={numeroOrden}
                onChange={(e) => setNumeroOrden(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="rutCliente">RUT Cliente (Opcional)</label>
              <input
                id="rutCliente"
                type="text"
                placeholder="Ej: 12345678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-consultar" disabled={cargando}>
              {cargando ? 'Buscando...' : '🔍 Consultar Estado'}
            </button>
          </form>
        </div>

        {error && (
          <div className="consulta-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {orden && estadoInfo && (
          <div className="consulta-card result-card">
            <div className="orden-header">
              <div>
                <span className="orden-numero">{orden.numero_orden}</span>
                <p className="orden-cliente">Cliente: <strong>{orden.cliente_nombre}</strong></p>
              </div>
              <div className="estado-pill" style={{ backgroundColor: estadoInfo.color }}>
                {estadoInfo.label}
              </div>
            </div>

            {/* Pasos de progreso */}
            <div className="progreso-container">
              <div className={`paso-item ${estadoInfo.paso >= 1 ? 'activo' : ''}`}>
                <div className="paso-icono">📥</div>
                <span>Recibido</span>
              </div>
              <div className={`paso-linea ${estadoInfo.paso >= 2 ? 'activa' : ''}`}></div>
              <div className={`paso-item ${estadoInfo.paso >= 2 ? 'activo' : ''}`}>
                <div className="paso-icono">🔍</div>
                <span>Diagnóstico</span>
              </div>
              <div className={`paso-linea ${estadoInfo.paso >= 3 ? 'activa' : ''}`}></div>
              <div className={`paso-item ${estadoInfo.paso >= 3 ? 'activo' : ''}`}>
                <div className="paso-icono">🛠️</div>
                <span>Reparación</span>
              </div>
              <div className={`paso-linea ${estadoInfo.paso >= 4 ? 'activa' : ''}`}></div>
              <div className={`paso-item ${estadoInfo.paso >= 4 ? 'activo' : ''}`}>
                <div className="paso-icono">✅</div>
                <span>Listo para Retiro</span>
              </div>
            </div>

            <div className="estado-descripcion-box" style={{ borderColor: estadoInfo.color }}>
              <p><strong>Estado Actual:</strong> {estadoInfo.desc}</p>
            </div>

            <div className="detalles-grid">
              <div className="detalle-box">
                <h3>💻 Datos del Equipo</h3>
                <p><strong>Tipo:</strong> <span className="text-capitalize">{orden.tipo_equipo}</span></p>
                <p><strong>Marca / Modelo:</strong> {[orden.marca, orden.modelo].filter(Boolean).join(' ') || 'No especificado'}</p>
                {orden.color && <p><strong>Color:</strong> {orden.color}</p>}
                <p><strong>Falla Reportada:</strong> {orden.falla_reportada}</p>
              </div>

              <div className="detalle-box">
                <h3>📋 Accesorios e Ingreso</h3>
                <p><strong>Accesorios Entregados:</strong></p>
                {orden.accesorios && orden.accesorios.length > 0 ? (
                  <ul className="accesorios-list">
                    {orden.accesorios.map((acc, i) => (
                      <li key={i}>✓ {acc}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Ninguno registrado</p>
                )}
                {orden.estado_fisico && (
                  <p className="mt-2"><strong>Estado Físico:</strong> {orden.estado_fisico}</p>
                )}
              </div>
            </div>

            {orden.diagnostico && (
              <div className="diagnostico-box">
                <h3>🩺 Informe del Diagnóstico</h3>
                <p className="diagnostico-texto">{orden.diagnostico}</p>
                {orden.presupuesto_monto !== null && (
                  <div className="presupuesto-tag">
                    <span>Monto Presupuestado:</span>
                    <strong>${Number(orden.presupuesto_monto).toLocaleString('es-CL')} CLP</strong>
                  </div>
                )}
              </div>
            )}

            {orden.fotos && orden.fotos.length > 0 && (
              <div className="fotos-box">
                <h3>📷 Registro Fotográfico</h3>
                <div className="public-fotos-grid">
                  {orden.fotos.map((foto) => (
                    <div key={foto.id} className="foto-item">
                      <img src={`/uploads/${foto.ruta_archivo}`} alt="Foto del equipo" />
                      <span className="foto-tipo">{foto.tipo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="contacto-sucursal-box">
              <h3>📍 Ubicación y Atención</h3>
              <p>📍 <strong>Dirección:</strong> Icalma 1030, Puerto Montt</p>
              <p>📞 <strong>Teléfono:</strong> +56 9 6768 2596</p>
              <p>⏰ <strong>Horario:</strong> Lunes a Viernes de 09:00 a 18:30 hrs</p>
            </div>
          </div>
        )}
      </main>

      <footer className="consulta-footer">
        <p>© {new Date().getFullYear()} Backupcode SPA — Servicio Técnico Informático</p>
      </footer>
    </div>
  );
}
