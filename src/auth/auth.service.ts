import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AuditService))
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const { password_hash: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, requestInfo?: { ip?: string; userAgent?: string }) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      // Log failed login attempt
      if (requestInfo) {
        await this.logFailedLogin(loginDto.email, requestInfo, 'Invalid credentials');
        
        // Verificar tentativas múltiplas de login falhado
        if (this.auditService) {
          await this.auditService.checkFailedLoginAttempts(loginDto.email, requestInfo.ip || '');
        }
      }
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Update last_login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Log successful login
    try {
      console.log(`AuthService: Logging successful login for user ${user.id}`);
      const loginRecord = await this.logSuccessfulLogin(user.id, requestInfo);
      
      // Log user activity
      await this.logUserActivity(user.id, 'login', undefined, undefined, {
        login_record_id: loginRecord.id,
        ...requestInfo
      });
      console.log(`AuthService: User activity logged for user ${user.id}`);

      // Verificar IP suspeito
      if (this.auditService && requestInfo?.ip) {
        await this.auditService.checkSuspiciousIP(requestInfo.ip, user.id);
      }
    } catch (error) {
      console.error('Error logging login activity:', error);
      // Continue with login even if logging fails
    }

    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };

    // Buscar permissões do usuário
    const permissions = await this.getUserPermissions(user.id, user.role);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company_id,
        permissions,
        allowed: user.allowed,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: new Date(),
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Verificar se o email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password_hash: hashedPassword,
        role: registerDto.role || 'user',
      },
    });

    // Remover senha do retorno
    const { password_hash: _, ...userWithoutPassword } = user;

    // Gerar token JWT
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };

    // Buscar permissões do usuário
    const permissions = await this.getUserPermissions(user.id, user.role);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company_id,
        permissions,
        allowed: user.allowed,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Buscar permissões do usuário
    const permissions = await this.getUserPermissions(user.id, user.role);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company_id,
      permissions,
      allowed: user.allowed,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async getUserPermissions(userId: string, role: string) {
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

  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company_id: true,
        is_active: true,
        last_login: true,
        allowed: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Buscar permissões efetivas para cada usuário
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const permissions = await this.getUserPermissions(user.id, user.role);
        return {
          ...user,
          permissions,
        };
      })
    );

    return usersWithPermissions;
  }

  async updateUserPermissions(userId: string, permissions: string[]) {
    // Buscar todas as permissões do sistema para criar o objeto allowed
    const allPermissions = await this.prisma.permission.findMany({
      select: { key: true }
    });

    // Criar objeto allowed com todas as permissões
    const allowed: Record<string, boolean> = {};
    allPermissions.forEach(permission => {
      allowed[permission.key] = permissions.includes(permission.key);
    });

    // Atualizar usuário
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { allowed },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        allowed: true,
        updated_at: true
      }
    });

    return {
      message: 'Permissões atualizadas com sucesso',
      user: updatedUser
    };
  }

  // ==================== AUDIT AND ACTIVITY TRACKING ====================

  async logSuccessfulLogin(userId: string, requestInfo?: { ip?: string; userAgent?: string }) {
    const deviceInfo = this.parseDeviceInfo(requestInfo?.userAgent);
    
    try {
      return await this.prisma.login_history.create({
        data: {
          user_id: userId,
          login_at: new Date(),
          ip_address: requestInfo?.ip,
          user_agent: requestInfo?.userAgent,
          device_info: deviceInfo.device,
          browser_info: deviceInfo.browser,
          status: 'success'
        }
      });
    } catch (error) {
      console.error('Error logging successful login:', error);
      return { id: 'temp-login-id' };
    }
  }

  async logFailedLogin(email: string, requestInfo: { ip?: string; userAgent?: string }, reason: string) {
    // Try to find user by email for logging purposes
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (user) {
      const deviceInfo = this.parseDeviceInfo(requestInfo.userAgent);
      
      try {
        await this.prisma.login_history.create({
          data: {
            user_id: user.id,
            login_at: new Date(),
            ip_address: requestInfo.ip,
            user_agent: requestInfo.userAgent,
            device_info: deviceInfo.device,
            browser_info: deviceInfo.browser,
            status: 'failed',
            failure_reason: reason
          }
        });
      } catch (error) {
        console.error('Error logging failed login:', error);
      }
    }
  }

  async logUserActivity(
    userId: string, 
    action: string, 
    entityType?: string, 
    entityId?: string, 
    details?: any,
    requestInfo?: { ip?: string; userAgent?: string }
  ) {
    try {
      console.log(`AuthService: Creating activity log for user ${userId}, action: ${action}`);
      const result = await this.prisma.user_activity_log.create({
        data: {
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: details ? JSON.stringify(details) : undefined,
          ip_address: requestInfo?.ip,
          user_agent: requestInfo?.userAgent
        }
      });
      console.log(`AuthService: Activity log created with ID: ${result.id}`);
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }

  private parseDeviceInfo(userAgent?: string) {
    if (!userAgent) return { device: null, browser: null };

    let device = 'Desktop';
    let browser = 'Unknown';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
    }

    // Detect browser
    if (/Chrome/.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) browser = 'Firefox';
    else if (/Safari/.test(userAgent)) browser = 'Safari';
    else if (/Edge/.test(userAgent)) browser = 'Edge';
    else if (/Opera/.test(userAgent)) browser = 'Opera';

    return { device, browser };
  }

  async getUserActivityStats(userId: string) {
    try {
      const [totalActivities, recentActivities, loginStats] = await Promise.all([
        // Total de atividades
        this.prisma.user_activity_log.count({
          where: { user_id: userId }
        }),
        
        // Atividades recentes (últimos 7 dias)
        this.prisma.user_activity_log.findMany({
          where: {
            user_id: userId,
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { created_at: 'desc' },
          take: 10
        }),
        
        // Estatísticas de login
        this.prisma.login_history.findMany({
          where: { user_id: userId },
          orderBy: { login_at: 'desc' },
          take: 5
        })
      ]);

      return {
        total_activities: totalActivities,
        recent_activities: recentActivities,
        recent_logins: loginStats
      };
    } catch (error) {
      console.error('Error getting user activity stats:', error);
      return {
        total_activities: 0,
        recent_activities: [],
        recent_logins: []
      };
    }
  }

}
