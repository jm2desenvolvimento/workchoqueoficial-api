import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  UpdateRolePermissionsDto, 
  CreatePermissionDto, 
  UpdatePermissionDto,
  UserRole,
  PermissionResponseDto,
  RolePermissionsResponseDto
} from './dto/permissions.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // ==================== PERMISSÕES ====================

  async getAllPermissions(): Promise<PermissionResponseDto[]> {
    return await this.prisma.permission.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async getPermissionsByCategory(): Promise<Record<string, PermissionResponseDto[]>> {
    const permissions = await this.getAllPermissions();
    
    console.log('🔍 [getPermissionsByCategory] Permissões encontradas:', permissions.length);
    console.log('📊 [getPermissionsByCategory] Categorias únicas:', [...new Set(permissions.map(p => p.category))]);
    
    const categories = permissions.reduce((acc, permission) => {
      const category = permission.category || 'Outros';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, PermissionResponseDto[]>);

    console.log('🔍 [getPermissionsByCategory] Categorias agrupadas:', Object.keys(categories));
    
    return categories;
  }

  async getPermissionById(id: string): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permissão não encontrada');
    }

    return permission;
  }

  async createPermission(createDto: CreatePermissionDto, currentUserRole: string): Promise<PermissionResponseDto> {
    // Apenas MASTER pode criar permissões
    if (currentUserRole !== 'master') {
      throw new ForbiddenException('Apenas usuários MASTER podem criar permissões');
    }

    // Verificar se a key já existe
    const existingPermission = await this.prisma.permission.findUnique({
      where: { key: createDto.key },
    });

    if (existingPermission) {
      throw new ConflictException('Já existe uma permissão com esta key');
    }

    return await this.prisma.permission.create({
      data: createDto,
    });
  }

  async updatePermission(id: string, updateDto: UpdatePermissionDto, currentUserRole: string): Promise<PermissionResponseDto> {
    // Apenas MASTER pode editar permissões
    if (currentUserRole !== 'master') {
      throw new ForbiddenException('Apenas usuários MASTER podem editar permissões');
    }

    const permission = await this.getPermissionById(id);

    return await this.prisma.permission.update({
      where: { id },
      data: updateDto,
    });
  }

  async deletePermission(id: string, currentUserRole: string): Promise<void> {
    // Apenas MASTER pode deletar permissões
    if (currentUserRole !== 'master') {
      throw new ForbiddenException('Apenas usuários MASTER podem deletar permissões');
    }

    await this.getPermissionById(id);

    // Verificar se a permissão está sendo usada por alguma role
    const rolePermissions = await this.prisma.role_permission.findFirst({
      where: { permission_id: id },
    });

    if (rolePermissions) {
      throw new ConflictException('Não é possível deletar uma permissão que está sendo usada por alguma role');
    }

    await this.prisma.permission.delete({
      where: { id },
    });
  }

  // ==================== ROLE PERMISSIONS ====================

  async getAllRolesPermissions(): Promise<Record<string, RolePermissionsResponseDto>> {
    const roles = ['master', 'admin', 'user'] as const;
    const result: Record<string, RolePermissionsResponseDto> = {};

    for (const role of roles) {
      result[role] = await this.getRolePermissions(role as UserRole);
    }

    return result;
  }

  async getRolePermissions(role: UserRole): Promise<RolePermissionsResponseDto> {
    const rolePermissions = await this.prisma.role_permission.findMany({
      where: { role: role as any },
      include: { permission: true },
    });

    return {
      role,
      permissions: rolePermissions.map(rp => ({
        id: rp.permission.id,
        key: rp.permission.key,
        name: rp.permission.name,
        description: rp.permission.description,
        category: rp.permission.category,
        created_at: rp.permission.created_at,
        updated_at: rp.permission.updated_at,
      })),
    };
  }

  async updateRolePermissions(updateDto: UpdateRolePermissionsDto, currentUserRole: string): Promise<RolePermissionsResponseDto> {
    // Apenas MASTER pode gerenciar permissões de roles
    if (currentUserRole !== 'master') {
      throw new ForbiddenException('Apenas usuários MASTER podem gerenciar permissões de roles');
    }

    // Buscar todas as permissões disponíveis
    const allPermissions = await this.prisma.permission.findMany();
    const permissionMap = new Map(allPermissions.map(p => [p.key, p.id]));

    // Remover todas as permissões atuais da role
    await this.prisma.role_permission.deleteMany({
      where: { role: updateDto.role as any },
    });

    // Adicionar as novas permissões
    const rolePermissions = updateDto.permissions
      .map(permKey => {
        const permissionId = permissionMap.get(permKey);
        return permissionId ? {
          role: updateDto.role as any,
          permission_id: permissionId,
        } : null;
      })
      .filter((item): item is { role: any; permission_id: string } => item !== null);

    if (rolePermissions.length > 0) {
      await this.prisma.role_permission.createMany({
        data: rolePermissions,
      });
    }

    return this.getRolePermissions(updateDto.role);
  }

  // ==================== UTILITÁRIOS ====================

  async getUserEffectivePermissions(userId: string, role: string): Promise<string[]> {
    // Buscar permissões da role
    const rolePermissions = await this.prisma.role_permission.findMany({
      where: { role: role as any },
      include: { permission: true },
    });

    // Buscar permissões customizadas do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { allowed: true },
    });

    const rolePermissionKeys = rolePermissions.map(rp => rp.permission.key);
    const customPermissions = user?.allowed as Record<string, boolean> || {};

    // Combinar permissões da role com permissões customizadas
    const allPermissions = new Set(rolePermissionKeys);
    
    // Adicionar permissões customizadas habilitadas
    Object.entries(customPermissions).forEach(([key, enabled]) => {
      if (enabled) {
        allPermissions.add(key);
      } else {
        allPermissions.delete(key);
      }
    });

    return Array.from(allPermissions);
  }

  async getRoleStatistics(): Promise<Record<string, any>> {
    const roles = ['user', 'admin', 'master'] as const;
    const statistics: Record<string, any> = {};

    for (const role of roles) {
      const rolePermissions = await this.prisma.role_permission.findMany({
        where: { role: role as any },
        include: { permission: true },
      });

      const categories = rolePermissions.reduce((acc, rp) => {
        const category = rp.permission.category || 'Outros';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category]++;
        return acc;
      }, {} as Record<string, number>);

      statistics[role] = {
        totalPermissions: rolePermissions.length,
        categories,
        permissions: rolePermissions.map(rp => rp.permission.key),
      };
    }

    return statistics;
  }
}
