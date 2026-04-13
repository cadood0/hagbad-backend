import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateCycleDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'periodKey must be in YYYY-MM format',
  })
  periodKey?: string;
}