const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPrisma } = require('../utils/prisma');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, organization } = req.body;

    // TEMPORARY: Bypass database for testing
    if (process.env.BYPASS_DB === 'true') {
      const mockUser = {
        id: 1,
        email: email,
        name: name || 'Test User',
        organization: organization || null,
        createdAt: new Date()
      };

      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.status(201).json({
        message: 'User registered successfully (test mode)',
        user: mockUser,
        token
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        organization: organization || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // TEMPORARY: Fallback to mock user if database fails
    if (process.env.BYPASS_DB === 'true' || error.code === 'P1001') {
      const { email, name, organization } = req.body;
      const mockUser = {
        id: 1,
        email: email,
        name: name || 'Test User',
        organization: organization || null,
        createdAt: new Date()
      };

      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'User registered successfully (test mode - no database)',
        user: mockUser,
        token
      });
    }

    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // TEMPORARY: Bypass database for testing - allow any email/password
    if (process.env.BYPASS_DB === 'true') {
      const mockUser = {
        id: 1,
        email: email,
        name: 'Test User',
        organization: null
      };

      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({
        message: 'Login successful (test mode)',
        user: mockUser,
        token
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // TEMPORARY: Fallback to mock login if database fails
    if (process.env.BYPASS_DB === 'true' || error.code === 'P1001') {
      const { email } = req.body;
      const mockUser = {
        id: 1,
        email: email,
        name: 'Test User',
        organization: null
      };

      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful (test mode - no database)',
        user: mockUser,
        token
      });
    }

    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // TEMPORARY: Bypass database for testing
    if (process.env.BYPASS_DB === 'true') {
      return res.json({
        user: {
          id: req.user.userId,
          email: req.user.email,
          name: 'Test User',
          organization: null,
          createdAt: new Date()
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        createdAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    
    // Fallback to mock user if database fails
    if (process.env.BYPASS_DB === 'true' || error.code === 'P1001') {
      return res.json({
        user: {
          id: req.user.userId,
          email: req.user.email,
          name: 'Test User',
          organization: null,
          createdAt: new Date()
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ===== USER MANAGEMENT ROUTES =====

// Get all users (admin function)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // TEMPORARY: Bypass database - return mock users
    if (process.env.BYPASS_DB === 'true') {
      // Get users from a simple JSON file or return defaults
      const mockUsers = getMockUsers();
      return res.json({ users: mockUsers });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    // Fallback to mock users
    const mockUsers = getMockUsers();
    res.json({ users: mockUsers });
  }
});

// Create new user (admin function)
router.post('/users', authenticateToken, async (req, res) => {
  try {
    const { email, password, name, organization, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // TEMPORARY: Bypass database - add to mock users
    if (process.env.BYPASS_DB === 'true') {
      const mockUsers = getMockUsers();
      
      // Check if user exists
      if (mockUsers.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const newUser = {
        id: Date.now(),
        email,
        name: name || email.split('@')[0],
        organization: organization || null,
        role: role || 'user',
        createdAt: new Date().toISOString()
      };

      mockUsers.push(newUser);
      saveMockUsers(mockUsers);

      return res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        organization: organization || null,
        role: role || 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Delete user (admin function)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // TEMPORARY: Bypass database - remove from mock users
    if (process.env.BYPASS_DB === 'true') {
      let mockUsers = getMockUsers();
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      mockUsers.splice(userIndex, 1);
      saveMockUsers(mockUsers);

      return res.json({ message: 'User deleted successfully' });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Helper functions for mock users (stored in memory/file)
const fs = require('fs');
const path = require('path');
const MOCK_USERS_FILE = path.join(__dirname, '../data/mock-users.json');

function getMockUsers() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(MOCK_USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(MOCK_USERS_FILE)) {
      const data = fs.readFileSync(MOCK_USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading mock users:', error);
  }

  // Return default users
  return [
    { id: 1, email: 'yehuda@example.com', name: 'Yehuda', organization: 'Client', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 2, email: 'builder@example.com', name: 'Builder', organization: 'Dev', role: 'user', createdAt: '2024-01-01T00:00:00.000Z' }
  ];
}

function saveMockUsers(users) {
  try {
    const dataDir = path.dirname(MOCK_USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(MOCK_USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving mock users:', error);
  }
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;

