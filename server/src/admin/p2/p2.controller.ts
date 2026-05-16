import { randomBytes } from 'crypto';
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { OfflinePackageStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AppError } from '../../common/errors';
import { ErrorCode } from '../../common/error-codes';
import { PublicApiRateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RequestSignatureGuard } from '../../common/guards/request-signature.guard';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { hashLicenseKey, legacyHashLicenseKey } from '../../license/license-key';
import { assertOfflineSigningConfigured, signOfflinePackage, verifyOfflinePackage } from '../../license/offline-signature';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import {
  CreateCardKeyDto,
  CreateChannelDto,
  CreateDeviceUnbindRequestDto,
  CreateOfflinePackageDto,
  CreateProtectorAdapterDto,
  CreateRiskEventDto,
  CreateTenantDto,
  ReviewDeviceUnbindRequestDto,
  UpdateCardKeyStatusDto,
  UpdateChannelStatusDto,
  UpdateOfflinePackageStatusDto,
  UpdateProtectorAdapterStatusDto,
  UpdateRiskEventStatusDto,
} from './p2.dto';
import { ImportOfflinePackageDto } from './offline.dto';
import { AdminRoles } from '../auth/admin-roles.decorator';

type CardKeyDurationType = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
const cardKeyPrefixes: Record<CardKeyDurationType, string> = {
  hour: 'SK',
  day: 'TK',
  week: 'ZK',
  month: 'YK',
  quarter: 'JK',
  year: 'NK',
};

