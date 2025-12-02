import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type DateRange = { from?: string; to?: string };

export type OverviewReport = {
  users: { total: number; active: number };
  diagnostics: { total: number; completed: number; processing: number; failed: number };
  actionPlans: {
    total: number;
    byStatus: { key: string; count: number }[];
    byPriority: { key: string; count: number }[];
    avgProgress: number;
  };
  goals: { total: number; completed: number; inProgress: number; pending: number; overdue: number; avgProgress: number };
  contents: { total: number; totalViews: number; totalDownloads: number };
  notifications: { total: number; unread: number };
  activity: { total24h: number; logins24h: number };
  nps?: number | null;
};

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private toDate(date?: string) {
    return date ? new Date(date) : undefined;
  }

  async getOverview(range: DateRange, companyId?: string): Promise<OverviewReport> {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const now = new Date();

    const userWhere: any = companyId ? { company_id: companyId } : {};
    const timeWhere = (field: string) =>
      from || to ? { [field]: { gte: from, lte: to } } : {};

    const [usersTotal, usersActive] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.count({ where: { ...userWhere, is_active: true } }),
    ]);

    const diagnosticsWhere: any = companyId ? { user: { company_id: companyId } } : {};
    const [diagTotal, diagCompleted, diagProcessing, diagFailed] = await Promise.all([
      this.prisma.diagnostic.count({ where: diagnosticsWhere }),
      this.prisma.diagnostic.count({ where: { ...diagnosticsWhere, status: 'completed' as any } }),
      this.prisma.diagnostic.count({ where: { ...diagnosticsWhere, status: 'processing' as any } }),
      this.prisma.diagnostic.count({ where: { ...diagnosticsWhere, status: 'failed' as any } }),
    ]);

    const plansWhere: any = companyId ? { user: { company_id: companyId } } : {};
    const [plansTotal, plansByStatusRaw, plansByPriorityRaw, plansAvgProgress] = await Promise.all([
      this.prisma.action_plan.count({ where: plansWhere }),
      this.prisma.action_plan.groupBy({ by: ['status'], where: plansWhere, _count: { id: true } }),
      this.prisma.action_plan.groupBy({ by: ['priority'], where: plansWhere, _count: { id: true } }),
      this.prisma.action_plan.aggregate({ where: plansWhere, _avg: { progress: true } }).then((r) => r._avg.progress ?? 0),
    ]);
    const plansByStatus = plansByStatusRaw.map((s) => ({ key: s.status, count: s._count.id }));
    const plansByPriority = plansByPriorityRaw.map((p) => ({ key: p.priority, count: p._count.id }));

    const goalsWhere: any = companyId ? { action_plan: { user: { company_id: companyId } } } : {};
    const [goalsTotal, goalsCompleted, goalsInProgress, goalsPending, goalsOverdue, goalsAvgProgress] = await Promise.all([
      this.prisma.goal.count({ where: goalsWhere }),
      this.prisma.goal.count({ where: { ...goalsWhere, status: 'concluida' as any } }),
      this.prisma.goal.count({ where: { ...goalsWhere, status: 'em_andamento' as any } }),
      this.prisma.goal.count({ where: { ...goalsWhere, status: 'pendente' as any } }),
      this.prisma.goal.count({ where: { ...goalsWhere, due_date: { lt: now }, NOT: { status: 'concluida' as any } } }),
      this.prisma.goal.aggregate({ where: goalsWhere, _avg: { progress: true } }).then((r) => r._avg.progress ?? 0),
    ]);

    const contentsWhere: any = companyId ? { action_plans: { some: { action_plan: { user: { company_id: companyId } } } } } : {};
    const [contentsTotal, contentsAgg] = await Promise.all([
      this.prisma.content.count({ where: contentsWhere }),
      this.prisma.content.aggregate({ where: contentsWhere, _sum: { views: true, downloads: true } }),
    ]);
    const totalViews = Number(contentsAgg._sum.views || 0);
    const totalDownloads = Number(contentsAgg._sum.downloads || 0);

    const notifWhere: any = companyId ? { user: { company_id: companyId } } : {};
    const [notifTotal, notifUnread] = await Promise.all([
      this.prisma.notification.count({ where: notifWhere }),
      this.prisma.notification.count({ where: { ...notifWhere, is_read: false } }),
    ]);

    const activitiesWhere: any = companyId ? { user: { company_id: companyId } } : {};
    const [totalActivities24h, logins24h] = await Promise.all([
      this.prisma.user_activity_log.count({ where: { ...activitiesWhere, created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.prisma.login_history.count({ where: { ...activitiesWhere, login_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    // NPS
    const npsWhere: any = companyId ? { questionnaire: { type: 'nps' }, user: { company_id: companyId } } : { questionnaire: { type: 'nps' } };
    const npsResponses = await this.prisma.questionnaire_response.findMany({ where: npsWhere, select: { score: true } });
    let nps: number | null = null;
    if (npsResponses.length) {
      let promoters = 0;
      let detractors = 0;
      for (const r of npsResponses) {
        const s = Number(r.score || 0);
        if (s >= 9) promoters++;
        else if (s <= 6) detractors++;
      }
      const total = npsResponses.length;
      nps = Math.round(((promoters / total) * 100 - (detractors / total) * 100) * 10) / 10;
    }

    return {
      users: { total: usersTotal, active: usersActive },
      diagnostics: { total: diagTotal, completed: diagCompleted, processing: diagProcessing, failed: diagFailed },
      actionPlans: { total: plansTotal, byStatus: plansByStatus, byPriority: plansByPriority, avgProgress: Number(plansAvgProgress) || 0 },
      goals: {
        total: goalsTotal,
        completed: goalsCompleted,
        inProgress: goalsInProgress,
        pending: goalsPending,
        overdue: goalsOverdue,
        avgProgress: Number(goalsAvgProgress) || 0,
      },
      contents: { total: contentsTotal, totalViews, totalDownloads },
      notifications: { total: notifTotal, unread: notifUnread },
      activity: { total24h: totalActivities24h, logins24h },
      nps,
    };
  }

  async getClientsTop(range: DateRange, limit = 10, sortBy: 'revenue' | 'engagement' = 'revenue') {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const tx = await this.prisma.transaction.findMany({
      where: {
        type: 'revenue',
        category: 'subscription',
        ...(from || to ? { transaction_date: { gte: from, lte: to } } : {}),
      },
      include: { subscription: { include: { company: true } } },
    });
    const byCompany: Record<string, { companyId: string; companyName: string; revenue: number; diagnostics: number; engagement: number; plansInProgress: number; goalsCompleted: number }> = {};
    for (const t of tx) {
      const cid = t.subscription?.company_id || 'unknown';
      const cname = t.subscription?.company?.name || 'N/D';
      const curr = byCompany[cid] || { companyId: cid, companyName: cname, revenue: 0, diagnostics: 0, engagement: 0, plansInProgress: 0, goalsCompleted: 0 };
      curr.revenue += Number(t.value || 0);
      byCompany[cid] = curr;
    }
    const companyIds = Object.keys(byCompany).filter((k) => k !== 'unknown');
    const users = await this.prisma.user.findMany({ where: { company_id: { in: companyIds } }, select: { id: true, company_id: true } });
    const userIds = users.map((u) => u.id);
    const userToCompany: Record<string, string> = {};
    for (const u of users) userToCompany[u.id] = u.company_id || 'unknown';
    const [diagCounts, activityCounts, plansCounts, goalsCounts] = await Promise.all([
      this.prisma.diagnostic.groupBy({ by: ['user_id'], _count: { id: true }, where: { user_id: { in: userIds } } }),
      this.prisma.user_activity_log.groupBy({ by: ['user_id'], _count: { id: true }, where: { user_id: { in: userIds }, ...(from || to ? { created_at: { gte: from, lte: to } } : {}) } }),
      this.prisma.action_plan.groupBy({ by: ['user_id'], _count: { id: true }, where: { user: { company_id: { in: companyIds } }, status: 'em_andamento' as any } }),
      this.prisma.goal.groupBy({ by: ['action_plan_id'], _count: { id: true }, where: { status: 'concluida' as any, action_plan: { user: { company_id: { in: companyIds } } } } }),
    ]);
    for (const d of diagCounts) {
      const cid = userToCompany[d.user_id] || 'unknown';
      if (byCompany[cid]) byCompany[cid].diagnostics += d._count.id;
    }
    for (const a of activityCounts) {
      const cid = userToCompany[a.user_id] || 'unknown';
      if (byCompany[cid]) byCompany[cid].engagement += a._count.id;
    }
    for (const p of plansCounts) {
      const cid = userToCompany[p.user_id] || 'unknown';
      if (byCompany[cid]) byCompany[cid].plansInProgress += p._count.id;
    }
    if (goalsCounts.length) {
      const apIds = goalsCounts.map((g) => g.action_plan_id);
      const aps = await this.prisma.action_plan.findMany({ where: { id: { in: apIds } }, select: { id: true, user: { select: { company_id: true } } } });
      const apToCompany: Record<string, string> = {};
      for (const ap of aps) apToCompany[ap.id] = ap.user?.company_id || 'unknown';
      for (const g of goalsCounts) {
        const cid = apToCompany[g.action_plan_id] || 'unknown';
        if (byCompany[cid]) byCompany[cid].goalsCompleted += g._count.id;
      }
    }
    const list = Object.values(byCompany);
    list.sort((a, b) => (sortBy === 'revenue' ? b.revenue - a.revenue : b.engagement - a.engagement));
    return list.slice(0, limit);
  }

  async getPlatformUsage(range: DateRange, companyId?: string) {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const whereTime = (field: string) => (from || to ? { [field]: { gte: from, lte: to } } : {});
    const userScope = companyId ? { company_id: companyId } : {};
    const [usersActive, sessions, questionnairesCompleted, diagnosticsByStatus, contentAgg, chats, messages] = await Promise.all([
      this.prisma.user.count({ where: { ...userScope, is_active: true } }),
      this.prisma.login_history.count({ where: { user: userScope, ...whereTime('login_at') } }),
      this.prisma.questionnaire_response.count({ where: { user: userScope, ...whereTime('completed_at') } }),
      this.prisma.diagnostic.groupBy({ by: ['status'], _count: { id: true }, where: { user: userScope, ...whereTime('generated_at') } }),
      this.prisma.content.aggregate({ _sum: { views: true, downloads: true } }),
      this.prisma.chat_session.count({ where: { company_id: companyId, ...whereTime('created_at') } }),
      this.prisma.chat_message.count({ where: { ...whereTime('created_at') } }),
    ]);
    return {
      usersActive,
      sessions,
      questionnairesCompleted,
      diagnosticsByStatus: diagnosticsByStatus.map((d) => ({ key: d.status, count: d._count.id })),
      contentUsage: { views: Number(contentAgg._sum.views || 0), downloads: Number(contentAgg._sum.downloads || 0) },
      aiUsage: { sessions: chats, messages },
    };
  }

  async getFinancialSummary(range: DateRange, companyId?: string) {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const whereTimeTx = from || to ? { transaction_date: { gte: from, lte: to } } : {};
    const whereSub: any = companyId ? { company_id: companyId } : {};
    const whereTx: any = { type: 'revenue', category: 'subscription', ...whereTimeTx };
    const [mrrSubs, revenueTx, expensesTx, refundsTx, activeSubsCount, cancelledSubsCount] = await Promise.all([
      this.prisma.subscription.aggregate({ _sum: { final_value: true }, where: { ...whereSub, status: 'active' } }),
      this.prisma.transaction.aggregate({ _sum: { value: true }, where: whereTx }),
      this.prisma.transaction.aggregate({ _sum: { value: true }, where: { type: 'expense', ...whereTimeTx } }),
      this.prisma.transaction.aggregate({ _sum: { value: true }, where: { type: 'refund', ...whereTimeTx } }),
      this.prisma.subscription.count({ where: { ...whereSub, status: 'active' } }),
      this.prisma.subscription.count({ where: { ...whereSub, status: 'cancelled' } }),
    ]);
    const mrr = Number(mrrSubs._sum.final_value || 0);
    const arr = mrr * 12;
    const revenue = Number(revenueTx._sum.value || 0);
    const expenses = Number(expensesTx._sum.value || 0);
    const refunds = Number(refundsTx._sum.value || 0);
    const churnRate = activeSubsCount ? cancelledSubsCount / activeSubsCount : 0;
    return { mrr, arr, revenue, expenses, refunds, churnRate };
  }

  async getAuditSummary(range: DateRange, companyId?: string) {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const whereUser = companyId ? { company_id: companyId } : {};
    const [loginsSuccess, loginsFailed, activities24h] = await Promise.all([
      this.prisma.login_history.count({ where: { user: whereUser, status: 'success', ...(from || to ? { login_at: { gte: from, lte: to } } : {}) } }),
      this.prisma.login_history.count({ where: { user: whereUser, status: 'failed', ...(from || to ? { login_at: { gte: from, lte: to } } : {}) } }),
      this.prisma.user_activity_log.count({ where: { user: whereUser, ...(from || to ? { created_at: { gte: from, lte: to } } : {}) } }),
    ]);
    return { loginsSuccess, loginsFailed, activities24h };
  }

  async getFinancialHistory(range: DateRange, companyId?: string) {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to || new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const out: { date: string; revenue: number; expenses: number; refunds: number }[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
      const dayStart = new Date(t);
      const dayEnd = new Date(t + dayMs - 1);
      const [rev, exp, ref] = await Promise.all([
        this.prisma.transaction.aggregate({ _sum: { value: true }, where: { type: 'revenue', category: 'subscription', transaction_date: { gte: dayStart, lte: dayEnd } } }),
        this.prisma.transaction.aggregate({ _sum: { value: true }, where: { type: 'expense', transaction_date: { gte: dayStart, lte: dayEnd } } }),
        this.prisma.transaction.aggregate({ _sum: { value: true }, where: { type: 'refund', transaction_date: { gte: dayStart, lte: dayEnd } } }),
      ]);
      out.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: Number(rev._sum.value || 0),
        expenses: Number(exp._sum.value || 0),
        refunds: Number(ref._sum.value || 0),
      });
    }
    return out;
  }

  async getClientsHistory(range: DateRange) {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to || new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const out: { date: string; activeClients: number }[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
      const dayStart = new Date(t);
      const dayEnd = new Date(t + dayMs - 1);
      const active = await this.prisma.user.count({ where: { is_active: true, created_at: { lte: dayEnd } } });
      out.push({ date: dayStart.toISOString().slice(0, 10), activeClients: active });
    }
    return out;
  }

  async getPlatformHistory(range: DateRange, companyId?: string) {
    const from = this.toDate(range.from);
    const to = this.toDate(range.to);
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to || new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const out: { date: string; sessions: number; diagnostics: number }[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
      const dayStart = new Date(t);
      const dayEnd = new Date(t + dayMs - 1);
      const [sess, diags] = await Promise.all([
        this.prisma.login_history.count({ where: { ...(companyId ? { user: { company_id: companyId } } : {}), login_at: { gte: dayStart, lte: dayEnd } } }),
        this.prisma.diagnostic.count({ where: { ...(companyId ? { user: { company_id: companyId } } : {}), generated_at: { gte: dayStart, lte: dayEnd } } }),
      ]);
      out.push({ date: dayStart.toISOString().slice(0, 10), sessions: sess, diagnostics: diags });
    }
    return out;
  }
}