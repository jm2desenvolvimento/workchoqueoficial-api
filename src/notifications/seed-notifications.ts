import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedNotifications() {
  console.log('🔔 Criando notificações de exemplo...');

  // Notificação global para todos os usuários
  await prisma.notification.create({
    data: {
      title: 'Bem-vindo ao WorkChoque!',
      message: 'Sistema de auditoria e notificações implementado com sucesso. Agora você pode acompanhar todas as atividades em tempo real.',
      type: 'success',
      priority: 'medium',
      is_global: true,
    }
  });

  // Notificação para admins
  await prisma.notification.create({
    data: {
      role: 'admin',
      title: 'Sistema de Monitoramento Ativo',
      message: 'O sistema de auditoria está funcionando. Você pode acompanhar todas as atividades dos usuários na Gestão de Usuários.',
      type: 'info',
      priority: 'high',
    }
  });

  // Notificação para masters
  await prisma.notification.create({
    data: {
      role: 'master',
      title: 'Logs de Auditoria Implementados',
      message: 'Sistema completo de logs, auditoria e notificações está operacional. Verifique os relatórios para dados em tempo real.',
      type: 'success',
      priority: 'high',
    }
  });

  // Notificação de segurança para masters
  await prisma.notification.create({
    data: {
      role: 'master',
      title: 'Sistema de Segurança Ativo',
      message: 'Monitoramento de logins suspeitos e atividades anômalas está funcionando.',
      type: 'security',
      priority: 'urgent',
    }
  });

  console.log('✅ Notificações de exemplo criadas!');
}

// Executar se chamado diretamente
if (require.main === module) {
  seedNotifications()
    .catch((e) => {
      console.error('❌ Erro ao criar notificações:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
