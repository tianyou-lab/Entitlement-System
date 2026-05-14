import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@UseGuards(AdminAuthGuard)
@Controller('/admin/products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return ok(await this.prisma.product.create({ data: dto }), 'created');
  }

  @Get()
  async list() {
    return ok(await this.prisma.product.findMany({ orderBy: { id: 'desc' } }));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return ok(await this.prisma.product.update({ where: { id: Number(id) }, data: dto }));
  }
}
