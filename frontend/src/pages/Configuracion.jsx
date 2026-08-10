import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Tarjeta, Campo, Input, Boton, Alerta, Spinner } from '../components/ui';
import './Configuracion.css';

const MODULOS = [
  {
    titulo: 'Empresas',
    descripcion: 'Administra la ficha maestra de empresas, RUT, correo y direccion.',
    ruta: '/clientes',
    accion: 'Abrir empresas'
  },
  {
    titulo: 'Tecnicos',
    descripcion: 'Crea tecnicos y revisa quienes pueden quedar asignados a las ordenes.',
    ruta: '/tecnicos',
    accion: 'Abrir tecnicos'
  },
  {
    titulo: 'Usuarios',
    descripcion: 'Gestiona accesos, roles, activacion de cuentas y restablecimiento de contrasenas.',
    ruta: '/usuarios',
    accion: 'Abrir usuarios'
  },
  {
    titulo: 'Preingresos',
    descripcion: 'Genera enlaces publicos y controla el flujo previo a la recepcion del equipo.',
    ruta: '/preingresos',
    accion: 'Abrir preingresos'
  }
];

export default function Configuracion() {
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    telegram_bot_token: '',
    telegram_chat_id: ''
  });
  const [estadoSecretos, setEstadoSecretos] = useState({
    has_smtp_pass: false,
    has_telegram_bot_token: false
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    api.get('/configuracion/notificaciones')
      .then(({ data }) => {
        setForm((prev) => ({
          ...prev,
          smtp_host: data.smtp_host || '',
          smtp_port: String(data.smtp_port || '587'),
          smtp_secure: Boolean(data.smtp_secure),
          smtp_user: data.smtp_user || '',
          smtp_from: data.smtp_from || '',
          telegram_chat_id: data.telegram_chat_id || '',
          smtp_pass: '',
          telegram_bot_token: ''
        }));
        setEstadoSecretos({
          has_smtp_pass: Boolean(data.has_smtp_pass),
          has_telegram_bot_token: Boolean(data.has_telegram_bot_token)
        });
      })
      .finally(() => setCargando(false));
  }, []);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = {
        ...form,
        preservar_smtp_pass: !form.smtp_pass && estadoSecretos.has_smtp_pass,
        preservar_telegram_bot_token: !form.telegram_bot_token && estadoSecretos.has_telegram_bot_token
      };
      const { data } = await api.put('/configuracion/notificaciones', payload);
      setEstadoSecretos({
        has_smtp_pass: Boolean(data.has_smtp_pass),
        has_telegram_bot_token: Boolean(data.has_telegram_bot_token)
      });
      setForm((prev) => ({
        ...prev,
        smtp_pass: '',
        telegram_bot_token: ''
      }));
      setMensaje({ tipo: 'ok', texto: 'Configuracion de notificaciones guardada correctamente.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo guardar la configuracion.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="configuracion-pagina">
      <div className="configuracion-header">
        <h1>Configuracion</h1>
        <p>Centraliza desde aqui los modulos administrativos del sistema y las funciones de recepcion.</p>
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <div className="configuracion-grid">
        {MODULOS.map((modulo) => (
          <Tarjeta key={modulo.ruta}>
            <div className="configuracion-card">
              <div>
                <h2>{modulo.titulo}</h2>
                <p>{modulo.descripcion}</p>
              </div>
              <Link to={modulo.ruta} className="configuracion-link">
                {modulo.accion}
              </Link>
            </div>
          </Tarjeta>
        ))}
      </div>

      <Tarjeta titulo="Correo y Telegram">
        {cargando ? (
          <Spinner texto="Cargando configuracion..." />
        ) : (
          <form onSubmit={guardar}>
            <div className="configuracion-bloque">
              <h3>Correo SMTP</h3>
              <div className="configuracion-form-grid">
                <Campo etiqueta="Servidor SMTP">
                  <Input value={form.smtp_host} onChange={(e) => actualizar('smtp_host', e.target.value)} placeholder="smtp.tudominio.cl" />
                </Campo>
                <Campo etiqueta="Puerto SMTP">
                  <Input value={form.smtp_port} onChange={(e) => actualizar('smtp_port', e.target.value)} placeholder="587" />
                </Campo>
                <Campo etiqueta="Usuario SMTP">
                  <Input value={form.smtp_user} onChange={(e) => actualizar('smtp_user', e.target.value)} placeholder="soporte@backupcode.cl" />
                </Campo>
                <Campo etiqueta="Correo remitente">
                  <Input value={form.smtp_from} onChange={(e) => actualizar('smtp_from', e.target.value)} placeholder="soporte@backupcode.cl" />
                </Campo>
              </div>
              <div className="configuracion-switch">
                <label>
                  <input
                    type="checkbox"
                    checked={form.smtp_secure}
                    onChange={(e) => actualizar('smtp_secure', e.target.checked)}
                  />
                  Usar conexion segura SSL/TLS
                </label>
              </div>
              <Campo etiqueta="Clave SMTP" hint={estadoSecretos.has_smtp_pass ? 'Deja vacio para mantener la clave guardada.' : 'Se guarda cifrada en el sistema.'}>
                <Input type="password" value={form.smtp_pass} onChange={(e) => actualizar('smtp_pass', e.target.value)} placeholder={estadoSecretos.has_smtp_pass ? 'Clave ya configurada' : 'Ingresa clave SMTP'} />
              </Campo>
            </div>

            <div className="configuracion-bloque">
              <h3>Alertas por Telegram</h3>
              <div className="configuracion-form-grid">
                <Campo etiqueta="Chat ID">
                  <Input value={form.telegram_chat_id} onChange={(e) => actualizar('telegram_chat_id', e.target.value)} placeholder="-1001234567890" />
                </Campo>
                <Campo etiqueta="Token del bot" hint={estadoSecretos.has_telegram_bot_token ? 'Deja vacio para conservar el token actual.' : 'Se guarda cifrado en el sistema.'}>
                  <Input type="password" value={form.telegram_bot_token} onChange={(e) => actualizar('telegram_bot_token', e.target.value)} placeholder={estadoSecretos.has_telegram_bot_token ? 'Token ya configurado' : '123456:ABC...'} />
                </Campo>
              </div>
            </div>

            <div className="configuracion-notas">
              <p>Estas opciones solo estan disponibles para administradores.</p>
              <p>El correo al cliente se envía al completar el preingreso, con su codigo de servicio, resumen y direccion de recepcion en Icalma 1030, Puerto Montt.</p>
            </div>

            <Boton tipo="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar configuracion'}
            </Boton>
          </form>
        )}
      </Tarjeta>
    </div>
  );
}
