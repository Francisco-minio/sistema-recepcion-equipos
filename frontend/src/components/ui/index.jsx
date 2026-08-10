import './ui.css';

export function Boton({ children, variante = 'primario', tipo = 'button', onClick, disabled, ancho, icono }) {
  return (
    <button
      type={tipo}
      className={`btn btn-${variante}`}
      onClick={onClick}
      disabled={disabled}
      style={ancho ? { width: ancho } : undefined}
    >
      {icono && <span className="btn-icono">{icono}</span>}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, requerido, error, hint, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">
        {etiqueta} {requerido && <span className="campo-requerido">*</span>}
      </span>
      {children}
      {hint && !error && <span className="campo-hint">{hint}</span>}
      {error && <span className="campo-error">{error}</span>}
    </label>
  );
}

export function Input(props) {
  return <input className="input" {...props} />;
}

export function Textarea(props) {
  return <textarea className="input textarea" {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className="input select" {...props}>
      {children}
    </select>
  );
}

export function Tarjeta({ children, titulo, acciones, padding = true }) {
  return (
    <div className="tarjeta">
      {(titulo || acciones) && (
        <div className="tarjeta-header">
          {titulo && <h3 className="tarjeta-titulo">{titulo}</h3>}
          {acciones && <div className="tarjeta-acciones">{acciones}</div>}
        </div>
      )}
      <div className={padding ? 'tarjeta-body' : ''}>{children}</div>
    </div>
  );
}

const ESTADO_CONFIG = {
  ingresado: { etiqueta: 'Ingresado', clase: 'badge-info' },
  en_diagnostico: { etiqueta: 'En diagnostico', clase: 'badge-info' },
  en_reparacion: { etiqueta: 'En reparacion', clase: 'badge-warn' },
  esperando_aprobacion: { etiqueta: 'Esperando aprobacion', clase: 'badge-warn' },
  reparado: { etiqueta: 'Reparado', clase: 'badge-ok' },
  no_reparable: { etiqueta: 'No reparable', clase: 'badge-danger' },
  entregado: { etiqueta: 'Entregado', clase: 'badge-neutro' },
  cancelado: { etiqueta: 'Cancelado', clase: 'badge-danger' }
};

export function BadgeEstado({ estado }) {
  const config = ESTADO_CONFIG[estado] || { etiqueta: estado, clase: 'badge-neutro' };
  return <span className={`badge ${config.clase}`}>{config.etiqueta}</span>;
}

export function Spinner({ texto }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      {texto && <span className="spinner-texto">{texto}</span>}
    </div>
  );
}

export function Alerta({ tipo = 'info', children }) {
  return <div className={`alerta alerta-${tipo}`}>{children}</div>;
}

export function VacioEstado({ titulo, descripcion, accion }) {
  return (
    <div className="vacio-estado">
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
      {accion}
    </div>
  );
}
