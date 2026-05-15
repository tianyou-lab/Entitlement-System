import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsIn(['super_admin', 'operator', 'viewer'])
  roleCode: 'super_admin' | 'operator' | 'viewer';

  @IsOptional()
  @IsInt()
  tenantId?: number;
}

export class UpdateAdminStatusDto {
  @IsIn(['active', 'disabled'])
  status: 'active' | 'disabled';
}

export class UpdateAdminRoleDto {
  @IsIn(['super_admin', 'operator', 'viewer'])
  roleCode: 'super_admin' | 'operator' | 'viewer';
}
