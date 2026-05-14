import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateVersionPolicyDto {
  @IsInt()
  productId: number;

  @IsString()
  minSupportedVersion: string;

  @IsString()
  latestVersion: string;

  @IsBoolean()
  @IsOptional()
  forceUpgrade?: boolean;

  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @IsString()
  @IsOptional()
  notice?: string;
}

export class UpdateVersionPolicyDto {
  @IsString()
  @IsOptional()
  minSupportedVersion?: string;

  @IsString()
  @IsOptional()
  latestVersion?: string;

  @IsBoolean()
  @IsOptional()
  forceUpgrade?: boolean;

  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @IsString()
  @IsOptional()
  notice?: string;
}
