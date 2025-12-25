// Activity Logger - Tracks user actions in the system

const ACTIVITY_LOG_KEY = 'systemActivityLog';
const MAX_ACTIVITIES = 500; // Keep last 500 activities

// Activity types
export const ACTIVITY_TYPES = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Document Operations
  UPLOAD_LEASE_CONTROL: 'upload_lease_control',
  UPLOAD_INVOICE: 'upload_invoice',
  UPLOAD_DOCUMENT: 'upload_document',
  
  // Generation
  GENERATE_PDF: 'generate_pdf',
  GENERATE_WORD: 'generate_word',
  PREVIEW: 'preview',
  
  // Form Operations
  SAVE_DRAFT: 'save_draft',
  LOAD_DRAFT: 'load_draft',
  DELETE_DRAFT: 'delete_draft',
  CLEAR_FORM: 'clear_form',
  
  // User Management (Admin)
  CREATE_USER: 'create_user',
  APPROVE_USER: 'approve_user',
  REJECT_USER: 'reject_user',
  DELETE_USER: 'delete_user',
  DISABLE_USER: 'disable_user',
  ENABLE_USER: 'enable_user',
  
  // Account
  REQUEST_ACCOUNT: 'request_account',
};

// Get all activities from storage
export const getActivities = () => {
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading activity log:', e);
    return [];
  }
};

// Log a new activity
export const logActivity = (type, details = {}, user = null) => {
  try {
    // Get current user if not provided
    if (!user) {
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        const parsed = JSON.parse(authUser);
        user = {
          username: parsed.username,
          name: parsed.name,
          role: parsed.role
        };
      }
    }
    
    const activity = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type,
      details,
      user: user || { username: 'anonymous', name: 'Anonymous', role: 'Unknown' },
      timestamp: new Date().toISOString(),
    };
    
    const activities = getActivities();
    activities.unshift(activity); // Add to beginning
    
    // Keep only last MAX_ACTIVITIES
    const trimmed = activities.slice(0, MAX_ACTIVITIES);
    
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmed));
    
    return activity;
  } catch (e) {
    console.error('Error logging activity:', e);
    return null;
  }
};

// Get activities for a specific user
export const getUserActivities = (username) => {
  const activities = getActivities();
  return activities.filter(a => a.user?.username?.toLowerCase() === username?.toLowerCase());
};

// Get activities by type
export const getActivitiesByType = (type) => {
  const activities = getActivities();
  return activities.filter(a => a.type === type);
};

// Get activities within a date range
export const getActivitiesInRange = (startDate, endDate) => {
  const activities = getActivities();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return activities.filter(a => {
    const time = new Date(a.timestamp).getTime();
    return time >= start && time <= end;
  });
};

// Clear all activities (admin only)
export const clearAllActivities = () => {
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify([]));
};

// Get activity display info
export const getActivityDisplay = (type) => {
  const displays = {
    [ACTIVITY_TYPES.LOGIN]: { icon: '🔐', label: 'Logged in', color: 'green' },
    [ACTIVITY_TYPES.LOGOUT]: { icon: '🚪', label: 'Logged out', color: 'gray' },
    [ACTIVITY_TYPES.UPLOAD_LEASE_CONTROL]: { icon: '📄', label: 'Uploaded Lease Control', color: 'blue' },
    [ACTIVITY_TYPES.UPLOAD_INVOICE]: { icon: '🧾', label: 'Uploaded Invoice', color: 'orange' },
    [ACTIVITY_TYPES.UPLOAD_DOCUMENT]: { icon: '📎', label: 'Uploaded Document', color: 'purple' },
    [ACTIVITY_TYPES.GENERATE_PDF]: { icon: '📕', label: 'Generated PDF', color: 'red' },
    [ACTIVITY_TYPES.GENERATE_WORD]: { icon: '📘', label: 'Generated Word', color: 'blue' },
    [ACTIVITY_TYPES.PREVIEW]: { icon: '👁️', label: 'Previewed Document', color: 'cyan' },
    [ACTIVITY_TYPES.SAVE_DRAFT]: { icon: '💾', label: 'Saved Draft', color: 'green' },
    [ACTIVITY_TYPES.LOAD_DRAFT]: { icon: '📂', label: 'Loaded Draft', color: 'yellow' },
    [ACTIVITY_TYPES.DELETE_DRAFT]: { icon: '🗑️', label: 'Deleted Draft', color: 'red' },
    [ACTIVITY_TYPES.CLEAR_FORM]: { icon: '🧹', label: 'Cleared Form', color: 'gray' },
    [ACTIVITY_TYPES.CREATE_USER]: { icon: '👤', label: 'Created User', color: 'green' },
    [ACTIVITY_TYPES.APPROVE_USER]: { icon: '✅', label: 'Approved User', color: 'green' },
    [ACTIVITY_TYPES.REJECT_USER]: { icon: '❌', label: 'Rejected User', color: 'red' },
    [ACTIVITY_TYPES.DELETE_USER]: { icon: '🗑️', label: 'Deleted User', color: 'red' },
    [ACTIVITY_TYPES.DISABLE_USER]: { icon: '🚫', label: 'Disabled User', color: 'orange' },
    [ACTIVITY_TYPES.ENABLE_USER]: { icon: '✓', label: 'Enabled User', color: 'green' },
    [ACTIVITY_TYPES.REQUEST_ACCOUNT]: { icon: '📝', label: 'Requested Account', color: 'blue' },
  };
  
  return displays[type] || { icon: '📌', label: type, color: 'gray' };
};

// Format timestamp for display
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default {
  logActivity,
  getActivities,
  getUserActivities,
  getActivitiesByType,
  getActivitiesInRange,
  clearAllActivities,
  getActivityDisplay,
  formatTimestamp,
  ACTIVITY_TYPES
};


