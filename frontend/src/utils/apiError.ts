// O backend responde com mensagens de erro em INGLÊS (uma língua só, no
// servidor). Este mapa converte cada mensagem conhecida na chave de
// tradução certa, para o utilizador ver o erro no idioma do site.
// Mensagens desconhecidas passam como estão (melhor cru que errado).

const API_ERROR_KEYS: Record<string, string> = {
  // amigos
  'You are already friends with this user': 'errors.alreadyFriends',
  'Friend request already sent': 'errors.requestAlreadySent',
  'You cannot send a friend request to yourself': 'errors.cannotAddSelf',
  'User not found': 'profile.addfriends.notfound',
  'Target username is required': 'errors.fillAllFields',
  // conta / perfil
  'Email already in use': 'errors.emailInUse',
  'Username already taken': 'errors.usernameTaken',
  'Current password is incorrect': 'errors.wrongCurrentPassword',
  'Current password is required to set a new password': 'errors.currentPassRequired',
  'Avatar image is too large. Maximum size: 2 MB.': 'errors.avatarTooLarge',
  // sessão
  'Invalid credentials': 'errors.invalidCredentials',
  'Too many login attempts, please try again in a minute': 'errors.tooManyAttempts',
  // validação do registo (chaves já existentes no translations.ts)
  'Valid email is required': 'errors.validEmail',
  'Username must be 3–20 characters': 'errors.usernameLength',
  'Username may only contain letters, numbers, underscores, and hyphens': 'errors.usernameInvalid',
  'Password must be at least 8 characters and contain a letter and a number': 'errors.passwordRequirements',
  'Passwords do not match': 'errors.passwordsDoNotMatch',
}

export function translateApiError(
  t: (key: string) => string,
  message?: string | null,
): string {
  if (message && API_ERROR_KEYS[message]) return t(API_ERROR_KEYS[message])
  return message || t('errors.networkError')
}
