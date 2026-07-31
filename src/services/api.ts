import axios from 'axios'

const api = axios.create({
  // En Docker se usa /api y Vite lo redirige al contenedor backend. Fuera de
  // Docker se mantiene la URL local habitual para el flujo de desarrollo.
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
})

// Interceptor: añade automáticamente el token Bearer a cada petición si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
