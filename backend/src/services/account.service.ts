import { prisma } from '../config/prisma';

export async function createAccount(
  projectId: string,
  serviceName: string,
  email: string,
  username?: string,
  notesCiphertext?: string,
  notesIv?: string
) {
  return prisma.account.create({
    data: { projectId, serviceName, email, username, notesCiphertext, notesIv },
  });
}

export async function getAccounts(projectId: string, search?: string) {
  return prisma.account.findMany({
    where: {
      projectId,
      ...(search
        ? {
            OR: [
              { serviceName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { serviceName: 'asc' },
  });
}

export async function searchAccountsByEmail(userId: string, email: string) {
  // Cross-project search: find all accounts with a matching email owned by this user
  return prisma.account.findMany({
    where: {
      email: { contains: email, mode: 'insensitive' },
      project: { userId },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { serviceName: 'asc' },
  });
}

export async function updateAccount(
  id: string,
  projectId: string,
  data: {
    serviceName?: string;
    email?: string;
    username?: string;
    notesCiphertext?: string;
    notesIv?: string;
  }
) {
  const account = await prisma.account.findFirst({ where: { id, projectId } });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  return prisma.account.update({ where: { id }, data });
}

export async function deleteAccount(id: string, projectId: string) {
  const account = await prisma.account.findFirst({ where: { id, projectId } });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  await prisma.account.delete({ where: { id } });
}
