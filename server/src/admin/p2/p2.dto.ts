import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  tenantCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @IsString()
  contactEmail?: string;
}

export class CreateChannelDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsString()
  channelCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateChannelStatusDto {
  @IsIn(['active', 'disabled'])
  status: 'active' | 'disabled';
}

export class CreateCardKeyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  planId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  channelId?: number;

  @IsOptional()
  @IsString()
  cardKey?: string;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsOptional()
  @IsIn(['unused', 'issued', 'redeemed', 'disabled'])
  status?: 'unused' | 'issued' | 'redeemed' | 'disabled';

  @IsOptional()
  @IsString()
  expireAt?: string;
}

export class UpdateCardKeyStatusDto {
  @IsIn(['unused', 'issued', 'redeemed', 'disabled'])
  status: 'unused' | 'issued' | 'redeemed' | 'disabled';
}

export class CreateOfflinePackageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  licenseId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deviceId?: number;

  @IsOptional()
  @IsString()
  packageCode?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsString()
  expireAt: string;
}

export class UpdateOfflinePackageStatusDto {
  @IsIn(['active', 'revoked'])
  status: 'active' | 'revoked';
}

export class CreateRiskEventDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  licenseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deviceId?: number;

  @IsString()
  eventType: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  severity?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsIn(['open', 'resolved', 'ignored'])
  status?: 'open' | 'resolved' | 'ignored';

  @IsString()
  summary: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  count?: number;
}

export class UpdateRiskEventStatusDto {
  @IsIn(['open', 'resolved', 'ignored'])
  status: 'open' | 'resolved' | 'ignored';
}

export class CreateDeviceUnbindRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  licenseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deviceId?: number;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsString()
  deviceCode?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewDeviceUnbindRequestDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';
}

export class CreateProtectorAdapterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @IsString()
  adapterCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProtectorAdapterStatusDto {
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
