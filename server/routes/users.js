const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { getPrisma } = require('../utils/prisma');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        createdAt: true,
        _count: {
          select: {
            leases: true,
            documents: true
          }
        }
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const { name, organization } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name,
        organization
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;












