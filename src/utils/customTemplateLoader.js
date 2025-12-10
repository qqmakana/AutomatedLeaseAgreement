// Load and use custom templates
export const loadCustomTemplate = () => {
  const savedTemplate = localStorage.getItem('customLeaseTemplate');
  return savedTemplate ? JSON.parse(savedTemplate) : null;
};

export const saveCustomTemplate = (template) => {
  localStorage.setItem('customLeaseTemplate', JSON.stringify(template));
};

export const useCustomTemplate = (tenantData, leaseDetails) => {
  const template = loadCustomTemplate();
  if (template && template.content) {
    // Use custom template
    return processCustomTemplate(template.content, tenantData, leaseDetails);
  }
  return null; // Use default template
};

const processCustomTemplate = (templateContent, tenantData, leaseDetails) => {
  // Import template processor
  const { processTemplate } = require('./templateProcessor');
  return processTemplate(templateContent, tenantData, leaseDetails);
};


















