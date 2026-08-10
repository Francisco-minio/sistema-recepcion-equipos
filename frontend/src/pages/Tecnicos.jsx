import { useEffect, useState } from 'react';
import api from '../services/api';
import { Tarjeta, Campo, Input, Boton, Alerta, Spinner } from '../components/ui';
import './Tecnicos.css';

export default function Tecnicos() {
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    setCargando(true);
    api.get('/usuarios/tecnicos/detalle')
      .then(({ data }) => setTecnicos(data))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const activos = tecnicos.filter((t) => t.activo).length;
  const cargaActiva = tecnicos.reduce((acc, t) => acc + Number(t.ordenes_activas || 0), 0);
  const entregadas = tecnicos.reduce((acc, t) => acc + Number(t.ordenes_entregadas || 0), 0);

  return (
    <div className="tecnicos-pagina">
      <div className="tecnicos-header">
        <div>
          <h1 className="tecnicos-titulo">Modulo de tecnicos</h1>
          <p className="tecnicos-sub">Administra el equipo tecnico y visualiza su carga operativa.</p>
        </div>
        <Boton onClick={() => setMostrarForm((v) => !v)}>{mostrarForm ? 'Cancelar' : '+ Nuevo tecnico'}</Boton>
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <div className="tecnicos-resumen">
        <Metrica etiqueta="Tecnicos activos" valor={activos} />
        <Metrica etiqueta="Ordenes activas asignadas" valor={cargaActiva} />
        <Metrica etiqueta="Ordenes entregadas" valor={entregadas} />
      </div>

      {mostrarForm && (
        <FormularioTecnico
          onCreado={() => {
            setMostrarForm(false);
            cargar();
            mostrarMensaje('Tecnico creado correctamente.');
          }}
        />
      )}

      {cargando ? (
        <Spinner texto="Cargando tecnicos..." />
      ) : (
        <div className="tecnicos-grid">
          {tecnicos.map((tecnico) => (
            <Tarjeta key={tecnico.id}>
              <div className="tecnico-card-head">
                <div>
                  <h3>{tecnico.nombre}</h3>
                  <p className="mono">{tecnico.email}</p>
                </div>
                <span className={`badge ${tecnico.activo ? 'badge-ok' : 'badge-danger'}`}>
                  {tecnico.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="tecnico-card-metricas">
                <DatoMini etiqueta="Ordenes activas" valor={tecnico.ordenes_activas} />
                <DatoMini etiqueta="Entregadas" valor={tecnico.ordenes_entregadas} />
                <DatoMini etiqueta="Total historico" valor={tecnico.ordenes_totales} />
              </div>

              <div className="tecnico-card-footer">
                <span className="tecnico-card-meta">Rol: {tecnico.rol}</span>
                <span className="tecnico-card-meta">Alta: {new Date(tecnico.creado_en).toLocaleDateString('es-CL')}</span>
              </div>

              <AccionesTecnico tecnico={tecnico} onActualizado={cargar} mostrarMensaje={mostrarMensaje} />
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}

function FormularioTecnico({ onCreado }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.post('/usuarios', { nombre, email, password, rol: 'tecnico' });
      onCreado();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el tecnico.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo="Nuevo tecnico">
      <form onSubmit={crear} className="tecnico-form">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <div className="tecnico-form-grid">
          <Campo etiqueta="Nombre completo" requerido>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
          </Campo>
          <Campo etiqueta="Correo electronico" requerido>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
        </div>
        <Campo etiqueta="Contrasena temporal" requerido hint="Minimo 6 caracteres">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </Campo>
        <Boton tipo="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear tecnico'}</Boton>
      </form>
    </Tarjeta>
  );
}

function AccionesTecnico({ tecnico, onActualizado, mostrarMensaje }) {
  const [nuevaPassword, setNuevaPassword] = useState('');

  const cambiarActivo = async () => {
    await api.put(`/usuarios/${tecnico.id}`, {
      nombre: tecnico.nombre,
      rol: 'tecnico',
      activo: tecnico.activo ? 0 : 1
    });
    onActualizado();
    mostrarMensaje(`Estado de ${tecnico.nombre} actualizado.`);
  };

  const resetPassword = async () => {
    if (nuevaPassword.length < 6) return;
    await api.post(`/usuarios/${tecnico.id}/reset-password`, { passwordNueva: nuevaPassword });
    setNuevaPassword('');
    mostrarMensaje(`Clave restablecida para ${tecnico.nombre}.`);
  };

  return (
    <div className="tecnico-acciones">
      <button className="link-accion" onClick={cambiarActivo}>{tecnico.activo ? 'Desactivar' : 'Activar'}</button>
      <div className="tecnico-reset">
        <Input
          type="password"
          placeholder="Nueva clave"
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
        />
        <Boton variante="secundario" onClick={resetPassword} disabled={nuevaPassword.length < 6}>Restablecer</Boton>
      </div>
    </div>
  );
}

function Metrica({ etiqueta, valor }) {
  return (
    <div className="tecnicos-metrica">
      <strong>{valor}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}

function DatoMini({ etiqueta, valor }) {
  return (
    <div className="tecnico-dato-mini">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}
