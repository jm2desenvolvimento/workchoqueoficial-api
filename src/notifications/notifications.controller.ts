import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { NotificationsService, CreateNotificationDto } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // Buscar notificações do usuário atual
  @Get()
  async getMyNotifications(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const user = req.user;
    return await this.notificationsService.getForUser(
      user.sub,
      user.role,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0
    );
  }

  // Contar notificações não lidas
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const user = req.user;
    return {
      count: await this.notificationsService.getUnreadCount(user.sub, user.role)
    };
  }

  // Buscar notificações enviadas pelo usuário atual
  @Get('sent')
  async getSentNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string
  ) {
    const user = req.user;
    const filters = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search: search || '',
      filter: filter || 'all'
    };
    
    return await this.notificationsService.getSentByUser(user.sub, filters);
  }

  // Marcar notificação como lida
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return await this.notificationsService.markAsRead(id, user.sub);
  }

  // Marcar todas como lidas
  @Put('read-all')
  async markAllAsRead(@Request() req) {
    const user = req.user;
    return await this.notificationsService.markAllAsRead(user.sub, user.role);
  }

  // Criar notificação (apenas admins e masters)
  @Post()
  async create(@Body() data: CreateNotificationDto, @Request() req) {
    const user = req.user;
    
    if (user.role !== 'admin' && user.role !== 'master') {
      throw new UnauthorizedException('Apenas administradores podem criar notificações');
    }

    // Adicionar o ID do usuário que está criando a notificação
    data.createdBy = user.sub;

    return await this.notificationsService.create(data);
  }

  // Deletar notificação (apenas admins e masters)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const user = req.user;
    
    if (user.role !== 'admin' && user.role !== 'master') {
      throw new UnauthorizedException('Apenas administradores podem deletar notificações');
    }

    return await this.notificationsService.delete(id);
  }

  // Estatísticas (apenas admins e masters)
  @Get('stats')
  async getStats(@Request() req) {
    const user = req.user;
    return await this.notificationsService.getStats(user.role);
  }

  // Limpar notificações expiradas (apenas masters)
  @Post('cleanup')
  async cleanup(@Request() req) {
    const user = req.user;
    
    if (user.role !== 'master') {
      throw new UnauthorizedException('Apenas masters podem executar limpeza');
    }

    return await this.notificationsService.cleanupExpired();
  }

  // ==================== MÉTODOS DE CONVENIÊNCIA ====================

  // Notificar todos os usuários (apenas masters)
  @Post('broadcast')
  async broadcast(
    @Body() data: { title: string; message: string; type?: 'info' | 'warning' | 'success' },
    @Request() req
  ) {
    const user = req.user;
    
    if (user.role !== 'master') {
      throw new UnauthorizedException('Apenas masters podem enviar notificações globais');
    }

    return await this.notificationsService.notifyAllUsers(
      data.title,
      data.message,
      data.type,
      user.sub
    );
  }

  // Notificar admins sobre evento do sistema (apenas masters)
  @Post('notify-admins')
  async notifyAdmins(
    @Body() data: { title: string; message: string; type?: 'info' | 'warning' | 'error' },
    @Request() req
  ) {
    const user = req.user;
    
    if (user.role !== 'master') {
      throw new UnauthorizedException('Apenas masters podem notificar administradores');
    }

    return await this.notificationsService.notifyMastersSystemEvent(
      data.title,
      data.message,
      data.type,
      user.sub
    );
  }
}
