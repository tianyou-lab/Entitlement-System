import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../../audit/audit.service';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { CreateAdminDto, UpdateAdminRoleDto, UpdateAdminStatusDto } from './admins.dto';

interface AdminRequest {
  admin?: {
    sub?: number;
  };
  ip?: string;
}

@UseGuards(AdminAuthGuard)
@AdminRoles('super_admin')
@Controller('/admin/admins')
export class AdminsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const admins = await this.prisma.admin.findMany({ include: { tenant: true }, orderBy: { id: 'desc' } });
    return ok(admins.map((admin) => this.publicAdmin(admin)));
  }

  @Post()
  async create(@Body() dto: CreateAdminDto, @Req() req: AdminRequest) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = await this.prisma.admin.create({
      data: {
        username: dto.username,
        passwordHash,
        roleCode: dto.roleCode,
        tenantId: dto.tenantId,
        status: AdminStatus.active,
      },
    });
    await this.audit.admin({
      actorId: req.admin?.sub,
      targetType: 'admin',
      targetId: admin.id,
      action: 'create',
      afterData: admin,
      ip: req.ip,
    });
    return ok(this.publicAdmin(admin), 'created');
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateAdminStatusDto, @Req() req: AdminRequest) {
    const before = await this.prisma.admin.findUnique({ where: { id: Number(id) } });
    const admin = await this.prisma.admin.update({ where: { id: Number(id) }, data: { status: dto.status as AdminStatus } });
    await this.audit.admin({
      actorId: req.admin?.sub,
      targetType: 'admin',
      targetId: admin.id,
      action: 'update_status',
      beforeData: before,
      afterData: admin,
      ip: req.ip,
    });
    return ok(this.publicAdmin(admin));
  }

  @Put(':id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateAdminRoleDto, @Req() req: AdminRequest) {
    const before = await this.prisma.admin.findUnique({ where: { id: Number(id) } });
    const admin = await this.prisma.admin.update({ where: { id: Number(id) }, data: { roleCode: dto.roleCode } });
    await this.audit.admin({
      actorId: req.admin?.sub,
      targetType: 'admin',
      targetId: admin.id,
      action: 'update_role',
      beforeData: before,
      afterData: admin,
      ip: req.ip,
    });
    return ok(this.publicAdmin(admin));
  }

  private publicAdmin<T extends { passwordHash?: string }>(admin: T) {
    const publicAdmin = { ...admin };
    delete publicAdmin.passwordHash;
    return publicAdmin;
  }
}
