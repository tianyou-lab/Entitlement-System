import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreatePlanDto } from './plans.dto';

@UseGuards(AdminAuthGuard)
@Controller('/admin/plans')
export class PlansController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() dto: CreatePlanDto) {
    return ok(await this.prisma.plan.create({ data: { ...dto, featureFlags: (dto.featureFlags ?? {}) as Prisma.InputJsonValue } }), 'created');
  }

  @Get()
  async list() {
    return ok(await this.prisma.plan.findMany({ include: { product: true }, orderBy: { id: 'desc' } }));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    const data: Prisma.PlanUncheckedUpdateInput = {
      ...dto,
      featureFlags: dto.featureFlags as Prisma.InputJsonValue | undefined,
    };
    return ok(await this.prisma.plan.update({ where: { id: Number(id) }, data }));
  }
}
