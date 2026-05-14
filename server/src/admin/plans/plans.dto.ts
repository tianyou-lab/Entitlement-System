import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsInt()
  productId: number;

  @IsString()
  @IsNotEmpty()
  planCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsInt()
  @Min(1)
  maxDevices: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxConcurrency?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  graceHours?: number;

  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, unknown>;
}