@UseGuards(AdminAuthGuard)
@Controller('/admin')
export class P2AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('tenants')
  @AdminRoles('super_admin')
  async createTenant(@Body() dto: CreateTenantDto) {
    const tenant = await this.prisma.tenant.create({ data: dto });
    await this.audit.admin({ targetType: 'tenant', targetId: tenant.id, action: 'create', afterData: tenant });
    return ok(tenant, 'created');
  }

  @Get('tenants')
  async listTenants() {
    return ok(await this.prisma.tenant.findMany({ orderBy: { id: 'desc' } }));
  }

  @Post('channels')
  async createChannel(@Body() dto: CreateChannelDto) {
    const channel = await this.prisma.channel.create({ data: dto });
    await this.audit.admin({ targetType: 'channel', targetId: channel.id, action: 'create', afterData: channel });
    return ok(channel, 'created');
  }

  @Get('channels')
  async listChannels() {
    return ok(await this.prisma.channel.findMany({ include: { tenant: true }, orderBy: { id: 'desc' } }));
  }

  @Put('channels/:id/status')
  async updateChannelStatus(@Param('id') id: string, @Body() dto: UpdateChannelStatusDto) {
    const before = await this.prisma.channel.findUnique({ where: { id: Number(id) } });
    const channel = await this.prisma.channel.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'channel', targetId: channel.id, action: 'update_status', beforeData: before, afterData: channel });
    return ok(channel);
  }

  @Post('card-keys')
  async createCardKey(@Body() dto: CreateCardKeyDto) {
    const planId = dto.planId ?? (await this.ensureDefaultCardKeyPlan(dto.productId, dto.durationType ?? 'day')).id;
    const cardKey = await this.prisma.cardKey.create({
      data: {
        tenantId: dto.tenantId,
        productId: dto.productId,
        planId,
        channelId: dto.channelId,
        cardKey: dto.cardKey ?? this.generateCardKey(dto.durationType ?? 'day'),
        batchCode: dto.batchCode,
        status: dto.status,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
      },
    });
    await this.audit.admin({ targetType: 'card_key', targetId: cardKey.id, action: 'create', afterData: cardKey });
    return ok(cardKey, 'created');
  }

  @Get('card-keys')
  async listCardKeys() {
    return ok(await this.prisma.cardKey.findMany({ include: { tenant: true, product: true, plan: true, channel: true, license: true }, orderBy: { id: 'desc' } }));
  }

  @Put('card-keys/:id/status')
  async updateCardKeyStatus(@Param('id') id: string, @Body() dto: UpdateCardKeyStatusDto) {
    const before = await this.prisma.cardKey.findUnique({ where: { id: Number(id) } });
    const cardKey = await this.prisma.cardKey.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'card_key', targetId: cardKey.id, action: 'update_status', beforeData: before, afterData: cardKey });
    return ok(cardKey);
  }

  @Post('offline-packages')
  async createOfflinePackage(@Body() dto: CreateOfflinePackageDto) {
    assertOfflineSigningConfigured();
    const license = await this.prisma.license.findUnique({ where: { id: dto.licenseId }, include: { product: true, plan: true } });
    if (!license) throw new AppError(ErrorCode.LICENSE_NOT_FOUND, 'license not found');
    const payload = dto.payload ?? {
      licenseId: dto.licenseId,
      productCode: license.product.productCode,
      planCode: license.plan.planCode,
      deviceId: dto.deviceId,
      expireAt: dto.expireAt,
      featureFlags: license.featureFlagsOverride ?? license.plan.featureFlags,
    };
    const packageCode = dto.packageCode ?? this.randomCode('OFFLINE');
    const offlinePackage = await this.prisma.offlinePackage.create({
      data: {
        tenantId: dto.tenantId,
        licenseId: dto.licenseId,
        deviceId: dto.deviceId,
        packageCode,
        payload: payload as Prisma.InputJsonValue,
        signature: signOfflinePackage(packageCode, payload),
        expireAt: new Date(dto.expireAt),
      },
    });
    await this.audit.admin({ targetType: 'offline_package', targetId: offlinePackage.id, action: 'create', afterData: offlinePackage });
    return ok(offlinePackage, 'created');
  }

  @Get('offline-packages')
  async listOfflinePackages() {
    return ok(await this.prisma.offlinePackage.findMany({ include: { tenant: true, license: true, device: true }, orderBy: { id: 'desc' } }));
  }

  @Put('offline-packages/:id/status')
  async updateOfflinePackageStatus(@Param('id') id: string, @Body() dto: UpdateOfflinePackageStatusDto) {
    const before = await this.prisma.offlinePackage.findUnique({ where: { id: Number(id) } });
    const offlinePackage = await this.prisma.offlinePackage.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'offline_package', targetId: offlinePackage.id, action: 'update_status', beforeData: before, afterData: offlinePackage });
    return ok(offlinePackage);
  }

  @Post('risk-events')
  async createRiskEvent(@Body() dto: CreateRiskEventDto) {
    const riskEvent = await this.prisma.riskEvent.create({
      data: {
        tenantId: dto.tenantId,
        licenseId: dto.licenseId,
        deviceId: dto.deviceId,
        eventType: dto.eventType,
        severity: dto.severity,
        status: dto.status,
        summary: dto.summary,
        details: (dto.details ?? {}) as Prisma.InputJsonValue,
        count: dto.count,
      },
    });
    await this.audit.admin({ targetType: 'risk_event', targetId: riskEvent.id, action: 'create', afterData: riskEvent });
    return ok(riskEvent, 'created');
  }

  @Get('risk-events')
  async listRiskEvents() {
    return ok(await this.prisma.riskEvent.findMany({ include: { tenant: true, license: true, device: true }, orderBy: { id: 'desc' } }));
  }

  @Get('risk-summary')
  async riskSummary() {
    const events = await this.prisma.riskEvent.findMany();
    return ok({
      total: events.length,
      open: events.filter((event) => event.status === 'open').length,
      high: events.filter((event) => event.severity === 'high').length,
      resolved: events.filter((event) => event.status === 'resolved').length,
    });
  }

  @Put('risk-events/:id/status')
  async updateRiskEventStatus(@Param('id') id: string, @Body() dto: UpdateRiskEventStatusDto) {
    const before = await this.prisma.riskEvent.findUnique({ where: { id: Number(id) } });
    const riskEvent = await this.prisma.riskEvent.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'risk_event', targetId: riskEvent.id, action: 'update_status', beforeData: before, afterData: riskEvent });
    return ok(riskEvent);
  }

  @Post('device-unbind-requests')
  async createDeviceUnbindRequest(@Body() dto: CreateDeviceUnbindRequestDto) {
    const ids = await this.resolveUnbindTarget(dto);
    const request = await this.prisma.deviceUnbindRequest.create({ data: { licenseId: ids.licenseId, deviceId: ids.deviceId, reason: dto.reason } });
    await this.audit.admin({ targetType: 'device_unbind_request', targetId: request.id, action: 'create', afterData: request });
    return ok(request, 'created');
  }

  @Get('device-unbind-requests')
  async listDeviceUnbindRequests() {
    return ok(await this.prisma.deviceUnbindRequest.findMany({ include: { license: true, device: true }, orderBy: { id: 'desc' } }));
  }

  @Put('device-unbind-requests/:id/review')
  async reviewDeviceUnbindRequest(@Param('id') id: string, @Body() dto: ReviewDeviceUnbindRequestDto) {
    const before = await this.prisma.deviceUnbindRequest.findUnique({ where: { id: Number(id) } });
    const request = await this.prisma.deviceUnbindRequest.update({ where: { id: Number(id) }, data: { status: dto.status, handledAt: new Date() } });
    if (dto.status === 'approved') {
      await this.prisma.device.update({ where: { id: request.deviceId }, data: { status: 'removed', unbindCount: { increment: 1 } } });
    }
    await this.audit.admin({ targetType: 'device_unbind_request', targetId: request.id, action: 'review', beforeData: before, afterData: request });
    return ok(request);
  }

  @Post('protector-adapters')
  @AdminRoles('super_admin')
  async createProtectorAdapter(@Body() dto: CreateProtectorAdapterDto) {
    const adapter = await this.prisma.protectorAdapter.create({ data: { ...dto, config: (dto.config ?? {}) as Prisma.InputJsonValue } });
    await this.audit.admin({ targetType: 'protector_adapter', targetId: adapter.id, action: 'create', afterData: adapter });
    return ok(adapter, 'created');
  }

  @Get('protector-adapters')
  async listProtectorAdapters() {
    return ok(await this.prisma.protectorAdapter.findMany({ include: { tenant: true, product: true }, orderBy: { id: 'desc' } }));
  }

  @Put('protector-adapters/:id/status')
  @AdminRoles('super_admin')
  async updateProtectorAdapterStatus(@Param('id') id: string, @Body() dto: UpdateProtectorAdapterStatusDto) {
    const before = await this.prisma.protectorAdapter.findUnique({ where: { id: Number(id) } });
    const adapter = await this.prisma.protectorAdapter.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'protector_adapter', targetId: adapter.id, action: 'update_status', beforeData: before, afterData: adapter });
    return ok(adapter);
  }

  private async resolveUnbindTarget(dto: CreateDeviceUnbindRequestDto) {
    if (dto.licenseId && dto.deviceId) return { licenseId: dto.licenseId, deviceId: dto.deviceId };
    if (!dto.licenseKey || !dto.deviceCode) throw new AppError(ErrorCode.BAD_REQUEST, 'licenseKey and deviceCode are required');
    const device = await this.prisma.device.findUnique({ where: { deviceCode: dto.deviceCode }, include: { license: true } });
    if (!device || !licenseKeyMatchesStoredHash(dto.licenseKey, device.license.licenseKeyHash)) throw new AppError(ErrorCode.BAD_REQUEST, 'device not found for license');
    return { licenseId: device.licenseId, deviceId: device.id };
  }

  private randomCode(prefix: string) {
    return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private generateCardKey(durationType: CardKeyDurationType) {
    return `${cardKeyPrefixes[durationType]}${randomBytes(16).toString('hex').toUpperCase()}`;
  }

  private async ensureDefaultCardKeyPlan(productId: number, durationType: CardKeyDurationType) {
    const config: Record<CardKeyDurationType, { code: string; name: string; days: number; flags?: Record<string, unknown> }> = {
      hour: { code: 'default_hour', name: '时卡', days: 1, flags: { durationUnit: 'hour', durationHours: 1 } },
      day: { code: 'default_day', name: '天卡', days: 1 },
      week: { code: 'default_week', name: '周卡', days: 7 },
      month: { code: 'default_month', name: '月卡', days: 30 },
      quarter: { code: 'default_quarter', name: '季卡', days: 90 },
      year: { code: 'default_year', name: '年卡', days: 365 },
    };
    const plan = config[durationType];
    return this.prisma.plan.upsert({
      where: { productId_planCode: { productId, planCode: plan.code } },
      create: {
        productId,
        planCode: plan.code,
        name: plan.name,
        durationDays: plan.days,
        maxDevices: 1,
        maxConcurrency: 1,
        graceHours: 24,
        featureFlags: (plan.flags ?? {}) as Prisma.InputJsonValue,
      },
      update: {},
    });
  }
}

