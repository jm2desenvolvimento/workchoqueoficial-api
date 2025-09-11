import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  Query
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { 
  UpdateRolePermissionsDto, 
  CreatePermissionDto, 
  UpdatePermissionDto,
  UserRole,
  PermissionResponseDto,
  RolePermissionsResponseDto
} from './dto/permissions.dto';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  // ==================== PERMISSÕES ====================

  @Get()
  async getAllPermissions(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.getAllPermissions();
  }

  @Get('categories')
  async getPermissionsByCategory(): Promise<Record<string, PermissionResponseDto[]>> {
    return this.permissionsService.getPermissionsByCategory();
  }

  @Get('statistics')
  async getRoleStatistics(): Promise<Record<string, any>> {
    return this.permissionsService.getRoleStatistics();
  }

  @Get(':id')
  async getPermissionById(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.getPermissionById(id);
  }

  @Post()
  async createPermission(
    @Body() createDto: CreatePermissionDto,
    @Request() req
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.createPermission(createDto, req.user.role);
  }

  @Put(':id')
  async updatePermission(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionDto,
    @Request() req
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.updatePermission(id, updateDto, req.user.role);
  }

  @Delete(':id')
  async deletePermission(
    @Param('id') id: string,
    @Request() req
  ): Promise<{ message: string }> {
    await this.permissionsService.deletePermission(id, req.user.role);
    return { message: 'Permissão deletada com sucesso' };
  }

  // ==================== ROLE PERMISSIONS ====================

  @Get('roles/:role')
  async getRolePermissions(@Param('role') role: UserRole): Promise<RolePermissionsResponseDto> {
    return this.permissionsService.getRolePermissions(role);
  }

  @Put('roles/:role')
  async updateRolePermissions(
    @Param('role') role: UserRole,
    @Body() updateDto: Omit<UpdateRolePermissionsDto, 'role'>,
    @Request() req
  ): Promise<RolePermissionsResponseDto> {
    const fullUpdateDto: UpdateRolePermissionsDto = {
      ...updateDto,
      role,
    };
    return this.permissionsService.updateRolePermissions(fullUpdateDto, req.user.role);
  }

  // ==================== USER PERMISSIONS ====================

  @Get('user/:userId/effective')
  async getUserEffectivePermissions(
    @Param('userId') userId: string,
    @Request() req
  ): Promise<{ permissions: string[] }> {
    // Apenas MASTER pode ver permissões efetivas de outros usuários
    if (req.user.role !== 'master' && req.user.sub !== userId) {
      throw new Error('Apenas MASTER pode ver permissões efetivas de outros usuários');
    }

    const permissions = await this.permissionsService.getUserEffectivePermissions(
      userId, 
      req.user.role
    );
    
    return { permissions };
  }
}
