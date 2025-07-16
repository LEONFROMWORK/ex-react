import axios from 'axios'

// Create axios instance with test user authentication
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
})

// Add test user ID to all requests
apiClient.interceptors.request.use((config) => {
  // Get test user from localStorage
  const testUser = typeof window !== 'undefined' ? localStorage.getItem('testUser') : null
  if (testUser) {
    const user = JSON.parse(testUser)
    config.headers['x-test-user-id'] = user.id
  }
  return config
})

export default apiClient