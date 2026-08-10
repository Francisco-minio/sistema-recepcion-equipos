import { useEffect, useState } from 'react';
import api from '../services/api';
import { Tarjeta, Campo, Input, Select, Boton, Alerta, Spinner } from '../components/ui';
import './Usuarios.css';

const ROLES = [
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'recepcion', label: 'Recepcion' },
  { value: 'admin', label: 'Administrador' }
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    setCargando(true);
    api.get('/usuarios').then(({ data }) => setUsuarios(data)).finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  return (
    <div>
      <div className="usuarios-header">
        <div>
          <h1 className="usuarios-titulo">Usuarios del sistema</h1>
          <p className="usuarios-sub">Gestiona tecnicos, recepcionistas y administradores</p>
        </div>
        <Boton onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo usuario'}
        </Boton>
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      {mostrarForm && (
        <FormularioUsuario
          onCreado={() => { setMostrarForm(false); cargar(); mostrarMensaje('Usuario creado correctamente.'); }}
        />
      )}

      <Tarjeta padding={false}>
        {cargando ? (
          <Spinner texto="Cargando usuarios..." />
        ) : (
          <table className="tabla-usuarios">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <FilaUsuario key={u.id} usuario={u} onActualizado={cargar} mostrarMensaje={mostrarMensaje} />
              ))}
            </tbody>
          </table>
        )}
      </Tarjeta>
    </div>
  );
}

function FormularioUsuario({ onCreado }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('tecnico');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.post('/usuarios', { nombre, email, password, rol });
      onCreado();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el usuario.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo="Nuevo usuario">
      <form onSubmit={crear}>
        {error && <Alerta tipo="error">{error}</Alerta>}
        <div className="usuarios-form-grid">
          <Campo etiqueta="Nombre completo" requerido>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
          </Campo>
          <Campo etiqueta="Correo electronico" requerido>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Contrasena temporal" requerido hint="Minimo 6 caracteres">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </Campo>
          <Campo etiqueta="Rol" requerido>
            <Select value={rol} onChange={(e) => setRol(e.target.value)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </Campo>
        </div>
        <Boton tipo="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear usuario'}</Boton>
      </form>
    </Tarjeta>
  );
}

function FilaUsuario({ usuario, onActualizado, mostrarMensaje }) {
  const [mostrarReset, setMostrarReset] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState('');

  const toggleActivo = async () => {
    await api.put(`/usuarios/${usuario.id}`, { nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo ? 0 : 1 });
    onActualizado();
  };

  const resetPassword = async () => {
    if (nuevaPassword.length < 6) return;
    await api.post(`/usuarios/${usuario.id}/reset-password`, { passwordNueva: nuevaPassword });
    setMostrarReset(false);
    setNuevaPassword('');
    mostrarMensaje(`Contrasena de ${usuario.nombre} restablecida.`);
  };

  return (
    <>
      <tr>
        <td>{usuario.nombre}</td>
        <td className="mono">{usuario.email}</td>
        <td style={{ textTransform: 'capitalize' }}>{usuario.rol}</td>
        <td>
          <span className={`badge ${usuario.activo ? 'badge-ok' : 'badge-danger'}`}>
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td className="tabla-usuarios-acciones">
          <button className="link-accion" onClick={() => setMostrarReset((v) => !v)}>Restablecer clave</button>
          <button className="link-accion" onClick={toggleActivo}>{usuario.activo ? 'Desactivar' : 'Activar'}</button>
        </td>
      </tr>
      {mostrarReset && (
        <tr>
          <td colSpan={5}>
            <div className="reset-password-fila">
              <Input
                type="password"
                placeholder="Nueva contrasena (min. 6 caracteres)"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
              />
              <Boton onClick={resetPassword} disabled={nuevaPassword.length < 6}>Guardar</Boton>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
