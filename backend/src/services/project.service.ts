import { prisma } from '../config/prisma';

export async function createProject(
  userId: string,
  name: string,
  description?: string,
  stack?: string[]
) {
  return prisma.project.create({
    data: { userId, name, description, stack: stack || [] },
  });
}

export async function getProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { envVars: true, accounts: true, commands: true },
      },
    },
  });
}

export async function getProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: { envVars: true, accounts: true, commands: true },
      },
    },
  });
  if (!project) throw new Error('PROJECT_NOT_FOUND');
  return project;
}

export async function updateProject(
  id: string,
  userId: string,
  data: { name?: string; description?: string; stack?: string[] }
) {
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) throw new Error('PROJECT_NOT_FOUND');
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) throw new Error('PROJECT_NOT_FOUND');
  await prisma.project.delete({ where: { id } });
}
