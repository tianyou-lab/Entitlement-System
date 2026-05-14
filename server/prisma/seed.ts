import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const seededPassword = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production' && !seededPassword) {
    throw new Error('ADMIN_PASSWORD is required when seeding production');
  }
  const adminPassword = await bcrypt.hash(seededPassword ?? 'admin123456', 10);

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: seededPassword ? { passwordHash: adminPassword, passwordChangedAt: new Date() } : {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      passwordChangedAt: seededPassword ? new Date() : null,
      roleCode: 'super_admin',
      status: 'active',
    },
  });

  const product = await prisma.product.upsert({
    where: { productCode: 'demo_app' },
    update: {},
    create: {
      productCode: 'demo_app',
      name: 'Demo App',
      status: 'active',
      description: 'Default seeded product',
    },
  });

  const plan = await prisma.plan.upsert({
    where: { productId_planCode: { productId: product.id, planCode: 'basic' } },
    update: {},
    create: {
      productId: product.id,
      planCode: 'basic',
      name: 'Basic Plan',
      status: 'active',
      durationDays: 365,
      maxDevices: 1,
      maxConcurrency: 1,
      graceHours: 24,
      featureFlags: { publish: true, maxWindowCount: 20 },
    },
  });

  await prisma.versionPolicy.create({
    data: {
      productId: product.id,
      minSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpgrade: false,
    },
  }).catch(() => undefined);

  await prisma.license.upsert({
    where: { licenseKey: 'DEMO-AAAA-BBBB-CCCC' },
    update: {},
    create: {
      licenseKey: 'DEMO-AAAA-BBBB-CCCC',
      productId: product.id,
      planId: plan.id,
      status: 'active',
      expireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
