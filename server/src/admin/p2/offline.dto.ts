import { IsObject, IsOptional, IsString } from 'class-validator';

export class ImportOfflinePackageDto {
  @IsString()
  packageCode: string;

  @IsString()
  signature: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
