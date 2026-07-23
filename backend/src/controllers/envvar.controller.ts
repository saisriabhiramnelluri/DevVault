import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as envVarService from '../services/envvar.service';
import { createAuditLog } from '../services/audit.service';
import { prisma } from '../config/prisma';
import { param } from '../utils/param';

async function assertProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return !!project;
}

export async function getEnvVariables(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { search } = req.query;
  const vars = await envVarService.getEnvVariables(projectId, search as string | undefined);
  res.json({ variables: vars });
}

export async function createEnvVariable(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { key, ciphertext, iv, environment, category } = req.body;
  const variable = await envVarService.createEnvVariable(projectId, key, ciphertext, iv, environment, category);
  await createAuditLog(req.userId!, 'SECRET_CREATED', 'EnvVariable', variable.id);
  res.status(201).json({ variable });
}

export async function bulkCreateEnvVariables(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { variables } = req.body;
  const result = await envVarService.bulkCreateEnvVariables(projectId, variables);
  await createAuditLog(req.userId!, 'SECRETS_BULK_IMPORTED', 'EnvVariable', projectId);
  res.status(201).json({ count: result.count });
}

export async function updateEnvVariable(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const varId = param(req.params.varId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const variable = await envVarService.updateEnvVariable(varId, projectId, req.body);
  await createAuditLog(req.userId!, 'SECRET_UPDATED', 'EnvVariable', variable.id);
  res.json({ variable });
}

export async function deleteEnvVariable(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const varId = param(req.params.varId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  await envVarService.deleteEnvVariable(varId, projectId);
  await createAuditLog(req.userId!, 'SECRET_DELETED', 'EnvVariable', varId);
  res.json({ message: 'Variable deleted' });
}

export async function parseEnvFile(req: AuthRequest, res: Response): Promise<void> {
  const projectId = param(req.params.projectId);
  const owned = await assertProjectOwnership(projectId, req.userId!);
  if (!owned) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  const { content } = req.body;
  if (!content) { res.status(400).json({ error: 'MISSING_CONTENT' }); return; }

  const parsed = envVarService.parseEnvFile(content);
  const preview = parsed.map((v) => ({
    key: v.key,
    value: v.value,
    category: envVarService.detectCategory(v.key),
  }));
  res.json({ variables: preview });
}
