/**
 * Notification Routes
 * Handles email notifications for user registrations and other events
 */

const express = require('express');
const router = express.Router();
const { sendNewUserNotification, sendApprovalNotification } = require('../services/emailService');

// POST /api/notifications/new-user - Notify admin of new user registration
router.post('/new-user', async (req, res) => {
  try {
    const { userDetails, appUrl } = req.body;
    
    if (!userDetails || !userDetails.name || !userDetails.username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required user details' 
      });
    }
    
    const result = await sendNewUserNotification(userDetails, appUrl);
    
    res.json(result);
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification',
      error: error.message 
    });
  }
});

// POST /api/notifications/user-approved - Notify user that their account was approved
router.post('/user-approved', async (req, res) => {
  try {
    const { userEmail, userName, appUrl } = req.body;
    
    const result = await sendApprovalNotification(userEmail, userName, appUrl);
    
    res.json(result);
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification',
      error: error.message 
    });
  }
});

// GET /api/notifications/config - Check if email is configured
router.get('/config', (req, res) => {
  const isConfigured = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL_APP_PASSWORD);
  res.json({ 
    configured: isConfigured,
    message: isConfigured 
      ? 'Email notifications are configured' 
      : 'Email not configured - set ADMIN_EMAIL and ADMIN_EMAIL_APP_PASSWORD in .env'
  });
});

module.exports = router;

