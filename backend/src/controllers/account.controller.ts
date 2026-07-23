import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as accountService from '../services/account.service';
import { createAuditLog } from '../services/audit.service';
import { prisma } from '../config/prisma';
import { param } from '../utils/param';

async function assertProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return !!project;
}

export async function getAccounts(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const accounts = await accountService.getAccounts(projectId, req.query.search as string);
  res.json({ accounts });
}

export async function createAccount(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { serviceName, email, username, notesCiphertext, notesIv } = req.body;
  const account = await accountService.createAccount(projectId, serviceName, email, username, notesCiphertext, notesIv);
  await createAuditLog(req.userId!, 'ACCOUNT_ADDED', 'Account', account.id);
  res.status(201).json({ account });
}

export async function updateAccount(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const accId = param(req.params.accId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const account = await accountService.updateAccount(accId, projectId, req.body);
  await createAuditLog(req.userId!, 'ACCOUNT_UPDATED', 'Account', account.id);
  res.json({ account });
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const accId = param(req.params.accId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  await accountService.deleteAccount(accId, projectId);
  await createAuditLog(req.userId!, 'ACCOUNT_REMOVED', 'Account', accId);
  res.json({ message: 'Account deleted' });
}

export async function searchAccountsByEmail(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.query;
  if (!email) { res.status(400).json({ error: 'EMAIL_REQUIRED' }); return; }

  const accounts = await accountService.searchAccountsByEmail(req.userId!, email as string);
  res.json({ accounts });
}
