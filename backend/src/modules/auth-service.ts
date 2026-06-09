import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { authRepository } from './auth-repository.js';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiresAt(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export const authService = {
  async register(email: string, password: string, signJwt: (payload: object) => string): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(email);
    if (existing) throw new Error('EMAIL_TAKEN');

    if (password.length < 6) throw new Error('PASSWORD_TOO_SHORT');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await authRepository.createUser(email, passwordHash);

    const accessToken = signJwt({ sub: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    await authRepository.createSession(user.id, hashToken(refreshToken), refreshTokenExpiresAt());

    return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
  },

  async login(email: string, password: string, signJwt: (payload: object) => string): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new Error('INVALID_CREDENTIALS');

    const accessToken = signJwt({ sub: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    await authRepository.createSession(user.id, hashToken(refreshToken), refreshTokenExpiresAt());

    return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
  },

  async refresh(refreshToken: string, signJwt: (payload: object) => string): Promise<{ accessToken: string }> {
    const tokenHash = hashToken(refreshToken);
    const session = await authRepository.findSession(tokenHash);
    if (!session) throw new Error('INVALID_REFRESH_TOKEN');

    const user = await authRepository.findUserById(session.user_id);
    if (!user) throw new Error('INVALID_REFRESH_TOKEN');

    const accessToken = signJwt({ sub: user.id, email: user.email });
    return { accessToken };
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await authRepository.deleteSession(tokenHash);
  },
};