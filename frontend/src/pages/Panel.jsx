import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Tarjeta, BadgeEstado, Spinner, Boton, Input } from '../components/ui';
import './Panel.css';

const STORAGE_KEY = 'panel_busqueda_ordenes';

const ETIQUETAS_ESTADO = {
  ingresado: 'Ingresados',
  en_diagnostico: 'En diagnostico',
  en_reparacion: 'En reparacion',
  esperando_aprobacion: 'Esperando aprobacion',
  reparado: 'Reparados (listos)',
  no_reparable: 'No reparables',
  entregado: 'Entregados',
  cancelado: 'Cancelados'
};

export default function Panel() {
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => {
    setCargando(true);
    Promise.all([
      api.get('/ordenes/estadisticas'),
      api.get('/ordenes', { params: { limit: 6, busqueda: busqueda || undefined } })
    ]).then(([statsRes, ordenesRes]) => {
      setStats(statsRes.data);
      setRecientes(ordenesRes.data.ordenes);
    }).finally(() => setCargando(false));
  }, [busqueda]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, busqueda);
  }, [busqueda]);

  if (cargando) return <Spinner texto="Cargando panel..." />;

  const mapaEstados = Object.fromEntries((stats?.porEstado || []).map(s => [s.estado, s.total]));
  const pendientes = ['ingresado', 'en_diagnostico', 'en_reparacion', 'esperando_aprobacion', 'reparado']
    .reduce((acc, e) => acc + (mapaEstados[e] || 0), 0);

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1 className="panel-titulo">Panel general</h1>
          <p className="panel-sub">Resumen del estado de los equipos en taller</p>
        </div>
        <Link to="/ingreso"><Boton>+ Nuevo ingreso</Boton></Link>
      </div>

      <div className="panel-metricas">
        <Link to="/ordenes" onClick={() => localStorage.setItem('ordenes_filtros', JSON.stringify({ busqueda: '', estado: '' }))} style={{ textDecoration: 'none' }}>
          <MetricaCard etiqueta="Ingresos hoy" valor={stats?.ingresosHoy ?? 0} acento="info" />
        </Link>
        <Link to="/ordenes" onClick={() => localStorage.setItem('ordenes_filtros', JSON.stringify({ busqueda: '', estado: 'ingresado' }))} style={{ textDecoration: 'none' }}>
          <MetricaCard etiqueta="Equipos en taller" valor={pendientes} acento="warn" />
        </Link>
        <Link to="/ordenes" onClick={() => localStorage.setItem('ordenes_filtros', JSON.stringify({ busqueda: '', estado: 'reparado' }))} style={{ textDecoration: 'none' }}>
          <MetricaCard etiqueta="🟢 Listos para entrega" valor={mapaEstados.reparado || 0} acento="ok" />
        </Link>
        <Link to="/ordenes" onClick={() => localStorage.setItem('ordenes_filtros', JSON.stringify({ busqueda: '', estado: 'entregado' }))} style={{ textDecoration: 'none' }}>
          <MetricaCard etiqueta="Entregados (total)" valor={mapaEstados.entregado || 0} acento="neutro" />
        </Link>
      </div>

      <div className="panel-grid">
        <Tarjeta titulo="Equipos por estado">
          <div className="panel-estados-lista">
            {Object.entries(ETIQUETAS_ESTADO).map(([clave, etiqueta]) => (
              <div key={clave} className="panel-estado-fila">
                <BadgeEstado estado={clave} />
                <span className="panel-estado-num">{mapaEstados[clave] || 0}</span>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Ultimas ordenes ingresadas"
          acciones={<Link to="/ordenes" className="panel-ver-todas">Ver todas →</Link>}
        >
          <Input
            placeholder="Buscar por serie, marca, modelo o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {recientes.length === 0 ? (
            <p className="panel-vacio">Aun no hay ordenes registradas.</p>
          ) : (
            <div className="panel-tabla-mini">
              {recientes.map((o) => (
                <Link to={`/ordenes/${o.id}`} key={o.id} className="panel-tabla-fila">
                  <span className="mono panel-num-orden">{o.numero_orden}</span>
                  <span className="panel-cliente">{o.cliente_nombre}</span>
                  <span className="panel-equipo">{o.tipo_equipo} {o.marca || ''}</span>
                  <BadgeEstado estado={o.estado} />
                </Link>
              ))}
            </div>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

function MetricaCard({ etiqueta, valor, acento }) {
  return (
    <div className={`metrica-card metrica-${acento}`}>
      <div className="metrica-valor">{valor}</div>
      <div className="metrica-etiqueta">{etiqueta}</div>
    </div>
  );
}
