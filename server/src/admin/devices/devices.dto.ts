import { IsIn } from 'class-validator';

export class UpdateDeviceStatusDto {
  @IsIn(['active', 'removed', 'banned'])
  status: 'active' | 'removed' | 'banned';
}
