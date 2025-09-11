import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar permissões do sistema
  await createPermissions();

  // Criar usuário master
  const masterEmail = 'master@workchoque.com';
  const masterPassword = 'master123';

  const existingMaster = await prisma.user.findUnique({
    where: { email: masterEmail },
  });

  if (!existingMaster) {
    const hashedPassword = await bcrypt.hash(masterPassword, 10);

    const masterUser = await prisma.user.create({
      data: {
        name: 'Master WorkChoque',
        email: masterEmail,
        password_hash: hashedPassword,
        role: 'master',
      },
    });

    console.log('✅ Usuário master criado:', {
      id: masterUser.id,
      name: masterUser.name,
      email: masterUser.email,
      role: masterUser.role,
    });
  } else {
    console.log('ℹ️ Usuário master já existe');
  }

  // Criar usuário admin de exemplo
  const adminEmail = 'admin@empresa.com';
  const adminPassword = 'admin123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin Empresa',
        email: adminEmail,
        password_hash: hashedPassword,
        role: 'admin',
      },
    });

    console.log('✅ Usuário admin criado:', {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
    });
  } else {
    console.log('ℹ️ Usuário admin já existe');
  }

  // Criar usuário comum de exemplo
  const userEmail = 'colaborador@empresa.com';
  const userPassword = '123456';

  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    const commonUser = await prisma.user.create({
      data: {
        name: 'João Silva',
        email: userEmail,
        password_hash: hashedPassword,
        role: 'user',
      },
    });

    console.log('✅ Usuário comum criado:', {
      id: commonUser.id,
      name: commonUser.name,
      email: commonUser.email,
      role: commonUser.role,
    });
  } else {
    console.log('ℹ️ Usuário comum já existe');
  }

  console.log('🎉 Seed concluído com sucesso!');
}

