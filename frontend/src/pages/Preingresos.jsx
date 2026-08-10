import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { Tarjeta, Boton, BadgeEstado, Spinner, Alerta, Input } from '../components/ui';
import logoBackupcode from '../assets/backupcode-login-logo.jpg';
import './Preingresos.css';

export default function Preingresos() {
  const [preingresos, setPreingresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [filtro, setFiltro] = useState('');
  const origen = useMemo(() => window.location.origin, []);

  const cargar = () => {
    setCargando(true);
    api.get('/preingresos')
      .then(({ data }) => setPreingresos(data || []))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const crearEnlace = async () => {
    const { data } = await api.post('/preingresos');
    setPreingresos((prev) => [data, ...prev]);
    mostrarMensaje(`Enlace generado para ${data.codigo_servicio}.`);
  };

  const copiar = async (preingreso) => {
    const url = `${origen}/solicitud/${preingreso.token_acceso}`;
    try {
      await copiarTexto(url);
      mostrarMensaje(`Enlace copiado para ${preingreso.codigo_servicio}.`);
    } catch (err) {
      mostrarMensaje('No se pudo copiar automaticamente. Abre el formulario y copia la URL manualmente.', 'warn');
    }
  };

  const abrirFormulario = (preingreso) => {
    const url = `${origen}/solicitud/${preingreso.token_acceso}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const compartir = async (preingreso) => {
    const url = `${origen}/solicitud/${preingreso.token_acceso}`;
    const texto = `Hola, te compartimos tu formulario de preingreso para servicio tecnico Backupcode. Completa tus datos aqui: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Preingreso ${preingreso.codigo_servicio}`,
          text: texto,
          url
        });
        mostrarMensaje(`Enlace compartido para ${preingreso.codigo_servicio}.`);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    mostrarMensaje(`Abriendo envio para ${preingreso.codigo_servicio}.`);
  };

  const reenviarCorreo = async (preingreso) => {
    try {
      const { data } = await api.post(`/preingresos/${preingreso.id}/reenviar-correo`);
      setPreingresos((prev) => prev.map((item) => (
        item.id === preingreso.id ? data.preingreso : item
      )));
      mostrarMensaje(
        data.estado === 'enviado'
          ? `Correo reenviado para ${preingreso.codigo_servicio}.`
          : data.detalle || 'No fue posible reenviar el correo.',
        data.estado === 'enviado' ? 'ok' : 'warn'
      );
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'No se pudo reenviar el correo.', 'error');
    }
  };

  const visibles = preingresos.filter((item) => {
    if (!filtro.trim()) return true;
    const valor = filtro.trim().toLowerCase();
    return [
      item.codigo_servicio,
      item.cliente_nombre,
      item.cliente_rut,
      item.marca,
      item.modelo
    ].filter(Boolean).some((texto) => String(texto).toLowerCase().includes(valor));
  });

  return (
    <div className="preingresos-pagina">
      <Tarjeta padding={false}>
        <div className="preingresos-hero">
          <div className="preingresos-hero-copy">
            <span className="preingresos-kicker">Backupcode</span>
            <h1 className="preingresos-titulo">Preingresos del cliente</h1>
            <p className="preingresos-sub">
              Genera un enlace publico para que el cliente complete los datos basicos antes de llegar a recepcion.
            </p>
            <div className="preingresos-pasos">
              <span>1. Genera el enlace</span>
              <span>2. Envialo al cliente</span>
              <span>3. Usa el codigo al recepcionar</span>
            </div>
          </div>
          <div className="preingresos-hero-brand">
            <img src={logoBackupcode} alt="Backupcode Soluciones IT" className="preingresos-logo" />
          </div>
        </div>
      </Tarjeta>

      <div className="preingresos-header">
        <div>
          <h2 className="preingresos-accion-titulo">Generar y enviar</h2>
          <p className="preingresos-accion-sub">Puedes compartir el formulario por WhatsApp, abrirlo para revisar como se vera o copiar el enlace manualmente.</p>
        </div>
        <Boton onClick={crearEnlace}>+ Generar enlace</Boton>
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <Tarjeta>
        <Input
          placeholder="Buscar por codigo, nombre, RUT, marca o modelo..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </Tarjeta>

      <Tarjeta padding={false}>
        {cargando ? (
          <Spinner texto="Cargando preingresos..." />
        ) : visibles.length === 0 ? (
          <div className="preingresos-vacio">Aun no hay enlaces generados o no hay coincidencias con la busqueda.</div>
        ) : (
          <div className="preingresos-lista">
            {visibles.map((item) => (
              <div key={item.id} className="preingreso-item">
                <div>
                  <div className="preingreso-item-top">
                    <span className="mono preingreso-codigo">{item.codigo_servicio}</span>
                    <BadgeEstado estado={mapearEstado(item.estado)} />
                  </div>
                  <div className="preingreso-item-main">{item.cliente_nombre || 'Pendiente de completar por cliente'}</div>
                  <div className="preingreso-item-sub">
                    {item.cliente_rut || 'Sin RUT'} · {item.marca || 'Sin marca'} {item.modelo || ''}
                  </div>
                  <div className="preingreso-item-sub">
                    {item.enviado_en ? `Enviado ${new Date(item.enviado_en).toLocaleString('es-CL')}` : 'Enlace generado, aun no respondido'}
                  </div>
                  {item.ultima_notificacion_email_estado && (
                    <div className="preingreso-item-sub">
                      Correo cliente: {formatearEstadoNotificacion(item.ultima_notificacion_email_estado)}
                      {item.ultima_notificacion_email_fecha ? ` · ${new Date(item.ultima_notificacion_email_fecha).toLocaleString('es-CL')}` : ''}
                    </div>
                  )}
                  {item.ultima_notificacion_email_detalle && item.ultima_notificacion_email_estado !== 'enviado' && (
                    <div className="preingreso-item-sub">
                      {item.ultima_notificacion_email_detalle}
                    </div>
                  )}
                  {!item.token_acceso && (
                    <div className="preingreso-item-sub">
                      El enlace publico ya fue utilizado y el token quedo invalidado.
                    </div>
                  )}
                </div>
                <div className="preingreso-item-acciones">
                  {accionesDisponibles(item) ? (
                    <>
                      <Boton variante="secundario" onClick={() => abrirFormulario(item)}>Abrir formulario</Boton>
                      <Boton variante="secundario" onClick={() => copiar(item)}>Copiar enlace</Boton>
                      <Boton onClick={() => compartir(item)}>Enviar enlace</Boton>
                    </>
                  ) : (
                    <>
                      <Boton variante="fantasma" disabled>Formulario ya enviado</Boton>
                      {item.cliente_email && (
                        <Boton variante="secundario" onClick={() => reenviarCorreo(item)}>Reenviar correo</Boton>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

function mapearEstado(estado) {
  const mapa = {
    borrador: 'ingresado',
    enviado: 'en_diagnostico',
    recepcionado: 'reparado',
    cancelado: 'cancelado'
  };
  return mapa[estado] || 'ingresado';
}

function accionesDisponibles(item) {
  return Boolean(item.token_acceso) && item.estado === 'borrador';
}

function formatearEstadoNotificacion(estado) {
  const mapa = {
    enviado: 'enviado',
    fallido: 'fallido',
    omitido: 'omitido'
  };
  return mapa[estado] || estado;
}

async function copiarTexto(texto) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const input = document.createElement('input');
  input.value = texto;
  input.setAttribute('readonly', '');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, input.value.length);

  const copiado = document.execCommand('copy');
  document.body.removeChild(input);

  if (!copiado) {
    throw new Error('No se pudo copiar el texto.');
  }
}
