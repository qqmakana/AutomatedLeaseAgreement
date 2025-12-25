/**
 * Email Notification Service
 * Sends email notifications to admin when new users register
 */

const nodemailer = require('nodemailer');

// Email configuration - using environment variables
const EMAIL_CONFIG = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.ADMIN_EMAIL || '', // Your Gmail address
    pass: process.env.ADMIN_EMAIL_APP_PASSWORD || '' // Gmail App Password (NOT your regular password)
  }
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(EMAIL_CONFIG);
};

/**
 * Send email notification to admin about new user registration
 * @param {Object} userDetails - The new user's details
 * @param {string} appUrl - The URL of the deployed app
 */
const sendNewUserNotification = async (userDetails, appUrl = 'http://localhost:3000') => {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail || !process.env.ADMIN_EMAIL_APP_PASSWORD) {
    console.log('⚠️ Email not configured. Skipping notification.');
    return { success: false, message: 'Email not configured' };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Lease System 📧" <${adminEmail}>`,
    to: adminEmail,
    subject: `🔔 New User Registration Request: ${userDetails.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; }
          .content { padding: 30px; }
          .user-card { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
          .user-card h3 { margin: 0 0 15px 0; color: #333; }
          .info-row { margin: 10px 0; }
          .label { color: #666; font-size: 12px; text-transform: uppercase; }
          .value { color: #333; font-size: 16px; font-weight: 500; }
          .password-box { background: #fff3cd; padding: 10px 15px; border-radius: 8px; margin-top: 15px; }
          .password-box code { font-size: 16px; font-weight: bold; color: #856404; }
          .buttons { text-align: center; margin: 30px 0; }
          .btn { display: inline-block; padding: 14px 28px; margin: 5px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; }
          .btn-approve { background: linear-gradient(135deg, #28a745, #20c997); color: white; }
          .btn-reject { background: linear-gradient(135deg, #dc3545, #e83e8c); color: white; }
          .btn-view { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .time { font-size: 12px; color: #999; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New User Registration</h1>
            <p>Someone is requesting access to your system</p>
          </div>
          <div class="content">
            <div class="user-card">
              <h3>👤 ${userDetails.name}</h3>
              <div class="info-row">
                <div class="label">Username</div>
                <div class="value">@${userDetails.username}</div>
              </div>
              ${userDetails.company ? `
              <div class="info-row">
                <div class="label">Organization</div>
                <div class="value">🏢 ${userDetails.company}</div>
              </div>
              ` : ''}
              <div class="password-box">
                <div class="label">Password (Visible to you)</div>
                <code>${userDetails.password}</code>
              </div>
              <div class="time">⏰ Requested: ${new Date().toLocaleString()}</div>
            </div>
            
            <div class="buttons">
              <a href="${appUrl}" class="btn btn-view">📱 Open Admin Panel</a>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
              Login to your Admin Panel to approve or reject this request.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Lease Drafting System.</p>
            <p>Do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
New User Registration Request

Name: ${userDetails.name}
Username: ${userDetails.username}
${userDetails.company ? `Organization: ${userDetails.company}` : ''}
Password: ${userDetails.password}

Login to your Admin Panel to approve or reject: ${appUrl}

Time: ${new Date().toLocaleString()}
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send email when user account is approved
 */
const sendApprovalNotification = async (userEmail, userName, appUrl = 'http://localhost:3000') => {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail || !process.env.ADMIN_EMAIL_APP_PASSWORD || !userEmail) {
    return { success: false, message: 'Email not configured or user email not provided' };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Lease System 📧" <${adminEmail}>`,
    to: userEmail,
    subject: `✅ Your Account Has Been Approved!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #28a745, #20c997); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Account Approved!</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Great news! Your account has been approved. You can now login to the Lease Drafting System.</p>
            <a href="${appUrl}" class="btn">Login Now</a>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNewUserNotification,
  sendApprovalNotification
};

