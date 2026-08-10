import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Tarjeta, BadgeEstado, Spinner, Input, Select, VacioEstado, Boton } from '../components/ui';
import { enviarWhatsAppCliente } from '../utils/whatsapp';
import { useAuth } from '../context/AuthContext';
import './Ordenes.css';

const STORAGE_KEY = 'ordenes_filtros';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ingresado', label: 'Ingresado' },
  { value: 'en_diagnostico', label: 'En diagnostico' },
  { value: 'en_reparacion', label: 'En reparacion' },
  { value: 'esperando_aprobacion', label: 'Esperando aprobacion' },
  { value: 'reparado', label: 'Reparado' },
  { value: 'no_reparable', label: 'No reparable' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' }
];

export default function Ordenes() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [ordenes, setOrdenes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const filtrosGuardados = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  })();
  const [busqueda, setBusqueda] = useState(filtrosGuardados.busqueda || '');
  const [estado, setEstado] = useState(filtrosGuardados.estado || '');
  const [tecnicoId, setTecnicoId] = useState(filtrosGuardados.tecnicoId || '');

  const cargar = useCallback(() => {
    setCargando(true);
    api.get('/ordenes', { params: { busqueda: busqueda || undefined, estado: estado || undefined, tecnico_id: tecnicoId || undefined, limit: 100 } })
      .then(({ data }) => {
        setOrdenes(data.ordenes);
        setTotal(data.total);
      })
      .finally(() => setCargando(false));
  }, [busqueda, estado, tecnicoId]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300); // debounce de busqueda
    return () => clearTimeout(timeout);
  }, [cargar]);

  useEffect(() => {
    api.get('/usuarios/tecnicos').then(({ data }) => setTecnicos(data || []));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ busqueda, estado, tecnicoId }));
  }, [busqueda, estado, tecnicoId]);

  const eliminarOrden = async (orden) => {
    const confirmar = window.confirm(`Se eliminara la orden ${orden.numero_orden} y sus fotos, historial y notificaciones asociadas. Esta accion no se puede deshacer.`);
    if (!confirmar) return;

    try {
      await api.delete(`/ordenes/${orden.id}`);
      setOrdenes((prev) => prev.filter((item) => item.id !== orden.id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      window.alert(error.response?.data?.error || 'No se pudo eliminar la orden.');
    }
  };

  return (
    <div>
      <div className="ordenes-header">
        <div>
          <h1 className="ordenes-titulo">Ordenes de servicio</h1>
          <p className="ordenes-sub">{total} {total === 1 ? 'orden registrada' : 'ordenes registradas'}</p>
        </div>
        <Link to="/ingreso"><Boton>+ Nuevo ingreso</Boton></Link>
      </div>

      {/* Pestañas de acceso rápido para Secretaría */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={`chip ${estado === '' ? 'chip-activo' : ''}`}
          onClick={() => setEstado('')}
        >
          Todas
        </button>
        <button
          className={`chip ${estado === 'reparado' ? 'chip-activo' : ''}`}
          style={estado === 'reparado' ? { backgroundColor: '#166534', color: '#fff' } : { borderColor: '#22c55e', color: '#166534' }}
          onClick={() => setEstado('reparado')}
        >
          🟢 Listos para Retiro
        </button>
        <button
          className={`chip ${estado === 'ingresado' ? 'chip-activo' : ''}`}
          style={estado === 'ingresado' ? { backgroundColor: '#1e40af', color: '#fff' } : { borderColor: '#3b82f6', color: '#1e40af' }}
          onClick={() => setEstado('ingresado')}
        >
          🔵 Ingresados
        </button>
        <button
          className={`chip ${estado === 'en_reparacion' || estado === 'en_diagnostico' ? 'chip-activo' : ''}`}
          style={estado === 'en_reparacion' ? { backgroundColor: '#854d0e', color: '#fff' } : { borderColor: '#eab308', color: '#854d0e' }}
          onClick={() => setEstado('en_reparacion')}
        >
          🟡 En Proceso / Reparación
        </button>
        <button
          className={`chip ${estado === 'entregado' ? 'chip-activo' : ''}`}
          onClick={() => setEstado('entregado')}
        >
          📦 Entregados
        </button>
      </div>

      <div className="ordenes-filtros">
        <Input
          placeholder="Buscar por N° orden, cliente, RUT, serie, marca o modelo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </Select>
        <Select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
          <option value="">Todos los tecnicos</option>
          {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>)}
        </Select>
      </div>

      <Tarjeta padding={false}>
        {cargando ? (
          <Spinner texto="Cargando ordenes..." />
        ) : ordenes.length === 0 ? (
          <VacioEstado
            titulo="No se encontraron ordenes"
            descripcion="Ajusta los filtros o registra un nuevo ingreso."
            accion={<Link to="/ingreso"><Boton variante="secundario">Registrar ingreso</Boton></Link>}
          />
        ) : (
          <table className="tabla-ordenes">
            <thead>
              <tr>
                <th>N° Orden</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Falla reportada</th>
                <th>Tecnico</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/ordenes/${o.id}`)}>
                  <td className="mono">{o.numero_orden}</td>
                  <td>
                    <div className="celda-cliente-nombre">{o.cliente_nombre}</div>
                    <div className="celda-cliente-rut mono">{o.cliente_rut}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{o.tipo_equipo} {o.marca && `· ${o.marca}`}</td>
                  <td className="celda-falla">{o.falla_reportada}</td>
                  <td>
                    <span className={`celda-tecnico ${o.tecnico_asignado_nombre ? '' : 'sin-asignar'}`}>
                      {o.tecnico_asignado_nombre || 'Sin asignar'}
                    </span>
                  </td>
                  <td><BadgeEstado estado={o.estado} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Boton
                        variante="secundario"
                        tamaño="pequeño"
                        title="Avisar por WhatsApp"
                        onClick={() => enviarWhatsAppCliente({
                          telefono: o.cliente_telefono,
                          tipo: o.estado === 'reparado' ? 'listo_retiro' : 'ingreso',
                          clienteNombre: o.cliente_contacto_nombre || o.cliente_nombre,
                          numeroOrden: o.numero_orden,
                          equipo: [o.marca, o.modelo].filter(Boolean).join(' ') || o.tipo_equipo,
                          monto: o.presupuesto_monto
                        })}
                      >
                        💬 WhatsApp
                      </Boton>
                      {usuario?.rol === 'admin' && (
                        <Boton
                          variante="secundario"
                          tamaño="pequeño"
                          title="Eliminar orden"
                          style={{ borderColor: '#dc2626', color: '#dc2626' }}
                          onClick={() => eliminarOrden(o)}
                        >
                          Eliminar
                        </Boton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Tarjeta>
    </div>
  );
}
