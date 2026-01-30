import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import * as fs from 'fs';
import * as path from 'path';

let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;
let connectorInstance: Connector | null = null;

async function createProductionPool(): Promise<Pool> {
  const user = process.env.DB_PROD_USER;
  const password = process.env.DB_PROD_PASSWORD;
  const database = process.env.DB_PROD_NAME;
  const instanceConnectionName = process.env.DB_PROD_INSTANCE_CONNECTION_NAME;
  const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (!user || !password || !database) {
    throw new Error('Production database credentials missing. Required: DB_PROD_USER, DB_PROD_PASSWORD, DB_PROD_NAME');
  }

  if (instanceConnectionName && serviceAccountKey) {
    console.log('Production mode - Connecting via Cloud SQL Connector to:', instanceConnectionName);
    
    try {
      const credentialsPath = '/tmp/gcp-credentials.json';
      fs.writeFileSync(credentialsPath, serviceAccountKey);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

      connectorInstance = new Connector();
      const clientOpts = await connectorInstance.getOptions({
        instanceConnectionName,
        ipType: IpAddressTypes.PUBLIC,
      });

      return new Pool({
        ...clientOpts,
        user,
        password,
        database,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
    } catch (error) {
      console.error('Cloud SQL Connector failed:', error);
      throw error;
    }
  }

  const host = process.env.DB_PROD_HOST;
  if (!host) {
    throw new Error('Either DB_PROD_INSTANCE_CONNECTION_NAME or DB_PROD_HOST is required');
  }

  console.log('Production mode - Connecting directly to:', host);
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

function createDevelopmentPool(): Pool {
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

  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    poolInstance = await createProductionPool();
  } else {
    poolInstance = createDevelopmentPool();
  }

  const adapter = new PrismaPg(poolInstance);
  prismaInstance = new PrismaClient({
    adapter,
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
  });

  console.log('Database connected successfully');
  return prismaInstance;
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
  if (connectorInstance) {
    connectorInstance.close();
    connectorInstance = null;
  }
}

const prisma = createDevelopmentPool();
const adapter = new PrismaPg(prisma);
const defaultPrisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default defaultPrisma;
