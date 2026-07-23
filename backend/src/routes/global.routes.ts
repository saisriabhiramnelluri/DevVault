import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { searchAccountsByEmail } from '../controllers/account.controller';
import { getAuditLogs } from '../services/audit.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authMiddleware);

// Global cross-project account email search
router.get('/accounts/search', searchAccountsByEmail);

// Audit logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const result = await getAuditLogs(req.userId!, page, limit);
  res.json(result);
});

export default router;
