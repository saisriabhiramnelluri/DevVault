import { prisma } from '../config/prisma';

export async function createDiaryEntry(
  projectId: string,
  title: string,
  content: string,
  pinned?: boolean
) {
  return prisma.diaryEntry.create({
    data: { projectId, title, content, pinned: pinned || false },
  });
}

export async function getDiaryEntries(projectId: string, search?: string) {
  return prisma.diaryEntry.findMany({
    where: {
      projectId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function updateDiaryEntry(
  id: string,
  projectId: string,
  data: { title?: string; content?: string; pinned?: boolean }
) {
  const entry = await prisma.diaryEntry.findFirst({ where: { id, projectId } });
  if (!entry) throw new Error('DIARY_ENTRY_NOT_FOUND');
  return prisma.diaryEntry.update({ where: { id }, data });
}

export async function deleteDiaryEntry(id: string, projectId: string) {
  const entry = await prisma.diaryEntry.findFirst({ where: { id, projectId } });
  if (!entry) throw new Error('DIARY_ENTRY_NOT_FOUND');
  await prisma.diaryEntry.delete({ where: { id } });
}
