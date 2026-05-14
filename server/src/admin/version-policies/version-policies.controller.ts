import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateVersionPolicyDto, UpdateVersionPolicyDto } from './version-policies.dto';

@UseGuards(AdminAuthGuard)
@Controller('/admin/version-policies')
export class VersionPoliciesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(@Body() dto: CreateVersionPolicyDto) {
    const policy = await this.prisma.versionPolicy.create({ data: dto });
    await this.audit.admin({ targetType: 'version_policy', targetId: policy.id, action: 'create', afterData: policy });
    return ok(policy, 'created');
  }

  @Get()
  async list() {
    return ok(await this.prisma.versionPolicy.findMany({ include: { product: true }, orderBy: { id: 'desc' } }));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVersionPolicyDto) {
    const before = await this.prisma.versionPolicy.findUnique({ where: { id: Number(id) } });
    const policy = await this.prisma.versionPolicy.update({ where: { id: Number(id) }, data: dto });
    await this.audit.admin({ targetType: 'version_policy', targetId: policy.id, action: 'update', beforeData: before, afterData: policy });
    return ok(policy);
  }
}
