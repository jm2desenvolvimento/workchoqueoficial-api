import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  userId?: string;
  role?: 'master' | 'admin' | 'user';
  createdBy?: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'security';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isGlobal?: boolean;
  actionUrl?: string;
  metadata?: any;
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Criar notificação
  async create(data: CreateNotificationDto) {
    try {
      return await this.prisma.notification.create({
        data: {
          user_id: data.userId,
          role: data.role as any,
          created_by: data.createdBy,
          title: data.title,
          message: data.message,
          type: data.type as any || 'info',
          priority: data.priority as any || 'medium',
          is_global: data.isGlobal || false,
          action_url: data.actionUrl,
          metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
          expires_at: data.expiresAt
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Buscar notificações para um usuário específico
  async getForUser(userId: string, role: string, limit = 20, offset = 0) {
    try {
      const now = new Date();
      
      return await this.prisma.notification.findMany({
        where: {
          OR: [
            { user_id: userId }, // Notificações específicas para o usuário
            { role: role as any }, // Notificações para o role do usuário
            { is_global: true } // Notificações globais
          ],
          AND: {
            OR: [
              { expires_at: null }, // Sem expiração
              { expires_at: { gt: now } } // Não expiradas
            ]
          }
        },
        orderBy: [
          { priority: 'desc' }, // Urgentes primeiro
          { created_at: 'desc' } // Mais recentes primeiro
        ],
        take: limit,
        skip: offset
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Contar notificações não lidas para um usuário
  async getUnreadCount(userId: string, role: string) {
    try {
      const now = new Date();
      
      return await this.prisma.notification.count({
        where: {
          OR: [
            { user_id: userId },
            { role: role as any },
            { is_global: true }
          ],
          AND: {
            is_read: false,
            OR: [
              { expires_at: null },
              { expires_at: { gt: now } }
            ]
          }
        }
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Buscar notificações enviadas por um usuário
  async getSentByUser(userId: string, filters: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: string;
  }) {
    try {
      const { page = 1, limit = 10, search = '', filter = 'all' } = filters;
      const offset = (page - 1) * limit;

      // Construir condições de busca
      const whereConditions: any = {
        created_by: userId
      };

      // Filtro por tipo
      if (filter !== 'all') {
        whereConditions.type = filter;
      }

      // Busca por título ou mensagem
      if (search) {
        whereConditions.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar notificações
      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where: whereConditions,
          orderBy: [
            { priority: 'desc' },
            { created_at: 'desc' }
          ],
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }),
        this.prisma.notification.count({
          where: whereConditions
        })
      ]);

      return {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting sent notifications:', error);
      return {
        notifications: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId: string, userId: string) {
    try {
      // Verificar se o usuário tem acesso a esta notificação
      const notification = await this.prisma.notification.findFirst({
        where: {
          id: notificationId,
          OR: [
            { user_id: userId },
            { is_global: true },
            { role: { not: null } } // Role-based notifications
          ]
        }
      });

      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      return await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          is_read: true,
          read_at: new Date()
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Erro ao marcar notificação como lida');
    }
  }

  // Marcar todas as notificações como lidas para um usuário
  async markAllAsRead(userId: string, role: string) {
    try {
      const now = new Date();
      
      return await this.prisma.notification.updateMany({
        where: {
          OR: [
            { user_id: userId },
            { role: role as any },
            { is_global: true }
          ],
          AND: {
            is_read: false,
            OR: [
              { expires_at: null },
              { expires_at: { gt: now } }
            ]
          }
        },
        data: {
          is_read: true,
          read_at: now
        }
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw new Error('Erro ao marcar todas como lidas');
    }
  }

  // Deletar notificação
  async delete(notificationId: string) {
    try {
      return await this.prisma.notification.delete({
        where: { id: notificationId }
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Erro ao deletar notificação');
    }
  }

  // Limpar notificações expiradas
  async cleanupExpired() {
    try {
      const now = new Date();
      
      return await this.prisma.notification.deleteMany({
        where: {
          expires_at: {
            lt: now
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw new Error('Erro ao limpar notificações');
    }
  }

  // ==================== MÉTODOS DE CONVENIÊNCIA ====================

  // Notificar login suspeito
  async notifySuspiciousLogin(userId: string, details: any, createdBy?: string) {
    return await this.create({
      userId,
      createdBy,
      title: 'Login Suspeito Detectado',
      message: `Detectamos um login suspeito em sua conta. IP: ${details.ip}, Dispositivo: ${details.device}`,
      type: 'security',
      priority: 'high',
      metadata: details
    });
  }

  // Notificar nova atividade para admins
  async notifyAdminsNewActivity(activityType: string, userId: string, details: any, createdBy?: string) {
    return await this.create({
      role: 'admin',
      createdBy,
      title: 'Nova Atividade de Usuário',
      message: `Usuário realizou: ${activityType}`,
      type: 'info',
      priority: 'low',
      metadata: { userId, activityType, ...details }
    });
  }

  // Notificar sistema para masters
  async notifyMastersSystemEvent(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info', createdBy?: string) {
    return await this.create({
      role: 'master',
      createdBy,
      title,
      message,
      type,
      priority: type === 'error' ? 'urgent' : 'medium'
    });
  }

  // Notificação global para todos os usuários
  async notifyAllUsers(title: string, message: string, type: 'info' | 'warning' | 'success' = 'info', createdBy?: string) {
    return await this.create({
      isGlobal: true,
      createdBy,
      title,
      message,
      type,
      priority: 'medium'
    });
  }

  // Buscar estatísticas de notificações (para admins/masters)
  async getStats(role: string) {
    if (role !== 'admin' && role !== 'master') {
      throw new Error('Acesso negado');
    }

    try {
      const [total, unread, byType, byPriority] = await Promise.all([
        // Total de notificações
        this.prisma.notification.count(),
        
        // Não lidas
        this.prisma.notification.count({
          where: { is_read: false }
        }),
        
        // Por tipo
        this.prisma.notification.groupBy({
          by: ['type'],
          _count: true
        }),
        
        // Por prioridade
        this.prisma.notification.groupBy({
          by: ['priority'],
          _count: true
        })
      ]);

      return {
        total,
        unread,
        by_type: byType,
        by_priority: byPriority
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total: 0,
        unread: 0,
        by_type: [],
        by_priority: []
      };
    }
  }
}
