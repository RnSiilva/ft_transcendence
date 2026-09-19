// The backend responds with error messages in ENGLISH (a single language on
// the server). This map converts each known message into the correct
// translation key, so the user sees the error in the site's language.
// Unknown messages pass through as-is (better raw than wrong).

const API_ERROR_KEYS: Record<string, string> = {
  // friends
  'You are already friends with this user': 'errors.alreadyFriends',
  'Friend request already sent': 'errors.requestAlreadySent',
  'You cannot send a friend request to yourself': 'errors.cannotAddSelf',
  'User not found': 'profile.addfriends.notfound',
  'Target username is required': 'errors.fillAllFields',
  // account / profile
  'Email already in use': 'errors.emailInUse',
  'Username already taken': 'errors.usernameTaken',
  'Current password is incorrect': 'errors.wrongCurrentPassword',
  'Current password is required to set a new password': 'errors.currentPassRequired',
  'Avatar image is too large. Maximum size: 2 MB.': 'errors.avatarTooLarge',
  // session
  'Invalid credentials': 'errors.invalidCredentials',
  'Too many login attempts, please try again in a minute': 'errors.tooManyAttempts',
  // registration validation (keys already present in translations.ts)
  'Valid email is required': 'errors.validEmail',
  'Username must be 3–20 characters': 'errors.usernameLength',
  'Username may only contain letters, numbers, underscores, and hyphens': 'errors.usernameInvalid',
  'Password must be at least 8 characters and contain a letter and a number': 'errors.passwordRequirements',
  'New password must be at least 8 characters and contain a letter and a number': 'errors.passwordRequirements',
  'Passwords do not match': 'errors.passwordsDoNotMatch',
}

export function translateApiError(
  t: (key: string) => string,
  message?: string | null,
): string {
  if (message && API_ERROR_KEYS[message]) return t(API_ERROR_KEYS[message])
  return message || t('errors.networkError')
}
