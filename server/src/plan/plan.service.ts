import { Injectable } from '@nestjs/common';
import { PlanStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  ensureActive(plan: { status: PlanStatus }) {
    if (plan.status !== PlanStatus.active) {
      throw new AppError(ErrorCode.PLAN_INVALID, 'plan invalid');
    }
  }

  mergeFeatureFlags(planFlags: unknown, overrideFlags: unknown) {
    return {
      ...(typeof planFlags === 'object' && planFlags ? planFlags : {}),
      ...(typeof overrideFlags === 'object' && overrideFlags ? overrideFlags : {}),
    };
  }
}
