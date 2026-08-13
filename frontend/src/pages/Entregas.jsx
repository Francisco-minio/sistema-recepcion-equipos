import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { abrirDocumentoProtegido } from '../services/api';
import FirmaPanel from '../components/FirmaPanel';
import { Tarjeta, BadgeEstado, Spinner, Input, Boton, Campo, Textarea, Alerta, VacioEstado } from '../components/ui';
import { enviarWhatsAppCliente } from '../utils/whatsapp';
import './Entregas.css';

const ESTADOS_LISTOS = 'reparado,no_reparable';

export default function Entregas() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState(null);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);

  const cargarLista = async () => {
    setCargandoLista(true);
    try {
      const { data } = await api.get('/ordenes', {
        params: {
          estados: ESTADOS_LISTOS,
          limit: 200
        }
      });
      const lista = data?.ordenes || [];
      setOrdenes(lista);
      setOrdenSeleccionadaId((actual) => {
        if (actual && lista.some((item) => item.id === actual)) return actual;
        return lista[0]?.id || null;
      });
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  useEffect(() => {
    if (!ordenSeleccionadaId) {
      setOrdenDetalle(null);
      return;
    }

    let cancelado = false;
    setCargandoDetalle(true);
    api.get(`/ordenes/${ordenSeleccionadaId}`)
      .then(({ data }) => {
        if (!cancelado) setOrdenDetalle(data);
      })
      .finally(() => {
        if (!cancelado) setCargandoDetalle(false);
      });

    return () => {
      cancelado = true;
    };
  }, [ordenSeleccionadaId]);

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    window.setTimeout(() => setMensaje(null), 4000);
  };

  const visibles = useMemo(() => {
    if (!busqueda.trim()) return ordenes;
    const valor = busqueda.trim().toLowerCase();
    return ordenes.filter((item) => (
      [
        item.numero_orden,
        item.cliente_nombre,
        item.cliente_rut,
        item.marca,
        item.modelo,
        item.numero_serie
      ].filter(Boolean).some((texto) => String(texto).toLowerCase().includes(valor))
    ));
  }, [busqueda, ordenes]);

  const ordenSeleccionada = visibles.find((item) => item.id === ordenSeleccionadaId) || ordenDetalle;
  const resumenPendientes = ordenes.filter((item) => item.estado === 'reparado').length;
  const resumenNoReparable = ordenes.filter((item) => item.estado === 'no_reparable').length;

  return (
    <div className="entregas-pagina">
      <div className="entregas-header">
        <div>
          <h1 className="entregas-titulo">Modulo de entregas</h1>
          <p className="entregas-sub">Aqui se concentran los equipos listos para retiro y la firma final del cliente.</p>
        </div>
        <div className="entregas-header-acciones">
          <Link to="/ordenes"><Boton variante="secundario">Ver todas las ordenes</Boton></Link>
          <Boton onClick={cargarLista}>Actualizar lista</Boton>
        </div>
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <div className="entregas-resumen">
        <MetricCard etiqueta="Listos para retiro" valor={resumenPendientes} tono="ok" />
        <MetricCard etiqueta="No reparables por entregar" valor={resumenNoReparable} tono="warn" />
        <MetricCard etiqueta="Pendientes totales" valor={ordenes.length} tono="info" />
      </div>

      <div className="entregas-grid">
        <Tarjeta titulo="Cola de entrega">
          <div className="entregas-busqueda">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por orden, cliente, RUT, marca, modelo o serie..."
            />
          </div>

          {cargandoLista ? (
            <Spinner texto="Cargando equipos listos para retiro..." />
          ) : visibles.length === 0 ? (
            <VacioEstado
              titulo="Sin equipos pendientes"
              descripcion="No hay ordenes listas para entrega con los filtros actuales."
            />
          ) : (
            <div className="entregas-lista">
              {visibles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`entrega-item ${item.id === ordenSeleccionadaId ? 'activa' : ''}`}
                  onClick={() => setOrdenSeleccionadaId(item.id)}
                >
                  <div className="entrega-item-top">
                    <span className="mono entrega-item-numero">{item.numero_orden}</span>
                    <BadgeEstado estado={item.estado} />
                  </div>
                  <div className="entrega-item-cliente">{item.cliente_nombre}</div>
                  <div className="entrega-item-sub">{item.cliente_contacto_nombre || 'Sin contacto registrado'}</div>
                  <div className="entrega-item-sub">
                    {[item.marca, item.modelo].filter(Boolean).join(' · ') || item.tipo_equipo}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Tarjeta>

        <div className="entregas-detalle">
          {cargandoDetalle ? (
            <Tarjeta><Spinner texto="Cargando detalle de la orden..." /></Tarjeta>
          ) : !ordenDetalle ? (
            <Tarjeta>
              <VacioEstado
                titulo="Selecciona un equipo"
                descripcion="Elige una orden lista para entrega desde la columna izquierda."
              />
            </Tarjeta>
          ) : (
            <>
              <Tarjeta
                titulo={ordenDetalle.numero_orden}
                acciones={(
                  <div className="entregas-header-acciones">
                    <Boton
                      variante="secundario"
                      onClick={() => enviarWhatsAppCliente({
                        telefono: ordenDetalle.cliente_telefono,
                        tipo: 'listo_retiro',
                        clienteNombre: ordenDetalle.cliente_contacto_nombre || ordenDetalle.cliente_nombre,
                        numeroOrden: ordenDetalle.numero_orden,
                        equipo: [ordenDetalle.marca, ordenDetalle.modelo].filter(Boolean).join(' ') || ordenDetalle.tipo_equipo,
                        monto: ordenDetalle.presupuesto_monto
                      })}
                    >
                      Avisar por WhatsApp
                    </Boton>
                    <Boton variante="secundario" onClick={() => abrirDocumentoProtegido(`/ordenes/${ordenDetalle.id}/pdf/ingreso`)}>
                      Ver comprobante
                    </Boton>
                  </div>
                )}
              >
                <div className="entregas-ficha-grid">
                  <div className="entregas-ficha-bloque">
                    <span className="entregas-ficha-etiqueta">Empresa / cliente</span>
                    <strong>{ordenDetalle.cliente_nombre}</strong>
                  </div>
                  <div className="entregas-ficha-bloque">
                    <span className="entregas-ficha-etiqueta">Contacto</span>
                    <strong>{ordenDetalle.cliente_contacto_nombre || '-'}</strong>
                  </div>
                  <div className="entregas-ficha-bloque">
                    <span className="entregas-ficha-etiqueta">Telefono</span>
                    <strong>{ordenDetalle.cliente_telefono || '-'}</strong>
                  </div>
                  <div className="entregas-ficha-bloque">
                    <span className="entregas-ficha-etiqueta">Equipo</span>
                    <strong>{[ordenDetalle.marca, ordenDetalle.modelo].filter(Boolean).join(' · ') || ordenDetalle.tipo_equipo}</strong>
                  </div>
                  <div className="entregas-ficha-bloque">
                    <span className="entregas-ficha-etiqueta">Serie</span>
                    <strong className="mono">{ordenDetalle.numero_serie || '-'}</strong>
                  </div>
                  <div className="entregas-ficha-bloque">
                    <span className="entregas-ficha-etiqueta">Tecnico asignado</span>
                    <strong>{ordenDetalle.tecnico_asignado_nombre || 'Sin asignar'}</strong>
                  </div>
                </div>

                <div className="entregas-notas">
                  <div>
                    <span className="entregas-ficha-etiqueta">Falla reportada</span>
                    <p>{ordenDetalle.falla_reportada || '-'}</p>
                  </div>
                  <div>
                    <span className="entregas-ficha-etiqueta">Diagnostico</span>
                    <p>{ordenDetalle.diagnostico || 'Sin diagnostico registrado.'}</p>
                  </div>
                  <div>
                    <span className="entregas-ficha-etiqueta">Observaciones de ingreso</span>
                    <p>{ordenDetalle.observaciones_ingreso || '-'}</p>
                  </div>
                </div>
              </Tarjeta>

              <EntregaRapidaPanel
                orden={ordenDetalle}
                onEntregado={(ordenActualizada) => {
                  mostrarMensaje(`Entrega registrada para ${ordenActualizada.numero_orden}.`);
                  setOrdenes((prev) => prev.filter((item) => item.id !== ordenActualizada.id));
                  setOrdenDetalle(ordenActualizada);
                  setOrdenSeleccionadaId((actual) => {
                    if (actual !== ordenActualizada.id) return actual;
                    const restantes = visibles.filter((item) => item.id !== ordenActualizada.id);
                    return restantes[0]?.id || null;
                  });
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ etiqueta, valor, tono }) {
  return (
    <div className={`entregas-metrica entregas-metrica-${tono}`}>
      <strong>{valor}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}

function EntregaRapidaPanel({ orden, onEntregado }) {
  const [nombre, setNombre] = useState(orden.cliente_contacto_nombre || orden.cliente_nombre || '');
  const [rut, setRut] = useState(orden.cliente_rut || '');
  const [observaciones, setObservaciones] = useState('');
  const [firmaData, setFirmaData] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setNombre(orden.cliente_contacto_nombre || orden.cliente_nombre || '');
    setRut(orden.cliente_rut || '');
    setObservaciones('');
    setFirmaData(null);
    setError(null);
  }, [orden.id, orden.cliente_contacto_nombre, orden.cliente_nombre, orden.cliente_rut]);

  const puedeEntregar = orden.estado === 'reparado' || orden.estado === 'no_reparable';

  const registrarEntrega = async () => {
    setError(null);
    if (!firmaData || !nombre.trim() || !rut.trim()) {
      setError('Completa el nombre, RUT y la firma del cliente para registrar la entrega.');
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post(`/ordenes/${orden.id}/entrega`, {
        firma_entrega_nombre: nombre,
        firma_entrega_rut: rut,
        firma_entrega_data: firmaData,
        observaciones_entrega: observaciones
      });
      onEntregado(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la entrega.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo="Registrar entrega">
      {!puedeEntregar && (
        <Alerta tipo="warn">
          Esta orden aun no esta en una etapa valida para ser entregada.
        </Alerta>
      )}
      <div className="entregas-form-grid">
        <Campo etiqueta="Nombre de quien retira" requerido>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!puedeEntregar} />
        </Campo>
        <Campo etiqueta="RUT de quien retira" requerido>
          <Input value={rut} onChange={(e) => setRut(e.target.value)} disabled={!puedeEntregar} />
        </Campo>
      </div>
      <Campo etiqueta="Observaciones de entrega">
        <Textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={!puedeEntregar}
          placeholder="Ej: Se entrega con cargador, equipo probado en recepcion, cliente confirma conformidad."
        />
      </Campo>
      {puedeEntregar && (
        <>
          <FirmaPanel etiqueta="Firma de conformidad de entrega" onCambio={setFirmaData} />
          {error && <Alerta tipo="error">{error}</Alerta>}
          <div className="entregas-form-acciones">
            <Link to={`/ordenes/${orden.id}`}><Boton variante="secundario">Abrir orden completa</Boton></Link>
            <Boton onClick={registrarEntrega} disabled={enviando}>
              {enviando ? 'Registrando entrega...' : 'Confirmar entrega'}
            </Boton>
          </div>
        </>
      )}
    </Tarjeta>
  );
}
