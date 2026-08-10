import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Panel from './pages/Panel';
import Ordenes from './pages/Ordenes';
import DetalleOrden from './pages/DetalleOrden';
import Ingreso from './pages/Ingreso';
import Clientes from './pages/Clientes';
import Tecnicos from './pages/Tecnicos';
import Usuarios from './pages/Usuarios';
import Preingresos from './pages/Preingresos';
import Configuracion from './pages/Configuracion';
import SolicitudPublica from './pages/SolicitudPublica';
import ConsultaPublica from './pages/ConsultaPublica';
import RutaProtegida from './components/RutaProtegida';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/solicitud/:token" element={<SolicitudPublica />} />
      <Route path="/consulta" element={<ConsultaPublica />} />

      <Route path="/" element={<RutaProtegida><Panel /></RutaProtegida>} />
      <Route path="/ordenes" element={<RutaProtegida><Ordenes /></RutaProtegida>} />
      <Route path="/ordenes/:id" element={<RutaProtegida><DetalleOrden /></RutaProtegida>} />
      <Route path="/ingreso" element={<RutaProtegida><Ingreso /></RutaProtegida>} />
      <Route path="/preingresos" element={<RutaProtegida rolesPermitidos={['admin', 'recepcion', 'tecnico']}><Preingresos /></RutaProtegida>} />
      <Route path="/clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />
      <Route
        path="/configuracion"
        element={<RutaProtegida rolesPermitidos={['admin']}><Configuracion /></RutaProtegida>}
      />
      <Route
        path="/tecnicos"
        element={<RutaProtegida rolesPermitidos={['admin']}><Tecnicos /></RutaProtegida>}
      />
      <Route
        path="/usuarios"
        element={<RutaProtegida rolesPermitidos={['admin']}><Usuarios /></RutaProtegida>}
      />

      <Route path="*" element={<RutaProtegida><Panel /></RutaProtegida>} />
    </Routes>
  );
}
