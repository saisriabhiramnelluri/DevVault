import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as diaryService from '../services/diary.service';
import { createAuditLog } from '../services/audit.service';
import { prisma } from '../config/prisma';
import { param } from '../utils/param';

async function assertProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return !!project;
}

export async function getDiaryEntries(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const entries = await diaryService.getDiaryEntries(projectId, req.query.search as string);
  res.json({ entries });
}

export async function createDiaryEntry(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { title, content, pinned } = req.body;
  const entry = await diaryService.createDiaryEntry(projectId, title, content, pinned);
  await createAuditLog(req.userId!, 'DIARY_ENTRY_CREATED', 'DiaryEntry', entry.id);
  res.status(201).json({ entry });
}

export async function updateDiaryEntry(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const entryId = param(req.params.entryId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  try {
    const entry = await diaryService.updateDiaryEntry(entryId, projectId, req.body);
    await createAuditLog(req.userId!, 'DIARY_ENTRY_UPDATED', 'DiaryEntry', entry.id);
    res.json({ entry });
  } catch {
    res.status(404).json({ error: 'DIARY_ENTRY_NOT_FOUND' });
  }
}

export async function deleteDiaryEntry(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const entryId = param(req.params.entryId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  try {
    await diaryService.deleteDiaryEntry(entryId, projectId);
    await createAuditLog(req.userId!, 'DIARY_ENTRY_DELETED', 'DiaryEntry', entryId);
    res.json({ message: 'Diary entry deleted' });
  } catch {
    res.status(404).json({ error: 'DIARY_ENTRY_NOT_FOUND' });
  }
}
