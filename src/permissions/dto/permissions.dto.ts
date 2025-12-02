import {
  IsArray,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MASTER = 'master',
}

export class UpdateRolePermissionsDto {
  @IsEnum(UserRole, { message: 'Role deve ser user, admin ou master' })
  @IsNotEmpty({ message: 'Role é obrigatório' })
  role: UserRole;

  @IsArray({ message: 'Permissions deve ser um array' })
  @IsString({ each: true, message: 'Cada permissão deve ser uma string' })
  permissions: string[];
}

export class GetRolePermissionsDto {
  @IsEnum(UserRole, { message: 'Role deve ser user, admin ou master' })
  @IsNotEmpty({ message: 'Role é obrigatório' })
  role: UserRole;
}

export class CreatePermissionDto {
  @IsString({ message: 'Key deve ser uma string' })
  @IsNotEmpty({ message: 'Key é obrigatório' })
  key: string;

  @IsString({ message: 'Name deve ser uma string' })
  @IsNotEmpty({ message: 'Name é obrigatório' })
  name: string;

  @IsString({ message: 'Description deve ser uma string' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Category deve ser uma string' })
  @IsOptional()
  category?: string;
}

export class UpdatePermissionDto {
  @IsString({ message: 'Name deve ser uma string' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Description deve ser uma string' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Category deve ser uma string' })
  @IsOptional()
  category?: string;
}

export class PermissionResponseDto {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  created_at: Date;
  updated_at: Date;
}

export class RolePermissionsResponseDto {
  role: UserRole;
  permissions: PermissionResponseDto[];
}
