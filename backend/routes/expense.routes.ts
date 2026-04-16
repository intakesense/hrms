import { Router } from 'express';
import {
  createExpense,
  getMyExpenses,
  getAllExpenses,
  updateExpenseStatus,
  bulkUpdateStatus,
  exportExpensesExcel
} from '../controllers/expense.controllers.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router: Router = Router();

// Employee routes
router.post('/request', authMiddleware(), createExpense);
router.get('/my', authMiddleware(), getMyExpenses);

// Admin/HR routes
router.get('/all', authMiddleware(['admin', 'hr']), getAllExpenses);
router.put('/:id/status', authMiddleware(['admin', 'hr']), updateExpenseStatus);
router.post('/bulk-status', authMiddleware(['admin', 'hr']), bulkUpdateStatus);
router.get('/export', authMiddleware(['admin', 'hr']), exportExpensesExcel);

export default router;
