// import axios from 'axios'

// export const apiClient = axios.create({
//   // Local: /api → Vite proxy → localhost:5089
//   // Vercel: VITE_API_URL → Backend ngrok
//   baseURL: import.meta.env.VITE_API_URL || '/api',

//   timeout: 15000,

//   withCredentials: true,
// })

import axios from 'axios'
import { apiBaseUrl } from '../config/backendUrl'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
})