import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';
import { PrismaClient } from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

function createPool(): Pool {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const host = process.env.DB_PROD_HOST;
    const user = process.env.DB_PROD_USER;
    const password = process.env.DB_PROD_PASSWORD;
    const database = process.env.DB_PROD_NAME;

    if (!host || !user || !password || !database) {
      throw new Error('Production database credentials missing. Required: DB_PROD_HOST, DB_PROD_USER, DB_PROD_PASSWORD, DB_PROD_NAME');
    }

    const certsDir = path.join(__dirname, '..', '..', '..', 'certs');
    const serverCaPath = path.join(certsDir, 'server-ca.pem');
    const clientCertPath = path.join(certsDir, 'client-cert.pem');
    const clientKeyPath = path.join(certsDir, 'client-key.pem');

    if (!fs.existsSync(serverCaPath) || !fs.existsSync(clientCertPath) || !fs.existsSync(clientKeyPath)) {
      throw new Error('SSL certificates missing in certs/ directory. Required: server-ca.pem, client-cert.pem, client-key.pem');
    }

    return new Pool({
      host,
      port: 5432,
      user,
      password,
      database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync(serverCaPath).toString(),
        cert: fs.readFileSync(clientCertPath).toString(),
        key: fs.readFileSync(clientKeyPath).toString(),
      },
    });
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

const pool = createPool();
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
