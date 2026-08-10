import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
});

export async function abrirDocumentoProtegido(url) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');

  // Da tiempo al navegador para consumir el blob antes de liberarlo.
  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
}

// Adjunta el token JWT guardado a cada peticion saliente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expira o es invalido, redirige al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
