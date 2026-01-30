import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma';

let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;

function createPool(): Pool {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const productionDbUrl = process.env.DATABASE_URL_PRODUCTION;
    
    if (productionDbUrl) {
      console.log('Production mode - Using DATABASE_URL_PRODUCTION');
      return new Pool({
        connectionString: productionDbUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: { rejectUnauthorized: false },
      });
    }

    const user = process.env.DB_PROD_USER;
    const password = process.env.DB_PROD_PASSWORD;
    const database = process.env.DB_PROD_NAME;
    const host = process.env.DB_PROD_HOST;

    if (!user || !password || !database || !host) {
      throw new Error('Production database credentials missing');
    }

    console.log('Production mode - Connecting to:', host);
    return new Pool({
      host,
      port: 5432,
      user,
      password,
      database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export async function initializeDatabase(): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  try {
    poolInstance = createPool();
    const adapter = new PrismaPg(poolInstance);
    
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
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

const defaultPool = createPool();
const adapter = new PrismaPg(defaultPool);
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
