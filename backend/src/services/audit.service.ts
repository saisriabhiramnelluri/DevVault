import { prisma } from '../config/prisma';

export async function createAuditLog(
  userId: string,
  action: string,
  resource?: string,
  resourceId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  return prisma.auditLog.create({
    data: { userId, action, resource, resourceId, ipAddress, userAgent },
  });
}

export async function getAuditLogs(
  userId: string,
  page = 1,
  limit = 20
) {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where: { userId } }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}
