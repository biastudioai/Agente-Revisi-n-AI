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

    console.log('Production mode - Connecting to:', host);

    // Try multiple possible certificate locations
    const possibleCertDirs = [
      path.join(process.cwd(), 'certs'),
      path.join(__dirname, '..', '..', '..', 'certs'),
      path.join(__dirname, '..', '..', 'certs'),
      '/home/runner/workspace/certs',
      '/app/certs',
    ];

    let certsDir = '';
    for (const dir of possibleCertDirs) {
      const testPath = path.join(dir, 'server-ca.pem');
      console.log('Checking for certs at:', dir, '- exists:', fs.existsSync(testPath));
      if (fs.existsSync(testPath)) {
        certsDir = dir;
        break;
      }
    }

    const serverCaPath = path.join(certsDir, 'server-ca.pem');
    const clientCertPath = path.join(certsDir, 'client-cert.pem');
    const clientKeyPath = path.join(certsDir, 'client-key.pem');

    const hasCerts = certsDir && fs.existsSync(serverCaPath) && fs.existsSync(clientCertPath) && fs.existsSync(clientKeyPath);
    
    if (hasCerts) {
      console.log('Using SSL with client certificates');
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

    // Fallback: use basic SSL without client certificates
    console.log('Using basic SSL (no client certificates found)');
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
