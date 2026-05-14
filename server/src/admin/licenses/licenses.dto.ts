import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateLicenseDto {
  @IsInt()
  productId: number;

  @IsInt()
  planId: number;

  @IsString()
  @IsOptional()
  licenseKey?: string;

  @IsDateString()
  @IsOptional()
  expireAt?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxDevicesOverride?: number;

  @IsObject()
  @IsOptional()
  featureFlagsOverride?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLicenseStatusDto {
  @IsIn(['active', 'inactive', 'expired', 'banned', 'suspended'])
  status: 'active' | 'inactive' | 'expired' | 'banned' | 'suspended';
}
