import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as projectService from '../services/project.service';
import { createAuditLog } from '../services/audit.service';
import { param } from '../utils/param';

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, stack } = req.body;
    const project = await projectService.createProject(req.userId!, name, description, stack);
    await createAuditLog(req.userId!, 'PROJECT_CREATED', 'Project', project.id);
    res.status(201).json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
}

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  const projects = await projectService.getProjects(req.userId!);
  res.json({ projects });
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await projectService.getProject(param(req.params.id), req.userId!);
    res.json({ project });
  } catch {
    res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
  }
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await projectService.updateProject(param(req.params.id), req.userId!, req.body);
    await createAuditLog(req.userId!, 'PROJECT_UPDATED', 'Project', project.id);
    res.json({ project });
  } catch {
    res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
  }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = param(req.params.id);
    await projectService.deleteProject(id, req.userId!);
    await createAuditLog(req.userId!, 'PROJECT_DELETED', 'Project', id);
    res.json({ message: 'Project deleted' });
  } catch {
    res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
  }
}
