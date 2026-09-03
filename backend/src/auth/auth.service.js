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

  const valid = await bcrypt.compare(password, user.passwordHash); // extracts the salt from the hashed password, hashes the incoming one and compares hashes
  if (!valid)
    throw GENERIC_ERROR;

  const { passwordHash: _ph, ...safeUser } = user;
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
    },
  });
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
    if (!currentPassword) {
      const err = new Error('Current password is required to set a new password');
      err.status = 400;
      err.field = 'currentPassword';
      throw err;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      const err = new Error('New password must be at least 8 characters and contain a letter and a number');
      err.status = 400;
      err.field = 'newPassword';
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      const err = new Error('Current password is incorrect');
      err.status = 400;
      err.field = 'currentPassword';
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
    },
  });

  return updatedUser;
}

async function deleteUser(userId) {
  await prisma.friend.deleteMany({
    where: { OR: [{ userId }, { friendId: userId }] },
  });
  await prisma.report.deleteMany({
    where: { OR: [{ reportedId: userId }, { reporterId: userId }] },
  });
  await prisma.user.delete({ where: { id: userId } });
}

module.exports = { registerUser, loginUser, updateUserLanguage, getUserById, updateUserProfile, deleteUser };
