// API service for backend communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  logout: () => {
    removeAuthToken();
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
};

// Documents API
export const documentsAPI = {
  upload: async (file, documentType = 'id') => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  getAll: async () => {
    return apiRequest('/documents');
  },

  delete: async (id) => {
    return apiRequest(`/documents/${id}`, {
      method: 'DELETE',
    });
  },
};

// OCR API
export const ocrAPI = {
  extract: async (documentPath, usePythonOCR = true, useOllama = false) => {
    return apiRequest('/ocr/extract', {
      method: 'POST',
      body: JSON.stringify({ 
        documentPath,
        usePythonOCR,
        useOllama
      }),
    });
  },
};

// Leases API
export const leasesAPI = {
  getAll: async () => {
    return apiRequest('/leases');
  },

  getById: async (id) => {
    return apiRequest(`/leases/${id}`);
  },

  create: async (leaseData) => {
    return apiRequest('/leases', {
      method: 'POST',
      body: JSON.stringify(leaseData),
    });
  },

  update: async (id, leaseData) => {
    return apiRequest(`/leases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leaseData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/leases/${id}`, {
      method: 'DELETE',
    });
  },

  generatePDF: async (id) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/leases/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('PDF generation failed');
    }

    const blob = await response.blob();
    return blob;
  },

  generatePDFFromData: async (extractedData) => {
    const response = await fetch(`${API_BASE_URL}/leases/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(extractedData),
    });

    if (!response.ok) {
      // Try to get error message
      let errorMessage = 'PDF generation failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // CRITICAL: Get response as blob (binary data), not JSON
    const blob = await response.blob();
    
    // Verify it's actually a PDF
    if (blob.size === 0) {
      throw new Error('PDF blob is empty');
    }
    
    // Validate PDF magic bytes
    const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const isPDF = uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46;
    
    if (!isPDF) {
      // If it's not a PDF and has content, it might be an error message
      if (blob.size > 100) {
        const text = await blob.text();
        console.error('Response is not a PDF:', text.substring(0, 200));
      }
      console.error('Invalid PDF magic bytes. Blob type:', blob.type, 'size:', blob.size);
      throw new Error('Invalid PDF file received from server - file may be corrupted');
    }
    
    // Return the blob
    return blob;
  },
};

export { getAuthToken, setAuthToken, removeAuthToken };