@UseGuards(PublicApiRateLimitGuard, RequestSignatureGuard)
@Controller('/api/v1/offline-packages')
export class PublicOfflinePackageController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('import')
  async importPackage(@Body() dto: ImportOfflinePackageDto) {
    const offlinePackage = await this.prisma.offlinePackage.findUnique({ where: { packageCode: dto.packageCode }, include: { license: true, device: true } });
    if (!offlinePackage || offlinePackage.status !== OfflinePackageStatus.active) throw new AppError(ErrorCode.LEASE_INVALID, 'offline package invalid');
    if (offlinePackage.expireAt.getTime() <= Date.now()) throw new AppError(ErrorCode.LEASE_EXPIRED, 'offline package expired');
    const payload = (dto.payload ?? offlinePackage.payload) as Record<string, unknown>;
    if (dto.signature !== offlinePackage.signature || !verifyOfflinePackage(dto.packageCode, payload, dto.signature)) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid offline package signature');
    }
    return ok({ packageCode: offlinePackage.packageCode, payload, expireAt: offlinePackage.expireAt, licenseStatus: offlinePackage.license.status });
  }
}

@UseGuards(PublicApiRateLimitGuard, RequestSignatureGuard)
@Controller('/api/v1/device-unbind-requests')
export class PublicDeviceUnbindController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() dto: CreateDeviceUnbindRequestDto) {
    if (!dto.licenseKey || !dto.deviceCode) throw new AppError(ErrorCode.BAD_REQUEST, 'licenseKey and deviceCode are required');
    const device = await this.prisma.device.findUnique({ where: { deviceCode: dto.deviceCode }, include: { license: true } });
    if (!device || !licenseKeyMatchesStoredHash(dto.licenseKey, device.license.licenseKeyHash)) throw new AppError(ErrorCode.BAD_REQUEST, 'device not found for license');
    const request = await this.prisma.deviceUnbindRequest.create({ data: { licenseId: device.licenseId, deviceId: device.id, reason: dto.reason } });
    return ok(request, 'created');
  }
}

function licenseKeyMatchesStoredHash(licenseKey: string, storedHash: string) {
  return hashLicenseKey(licenseKey) === storedHash || legacyHashLicenseKey(licenseKey) === storedHash;
}
