import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import * as envVarController from '../controllers/envvar.controller';
import * as accountController from '../controllers/account.controller';
import * as commandController from '../controllers/command.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createProjectSchema,
  createEnvVarSchema,
  bulkEnvVarSchema,
  createAccountSchema,
  createCommandSchema,
} from '../validators/schemas';

const router = Router();
router.use(authMiddleware);

// ── Projects ────────────────────────────────────────────────────────────────────
router.get('/', projectController.getProjects);
router.post('/', validate(createProjectSchema), projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// ── Env Variables ──────────────────────────────────────────────────────────────
router.get('/:projectId/envvars', envVarController.getEnvVariables);
router.post('/:projectId/envvars', validate(createEnvVarSchema), envVarController.createEnvVariable);
router.post('/:projectId/envvars/bulk', validate(bulkEnvVarSchema), envVarController.bulkCreateEnvVariables);
router.post('/:projectId/envvars/parse', envVarController.parseEnvFile);
router.put('/:projectId/envvars/:varId', envVarController.updateEnvVariable);
router.delete('/:projectId/envvars/:varId', envVarController.deleteEnvVariable);

// ── Accounts ───────────────────────────────────────────────────────────────────
router.get('/:projectId/accounts', accountController.getAccounts);
router.post('/:projectId/accounts', validate(createAccountSchema), accountController.createAccount);
router.put('/:projectId/accounts/:accId', accountController.updateAccount);
router.delete('/:projectId/accounts/:accId', accountController.deleteAccount);

// ── Commands ───────────────────────────────────────────────────────────────────
router.get('/:projectId/commands', commandController.getCommands);
router.post('/:projectId/commands', validate(createCommandSchema), commandController.createCommand);
router.put('/:projectId/commands/:cmdId', commandController.updateCommand);
router.delete('/:projectId/commands/:cmdId', commandController.deleteCommand);

export default router;
