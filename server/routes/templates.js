const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { getPrisma } = require('../utils/prisma');

// Get all templates (user's custom + default)
router.get('/', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const userTemplates = await prisma.leaseTemplate.findMany({
      where: {
        OR: [
          { userId: req.user.userId },
          { isDefault: true }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ templates: userTemplates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create custom template
router.post('/', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const { name, content, jurisdiction } = req.body;

    const template = await prisma.leaseTemplate.create({
      data: {
        userId: req.user.userId,
        name,
        content,
        jurisdiction: jurisdiction || 'ZA', // Default to South Africa
        isDefault: false
      }
    });

    res.status(201).json({ template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const { name, content, jurisdiction } = req.body;

    const template = await prisma.leaseTemplate.update({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId // Only allow updating own templates
      },
      data: {
        name,
        content,
        jurisdiction
      }
    });

    res.json({ template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    await prisma.leaseTemplate.delete({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId // Only allow deleting own templates
      }
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;












