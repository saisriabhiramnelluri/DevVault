import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as commandService from '../services/command.service';
import { createAuditLog } from '../services/audit.service';
import { prisma } from '../config/prisma';
import { param } from '../utils/param';

async function assertProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return !!project;
}

export async function getCommands(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const commands = await commandService.getCommands(projectId, req.query.search as string);
  res.json({ commands });
}

export async function createCommand(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { title, command, description, order } = req.body;
  const cmd = await commandService.createCommand(projectId, title, command, description, order);
  await createAuditLog(req.userId!, 'COMMAND_CREATED', 'Command', cmd.id);
  res.status(201).json({ command: cmd });
}

export async function updateCommand(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const cmdId = param(req.params.cmdId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const cmd = await commandService.updateCommand(cmdId, projectId, req.body);
  await createAuditLog(req.userId!, 'COMMAND_UPDATED', 'Command', cmd.id);
  res.json({ command: cmd });
}

export async function deleteCommand(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const cmdId = param(req.params.cmdId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  await commandService.deleteCommand(cmdId, projectId);
  await createAuditLog(req.userId!, 'COMMAND_DELETED', 'Command', cmdId);
  res.json({ message: 'Command deleted' });
}
