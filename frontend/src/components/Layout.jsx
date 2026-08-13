import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoBackupcode from '../assets/backupcode-logo.png';
import './Layout.css';

const ENLACES = [
  { to: '/', etiqueta: 'Panel', icono: IconoPanel },
  { to: '/ordenes', etiqueta: 'Ordenes de servicio', icono: IconoOrden },
  { to: '/ingreso', etiqueta: 'Nuevo ingreso', icono: IconoMas },
  { to: '/entregas', etiqueta: 'Entregas', icono: IconoEntrega },
  { to: '/preingresos', etiqueta: 'Preingresos', icono: IconoPreingreso },
  { to: '/clientes', etiqueta: 'Empresas', icono: IconoCliente }
];

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    setMenuMovilAbierto(false);
  }, [location.pathname]);

  const cerrarSesion = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="layout-nav no-imprimir">
        <div className="layout-mobile-topbar">
          <div className="layout-marca">
            <img src={logoBackupcode} alt="Backupcode Soluciones IT" className="layout-marca-logo" />
            <div className="layout-marca-copy">
              <div className="layout-marca-titulo">Sistema de soporte</div>
              <div className="layout-marca-sub">Recepcion y trazabilidad de equipos</div>
            </div>
          </div>
          <button
            type="button"
            className={`layout-menu-toggle ${menuMovilAbierto ? 'abierto' : ''}`}
            onClick={() => setMenuMovilAbierto((valor) => !valor)}
            aria-label={menuMovilAbierto ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={menuMovilAbierto}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`layout-mobile-panel ${menuMovilAbierto ? 'abierto' : ''}`}>
        <nav className="layout-enlaces">
          {ENLACES.map(({ to, etiqueta, icono: Icono }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `layout-enlace ${isActive ? 'activo' : ''}`}
            >
              <Icono />
              {etiqueta}
            </NavLink>
          ))}
          {usuario?.rol === 'admin' && (
            <NavLink to="/configuracion" className={({ isActive }) => `layout-enlace ${isActive ? 'activo' : ''}`}>
              <IconoConfiguracion />
              Configuracion
            </NavLink>
          )}
          {usuario?.rol === 'admin' && (
            <NavLink to="/tecnicos" className={({ isActive }) => `layout-enlace ${isActive ? 'activo' : ''}`}>
              <IconoTecnicos />
              Tecnicos
            </NavLink>
          )}
          {usuario?.rol === 'admin' && (
            <NavLink to="/usuarios" className={({ isActive }) => `layout-enlace ${isActive ? 'activo' : ''}`}>
              <IconoUsuarios />
              Usuarios del sistema
            </NavLink>
          )}
        </nav>

        <div className="layout-usuario">
          <div className="layout-usuario-avatar">{usuario?.nombre?.[0]?.toUpperCase() || '?'}</div>
          <div className="layout-usuario-info">
            <div className="layout-usuario-nombre">{usuario?.nombre}</div>
            <div className="layout-usuario-rol">{usuario?.rol}</div>
          </div>
          <button className="layout-usuario-salir" onClick={cerrarSesion} title="Cerrar sesion">
            <IconoSalir />
          </button>
        </div>
        </div>
      </aside>

      <main className="layout-contenido">{children}</main>
    </div>
  );
}

function IconoPanel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function IconoOrden() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 2h6a1 1 0 011 1v2H8V3a1 1 0 011-1z" />
      <rect x="5" y="5" width="14" height="17" rx="2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function IconoMas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IconoCliente() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
function IconoPreingreso() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4h9l3 3v13a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </svg>
  );
}
function IconoEntrega() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h11v8H4z" />
      <path d="M15 10h2.8l2.2 2.4V15h-5z" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </svg>
  );
}
function IconoConfiguracion() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-.4-1.1 1.7 1.7 0 00-1-.6 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H2.8a2 2 0 110-4h.1a1.7 1.7 0 001.1-.4 1.7 1.7 0 00.6-1 1.7 1.7 0 00-.34-1.87L4.2 6.27a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6c.39 0 .76-.14 1.04-.4.28-.27.45-.64.46-1.03V3a2 2 0 114 0v.1c0 .39.15.76.43 1.03.28.26.65.4 1.04.4a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9c0 .39.14.76.4 1.04.27.28.64.43 1.03.46h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.03.43 1.7 1.7 0 00-.4 1.04z" />
    </svg>
  );
}
function IconoUsuarios() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3 3-5 7-5s7 2 7 5" />
      <circle cx="17" cy="7" r="2.3" /><path d="M16 14c2.8.3 5 2 5 5" />
    </svg>
  );
}
function IconoTecnicos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 011.4 0l1.6 1.6a1 1 0 010 1.4l-7.9 7.9-3.3.7.7-3.3 7.5-8.3z" />
      <path d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    </svg>
  );
}
function IconoSalir() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
