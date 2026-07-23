import { prisma } from '../config/prisma';

export async function createCommand(
  projectId: string,
  title: string,
  command: string,
  description?: string,
  order?: number
) {
  return prisma.command.create({
    data: { projectId, title, command, description, order: order || 0 },
  });
}

export async function getCommands(projectId: string, search?: string) {
  return prisma.command.findMany({
    where: {
      projectId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { command: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function updateCommand(
  id: string,
  projectId: string,
  data: { title?: string; command?: string; description?: string; order?: number }
) {
  const cmd = await prisma.command.findFirst({ where: { id, projectId } });
  if (!cmd) throw new Error('COMMAND_NOT_FOUND');
  return prisma.command.update({ where: { id }, data });
}

export async function deleteCommand(id: string, projectId: string) {
  const cmd = await prisma.command.findFirst({ where: { id, projectId } });
  if (!cmd) throw new Error('COMMAND_NOT_FOUND');
  await prisma.command.delete({ where: { id } });
}
