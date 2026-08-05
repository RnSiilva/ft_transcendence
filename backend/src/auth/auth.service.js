/**
 * auth.service.js
 * Business logic for authentication: register, login.
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

/**
 * Registers a new user.
 * Throws on duplicate email/username.
 * Returns the created user (without passwordHash).
 */
async function registerUser({ email, username, password }) {
  // Check for duplicates
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

/**
 * Validates credentials and returns the user.
 * Always throws a generic error to avoid username/email enumeration.
 */
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
    // Dummy compare to prevent timing attacks
    await bcrypt.compare(password, '$2a$12$dummyhashfortimingnormalization000000000000000000000000.');
    throw GENERIC_ERROR;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw GENERIC_ERROR;

  // Return safe user object (no passwordHash)
  const { passwordHash: _ph, ...safeUser } = user;
  return safeUser;
}

/**
 * Updates the user's language preference (pt, en, es).
 */
async function updateUserLanguage(userId, language) {
  const allowed = ['pt', 'en', 'es'];
  if (!allowed.includes(language)) {
    const err = new Error('Invalid language preference. Allowed: pt, en, es');
    err.status = 400;
    throw err;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { language },
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

/**
 * Fetches a user by id (for the /me endpoint).
 */
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

module.exports = { registerUser, loginUser, updateUserLanguage, getUserById };
