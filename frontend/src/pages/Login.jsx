import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Boton, Campo, Input, Alerta } from '../components/ui';
import logoBackupcode from '../assets/backupcode-login-logo.jpg';
import './Login.css';

export default function Login() {
  const { login, cargando, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const manejarSubmit = async (e) => {
    e.preventDefault();
    const exito = await login(email, password);
    if (exito) navigate('/');
  };

  return (
    <div className="login-pantalla">
      <div className="login-tarjeta">
        <div className="login-marca">
          <img src={logoBackupcode} alt="Backupcode Soluciones IT" className="login-marca-logo" />
          <h1>Sistema de soporte</h1>
          <p>Ingreso, seguimiento y entrega de equipos</p>
        </div>

        <form onSubmit={manejarSubmit}>
          {error && <Alerta tipo="error">{error}</Alerta>}

          <Campo etiqueta="Correo electronico" requerido>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.cl"
              required
              autoFocus
            />
          </Campo>

          <Campo etiqueta="Contrasena" requerido>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Campo>

          <Boton tipo="submit" ancho="100%" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar sesion'}
          </Boton>
        </form>

        <p className="login-pie">
          ¿Olvidaste tu contrasena? Pide a un administrador que la restablezca.
        </p>
      </div>
    </div>
  );
}
