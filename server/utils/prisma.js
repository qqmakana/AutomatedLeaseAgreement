// Lazy Prisma loader - only loads when actually needed
let prismaInstance = null;
let prismaError = null;

function getPrisma() {
  if (prismaInstance) {
    return prismaInstance;
  }
  
  if (prismaError) {
    return null;
  }
  
  try {
    const prismaModule = require('@prisma/client');
    if (prismaModule && prismaModule.PrismaClient) {
      prismaInstance = new prismaModule.PrismaClient();
      return prismaInstance;
    }
  } catch (error) {
    prismaError = error;
    console.log('⚠️  Prisma not available, database features disabled');
    return null;
  }
  
  return null;
}

module.exports = { getPrisma };







