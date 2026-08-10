import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { abrirDocumentoProtegido } from '../services/api';
import FirmaPanel from '../components/FirmaPanel';
import { useAuth } from '../context/AuthContext';
import { Tarjeta, BadgeEstado, Spinner, Campo, Input, Select, Textarea, Boton, Alerta, VacioEstado } from '../components/ui';
import { enviarWhatsAppCliente } from '../utils/whatsapp';
import './DetalleOrden.css';

const TRANSICIONES_ESTADO = [
  { value: 'ingresado', label: 'Ingresado' },
  { value: 'en_diagnostico', label: 'En diagnostico' },
  { value: 'en_reparacion', label: 'En reparacion' },
  { value: 'esperando_aprobacion', label: 'Esperando aprobacion del cliente' },
  { value: 'reparado', label: 'Reparado (listo para entrega)' },
  { value: 'no_reparable', label: 'No reparable' },
  { value: 'cancelado', label: 'Cancelado' }
];

function obtenerUrlFoto(rutaArchivo) {
  if (!rutaArchivo) return '';
  return `/uploads/${rutaArchivo}`;
}

export default function DetalleOrden() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tecnicos, setTecnicos] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(() => {
    api.get(`/ordenes/${id}`).then(({ data }) => setOrden(data)).finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    cargar();
    api.get('/usuarios/tecnicos').then(({ data }) => setTecnicos(data));
  }, [cargar]);

  if (cargando) return <Spinner texto="Cargando orden..." />;
  if (!orden) return <VacioEstado titulo="Orden no encontrada" descripcion="Revisa el enlace o vuelve al listado." />;

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirPdf = async (tipo) => {
    try {
      await abrirDocumentoProtegido(`/ordenes/${orden.id}/pdf/${tipo}`);
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'No se pudo abrir el comprobante.', 'error');
    }
  };

  const enviarWhatsApp = (tipoNotificacion = 'listo_retiro') => {
    enviarWhatsAppCliente({
      telefono: orden.cliente_telefono,
      tipo: orden.estado === 'reparado' ? 'listo_retiro' : orden.estado === 'esperando_aprobacion' ? 'presupuesto' : 'ingreso',
      clienteNombre: orden.cliente_contacto_nombre || orden.cliente_nombre,
      numeroOrden: orden.numero_orden,
      equipo: [orden.marca, orden.modelo].filter(Boolean).join(' ') || orden.tipo_equipo,
      monto: orden.presupuesto_monto
    });
  };

  const puedeSubirFotos = ['admin', 'recepcion', 'tecnico'].includes(usuario?.rol);
  const puedeEditarFotos = ['admin', 'tecnico'].includes(usuario?.rol);
  const puedeEliminarFotos = usuario?.rol === 'admin';

  return (
    <div className="detalle-pagina">
      <div className="detalle-header">
        <div>
          <Link to="/ordenes" className="detalle-volver">← Volver a ordenes</Link>
          <h1 className="detalle-titulo mono">{orden.numero_orden}</h1>
          <div className="detalle-badges">
            <BadgeEstado estado={orden.estado} />
            <span className="detalle-fecha">Ingresado el {new Date(orden.creado_en).toLocaleDateString('es-CL', { dateStyle: 'long' })}</span>
          </div>
        </div>
        <div className="detalle-acciones-pdf" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Boton variante="secundario" style={{ backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }} onClick={enviarWhatsApp}>
            💬 Avisar por WhatsApp
          </Boton>
          <Boton variante="secundario" onClick={() => abrirPdf('ingreso')}>🖨 Comprobante de ingreso</Boton>
          {orden.firma_entrega_data && (
            <Boton variante="secundario" onClick={() => abrirPdf('entrega')}>🖨 Comprobante de entrega</Boton>
          )}
        </div>
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <div className="detalle-grid">
        <div className="detalle-col-principal">
          <Tarjeta titulo="Datos del cliente">
            <FilaInfo etiqueta="Empresa / cliente" valor={orden.cliente_nombre} />
            <FilaInfo etiqueta="Razon social" valor={orden.cliente_empresa} />
            <FilaInfo etiqueta="RUT" valor={orden.cliente_rut} mono />
            <FilaInfo etiqueta="Contacto de esta orden" valor={orden.cliente_contacto_nombre} />
            <FilaInfo etiqueta="Telefono de contacto" valor={orden.cliente_telefono} />
            <FilaInfo etiqueta="Email de contacto" valor={orden.cliente_email} />
            <FilaInfo etiqueta="Direccion de contacto" valor={orden.cliente_direccion} />
          </Tarjeta>

          <Tarjeta titulo="Datos del equipo">
            <FilaInfo etiqueta="Tipo" valor={orden.tipo_equipo} capitalize />
            <FilaInfo etiqueta="Marca / Modelo" valor={[orden.marca, orden.modelo].filter(Boolean).join(' / ') || '-'} />
            <FilaInfo etiqueta="N° de serie" valor={orden.numero_serie} mono />
            <FilaInfo etiqueta="Color" valor={orden.color} />
            <FilaInfo etiqueta="Accesorios" valor={orden.accesorios?.length ? orden.accesorios.join(', ') : 'Ninguno'} />
            <FilaInfo etiqueta="Clave de acceso" valor={orden.clave_acceso_entregada ? 'Entregada y resguardada' : 'No proporcionada'} />
            <FilaInfo etiqueta="Falla reportada" valor={orden.falla_reportada} bloque />
            <FilaInfo etiqueta="Estado fisico al ingreso" valor={orden.estado_fisico} bloque />
          </Tarjeta>

          <FotosPanel
            orden={orden}
            puedeSubirFotos={puedeSubirFotos}
            puedeEditarFotos={puedeEditarFotos}
            puedeEliminarFotos={puedeEliminarFotos}
            onActualizado={async (texto, tipo = 'ok') => {
              await cargar();
              mostrarMensaje(texto, tipo);
            }}
          />

          <DiagnosticoPanel orden={orden} tecnicos={tecnicos} onActualizado={(o) => { setOrden(o); mostrarMensaje('Diagnostico actualizado.'); }} />

          {!orden.firma_entrega_data && (
            <EntregaPanel orden={orden} onEntregado={(o) => { setOrden(o); mostrarMensaje('Entrega registrada correctamente.'); }} />
          )}

          {orden.firma_entrega_data && (
            <Tarjeta titulo="Entrega registrada">
              <FilaInfo etiqueta="Recibido por (cliente)" valor={orden.firma_entrega_nombre} />
              <FilaInfo etiqueta="RUT" valor={orden.firma_entrega_rut} mono />
              <FilaInfo etiqueta="Fecha de entrega" valor={new Date(orden.firma_entrega_fecha).toLocaleString('es-CL')} />
              <FilaInfo etiqueta="Entrega registrada por" valor={orden.usuario_entrega_nombre} />
              <FilaInfo etiqueta="Observaciones" valor={orden.observaciones_entrega} bloque />
            </Tarjeta>
          )}
        </div>

        <div className="detalle-col-lateral">
          <Tarjeta titulo="Asignacion">
            <FilaInfo etiqueta="Tecnico asignado" valor={orden.tecnico_asignado_nombre || 'Sin asignar'} />
            <FilaInfo etiqueta="Recibido por" valor={orden.usuario_recibe_nombre} />
          </Tarjeta>

          <Tarjeta titulo="Estado de la orden">
            <EstadoPanel orden={orden} onActualizado={(o) => { setOrden(o); mostrarMensaje('Estado actualizado.'); }} />
          </Tarjeta>

          <Tarjeta titulo="Notificaciones">
            <NotificacionesPanel
              orden={orden}
              onActualizado={(o, texto, tipo = 'ok') => {
                setOrden(o);
                mostrarMensaje(texto, tipo);
              }}
            />
          </Tarjeta>

          <Tarjeta titulo="Historial">
            <div className="detalle-historial">
              {orden.historial?.length ? orden.historial.slice().reverse().map((h) => (
                <div key={h.id} className="detalle-historial-item">
                  <div className="detalle-historial-punto" />
                  <div>
                    <div className="detalle-historial-texto">{h.comentario || `Estado: ${h.estado_nuevo}`}</div>
                    <div className="detalle-historial-meta">
                      {h.usuario_nombre || 'Sistema'} · {new Date(h.creado_en).toLocaleString('es-CL')}
                    </div>
                  </div>
                </div>
              )) : <p className="ingreso-nota">Sin movimientos registrados.</p>}
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

function FilaInfo({ etiqueta, valor, mono, capitalize, bloque }) {
  return (
    <div className={`fila-info ${bloque ? 'fila-info-bloque' : ''}`}>
      <span className="fila-info-etiqueta">{etiqueta}</span>
      <span className={`fila-info-valor ${mono ? 'mono' : ''}`} style={capitalize ? { textTransform: 'capitalize' } : undefined}>
        {valor || '-'}
      </span>
    </div>
  );
}

function EstadoPanel({ orden, onActualizado }) {
  const [estado, setEstado] = useState(orden.estado);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setEstado(orden.estado);
  }, [orden.estado]);

  const guardar = async () => {
    setEnviando(true);
    try {
      const { data } = await api.patch(`/ordenes/${orden.id}/estado`, { estado, comentario: comentario || undefined });
      onActualizado(data);
      setComentario('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <Campo etiqueta="Cambiar estado">
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          {TRANSICIONES_ESTADO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          <option value="entregado" disabled>Entregado (usar formulario de entrega)</option>
        </Select>
      </Campo>
      <Campo etiqueta="Comentario (opcional)">
        <Input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej: Se solicito repuesto" />
      </Campo>
      <Boton ancho="100%" onClick={guardar} disabled={enviando || estado === orden.estado}>
        {enviando ? 'Guardando...' : 'Actualizar estado'}
      </Boton>
    </div>
  );
}

function DiagnosticoPanel({ orden, tecnicos, onActualizado }) {
  const [diagnostico, setDiagnostico] = useState(orden.diagnostico || '');
  const [presupuesto, setPresupuesto] = useState(orden.presupuesto_monto || '');
  const [tecnicoId, setTecnicoId] = useState(orden.tecnico_asignado_id || '');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setDiagnostico(orden.diagnostico || '');
    setPresupuesto(orden.presupuesto_monto || '');
    setTecnicoId(orden.tecnico_asignado_id || '');
  }, [orden.diagnostico, orden.presupuesto_monto, orden.tecnico_asignado_id]);

  const guardar = async () => {
    setEnviando(true);
    try {
      const { data } = await api.patch(`/ordenes/${orden.id}/diagnostico`, {
        diagnostico, presupuesto_monto: presupuesto ? Number(presupuesto) : null,
        tecnico_asignado_id: tecnicoId ? Number(tecnicoId) : null
      });
      onActualizado(data);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo="Diagnostico y presupuesto">
      <div className="ingreso-grid-2">
        <Campo etiqueta="Tecnico asignado">
          <Select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="Presupuesto (CLP)">
          <Input type="number" min="0" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="0" />
        </Campo>
      </div>
      <Campo etiqueta="Diagnostico tecnico">
        <Textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Describe el diagnostico encontrado" />
      </Campo>
      {orden.presupuesto_monto > 0 && (
        <div className="detalle-aprobacion-estado">
          Presupuesto: <strong>{orden.presupuesto_aprobado ? 'Aprobado por el cliente' : 'Pendiente de aprobacion'}</strong>
        </div>
      )}
      <Boton onClick={guardar} disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar diagnostico'}</Boton>
    </Tarjeta>
  );
}

function EntregaPanel({ orden, onEntregado }) {
  const [nombre, setNombre] = useState(orden.cliente_contacto_nombre || orden.cliente_nombre || '');
  const [rut, setRut] = useState(orden.cliente_rut || '');
  const [observaciones, setObservaciones] = useState('');
  const [firmaData, setFirmaData] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setNombre(orden.cliente_contacto_nombre || orden.cliente_nombre || '');
    setRut(orden.cliente_rut || '');
  }, [orden.cliente_contacto_nombre, orden.cliente_nombre, orden.cliente_rut]);

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
    <Tarjeta titulo="Entrega del equipo">
      {!puedeEntregar && (
        <Alerta tipo="warn">
          La orden debe estar en estado "Reparado" o "No reparable" antes de poder registrar la entrega.
        </Alerta>
      )}
      <div className="ingreso-grid-2">
        <Campo etiqueta="Nombre de quien retira" requerido>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!puedeEntregar} />
        </Campo>
        <Campo etiqueta="RUT de quien retira" requerido>
          <Input value={rut} onChange={(e) => setRut(e.target.value)} disabled={!puedeEntregar} />
        </Campo>
      </div>
      <Campo etiqueta="Observaciones de entrega">
        <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} disabled={!puedeEntregar} placeholder="Ej: Se entrega con respaldo de datos en pendrive del cliente" />
      </Campo>

      {puedeEntregar && (
        <>
          <FirmaPanel etiqueta="Firma de conformidad de entrega" onCambio={setFirmaData} />
          {error && <Alerta tipo="error">{error}</Alerta>}
          <div style={{ marginTop: 14 }}>
            <Boton onClick={registrarEntrega} disabled={enviando}>
              {enviando ? 'Registrando...' : 'Registrar entrega'}
            </Boton>
          </div>
        </>
      )}
    </Tarjeta>
  );
}

