import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tarjeta, Campo, Input, Select, Textarea, Boton, Alerta, Spinner } from '../components/ui';
import logoBackupcode from '../assets/backupcode-login-logo.jpg';
import './SolicitudPublica.css';

const DIRECCION_RECEPCION = 'Icalma 1030, Puerto Montt';
const MAPA_RECEPCION = 'https://maps.app.goo.gl/dGcwpXHw6qUxB6Jr6';

const apiPublica = {
  get: async (url) => {
    const res = await fetch(`/api${url}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar la solicitud.');
    return { data };
  },
  post: async (url, body) => {
    const res = await fetch(`/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo enviar la solicitud.');
    return { data };
  }
};

export default function SolicitudPublica() {
  const { token } = useParams();
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [preingreso, setPreingreso] = useState(null);
  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_rut: '',
    cliente_telefono: '',
    cliente_email: '',
    tipo_equipo: 'computador',
    marca: '',
    modelo: '',
    numero_serie: '',
    falla_reportada: '',
    observaciones: ''
  });
  const bloqueadoPorRecepcion = preingreso?.estado === 'recepcionado';

  useEffect(() => {
    apiPublica.get(`/preingresos/public/${token}`)
      .then(({ data }) => {
        setPreingreso(data);
        setForm({
          cliente_nombre: data.cliente_nombre || '',
          cliente_rut: data.cliente_rut || '',
          cliente_telefono: data.cliente_telefono || '',
          cliente_email: data.cliente_email || '',
          tipo_equipo: data.tipo_equipo || 'computador',
          marca: data.marca || '',
          modelo: data.modelo || '',
          numero_serie: data.numero_serie || '',
          falla_reportada: data.falla_reportada || '',
          observaciones: data.observaciones || ''
        });
        setEnviado(data.estado === 'enviado' || data.estado === 'recepcionado');
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [token]);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { data } = await apiPublica.post(`/preingresos/public/${token}`, form);
      setPreingreso(data);
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <div className="solicitud-publica-wrap"><Spinner texto="Cargando formulario..." /></div>;
  }

  if (!preingreso) {
    return <div className="solicitud-publica-wrap"><Tarjeta>{error || 'No se encontro el formulario solicitado.'}</Tarjeta></div>;
  }

  return (
    <div className="solicitud-publica-wrap">
      <div className="solicitud-publica-card">
        <div className="solicitud-publica-header">
          <div className="solicitud-publica-brand">
            <img src={logoBackupcode} alt="Backupcode Soluciones IT" className="solicitud-publica-logo" />
            <div>
              <h1>Preingreso de servicio tecnico</h1>
              <p className="mono">Codigo de servicio: {preingreso.codigo_servicio}</p>
              <p>Completa estos datos antes de ir a dejar tu equipo. En recepcion usaremos este codigo para terminar el ingreso formal.</p>
            </div>
          </div>
        </div>

        <Tarjeta>
          <div className="solicitud-publica-info">
            <div>
              <strong>Direccion de recepcion</strong>
              <p>{DIRECCION_RECEPCION}</p>
            </div>
            <a className="solicitud-publica-mapa" href={MAPA_RECEPCION} target="_blank" rel="noreferrer">
              Ver mapa
            </a>
          </div>
        </Tarjeta>

        {enviado && (
          <Alerta tipo={preingreso.estado === 'recepcionado' ? 'ok' : 'info'}>
            {preingreso.estado === 'recepcionado'
              ? 'Este codigo ya fue recepcionado por el taller.'
              : 'Tu informacion ya fue enviada. Si lo necesitas, puedes reenviar actualizando este mismo formulario.'}
          </Alerta>
        )}
        {error && <Alerta tipo="error">{error}</Alerta>}

        <Tarjeta>
          <form onSubmit={enviar} className="solicitud-publica-form">
            <div className="solicitud-publica-aviso-contacto">
              Usaremos tu telefono y correo para contactarte y enviarte informacion relacionada con el estado de tu servicio.
            </div>
            <div className="ingreso-grid-2">
              <Campo etiqueta="Nombre de quien entrega" requerido>
                <Input value={form.cliente_nombre} onChange={(e) => actualizar('cliente_nombre', e.target.value)} required />
              </Campo>
              <Campo etiqueta="RUT" requerido>
                <Input value={form.cliente_rut} onChange={(e) => actualizar('cliente_rut', e.target.value)} required />
              </Campo>
              <Campo etiqueta="Telefono" requerido>
                <Input
                  value={form.cliente_telefono}
                  onChange={(e) => actualizar('cliente_telefono', e.target.value)}
                  required
                  placeholder="Ej: +56 9 1234 5678"
                />
              </Campo>
              <Campo etiqueta="Correo" requerido>
                <Input
                  type="email"
                  value={form.cliente_email}
                  onChange={(e) => actualizar('cliente_email', e.target.value)}
                  required
                  placeholder="Ej: nombre@correo.cl"
                />
              </Campo>
              <Campo etiqueta="Tipo de equipo">
                <Select value={form.tipo_equipo} onChange={(e) => actualizar('tipo_equipo', e.target.value)}>
                  <option value="computador">Computador de escritorio</option>
                  <option value="notebook">Notebook</option>
                  <option value="impresora">Impresora</option>
                  <option value="otro">Otro</option>
                </Select>
              </Campo>
              <Campo etiqueta="Marca">
                <Input value={form.marca} onChange={(e) => actualizar('marca', e.target.value)} />
              </Campo>
              <Campo etiqueta="Modelo">
                <Input value={form.modelo} onChange={(e) => actualizar('modelo', e.target.value)} />
              </Campo>
              <Campo etiqueta="Numero de serie">
                <Input value={form.numero_serie} onChange={(e) => actualizar('numero_serie', e.target.value)} />
              </Campo>
            </div>
            <Campo etiqueta="Motivo del ingreso" requerido>
              <Textarea value={form.falla_reportada} onChange={(e) => actualizar('falla_reportada', e.target.value)} required placeholder="Ej: no enciende, esta lento, requiere respaldo, etc." />
            </Campo>
            <Campo etiqueta="Observaciones adicionales">
              <Textarea value={form.observaciones} onChange={(e) => actualizar('observaciones', e.target.value)} placeholder="Ej: llevar cargador, revisar bateria, urgencia del equipo, etc." />
            </Campo>
            <Boton tipo="submit" disabled={enviando || bloqueadoPorRecepcion}>
              {bloqueadoPorRecepcion ? 'Codigo ya recepcionado' : (enviando ? 'Enviando...' : 'Guardar informacion')}
            </Boton>
          </form>
        </Tarjeta>
      </div>
    </div>
  );
}
