// reset-db.js
// Run this with: node reset-db.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    // Delete all sessions first (due to foreign key constraints)
    await prisma.session.deleteMany({});
    console.log('All sessions deleted');
    
    // Delete all accounts
    await prisma.account.deleteMany({});
    console.log('All accounts deleted');
    
    // Delete all achievements
    await prisma.achievement.deleteMany({});
    console.log('All achievements deleted');
    
    // Delete all stats
    await prisma.stats.deleteMany({});
    console.log('All stats deleted');
    
    // Delete all users
    await prisma.user.deleteMany({});
    console.log('All users deleted');
    
    // Delete all verification tokens
    await prisma.verificationToken.deleteMany({});
    console.log('All verification tokens deleted');
    
    console.log('Database reset completed. You can now try logging in again.');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase(); 