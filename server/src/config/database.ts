import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

let prismaInstance: PrismaClient | null = null;

function getDatabaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const productionDbUrl = process.env.DATABASE_URL_PRODUCTION;
    if (productionDbUrl) {
      console.log('Production mode - Using DATABASE_URL_PRODUCTION');
      return productionDbUrl;
    }

    const user = process.env.DB_PROD_USER;
    const password = process.env.DB_PROD_PASSWORD;
    const database = process.env.DB_PROD_NAME;
    const host = process.env.DB_PROD_HOST;

    if (user && password && database && host) {
      const url = `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}?sslmode=require`;
      console.log('Production mode - Connecting to:', host);
      return url;
    }

    throw new Error('Production database credentials missing');
  }

  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) {
    throw new Error('DATABASE_URL not set');
  }
  return devUrl;
}

function createAdapter(): PrismaPg {
  const connectionString = getDatabaseUrl();
  return new PrismaPg({ connectionString });
}

export async function initializeDatabase(): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  try {
    const adapter = createAdapter();

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    });

    await prismaInstance.$connect();
    console.log('Database connected successfully');
    return prismaInstance;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return prismaInstance;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

const adapter = createAdapter();
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
