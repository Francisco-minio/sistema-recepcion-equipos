import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { abrirDocumentoProtegido } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FirmaPanel from '../components/FirmaPanel';
import { Tarjeta, Campo, Input, Select, Textarea, Boton, Alerta } from '../components/ui';
import { enviarWhatsAppCliente } from '../utils/whatsapp';
import './Ingreso.css';

const ACCESORIOS_DISPONIBLES = [
  'Cargador', 'Mouse', 'Teclado', 'Cable de poder', 'Maletin / Funda',
  'Mouse pad', 'Cable HDMI/VGA', 'Bateria', 'Tinta/Toner', 'Otro'
];

const FALLAS_PRESET = [
  'No enciende', 'Pantalla rota / sin video', 'Lento / Formateo',
  'No carga batería', 'Mantención / Limpieza', 'Derrame de líquido',
  'Teclado / Touchpad defectuoso', 'Revisión general'
];

const ESTADO_FISICO_PRESET = [
  'Buen estado general', 'Rayones de uso normal',
  'Golpe / Trizadura en carcasa', 'Pantalla trizada / rota', 'Faltan tornillos / gomas'
];

const ESTADO_FISICO_DEFAULT = '';

export default function Ingreso() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [paso, setPaso] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [ordenCreada, setOrdenCreada] = useState(null);
  const [advertenciaFotos, setAdvertenciaFotos] = useState(null);
  const [errorFotos, setErrorFotos] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [tecnicos, setTecnicos] = useState([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(true);
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState(null);
  const [empresaSeleccionadaCorreo, setEmpresaSeleccionadaCorreo] = useState('');
  const [correosEmpresa, setCorreosEmpresa] = useState([]);
  const [nuevoCorreoEmpresa, setNuevoCorreoEmpresa] = useState('');
  const [guardandoCorreoEmpresa, setGuardandoCorreoEmpresa] = useState(false);
  const [mensajeCorreoEmpresa, setMensajeCorreoEmpresa] = useState(null);
  const [modoEmpresaManual, setModoEmpresaManual] = useState(false);
  const [tipoClienteIngreso, setTipoClienteIngreso] = useState('particular');
  const [codigoServicio, setCodigoServicio] = useState('');
  const [cargandoPreingreso, setCargandoPreingreso] = useState(false);
  const [preingresoCargado, setPreingresoCargado] = useState(null);
  const [preingresosPendientes, setPreingresosPendientes] = useState([]);
  const [cargandoPreingresosPendientes, setCargandoPreingresosPendientes] = useState(true);

  const [form, setForm] = useState({
    cliente_nombre: '', cliente_empresa: '', cliente_rut: '', cliente_telefono: '', cliente_email: '', cliente_direccion: '',
    tipo_equipo: 'computador', marca: '', modelo: '', numero_serie: '', color: '',
    falla_reportada: '', accesorios: [], estado_fisico: ESTADO_FISICO_DEFAULT,
    tecnico_asignado_id: '',
    clave_acceso: '', observaciones_ingreso: '',
    firma_ingreso_nombre: '', firma_ingreso_rut: ''
  });
  const [firmaData, setFirmaData] = useState(null);
  const [fotosIngreso, setFotosIngreso] = useState([]);

  useEffect(() => {
    api.get('/clientes', { params: { tipo_cliente: 'empresa', limit: 200 } })
      .then(({ data }) => setEmpresas((data || []).filter((empresa) => (empresa.tipo_cliente || 'empresa') === 'empresa')))
      .finally(() => setCargandoEmpresas(false));

    api.get('/usuarios/tecnicos')
      .then(({ data }) => setTecnicos(data || []))
      .finally(() => setCargandoTecnicos(false));

    api.get('/preingresos', { params: { estado: 'enviado', limit: 100 } })
      .then(({ data }) => setPreingresosPendientes((data || []).filter((item) => !item.orden_id)))
      .finally(() => setCargandoPreingresosPendientes(false));
  }, []);

  useEffect(() => {
    if (!preingresoCargado || !empresas.length) return;

    if (preingresoCargado.empresa_id) {
      const empresa = empresas.find((item) => Number(item.id) === Number(preingresoCargado.empresa_id));
      if (empresa) {
        seleccionarEmpresa(empresa, {
          contactoNombre: preingresoCargado.cliente_nombre || '',
          telefono: preingresoCargado.cliente_telefono || '',
          email: preingresoCargado.cliente_email || '',
          direccion: '',
          rut: empresa.rut || preingresoCargado.cliente_rut || ''
        });
        return;
      }
    }

    if (preingresoCargado.empresa_nombre) {
      setTipoClienteIngreso('empresa');
      setEmpresaSeleccionadaId(null);
      setModoEmpresaManual(true);
      setCorreosEmpresa([]);
      setEmpresaSeleccionadaCorreo('');
      setForm((prev) => ({
        ...prev,
        cliente_empresa: preingresoCargado.empresa_nombre || '',
        cliente_nombre: preingresoCargado.cliente_nombre || '',
        cliente_rut: preingresoCargado.cliente_rut || '',
        cliente_telefono: preingresoCargado.cliente_telefono || '',
        cliente_email: preingresoCargado.cliente_email || '',
        cliente_direccion: ''
      }));
    }
  }, [preingresoCargado, empresas]);

  const actualizar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const toggleAccesorio = (item) => {
    setForm((f) => ({
      ...f,
      accesorios: f.accesorios.includes(item)
        ? f.accesorios.filter((a) => a !== item)
        : [...f.accesorios, item]
    }));
  };

  const agregarFotos = (files) => {
    const archivos = Array.from(files || []);
    if (!archivos.length) return;

    const imagenesValidas = archivos.filter((file) => esImagenValida(file));
    const disponibles = 3 - fotosIngreso.length;
    const base = imagenesValidas.slice(0, Math.max(disponibles, 0));
    const seleccionadas = base.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }));

    if (!imagenesValidas.length) {
      setErrorFotos('No se reconocio ninguna imagen valida. Intenta con JPG, PNG, WEBP, HEIC o HEIF.');
      return;
    }

    if (imagenesValidas.length < archivos.length) {
      setErrorFotos('Algunos archivos fueron omitidos porque no son imagenes compatibles.');
    } else if (archivos.length > disponibles) {
      setErrorFotos('Solo puedes subir hasta 3 imagenes por ingreso.');
    } else {
      setErrorFotos(null);
    }

    setFotosIngreso((prev) => [...prev, ...seleccionadas].slice(0, 3));
  };

  const quitarFoto = (id) => {
    setFotosIngreso((prev) => {
      const encontrada = prev.find((foto) => foto.id === id);
      if (encontrada) URL.revokeObjectURL(encontrada.preview);
      return prev.filter((foto) => foto.id !== id);
    });
  };

  const seleccionarEmpresa = (empresa, overrides = {}) => {
    const correosDisponibles = (empresa.correos || []).map((item) => item.email).filter(Boolean);
    const correoInicial = overrides.email || correosDisponibles[0] || '';

    setTipoClienteIngreso('empresa');
    setEmpresaSeleccionadaId(empresa.id);
    setCorreosEmpresa(correosDisponibles);
    setEmpresaSeleccionadaCorreo(correosDisponibles.includes(correoInicial) ? correoInicial : '');
    setNuevoCorreoEmpresa('');
    setMensajeCorreoEmpresa(null);
    setModoEmpresaManual(false);
    setForm((prev) => ({
      ...prev,
      cliente_empresa: empresa.nombre || '',
      cliente_rut: overrides.rut || empresa.rut || '',
      cliente_nombre: overrides.contactoNombre ?? '',
      cliente_telefono: overrides.telefono ?? '',
      cliente_email: correoInicial,
      cliente_direccion: overrides.direccion ?? ''
    }));
  };

  const cambiarEmpresaSeleccionada = (id) => {
    if (id === '__particular__') {
      setTipoClienteIngreso('particular');
      setEmpresaSeleccionadaId(null);
      setCorreosEmpresa([]);
      setEmpresaSeleccionadaCorreo('');
      setNuevoCorreoEmpresa('');
      setMensajeCorreoEmpresa(null);
      setModoEmpresaManual(false);
      setForm((prev) => ({
        ...prev,
        cliente_empresa: '',
        cliente_rut: '',
        cliente_telefono: '',
        cliente_email: '',
        cliente_direccion: ''
      }));
      return;
    }

    if (id === '__manual__') {
      setTipoClienteIngreso('empresa');
      setEmpresaSeleccionadaId(null);
      setCorreosEmpresa([]);
      setEmpresaSeleccionadaCorreo('');
      setNuevoCorreoEmpresa('');
      setMensajeCorreoEmpresa(null);
      setModoEmpresaManual(true);
      setForm((prev) => ({
        ...prev,
        cliente_empresa: '',
        cliente_nombre: '',
        cliente_rut: '',
        cliente_telefono: '',
        cliente_email: '',
        cliente_direccion: ''
      }));
      return;
    }

    const empresa = empresas.find((item) => String(item.id) === String(id));
    if (empresa) seleccionarEmpresa(empresa);
  };

  const seleccionarCorreoEmpresa = (valor) => {
    setEmpresaSeleccionadaCorreo(valor);
    actualizar('cliente_email', valor || '');
    setMensajeCorreoEmpresa(null);
  };

  const guardarCorreoEmpresa = async () => {
    if (!empresaSeleccionadaId || !nuevoCorreoEmpresa.trim()) return;
    setGuardandoCorreoEmpresa(true);
    setMensajeCorreoEmpresa(null);
    try {
      const { data } = await api.post(`/clientes/${empresaSeleccionadaId}/correos`, {
        email: nuevoCorreoEmpresa.trim()
      });
      const nuevosCorreos = (data.correos || []).map((item) => item.email).filter(Boolean);
      setEmpresas((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setCorreosEmpresa(nuevosCorreos);
      setEmpresaSeleccionadaCorreo(nuevoCorreoEmpresa.trim().toLowerCase());
      actualizar('cliente_email', nuevoCorreoEmpresa.trim().toLowerCase());
      setNuevoCorreoEmpresa('');
      setMensajeCorreoEmpresa({ tipo: 'ok', texto: 'Correo agregado a la empresa correctamente.' });
    } catch (err) {
      setMensajeCorreoEmpresa({
        tipo: 'error',
        texto: err.response?.data?.error || 'No se pudo agregar el correo a la empresa.'
      });
    } finally {
      setGuardandoCorreoEmpresa(false);
    }
  };

  const validarPaso1 = () => {
    if (tipoClienteIngreso === 'particular') {
      return form.cliente_nombre.trim() && form.cliente_rut.trim();
    }
    return form.cliente_empresa.trim() && form.cliente_nombre.trim() && form.cliente_rut.trim();
  };
  const validarPaso2 = () => form.tipo_equipo && form.falla_reportada.trim();
  const validarPaso3 = () => firmaData && form.firma_ingreso_nombre.trim() && form.firma_ingreso_rut.trim();

  const siguientePaso = () => setPaso((p) => Math.min(p + 1, 3));
  const pasoAnterior = () => setPaso((p) => Math.max(p - 1, 1));

  const enviarFormulario = async () => {
    setEnviando(true);
    setErrorEnvio(null);
    setAdvertenciaFotos(null);
    try {
      const payload = {
        cliente: {
          empresa_id: empresaSeleccionadaId,
          tipo_cliente: tipoClienteIngreso,
          nombre: tipoClienteIngreso === 'empresa' ? form.cliente_empresa : form.cliente_nombre,
          razon_social: tipoClienteIngreso === 'empresa' ? form.cliente_empresa : '',
          contacto_nombre: form.cliente_nombre,
          rut: form.cliente_rut,
          telefono: form.cliente_telefono,
          email: form.cliente_email,
          direccion: form.cliente_direccion
        },
        tipo_equipo: form.tipo_equipo,
        marca: form.marca,
        modelo: form.modelo,
        numero_serie: form.numero_serie,
        color: form.color,
        falla_reportada: form.falla_reportada,
        accesorios: form.accesorios,
        estado_fisico: form.estado_fisico,
        tecnico_asignado_id: form.tecnico_asignado_id ? Number(form.tecnico_asignado_id) : null,
        preingreso_id: preingresoCargado?.id || null,
        clave_acceso: form.clave_acceso,
        observaciones_ingreso: form.observaciones_ingreso,
        firma_ingreso_nombre: form.firma_ingreso_nombre,
        firma_ingreso_rut: form.firma_ingreso_rut,
        firma_ingreso_data: firmaData
      };
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      fotosIngreso.slice(0, 3).forEach((foto) => {
        formData.append('fotos_ingreso', foto.file, foto.file.name);
      });

      const { data } = await api.post('/ordenes', formData);

      fotosIngreso.forEach((foto) => URL.revokeObjectURL(foto.preview));
      setFotosIngreso([]);
      setAdvertenciaFotos(null);
      setOrdenCreada(data);
      if (preingresoCargado?.id) {
        setPreingresosPendientes((prev) => prev.filter((item) => item.id !== preingresoCargado.id));
      }
    } catch (err) {
      setErrorEnvio(err.response?.data?.error || 'No se pudo registrar el ingreso. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (ordenCreada) {
    return <ConfirmacionIngreso orden={ordenCreada} advertenciaFotos={advertenciaFotos} onNuevo={() => window.location.reload()} />;
  }

  const cargarCodigoServicio = async () => {
    if (!codigoServicio.trim()) return;
    setCargandoPreingreso(true);
    setErrorEnvio(null);
    try {
      const { data } = await api.get(`/preingresos/codigo/${codigoServicio.trim()}`);
      if (data.estado === 'recepcionado') {
        throw new Error('Este codigo de servicio ya fue usado en una recepcion.');
      }

      setPreingresoCargado(data);
      setTipoClienteIngreso('particular');
      setEmpresaSeleccionadaId(null);
      setCorreosEmpresa([]);
      setEmpresaSeleccionadaCorreo('');
      setNuevoCorreoEmpresa('');
      setMensajeCorreoEmpresa(null);
      setModoEmpresaManual(false);
      setForm((prev) => ({
        ...prev,
        cliente_empresa: data.empresa_nombre || '',
        cliente_nombre: data.cliente_nombre || '',
        cliente_rut: data.cliente_rut || '',
        cliente_telefono: data.cliente_telefono || '',
        cliente_email: data.cliente_email || '',
        cliente_direccion: '',
        tipo_equipo: data.tipo_equipo || prev.tipo_equipo,
        marca: data.marca || '',
        modelo: data.modelo || '',
        numero_serie: data.numero_serie || '',
        falla_reportada: data.falla_reportada || '',
        observaciones_ingreso: data.observaciones || ''
      }));
    } catch (err) {
      setPreingresoCargado(null);
      setErrorEnvio(err.response?.data?.error || err.message || 'No se pudo cargar el codigo de servicio.');
    } finally {
      setCargandoPreingreso(false);
    }
  };

  return (
    <div className="ingreso-pagina">
      <div className="ingreso-header">
        <h1 className="ingreso-titulo">Nuevo ingreso de equipo</h1>
        <p className="ingreso-sub">Completa los 3 pasos para registrar el equipo en taller</p>
      </div>

      <Tarjeta titulo="Codigo de servicio opcional">
        <div className="ingreso-codigo-grid">
          <Select
            value={codigoServicio}
            onChange={(e) => setCodigoServicio(e.target.value.toUpperCase())}
            disabled={cargandoPreingresosPendientes}
          >
            <option value="">
              {cargandoPreingresosPendientes
                ? 'Cargando preingresos respondidos...'
                : (preingresosPendientes.length ? 'Selecciona un preingreso respondido' : 'No hay preingresos pendientes')}
            </option>
            {preingresosPendientes.map((item) => (
              <option key={item.id} value={item.codigo_servicio}>
                {item.codigo_servicio} · {item.empresa_nombre || item.cliente_nombre || 'Sin nombre'} · {item.marca || 'Sin marca'} {item.modelo || ''}
              </option>
            ))}
          </Select>
          <Boton variante="secundario" onClick={cargarCodigoServicio} disabled={cargandoPreingreso}>
            {cargandoPreingreso ? 'Buscando...' : 'Cargar codigo'}
          </Boton>
        </div>
        <p className="ingreso-nota">
          Aqui se precargan los preingresos ya respondidos por el cliente y aun no asociados a un ingreso. Tambien puedes seleccionar uno para reutilizar sus datos basicos.
        </p>
        {preingresosPendientes.length > 0 && (
          <div className="ingreso-chips" style={{ marginTop: 10 }}>
            {preingresosPendientes.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip ${codigoServicio === item.codigo_servicio ? 'chip-activo' : ''}`}
                onClick={() => setCodigoServicio(item.codigo_servicio)}
              >
                {item.codigo_servicio} · {item.empresa_nombre || item.cliente_nombre || 'Pendiente'}
              </button>
            ))}
          </div>
        )}
        {preingresoCargado && (
          <Alerta tipo="ok">
            Codigo {preingresoCargado.codigo_servicio} cargado. Ahora solo completa los datos faltantes de recepcion.
          </Alerta>
        )}
      </Tarjeta>

      <PasosIndicador paso={paso} />

      <Tarjeta>
        {paso === 1 && (
          <SeccionCliente
            form={form}
            actualizar={actualizar}
            usuario={usuario}
            empresas={empresas}
            cargandoEmpresas={cargandoEmpresas}
            cambiarEmpresaSeleccionada={cambiarEmpresaSeleccionada}
            empresaSeleccionadaId={empresaSeleccionadaId}
            empresaSeleccionadaCorreo={empresaSeleccionadaCorreo}
            correosEmpresa={correosEmpresa}
            nuevoCorreoEmpresa={nuevoCorreoEmpresa}
            setNuevoCorreoEmpresa={setNuevoCorreoEmpresa}
            guardarCorreoEmpresa={guardarCorreoEmpresa}
            guardandoCorreoEmpresa={guardandoCorreoEmpresa}
            mensajeCorreoEmpresa={mensajeCorreoEmpresa}
            seleccionarCorreoEmpresa={seleccionarCorreoEmpresa}
            modoEmpresaManual={modoEmpresaManual}
            tipoClienteIngreso={tipoClienteIngreso}
          />
        )}
        {paso === 2 && (
          <SeccionEquipo
            form={form}
            actualizar={actualizar}
            toggleAccesorio={toggleAccesorio}
            fotosIngreso={fotosIngreso}
            agregarFotos={agregarFotos}
            quitarFoto={quitarFoto}
            tecnicos={tecnicos}
            cargandoTecnicos={cargandoTecnicos}
          />
        )}
        {paso === 3 && (
          <SeccionFirma
            form={form}
            actualizar={actualizar}
            firmaData={firmaData}
            setFirmaData={setFirmaData}
          />
        )}

        {errorEnvio && <Alerta tipo="error">{errorEnvio}</Alerta>}
        {errorFotos && <Alerta tipo="warn">{errorFotos}</Alerta>}

        <div className="ingreso-acciones">
          {paso > 1 && (
            <Boton variante="secundario" onClick={pasoAnterior}>← Atras</Boton>
          )}
          <div style={{ flex: 1 }} />
          {paso < 3 && (
            <Boton
              onClick={siguientePaso}
              disabled={(paso === 1 && !validarPaso1()) || (paso === 2 && !validarPaso2())}
            >
              Continuar →
            </Boton>
          )}
          {paso === 3 && (
            <Boton onClick={enviarFormulario} disabled={!validarPaso3() || enviando}>
              {enviando ? 'Registrando...' : 'Registrar ingreso'}
            </Boton>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}

function PasosIndicador({ paso }) {
  const pasos = ['Datos del cliente', 'Datos del equipo', 'Firma de conformidad'];
  return (
    <div className="pasos-indicador">
      {pasos.map((texto, i) => {
        const numero = i + 1;
        const estado = numero < paso ? 'completo' : numero === paso ? 'activo' : 'pendiente';
        return (
          <div key={texto} className={`paso-item paso-${estado}`}>
            <span className="paso-numero">{numero < paso ? '✓' : numero}</span>
            <span className="paso-texto">{texto}</span>
          </div>
        );
      })}
    </div>
  );
}

function SeccionCliente({
  form,
  actualizar,
  usuario,
  empresas,
  cargandoEmpresas,
  cambiarEmpresaSeleccionada,
  empresaSeleccionadaId,
  empresaSeleccionadaCorreo,
  correosEmpresa,
  nuevoCorreoEmpresa,
  setNuevoCorreoEmpresa,
  guardarCorreoEmpresa,
  guardandoCorreoEmpresa,
  mensajeCorreoEmpresa,
  seleccionarCorreoEmpresa,
  modoEmpresaManual,
  tipoClienteIngreso
}) {
  const esEmpresa = tipoClienteIngreso === 'empresa';
  const puedeCrearCorreosEmpresa = ['admin', 'tecnico'].includes(usuario?.rol);
  const empresaExistenteSeleccionada = esEmpresa && Boolean(empresaSeleccionadaId) && !modoEmpresaManual;

  return (
    <div>
      <h3 className="ingreso-seccion-titulo">Datos de la empresa y contacto</h3>
      <div className="ingreso-grid-2">
        <Campo etiqueta="Tipo de cliente" requerido hint="Elige particular o una empresa existente/manual">
          <Select
            value={tipoClienteIngreso === 'particular' ? '__particular__' : (modoEmpresaManual ? '__manual__' : (empresaSeleccionadaId || ''))}
            onChange={(e) => cambiarEmpresaSeleccionada(e.target.value)}
            disabled={cargandoEmpresas}
          >
            <option value="__particular__">Particular</option>
            <option value="" disabled>{cargandoEmpresas ? 'Cargando empresas...' : 'Selecciona una empresa'}</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre} - {empresa.rut}
              </option>
            ))}
            <option value="__manual__">Ingresar empresa manualmente</option>
          </Select>
        </Campo>
        {esEmpresa ? (
          <>
            <Campo etiqueta="Nombre empresa" requerido>
              <Input
                value={form.cliente_empresa}
                onChange={(e) => actualizar('cliente_empresa', e.target.value)}
                placeholder="Ej: Backupcode SPA"
                autoFocus
                disabled={!modoEmpresaManual && Boolean(empresaSeleccionadaId)}
              />
            </Campo>
            <Campo etiqueta="Persona que entrega / contacto" requerido>
              <Input value={form.cliente_nombre} onChange={(e) => actualizar('cliente_nombre', e.target.value)} placeholder="Ej: Maria Gonzalez Perez" />
            </Campo>
          </>
        ) : (
          <Campo etiqueta="Nombre completo" requerido>
            <Input
              value={form.cliente_nombre}
              onChange={(e) => actualizar('cliente_nombre', e.target.value)}
              placeholder="Ej: Maria Gonzalez Perez"
              autoFocus
            />
          </Campo>
        )}
        <Campo etiqueta={esEmpresa ? 'RUT empresa' : 'RUT'} requerido hint="Sin puntos, con guion. Ej: 12345678-9">
          <Input value={form.cliente_rut} onChange={(e) => actualizar('cliente_rut', e.target.value)} placeholder="12345678-9" />
        </Campo>
        <Campo etiqueta={esEmpresa ? 'Telefono empresa' : 'Telefono'}>
          <Input value={form.cliente_telefono} onChange={(e) => actualizar('cliente_telefono', e.target.value)} placeholder="+56 9 1234 5678" />
        </Campo>
        {empresaExistenteSeleccionada && (
          <Campo etiqueta="Correo asociado de empresa" hint="Puedes reutilizar un correo guardado o dejar otro solo para esta orden">
            <Select value={empresaSeleccionadaCorreo} onChange={(e) => seleccionarCorreoEmpresa(e.target.value)}>
              <option value="">Usar otro correo en esta orden</option>
              {correosEmpresa.map((correo) => (
                <option key={correo} value={correo}>{correo}</option>
              ))}
            </Select>
          </Campo>
        )}
        <Campo etiqueta={esEmpresa ? 'Correo contacto orden' : 'Correo'}>
          <Input type="email" value={form.cliente_email} onChange={(e) => actualizar('cliente_email', e.target.value)} placeholder="cliente@correo.cl" />
        </Campo>
      </div>
      <Campo etiqueta={esEmpresa ? 'Direccion empresa' : 'Direccion'}>
        <Input value={form.cliente_direccion} onChange={(e) => actualizar('cliente_direccion', e.target.value)} placeholder="Calle, numero, comuna" />
      </Campo>
      {empresaExistenteSeleccionada && (
        <div style={{ display: 'grid', gap: '10px', marginBottom: 12 }}>
          {puedeCrearCorreosEmpresa && (
            <div className="ingreso-grid-2">
              <Campo etiqueta="Agregar correo a la empresa" hint="Disponible para administradores y tecnicos">
                <Input
                  type="email"
                  value={nuevoCorreoEmpresa}
                  onChange={(e) => setNuevoCorreoEmpresa(e.target.value)}
                  placeholder="nuevo.contacto@empresa.cl"
                />
              </Campo>
              <Campo etiqueta="Accion">
                <Boton
                  tipo="button"
                  variante="secundario"
                  onClick={guardarCorreoEmpresa}
                  disabled={!nuevoCorreoEmpresa.trim() || guardandoCorreoEmpresa}
                >
                  {guardandoCorreoEmpresa ? 'Guardando...' : 'Guardar en empresa'}
                </Boton>
              </Campo>
            </div>
          )}
          {mensajeCorreoEmpresa && <Alerta tipo={mensajeCorreoEmpresa.tipo}>{mensajeCorreoEmpresa.texto}</Alerta>}
        </div>
      )}
      <p className="ingreso-nota">
        {esEmpresa
          ? 'Si seleccionas una empresa existente, se reutilizara su ficha maestra. El contacto de la orden sigue siendo editable para este ingreso.'
          : 'Usa la opcion Particular cuando el ingreso no este asociado a una empresa.'}
      </p>
    </div>
  );
}

function SeccionEquipo({ form, actualizar, toggleAccesorio, fotosIngreso, agregarFotos, quitarFoto, tecnicos, cargandoTecnicos }) {
  return (
    <div>
      <h3 className="ingreso-seccion-titulo">Datos del equipo</h3>
      <div className="ingreso-grid-2">
        <Campo etiqueta="Tipo de equipo" requerido>
          <Select value={form.tipo_equipo} onChange={(e) => actualizar('tipo_equipo', e.target.value)}>
            <option value="computador">Computador de escritorio</option>
            <option value="notebook">Notebook</option>
            <option value="impresora">Impresora</option>
            <option value="otro">Otro</option>
          </Select>
        </Campo>
        <Campo etiqueta="Marca">
          <Input value={form.marca} onChange={(e) => actualizar('marca', e.target.value)} placeholder="Ej: HP, Dell, Epson" />
        </Campo>
        <Campo etiqueta="Modelo">
          <Input value={form.modelo} onChange={(e) => actualizar('modelo', e.target.value)} placeholder="Ej: Pavilion 15" />
        </Campo>
        <Campo etiqueta="N° de serie">
          <Input className="mono" value={form.numero_serie} onChange={(e) => actualizar('numero_serie', e.target.value)} placeholder="Etiqueta del fabricante" />
        </Campo>
        <Campo etiqueta="Color">
          <Input value={form.color} onChange={(e) => actualizar('color', e.target.value)} placeholder="Ej: Gris espacial" />
        </Campo>
        <Campo etiqueta="Clave de acceso" hint="Solo si el cliente la proporciona voluntariamente">
          <Input value={form.clave_acceso} onChange={(e) => actualizar('clave_acceso', e.target.value)} placeholder="Contrasena del equipo/usuario" />
        </Campo>
        <Campo etiqueta="Tecnico asignado" hint="Opcional. Puedes dejarlo pendiente y asignarlo despues.">
          <Select value={form.tecnico_asignado_id} onChange={(e) => actualizar('tecnico_asignado_id', e.target.value)} disabled={cargandoTecnicos}>
            <option value="">{cargandoTecnicos ? 'Cargando tecnicos...' : 'Sin asignar'}</option>
            {tecnicos.map((tecnico) => (
              <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>
            ))}
          </Select>
        </Campo>
      </div>

      <Campo etiqueta="Falla reportada por el cliente" requerido hint="Puedes hacer clic en los motivos más comunes para autocompletar">
        <div className="ingreso-chips" style={{ marginBottom: 10 }}>
          {FALLAS_PRESET.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${form.falla_reportada.includes(item) ? 'chip-activo' : ''}`}
              onClick={() => {
                const actual = form.falla_reportada;
                if (actual.includes(item)) {
                  actualizar('falla_reportada', actual.replace(item, '').replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',').trim());
                } else {
                  actualizar('falla_reportada', actual ? `${actual}, ${item}` : item);
                }
              }}
            >
              + {item}
            </button>
          ))}
        </div>
        <Textarea value={form.falla_reportada} onChange={(e) => actualizar('falla_reportada', e.target.value)} placeholder="Describe el problema tal como lo indica el cliente" />
      </Campo>

      <Campo etiqueta="Accesorios entregados">
        <div className="ingreso-chips">
          {ACCESORIOS_DISPONIBLES.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${form.accesorios.includes(item) ? 'chip-activo' : ''}`}
              onClick={() => toggleAccesorio(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </Campo>

      <Campo etiqueta="Estado fisico al ingreso" hint="Rayones, golpes, piezas faltantes, etc. Haz clic en las opciones para agregar rápido.">
        <div className="ingreso-chips" style={{ marginBottom: 10 }}>
          {ESTADO_FISICO_PRESET.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${form.estado_fisico.includes(item) ? 'chip-activo' : ''}`}
              onClick={() => {
                const actual = form.estado_fisico;
                if (actual.includes(item)) {
                  actualizar('estado_fisico', actual.replace(item, '').replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',').trim());
                } else {
                  actualizar('estado_fisico', actual ? `${actual}, ${item}` : item);
                }
              }}
            >
              + {item}
            </button>
          ))}
        </div>
        <Textarea value={form.estado_fisico} onChange={(e) => actualizar('estado_fisico', e.target.value)} placeholder="Ej: Rayon en la tapa superior, falta tecla F5" />
      </Campo>

      <Campo etiqueta="Observaciones adicionales">
        <Textarea value={form.observaciones_ingreso} onChange={(e) => actualizar('observaciones_ingreso', e.target.value)} placeholder="Cualquier informacion relevante adicional" />
      </Campo>

      <Campo etiqueta="Fotos del ingreso" hint="Maximo 3 imagenes JPG, PNG o WEBP">
        <div className="ingreso-fotos-acciones">
          <div className="ingreso-foto-campo">
            <span className="ingreso-foto-label">Tomar foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                agregarFotos(e.target.files);
                e.target.value = '';
              }}
              disabled={fotosIngreso.length >= 3}
            />
          </div>
          <div className="ingreso-foto-campo">
            <span className="ingreso-foto-label">Elegir de galeria</span>
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={(e) => {
                agregarFotos(e.target.files);
                e.target.value = '';
              }}
              disabled={fotosIngreso.length >= 3}
            />
          </div>
        </div>
        <p className="ingreso-nota" style={{ marginTop: 8, marginBottom: 8 }}>
          Desde celular puedes tomar la foto con la camara o elegirla desde la galeria. Seleccionadas: {fotosIngreso.length} de 3
        </p>
        {fotosIngreso.length > 0 && (
          <div className="ingreso-fotos-grid">
            {fotosIngreso.map((foto) => (
              <div key={foto.id} className="ingreso-foto-item">
                <img src={foto.preview} alt={foto.file.name} className="ingreso-foto-preview" />
                <div className="ingreso-foto-meta">
                  <span>{foto.file.name}</span>
                  <button type="button" className="link-accion" onClick={() => quitarFoto(foto.id)}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Campo>
    </div>
  );
}

function esImagenValida(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  const nombre = (file.name || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].some((ext) => nombre.endsWith(ext));
}

function SeccionFirma({ form, actualizar, firmaData, setFirmaData }) {
  return (
    <div>
      <h3 className="ingreso-seccion-titulo">Firma de conformidad</h3>
      <p className="ingreso-nota" style={{ marginTop: -6, marginBottom: 16 }}>
        El cliente debe firmar para confirmar que los datos del equipo y los terminos del servicio son correctos.
      </p>

      <div className="ingreso-grid-2">
        <Campo etiqueta="Nombre de quien firma" requerido>
          <Input
            value={form.firma_ingreso_nombre}
            onChange={(e) => actualizar('firma_ingreso_nombre', e.target.value)}
            placeholder="Nombre completo"
          />
        </Campo>
        <Campo etiqueta="RUT de quien firma" requerido>
          <Input
            value={form.firma_ingreso_rut}
            onChange={(e) => actualizar('firma_ingreso_rut', e.target.value)}
            placeholder="12345678-9"
          />
        </Campo>
      </div>

      <FirmaPanel etiqueta="Firma del cliente" onCambio={setFirmaData} />

      {!firmaData && (
        <p className="campo-error" style={{ marginTop: 10 }}>Se requiere la firma del cliente para continuar.</p>
      )}
    </div>
  );
}

function ConfirmacionIngreso({ orden, advertenciaFotos, onNuevo }) {
  const navigate = useNavigate();
  const [errorImpresion, setErrorImpresion] = useState(null);

  const imprimirComprobante = async () => {
    setErrorImpresion(null);
    try {
      await abrirDocumentoProtegido(`/ordenes/${orden.id}/pdf/ingreso`);
    } catch (err) {
      setErrorImpresion(err.response?.data?.error || 'No se pudo abrir el comprobante de ingreso.');
    }
  };

  const enviarWhatsApp = () => {
    enviarWhatsAppCliente({
      telefono: orden.cliente_telefono,
      tipo: 'ingreso',
      clienteNombre: orden.cliente_contacto_nombre || orden.cliente_nombre,
      numeroOrden: orden.numero_orden,
      equipo: [orden.marca, orden.modelo].filter(Boolean).join(' ') || orden.tipo_equipo
    });
  };

  return (
    <div className="ingreso-confirmacion">
      <div className="ingreso-confirmacion-icono">✓</div>
      <h2>Ingreso registrado correctamente</h2>
      <p className="mono ingreso-confirmacion-numero">{orden.numero_orden}</p>
      <p className="ingreso-nota">El equipo de {orden.cliente_contacto_nombre || orden.cliente_nombre} ha sido registrado en el sistema.</p>
      {advertenciaFotos && <Alerta tipo="warn">{advertenciaFotos}</Alerta>}
      {errorImpresion && <Alerta tipo="error">{errorImpresion}</Alerta>}

      <div className="ingreso-confirmacion-acciones" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Boton onClick={imprimirComprobante}>🖨 Imprimir comprobante</Boton>
        <Boton variante="secundario" style={{ backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }} onClick={enviarWhatsApp}>
          💬 Avisar por WhatsApp
        </Boton>
        <Boton variante="secundario" onClick={() => navigate(`/ordenes/${orden.id}`)}>
          Ver detalle de la orden
        </Boton>
        <Boton variante="fantasma" onClick={onNuevo}>
          Registrar otro ingreso
        </Boton>
      </div>
    </div>
  );
}
