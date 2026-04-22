const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('📊 Checking database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        password: true, // We'll just check if it exists, not show it
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database.\n');
      console.log('💡 You may need to register a new account.');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.name || '(not set)'}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Has Password: ${user.password ? 'Yes (hashed)' : 'No'}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // Also check sessions
    const sessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (sessions.length > 0) {
      console.log(`\n📝 Active Sessions: ${sessions.length}`);
      sessions.forEach((session) => {
        console.log(`   - ${session.user.email} (expires: ${session.expires.toLocaleString()})`);
      });
    }
  } catch (error) {
    console.error('❌ Error accessing database:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. The database file exists at: prisma/dev.db');
    console.error('   2. You\'ve run: npx prisma db push');
    console.error('   3. Prisma client is generated: npx prisma generate');
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
