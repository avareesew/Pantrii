const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function viewDatabase() {
  try {
    console.log('='.repeat(60));
    console.log('📊 PANTrii DATABASE VIEWER');
    console.log('='.repeat(60));
    console.log('');

    // Users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        password: true,
        _count: {
          select: {
            recipes: true,
            sessions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`👥 USERS (${users.length} total)\n`);
    if (users.length === 0) {
      console.log('   No users found.\n');
    } else {
      users.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email}`);
        console.log(`      Name: ${user.name || '(not set)'}`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Password: ${user.password ? '✅ Set (hashed)' : '❌ Not set'}`);
        console.log(`      Recipes: ${user._count.recipes}`);
        console.log(`      Active Sessions: ${user._count.sessions}`);
        console.log(`      Created: ${user.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // Recipes
    const recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        recipe_name: true,
        author: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`\n📝 RECIPES (showing latest 10)\n`);
    if (recipes.length === 0) {
      console.log('   No recipes found.\n');
    } else {
      recipes.forEach((recipe, i) => {
        console.log(`   ${i + 1}. ${recipe.recipe_name}`);
        console.log(`      Author: ${recipe.author || '(not set)'}`);
        console.log(`      Owner: ${recipe.user.email}`);
        console.log(`      Created: ${recipe.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // Sessions
    const sessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        expires: 'desc',
      },
    });

    console.log(`\n🔐 ACTIVE SESSIONS (${sessions.length} total)\n`);
    if (sessions.length === 0) {
      console.log('   No active sessions.\n');
    } else {
      sessions.forEach((session, i) => {
        const isExpired = session.expires < new Date();
        console.log(`   ${i + 1}. ${session.user.email}`);
        console.log(`      Status: ${isExpired ? '❌ Expired' : '✅ Active'}`);
        console.log(`      Expires: ${session.expires.toLocaleString()}`);
        console.log('');
      });
    }

    console.log('='.repeat(60));
    console.log('💡 To view/edit in Prisma Studio, run: npx prisma studio');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('SQLITE_CANTOPEN') || error.message.includes('ENOENT')) {
      console.error('\n💡 Database file not found. Run: npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

viewDatabase();
