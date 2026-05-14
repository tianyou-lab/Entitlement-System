import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @IsString()
  @IsNotEmpty()
  fingerprintHash: string;

  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @IsString()
  @IsNotEmpty()
  osType: string;

  @IsString()
  @IsNotEmpty()
  osVersion: string;

  @IsString()
  @IsNotEmpty()
  appVersion: string;

  @IsObject()
  @IsOptional()
  hardwareSummary?: Record<string, unknown>;
}

export class ActivateDto {
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @IsString()
  @IsNotEmpty()
  licenseKey: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class VerifyDto {
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @IsString()
  @IsNotEmpty()
  leaseToken: string;

  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @IsString()
  @IsNotEmpty()
  appVersion: string;
}

export class HeartbeatDto extends VerifyDto {
  @IsObject()
  @IsOptional()
  runtime?: Record<string, unknown>;
}

export class DeactivateDto {
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @IsString()
  @IsNotEmpty()
  licenseKey: string;

  @IsString()
  @IsNotEmpty()
  deviceCode: string;
}
