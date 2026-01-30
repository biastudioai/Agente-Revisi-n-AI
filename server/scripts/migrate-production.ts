import { PrismaClient } from '../src/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';

const CERTS_DIR = path.join(__dirname, '../../certs');

async function buildProductionDatabaseUrl(): Promise<string> {
  const host = process.env.DB_PROD_HOST;
  const user = process.env.DB_PROD_USER;
  const password = process.env.DB_PROD_PASSWORD;
  const database = process.env.DB_PROD_NAME;

  if (!host || !user || !password || !database) {
    throw new Error('Missing production database credentials. Required: DB_PROD_HOST, DB_PROD_USER, DB_PROD_PASSWORD, DB_PROD_NAME');
  }

  const sslParams = new URLSearchParams({
    sslmode: 'verify-ca',
    sslrootcert: path.join(CERTS_DIR, 'server-ca.pem'),
    sslcert: path.join(CERTS_DIR, 'client-cert.pem'),
    sslkey: path.join(CERTS_DIR, 'client-key.pem'),
  });

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}?${sslParams.toString()}`;
}

function createProductionPool(): Pool {
  const host = process.env.DB_PROD_HOST;
  const user = process.env.DB_PROD_USER;
  const password = process.env.DB_PROD_PASSWORD;
  const database = process.env.DB_PROD_NAME;

  if (!host || !user || !password || !database) {
    throw new Error('Production database credentials missing. Required: DB_PROD_HOST, DB_PROD_USER, DB_PROD_PASSWORD, DB_PROD_NAME');
  }

  const serverCa = fs.readFileSync(path.join(CERTS_DIR, 'server-ca.pem')).toString();
  const clientCert = fs.readFileSync(path.join(CERTS_DIR, 'client-cert.pem')).toString();
  const clientKey = fs.readFileSync(path.join(CERTS_DIR, 'client-key.pem')).toString();

  return new Pool({
    host,
    port: 5432,
    user,
    password,
    database,
    ssl: {
      rejectUnauthorized: false,
      ca: serverCa,
      cert: clientCert,
      key: clientKey,
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

async function runPrismaMigrations(databaseUrl: string): Promise<void> {
  console.log('Creating/updating schema on production database using db push...');
  
  const configContent = `
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "${databaseUrl}",
  },
});
`;
  
  const tempConfigPath = path.join(__dirname, '..', 'prisma.config.prod.ts');
  fs.writeFileSync(tempConfigPath, configContent);

  try {
    execSync('npx prisma db push --config=prisma.config.prod.ts --accept-data-loss', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('Schema push completed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    throw error;
  } finally {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  }
}

async function migrateRules(devPrisma: PrismaClient, prodPrisma: PrismaClient): Promise<void> {
  console.log('Migrating scoring rules to production...');

  const scoringRules = await devPrisma.scoringRuleRecord.findMany();
  console.log(`Found ${scoringRules.length} scoring rules to migrate`);

  for (const rule of scoringRules) {
    await prodPrisma.scoringRuleRecord.upsert({
      where: { ruleId: rule.ruleId },
      update: {
        name: rule.name,
        level: rule.level,
        points: rule.points,
        description: rule.description,
        providerTarget: rule.providerTarget,
        category: rule.category,
        isCustom: rule.isCustom,
        isActive: rule.isActive,
        conditions: rule.conditions,
        logicOperator: rule.logicOperator,
        affectedFields: rule.affectedFields,
        hasValidator: rule.hasValidator,
        validatorKey: rule.validatorKey,
      },
      create: {
        id: rule.id,
        ruleId: rule.ruleId,
        name: rule.name,
        level: rule.level,
        points: rule.points,
        description: rule.description,
        providerTarget: rule.providerTarget,
        category: rule.category,
        isCustom: rule.isCustom,
        isActive: rule.isActive,
        conditions: rule.conditions,
        logicOperator: rule.logicOperator,
        affectedFields: rule.affectedFields,
        hasValidator: rule.hasValidator,
        validatorKey: rule.validatorKey,
      },
    });
  }
  console.log('Scoring rules migrated successfully!');

  const ruleVersions = await devPrisma.ruleVersion.findMany();
  console.log(`Found ${ruleVersions.length} rule versions to migrate`);

  for (const version of ruleVersions) {
    await prodPrisma.ruleVersion.upsert({
      where: { versionNumber: version.versionNumber },
      update: {
        rulesSnapshot: version.rulesSnapshot,
        rulesHash: version.rulesHash,
        description: version.description,
      },
      create: {
        id: version.id,
        versionNumber: version.versionNumber,
        rulesSnapshot: version.rulesSnapshot,
        rulesHash: version.rulesHash,
        description: version.description,
      },
    });
  }
  console.log('Rule versions migrated successfully!');

  const aseguradoraConfigs = await devPrisma.aseguradoraConfig.findMany();
  console.log(`Found ${aseguradoraConfigs.length} aseguradora configs to migrate`);

  for (const config of aseguradoraConfigs) {
    await prodPrisma.aseguradoraConfig.upsert({
      where: { codigo: config.codigo },
      update: {
        nombreCompleto: config.nombreCompleto,
        mappingsJson: config.mappingsJson,
        themeConfig: config.themeConfig,
        extractionRules: config.extractionRules,
        isActive: config.isActive,
      },
      create: {
        id: config.id,
        codigo: config.codigo,
        nombreCompleto: config.nombreCompleto,
        mappingsJson: config.mappingsJson,
        themeConfig: config.themeConfig,
        extractionRules: config.extractionRules,
        isActive: config.isActive,
      },
    });
  }
  console.log('Aseguradora configs migrated successfully!');
}

async function createAdminUser(prodPrisma: PrismaClient): Promise<void> {
  console.log('Creating admin user proyectos@biastudio.ai...');

  const email = 'proyectos@biastudio.ai';
  const password = process.env.PROD_ADMIN_PASSWORD;

  if (!password) {
    throw new Error('PROD_ADMIN_PASSWORD environment variable is required for creating admin user');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prodPrisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      nombre: 'Admin BIA Studio',
      rol: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      nombre: 'Admin BIA Studio',
      rol: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Admin user created successfully!');
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('PRODUCTION DATABASE MIGRATION');
  console.log('='.repeat(60));

  if (!fs.existsSync(path.join(CERTS_DIR, 'server-ca.pem')) ||
      !fs.existsSync(path.join(CERTS_DIR, 'client-cert.pem')) ||
      !fs.existsSync(path.join(CERTS_DIR, 'client-key.pem'))) {
    throw new Error('SSL certificates not found in certs/ directory');
  }
  console.log('SSL certificates verified');

  const prodDatabaseUrl = await buildProductionDatabaseUrl();
  console.log('Production database URL constructed');

  await runPrismaMigrations(prodDatabaseUrl);

  const prodPool = createProductionPool();
  const prodAdapter = new PrismaPg(prodPool);
  const prodPrisma = new PrismaClient({ adapter: prodAdapter });

  const devPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const devAdapter = new PrismaPg(devPool);
  const devPrisma = new PrismaClient({ adapter: devAdapter });

  try {
    await prodPrisma.$connect();
    console.log('Connected to production database');

    await devPrisma.$connect();
    console.log('Connected to development database');

    await migrateRules(devPrisma, prodPrisma);

    await createAdminUser(prodPrisma);

    console.log('='.repeat(60));
    console.log('MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
  } finally {
    await prodPrisma.$disconnect();
    await devPrisma.$disconnect();
    await prodPool.end();
    await devPool.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
