import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Tarjeta, Input, Spinner, VacioEstado, Boton, BadgeEstado, Campo, Textarea, Alerta } from '../components/ui';
import './Clientes.css';

const STORAGE_KEY = 'clientes_busqueda';

export default function Clientes() {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [cargando, setCargando] = useState(true);
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const puedeEditarClientes = ['admin', 'recepcion', 'tecnico'].includes(usuario?.rol);
  const puedeEliminarClientes = usuario?.rol === 'admin';

  const seleccionado = clientes.find((c) => c.id === seleccionadoId) || null;

  const cargar = useCallback(() => {
    setCargando(true);
    api.get('/clientes', { params: { busqueda: busqueda || undefined, tipo_cliente: 'empresa' } })
      .then(({ data }) => setClientes(data))
      .finally(() => setCargando(false));
  }, [busqueda]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, busqueda);
  }, [busqueda]);

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const empresasActivas = clientes.length;
  const conContacto = clientes.filter((c) => c.contacto_nombre || c.email || c.telefono).length;

  return (
    <div>
      <div className="clientes-header">
        <div>
          <h1 className="clientes-titulo">Modulo de clientes empresa</h1>
          <p className="clientes-sub">Administra empresas, contactos y su historial de ordenes.</p>
        </div>
        {puedeEditarClientes && (
          <Boton onClick={() => setMostrarForm((v) => !v)}>{mostrarForm ? 'Cancelar' : '+ Nueva empresa'}</Boton>
        )}
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <div className="clientes-resumen">
        <ResumenEmpresa etiqueta="Empresas registradas" valor={empresasActivas} />
        <ResumenEmpresa etiqueta="Con contacto definido" valor={conContacto} />
      </div>

      {mostrarForm && puedeEditarClientes && (
        <FormularioEmpresa
          onGuardado={(empresa, modo) => {
            setMostrarForm(false);
            setSeleccionadoId(empresa.id);
            cargar();
            mostrarMensaje(modo === 'crear' ? 'Empresa creada correctamente.' : 'Empresa actualizada correctamente.');
          }}
        />
      )}

      <Input
        placeholder="Buscar empresa por nombre, RUT, contacto, serie, marca o modelo..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <div className="clientes-grid">
        <Tarjeta padding={false}>
          {cargando ? (
            <Spinner texto="Buscando clientes..." />
          ) : clientes.length === 0 ? (
            <VacioEstado titulo="Sin resultados" descripcion="No se encontraron clientes con ese criterio." />
          ) : (
            <div className="clientes-lista">
              {clientes.map((c) => (
                <button
                  key={c.id}
                  className={`cliente-item ${seleccionado?.id === c.id ? 'cliente-item-activo' : ''}`}
                  onClick={() => setSeleccionadoId(c.id)}
                >
                  <span className="cliente-item-nombre">{c.nombre}</span>
                  <span className="cliente-item-rut mono">{c.razon_social || 'Sin razon social registrada'}</span>
                  <span className="cliente-item-rut mono">{c.rut}</span>
                </button>
              ))}
            </div>
          )}
        </Tarjeta>

        <div>
          {seleccionado ? (
            <FichaCliente
              cliente={seleccionado}
              puedeEditarClientes={puedeEditarClientes}
              puedeEliminarClientes={puedeEliminarClientes}
              onActualizado={(empresa) => {
                setSeleccionadoId(empresa.id);
                cargar();
                mostrarMensaje('Empresa actualizada correctamente.');
              }}
            />
          ) : (
            <Tarjeta>
              <VacioEstado titulo="Selecciona una empresa" descripcion="Elige una empresa de la lista para ver su ficha y sus ordenes." />
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  );
}

function FichaCliente({ cliente, onActualizado, puedeEditarClientes, puedeEliminarClientes }) {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setCargando(true);
    api.get('/ordenes', { params: { cliente_id: cliente.id, limit: 50 } })
      .then(({ data }) => setOrdenes(data.ordenes))
      .finally(() => setCargando(false));
  }, [cliente.id]);

  const eliminarEmpresa = async () => {
    const tieneOrdenes = ordenes.length > 0;
    const mensaje = tieneOrdenes
      ? `La empresa ${cliente.nombre} tiene ${ordenes.length} orden(es). Escribe ELIMINAR para borrar la empresa y su historial asociado.`
      : `Escribe ELIMINAR para borrar la empresa ${cliente.nombre}.`;
    const confirmacion = window.prompt(mensaje);
    if (confirmacion !== 'ELIMINAR') return;

    setEliminando(true);
    try {
      await api.delete(`/clientes/${cliente.id}`, {
        params: tieneOrdenes ? { forzar: 'true' } : undefined
      });
      window.location.reload();
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="ficha-cliente">
      <Tarjeta
        titulo={cliente.nombre}
        acciones={(
          <div className="clientes-tarjeta-acciones">
            {puedeEditarClientes && (
              <button className="link-accion" onClick={() => setEditando((v) => !v)}>
                {editando ? 'Cerrar edicion' : 'Editar empresa'}
              </button>
            )}
            {puedeEliminarClientes && (
              <button className="link-accion link-accion-danger" onClick={eliminarEmpresa} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Eliminar empresa'}
              </button>
            )}
          </div>
        )}
      >
        {editando && puedeEditarClientes && (
          <FormularioEmpresa
            empresa={cliente}
            onGuardado={(empresa) => {
              setEditando(false);
              onActualizado(empresa);
            }}
          />
        )}
        <div className="ficha-cliente-datos">
          <FilaDato etiqueta="Tipo" valor={cliente.tipo_cliente || 'empresa'} />
          <FilaDato etiqueta="Razon social" valor={cliente.razon_social} />
          <FilaDato etiqueta="Giro" valor={cliente.giro} />
          <FilaDato etiqueta="RUT" valor={cliente.rut} mono />
          <FilaDato etiqueta="Contacto principal" valor={cliente.contacto_nombre} />
          <FilaDato etiqueta="Cargo del contacto" valor={cliente.contacto_cargo} />
          <FilaDato etiqueta="Telefono" valor={cliente.telefono} />
          <FilaDato etiqueta="Email" valor={cliente.email} />
          <FilaDato etiqueta="Direccion" valor={cliente.direccion} />
          <FilaDato etiqueta="Notas" valor={cliente.notas} />
          <FilaDato etiqueta="Cliente desde" valor={new Date(cliente.creado_en).toLocaleDateString('es-CL')} />
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Historial de equipos (${ordenes.length})`}>
        {cargando ? (
          <Spinner texto="Cargando historial..." />
        ) : ordenes.length === 0 ? (
          <p className="ingreso-nota">Este cliente aun no tiene ordenes registradas.</p>
        ) : (
          <div className="ficha-cliente-historial">
            {ordenes.map((o) => (
              <Link to={`/ordenes/${o.id}`} key={o.id} className="ficha-cliente-orden">
                <div>
                  <span className="mono ficha-cliente-orden-num">{o.numero_orden}</span>
                  <span className="ficha-cliente-orden-equipo">{o.tipo_equipo} {o.marca || ''}</span>
                </div>
                <BadgeEstado estado={o.estado} />
              </Link>
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

function FormularioEmpresa({ empresa, onGuardado }) {
  const [form, setForm] = useState(() => ({
    nombre: empresa?.nombre || '',
    rut: empresa?.rut || '',
    tipo_cliente: empresa?.tipo_cliente || 'empresa',
    razon_social: empresa?.razon_social || '',
    giro: empresa?.giro || '',
    contacto_nombre: empresa?.contacto_nombre || '',
    contacto_cargo: empresa?.contacto_cargo || '',
    telefono: empresa?.telefono || '',
    email: empresa?.email || '',
    direccion: empresa?.direccion || '',
    notas: empresa?.notas || ''
  }));
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { data } = empresa
        ? await api.put(`/clientes/${empresa.id}`, form)
        : await api.post('/clientes', form);
      onGuardado(data, empresa ? 'editar' : 'crear');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la empresa.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo={empresa ? 'Editar empresa' : 'Nueva empresa'}>
      <form onSubmit={guardar} className="empresa-form">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <div className="empresa-form-grid">
          <Campo etiqueta="Nombre comercial" requerido>
            <Input value={form.nombre} onChange={(e) => actualizar('nombre', e.target.value)} required />
          </Campo>
          <Campo etiqueta="RUT empresa" requerido>
            <Input value={form.rut} onChange={(e) => actualizar('rut', e.target.value)} required disabled={Boolean(empresa)} />
          </Campo>
          <Campo etiqueta="Razon social">
            <Input value={form.razon_social} onChange={(e) => actualizar('razon_social', e.target.value)} />
          </Campo>
          <Campo etiqueta="Giro">
            <Input value={form.giro} onChange={(e) => actualizar('giro', e.target.value)} />
          </Campo>
          <Campo etiqueta="Contacto principal">
            <Input value={form.contacto_nombre} onChange={(e) => actualizar('contacto_nombre', e.target.value)} />
          </Campo>
          <Campo etiqueta="Cargo del contacto">
            <Input value={form.contacto_cargo} onChange={(e) => actualizar('contacto_cargo', e.target.value)} />
          </Campo>
          <Campo etiqueta="Telefono">
            <Input value={form.telefono} onChange={(e) => actualizar('telefono', e.target.value)} />
          </Campo>
          <Campo etiqueta="Email">
            <Input type="email" value={form.email} onChange={(e) => actualizar('email', e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Direccion">
          <Input value={form.direccion} onChange={(e) => actualizar('direccion', e.target.value)} />
        </Campo>
        <Campo etiqueta="Notas internas">
          <Textarea value={form.notas} onChange={(e) => actualizar('notas', e.target.value)} />
        </Campo>
        <Boton tipo="submit" disabled={enviando}>{enviando ? 'Guardando...' : empresa ? 'Guardar cambios' : 'Crear empresa'}</Boton>
      </form>
    </Tarjeta>
  );
}

function FilaDato({ etiqueta, valor, mono }) {
  return (
    <div className="ficha-dato">
      <span className="ficha-dato-etiqueta">{etiqueta}</span>
      <span className={mono ? 'mono' : ''}>{valor || '-'}</span>
    </div>
  );
}

function ResumenEmpresa({ etiqueta, valor }) {
  return (
    <div className="clientes-metrica">
      <strong>{valor}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}
