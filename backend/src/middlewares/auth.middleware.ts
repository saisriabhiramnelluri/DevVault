import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../services/auth.service';

export interface AuthRequest extends Request {
  userId?: string;
  sessionId?: string;
  user?: {
    id: string;
    email: string;
    pbkdf2Salt: string;
    isLocked: boolean;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.devvault_token;

    if (!token) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'No token provided' });
      return;
    }

    const { userId, sessionId, user } = await validateSession(token);
    req.userId = userId;
    req.sessionId = sessionId;
    req.user = {
      id: user.id,
      email: user.email,
      pbkdf2Salt: user.pbkdf2Salt,
      isLocked: user.isLocked,
    };

    next();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'SESSION_EXPIRED') {
      res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Session has expired' });
      return;
    }
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}
