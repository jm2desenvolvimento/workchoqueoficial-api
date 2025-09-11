import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
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

}
