// Toast notification utility
// Usage: toast.success('Message'), toast.error('Message'), etc.

let toastIdCounter = 0;
let toasts = [];
let setToastsState = null;

export const initToast = (setToasts) => {
  setToastsState = setToasts;
};

export const toast = {
  success: (message, duration = 4000) => {
    addToast('success', message, duration);
  },
  error: (message, duration = 5000) => {
    addToast('error', message, duration);
  },
  warning: (message, duration = 4000) => {
    addToast('warning', message, duration);
  },
  warn: (message, duration = 4000) => {
    addToast('warning', message, duration);
  },
  info: (message, duration = 4000) => {
    addToast('info', message, duration);
  }
};

const addToast = (type, message, duration) => {
  const id = ++toastIdCounter;
  const newToast = { id, type, message, duration };
  
  toasts = [...toasts, newToast];
  if (setToastsState) {
    setToastsState(toasts);
  }
  
  // Auto-remove after duration
  setTimeout(() => {
    removeToast(id);
  }, duration);
};

export const removeToast = (id) => {
  toasts = toasts.filter(t => t.id !== id);
  if (setToastsState) {
    setToastsState(toasts);
  }
};







