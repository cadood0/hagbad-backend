import { IsInt, IsNotEmpty,IsOptional, IsString } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  contributionAmount!: number;

  @IsOptional()
  @IsInt()
  durationMonths?: number;
}