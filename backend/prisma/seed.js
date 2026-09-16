const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const achievements = [
  // Matches Played
  { nameKey: 'ach.games.1.name', descKey: 'ach.games.1.desc', icon: '🎮', category: 'GAMES_PLAYED', targetValue: 1 },
  { nameKey: 'ach.games.2.name', descKey: 'ach.games.2.desc', icon: '🎲', category: 'GAMES_PLAYED', targetValue: 10 },
  { nameKey: 'ach.games.3.name', descKey: 'ach.games.3.desc', icon: '🕹️', category: 'GAMES_PLAYED', targetValue: 50 },
  { nameKey: 'ach.games.4.name', descKey: 'ach.games.4.desc', icon: '🎰', category: 'GAMES_PLAYED', targetValue: 100 },

  // Wins
  { nameKey: 'ach.wins.1.name', descKey: 'ach.wins.1.desc', icon: '🏆', category: 'WINS', targetValue: 1 },
  { nameKey: 'ach.wins.2.name', descKey: 'ach.wins.2.desc', icon: '🏅', category: 'WINS', targetValue: 5 },
  { nameKey: 'ach.wins.3.name', descKey: 'ach.wins.3.desc', icon: '🎖️', category: 'WINS', targetValue: 25 },
  { nameKey: 'ach.wins.4.name', descKey: 'ach.wins.4.desc', icon: '👑', category: 'WINS', targetValue: 50 },

  // Points
  { nameKey: 'ach.points.1.name', descKey: 'ach.points.1.desc', icon: '💸', category: 'TOTAL_POINTS', targetValue: 500 },
  { nameKey: 'ach.points.2.name', descKey: 'ach.points.2.desc', icon: '💰', category: 'TOTAL_POINTS', targetValue: 2000 },
  { nameKey: 'ach.points.3.name', descKey: 'ach.points.3.desc', icon: '💎', category: 'TOTAL_POINTS', targetValue: 10000 },
  { nameKey: 'ach.points.4.name', descKey: 'ach.points.4.desc', icon: '🤑', category: 'TOTAL_POINTS', targetValue: 50000 },

  // Rank
  { nameKey: 'ach.rank.1.name', descKey: 'ach.rank.1.desc', icon: '⭐', category: 'RANK', targetValue: 20 },
  { nameKey: 'ach.rank.2.name', descKey: 'ach.rank.2.desc', icon: '🌟', category: 'RANK', targetValue: 10 },
  { nameKey: 'ach.rank.3.name', descKey: 'ach.rank.3.desc', icon: '✨', category: 'RANK', targetValue: 5 },
  { nameKey: 'ach.rank.4.name', descKey: 'ach.rank.4.desc', icon: '🔥', category: 'RANK', targetValue: 1 },

  // Friends
  { nameKey: 'ach.friends.1.name', descKey: 'ach.friends.1.desc', icon: '👋', category: 'FRIENDS', targetValue: 1 },
  { nameKey: 'ach.friends.2.name', descKey: 'ach.friends.2.desc', icon: '🤝', category: 'FRIENDS', targetValue: 3 },
  { nameKey: 'ach.friends.3.name', descKey: 'ach.friends.3.desc', icon: '🤗', category: 'FRIENDS', targetValue: 5 },
  { nameKey: 'ach.friends.4.name', descKey: 'ach.friends.4.desc', icon: '🎉', category: 'FRIENDS', targetValue: 10 },
];

async function main() {
  console.log('Seeding achievements...');
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { nameKey: ach.nameKey },
      update: ach,
      create: ach,
    });
  }
  console.log('Achievements seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
