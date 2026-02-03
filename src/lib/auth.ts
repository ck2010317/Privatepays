import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import prisma from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_NAME = 'privatepay_token';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value || null;
}

export async function getCurrentUser() {
  const token = await getTokenFromCookies();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      balance: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(TOKEN_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      balance: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

export async function requireAuth(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (!user.isActive) {
    throw new Error('Account is disabled');
  }
  return user;
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

export function setAuthCookie(token: string) {
  return `${TOKEN_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearAuthCookie() {
  return `${TOKEN_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

// Initialize admin user if it doesn't exist
export async function initializeAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@privatepay.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        balance: 0,
      },
    });
    console.log('Admin user created:', adminEmail);
  }

  // Initialize settings if not exist
  const settings = await prisma.settings.findUnique({
    where: { id: 'settings' },
  });

  if (!settings) {
    await prisma.settings.create({
      data: {
        id: 'settings',
        cardCreationFee: 40,
        topUpFeePercent: 2.5,
        topUpFeeFlat: 2,
        minDeposit: 10,
        minTopUp: 10,
        maxTopUp: 5000,
        maintenanceMode: false,
      },
    });
    console.log('Settings initialized');
  }
}