async function createPermissions() {
  console.log('📋 Criando permissões do sistema...');

  const permissions = [
    // Dashboards
    { key: 'dashboard.master.view', name: 'Visualizar Dashboard Global', category: 'dashboard' },
    { key: 'dashboard.admin.view', name: 'Visualizar Dashboard da Empresa', category: 'dashboard' },
    { key: 'dashboard.user.view', name: 'Visualizar Dashboard Pessoal', category: 'dashboard' },
    
    // Diagnósticos
    { key: 'diagnostico.view', name: 'Visualizar Diagnósticos', category: 'diagnostico' },
    { key: 'diagnostico.create', name: 'Criar Diagnósticos', category: 'diagnostico' },
    { key: 'diagnostico.edit', name: 'Editar Diagnósticos', category: 'diagnostico' },
    { key: 'diagnostico.delete', name: 'Excluir Diagnósticos', category: 'diagnostico' },
    { key: 'diagnostico.global', name: 'Acessar Diagnósticos Globais', category: 'diagnostico' },
    
    // Planos de Ação
    { key: 'plano.view', name: 'Visualizar Planos de Ação', category: 'plano' },
    { key: 'plano.create', name: 'Criar Planos de Ação', category: 'plano' },
    { key: 'plano.edit', name: 'Editar Planos de Ação', category: 'plano' },
    { key: 'plano.delete', name: 'Excluir Planos de Ação', category: 'plano' },
    { key: 'plano.global', name: 'Gerenciar Planos Globais', category: 'plano' },
    
    // Conquistas
    { key: 'conquista.view', name: 'Visualizar Conquistas', category: 'conquista' },
    { key: 'conquista.manage', name: 'Gerenciar Sistema de Conquistas', category: 'conquista' },
    { key: 'conquista.create', name: 'Criar Conquistas', category: 'conquista' },
    { key: 'conquista.edit', name: 'Editar Conquistas', category: 'conquista' },
    { key: 'conquista.delete', name: 'Excluir Conquistas', category: 'conquista' },
    
    // Usuários
    { key: 'user.view', name: 'Visualizar Usuários', category: 'user' },
    { key: 'user.create', name: 'Criar Usuários', category: 'user' },
    { key: 'user.edit', name: 'Editar Usuários', category: 'user' },
    { key: 'user.delete', name: 'Excluir Usuários', category: 'user' },
    { key: 'user.manage', name: 'Gerenciar Usuários', category: 'user' },
    
    // Perfis e Permissões
    { key: 'perfil.view', name: 'Visualizar Perfis', category: 'perfil' },
    { key: 'perfil.create', name: 'Criar Perfis', category: 'perfil' },
    { key: 'perfil.edit', name: 'Editar Perfis', category: 'perfil' },
    { key: 'perfil.delete', name: 'Excluir Perfis', category: 'perfil' },
    { key: 'permissao.manage', name: 'Gerenciar Permissões', category: 'permissao' },
    
    // Empresas
    { key: 'empresa.view', name: 'Visualizar Empresas', category: 'empresa' },
    { key: 'empresa.create', name: 'Criar Empresas', category: 'empresa' },
    { key: 'empresa.edit', name: 'Editar Empresas', category: 'empresa' },
    { key: 'empresa.delete', name: 'Excluir Empresas', category: 'empresa' },
    { key: 'empresa.manage', name: 'Gerenciar Empresas', category: 'empresa' },
    
    // Relatórios
    { key: 'relatorio.view', name: 'Visualizar Relatórios', category: 'relatorio' },
    { key: 'relatorio.create', name: 'Criar Relatórios', category: 'relatorio' },
    { key: 'relatorio.export', name: 'Exportar Relatórios', category: 'relatorio' },
    { key: 'relatorio.global', name: 'Acessar Relatórios Globais', category: 'relatorio' },
    
    // Financeiro
    { key: 'financeiro.view', name: 'Visualizar Financeiro', category: 'financeiro' },
    { key: 'financeiro.manage', name: 'Gerenciar Financeiro', category: 'financeiro' },
    
    // Configurações
    { key: 'config.view', name: 'Visualizar Configurações', category: 'config' },
    { key: 'config.edit', name: 'Editar Configurações', category: 'config' },
    { key: 'config.manage', name: 'Gerenciar Configurações', category: 'config' },
    
    // Sistema
    { key: 'sistema.view', name: 'Visualizar Sistema', category: 'sistema' },
    { key: 'sistema.manage', name: 'Gerenciar Sistema', category: 'sistema' },
    { key: 'backup.manage', name: 'Gerenciar Backup', category: 'backup' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: perm,
    });
  }

  console.log(`✅ ${permissions.length} permissões criadas/atualizadas`);

  // Criar permissões por role
  await createRolePermissions();
}

async function createRolePermissions() {
  console.log('🔐 Criando permissões por role...');

  // Buscar todas as permissões
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map(p => [p.key, p.id]));

  // Permissões para USER
  const userPermissions = [
    'dashboard.user.view',
    'diagnostico.view',
    'diagnostico.create',
    'plano.view',
    'conquista.view',
  ];

  // Permissões para ADMIN
  const adminPermissions = [
    ...userPermissions,
    'dashboard.admin.view',
    'diagnostico.edit',
    'diagnostico.delete',
    'plano.create',
    'plano.edit',
    'plano.delete',
    'conquista.manage',
    'conquista.create',
    'conquista.edit',
    'conquista.delete',
    'user.view',
    'user.create',
    'user.edit',
    'user.delete',
    'user.manage',
    'relatorio.view',
    'relatorio.create',
    'relatorio.export',
    'config.view',
    'config.edit',
  ];

  // Permissões para MASTER (todas)
  const masterPermissions = allPermissions.map(p => p.key);

  // Criar role_permissions
  const rolePermissions = [
    { role: 'user', permissions: userPermissions },
    { role: 'admin', permissions: adminPermissions },
    { role: 'master', permissions: masterPermissions },
  ];

  for (const { role, permissions } of rolePermissions) {
    for (const permKey of permissions) {
      const permissionId = permissionMap.get(permKey);
      if (permissionId) {
        await prisma.role_permission.upsert({
          where: {
            role_permission_id: {
              role: role as any,
              permission_id: permissionId,
            },
          },
          update: {},
          create: {
            role: role as any,
            permission_id: permissionId,
          },
        });
      }
    }
  }

  console.log('✅ Permissões por role criadas');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