function FotosPanel({ orden, puedeSubirFotos, puedeEditarFotos, puedeEliminarFotos, onActualizado }) {
  const [tipoNuevaFoto, setTipoNuevaFoto] = useState('diagnostico');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const fotos = orden.fotos || [];

  const guardarOrden = async (fotosOrdenadas) => {
    for (let i = 0; i < fotosOrdenadas.length; i += 1) {
      const foto = fotosOrdenadas[i];
      await api.patch(`/ordenes/${orden.id}/fotos/${foto.id}`, {
        tipo: foto.tipo,
        posicion: i
      });
    }
  };

  const moverFoto = async (fotoId, direccion) => {
    const indice = fotos.findIndex((foto) => foto.id === fotoId);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= fotos.length) return;

    const copia = fotos.slice();
    const temporal = copia[indice];
    copia[indice] = copia[destino];
    copia[destino] = temporal;

    setProcesandoId(fotoId);
    try {
      await guardarOrden(copia);
      await onActualizado('Orden de fotos actualizado.');
    } finally {
      setProcesandoId(null);
    }
  };

  const cambiarTipo = async (foto, tipo) => {
    setProcesandoId(foto.id);
    try {
      await api.patch(`/ordenes/${orden.id}/fotos/${foto.id}`, {
        tipo,
        posicion: foto.posicion
      });
      await onActualizado('Tipo de foto actualizado.');
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarFoto = async (foto) => {
    setProcesandoId(foto.id);
    try {
      await api.delete(`/ordenes/${orden.id}/fotos/${foto.id}`);
      await onActualizado('Foto eliminada.');
    } finally {
      setProcesandoId(null);
    }
  };

  const subirFoto = async () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append('foto', archivo, archivo.name);
    formData.append('tipo', tipoNuevaFoto);

    setEnviando(true);
    try {
      await api.post(`/ordenes/${orden.id}/fotos`, formData);
      setArchivo(null);
      await onActualizado('Foto agregada correctamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo={`Registro fotografico (${fotos.length})`}>
      {puedeSubirFotos && (
        <div className="detalle-fotos-toolbar">
          <Campo etiqueta="Tipo de foto">
            <Select value={tipoNuevaFoto} onChange={(e) => setTipoNuevaFoto(e.target.value)}>
              <option value="ingreso">Ingreso</option>
              <option value="diagnostico">Diagnostico</option>
              <option value="entrega">Entrega</option>
            </Select>
          </Campo>
          <Campo etiqueta="Agregar imagen">
            <Input type="file" accept="image/*,.heic,.heif" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
          </Campo>
          <div className="detalle-fotos-toolbar-accion">
            <Boton onClick={subirFoto} disabled={!archivo || enviando}>{enviando ? 'Subiendo...' : 'Subir foto'}</Boton>
          </div>
        </div>
      )}

      {fotos.length ? (
        <div className="detalle-fotos-grid">
          {fotos.map((foto, indice) => (
            <div key={foto.id} className="detalle-foto-card detalle-foto-card-admin">
              <a href={obtenerUrlFoto(foto.ruta_archivo)} target="_blank" rel="noreferrer">
                <img
                  src={obtenerUrlFoto(foto.ruta_archivo)}
                  alt={foto.nombre_original || `Foto ${foto.id}`}
                  className="detalle-foto-img"
                  loading="lazy"
                />
              </a>
              <div className="detalle-foto-meta detalle-foto-meta-stack">
                <span>{foto.nombre_original || `Foto ${foto.id}`}</span>
                <strong>{foto.tipo}</strong>
              </div>
              <div className="detalle-foto-acciones">
                {puedeEditarFotos ? (
                  <Select value={foto.tipo} onChange={(e) => cambiarTipo(foto, e.target.value)} disabled={procesandoId === foto.id}>
                    <option value="ingreso">Ingreso</option>
                    <option value="diagnostico">Diagnostico</option>
                    <option value="entrega">Entrega</option>
                  </Select>
                ) : (
                  <div className="detalle-foto-tipo">{foto.tipo}</div>
                )}
                <div className="detalle-foto-botones">
                  {puedeEditarFotos && (
                    <>
                      <button type="button" className="link-accion" onClick={() => moverFoto(foto.id, -1)} disabled={indice === 0 || procesandoId === foto.id}>↑</button>
                      <button type="button" className="link-accion" onClick={() => moverFoto(foto.id, 1)} disabled={indice === fotos.length - 1 || procesandoId === foto.id}>↓</button>
                    </>
                  )}
                  {puedeEliminarFotos && (
                    <button type="button" className="link-accion link-accion-danger" onClick={() => eliminarFoto(foto)} disabled={procesandoId === foto.id}>Eliminar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ingreso-nota">Esta orden no tiene fotos asociadas aun.</p>
      )}
    </Tarjeta>
  );
}

function NotificacionesPanel({ orden, onActualizado }) {
  const [reenviando, setReenviando] = useState(false);
  const notificaciones = orden.notificaciones || [];
  const correo = notificaciones.filter((item) => item.canal === 'email');

  const reenviar = async () => {
    setReenviando(true);
    try {
      const { data } = await api.post(`/ordenes/${orden.id}/reenviar-correo`);
      onActualizado(
        data.orden,
        data.estado === 'enviado' ? 'Correo reenviado al cliente.' : (data.detalle || 'No fue posible reenviar el correo.'),
        data.estado === 'enviado' ? 'ok' : 'warn'
      );
    } catch (err) {
      onActualizado(orden, err.response?.data?.error || 'No se pudo reenviar el correo.', 'error');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="detalle-notificaciones">
      <FilaInfo etiqueta="Correo cliente" valor={orden.cliente_email || 'No definido'} />
      {orden.cliente_email && (
        <Boton ancho="100%" variante="secundario" onClick={reenviar} disabled={reenviando}>
          {reenviando ? 'Reenviando...' : 'Reenviar correo'}
        </Boton>
      )}
      {correo.length ? (
        <div className="detalle-notificaciones-lista">
          {correo.map((item) => (
            <div key={item.id} className="detalle-notificacion-item">
              <div className="detalle-notificacion-top">
                <strong>{item.evento.replace(/_/g, ' ')}</strong>
                <span className={`detalle-notificacion-estado estado-${item.estado}`}>{item.estado}</span>
              </div>
              <div className="detalle-notificacion-meta">
                {new Date(item.creado_en).toLocaleString('es-CL')}
              </div>
              {item.detalle && (
                <div className="detalle-notificacion-detalle">{item.detalle}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="ingreso-nota">Aun no hay envios registrados para esta orden.</p>
      )}
    </div>
  );
}
