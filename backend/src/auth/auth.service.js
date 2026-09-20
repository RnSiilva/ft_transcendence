const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12; // 2^12 (4096) hashing iterations with a random salt

async function registerUser({ email, username, password, avatarUrl, language }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    if (existing.email === email) {
      const err = new Error('Email already in use');
      err.status = 409;
      err.field = 'email';
      throw err;
    }
    const err = new Error('Username already taken');
    err.status = 409;
    err.field = 'username';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      avatarUrl: avatarUrl || null,
      language: language || 'pt',
    },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      language: true,
      rank: true,
      totalPoints: true,
      gamesPlayed: true,
      wins: true,
      createdAt: true,
    },
  });

  return user;
}

async function loginUser({ identifier, email, login, password }) {
  const loginInput = identifier || login || email;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: loginInput }, { username: loginInput }],
    },
  });

  const GENERIC_ERROR = new Error('Invalid credentials');
  GENERIC_ERROR.status = 401;

  if (!user) {
    await bcrypt.compare(password, '$2a$12$DummyCompareNonExistingUserToMakeTheTimmingTheSame.1ms.vs.250ms');
    throw GENERIC_ERROR;
  }

  if (!user.passwordHash) {
    await bcrypt.compare(password, '$2a$12$DummyCompareNonExistingUserToMakeTheTimmingTheSame.1ms.vs.250ms');
    throw GENERIC_ERROR;
  }

  const valid = await bcrypt.compare(password, user.passwordHash); // extracts the salt from the hashed password, hashes the incoming one and compares hashes
  if (!valid)
    throw GENERIC_ERROR;

  const { passwordHash: _ph, ...safeUser } = user;
  safeUser.hasPassword = !!_ph;
  return safeUser;
}

async function updateUserLanguage(userId, newLanguage) {
  const allowed = ['pt', 'en', 'es'];
  if (!allowed.includes(newLanguage)) {
    const err = new Error('Invalid language preference. Allowed: pt, en, es');
    err.status = 400;
    throw err;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { language: newLanguage },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      language: true,
      rank: true,
      totalPoints: true,
      gamesPlayed: true,
      wins: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      language: true,
      rank: true,
      totalPoints: true,
      gamesPlayed: true,
      wins: true,
      createdAt: true,
      passwordHash: true,
      achievements: {
        include: { achievement: true }
      },
      friendsSent: { where: { status: 'ACCEPTED' } },
      friendsReceived: { where: { status: 'ACCEPTED' } },
    },
  });
  if (user) {
    user.hasPassword = !!user.passwordHash;
    delete user.passwordHash;
    user.friendsCount = user.friendsSent.length + user.friendsReceived.length;
    delete user.friendsSent;
    delete user.friendsReceived;
  }
  return user;
}

async function updateUserProfile(userId, { username, avatarUrl, currentPassword, newPassword }) {
  const data = {};

  if (username !== undefined) {
    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
    });
    if (existing) {
      const err = new Error('Username already taken');
      err.status = 409;
      err.field = 'username';
      throw err;
    }
    data.username = username;
  }

  if (avatarUrl !== undefined) {
    data.avatarUrl = avatarUrl;
  }

  if (newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user.passwordHash) {
      if (!currentPassword) {
        const err = new Error('Current password is required to set a new password');
        err.status = 400;
        err.field = 'currentPassword';
        throw err;
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        const err = new Error('Current password is incorrect');
        err.status = 400;
        err.field = 'currentPassword';
        throw err;
      }
    }

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      const err = new Error('New password must be at least 8 characters and contain a letter and a number');
      err.status = 400;
      err.field = 'newPassword';
      throw err;
    }

    data.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      language: true,
      rank: true,
      totalPoints: true,
      gamesPlayed: true,
      wins: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (updatedUser) {
    updatedUser.hasPassword = !!updatedUser.passwordHash;
    delete updatedUser.passwordHash;
  }

  return updatedUser;
}

async function deleteUser(userId) {
  const id = Number(userId);
  await prisma.friend.deleteMany({
    where: { OR: [{ senderId: id }, { receiverId: id }] },
  });
  await prisma.report.deleteMany({
    where: { OR: [{ reportedId: id }, { reporterId: id }] },
  });
  await prisma.user.delete({ where: { id } });
}

async function findOrCreate42User(profile) {
  const user = await prisma.user.findUnique({ where: { intraId: profile.id } });
  if (user) return user;

  // An account already uses this email. Only link the 42 identity to it when it
  // has NO password (i.e. it was not manually registered): a password-protected
  // account belongs to a real user and must never be taken over by a 42 login,
  // even if the email matches.
  const sameEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (sameEmail) {
    if (sameEmail.passwordHash === null) {
      return prisma.user.update({
        where: { id: sameEmail.id },
        data: { intraId: profile.id },
      });
    }
    const err = new Error('EMAIL_IN_USE');
    err.code = 'EMAIL_IN_USE';
    throw err;
  }

  let username = profile.login;
  let existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    username = `${username}_42`;
    let doubleCheck = await prisma.user.findUnique({ where: { username } });
    if (doubleCheck) username = `${username}_${Math.floor(Math.random() * 10000)}`;
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      username,
      intraId: profile.id,
      avatarUrl: profile.image?.link || null,
      passwordHash: null,
      language: 'en',
    },
  });
}

async function checkAchievements(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements: true,
      friendsSent: { where: { status: 'ACCEPTED' } },
      friendsReceived: { where: { status: 'ACCEPTED' } },
    }
  });
  
  if (!user) return;
  
  const friendsCount = user.friendsSent.length + user.friendsReceived.length;
  const allAchievements = await prisma.achievement.findMany();
  const unlockedIds = new Set(user.achievements.map(ua => ua.achievementId));
  
  const newUnlocks = [];
  
  for (const ach of allAchievements) {
    if (unlockedIds.has(ach.id)) continue;
    
    let met = false;
    if (ach.category === 'GAMES_PLAYED' && user.gamesPlayed >= ach.targetValue) met = true;
    else if (ach.category === 'WINS' && user.wins >= ach.targetValue) met = true;
    else if (ach.category === 'TOTAL_POINTS' && user.totalPoints >= ach.targetValue) met = true;
    else if (ach.category === 'RANK' && user.rank > 0 && user.rank <= ach.targetValue) met = true;
    else if (ach.category === 'FRIENDS' && friendsCount >= ach.targetValue) met = true;
    
    if (met) {
      newUnlocks.push({ userId: user.id, achievementId: ach.id });
    }
  }
  
  if (newUnlocks.length > 0) {
    await prisma.userAchievement.createMany({ data: newUnlocks, skipDuplicates: true });
  }
}

module.exports = { registerUser, loginUser, updateUserLanguage, getUserById, updateUserProfile, deleteUser, findOrCreate42User, checkAchievements };
