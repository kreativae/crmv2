import { Router } from 'express';
import { leadController } from '../controllers/leadController';
import { authenticate, authorize } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { createLeadSchema, updateLeadSchema, paginationSchema } from '../utils/validators';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// CRUD operations
router.get('/', validate(paginationSchema, 'query'), leadController.getAll);
router.get('/stats', leadController.getStats);
router.get('/export', leadController.exportLeads);
router.get('/:id', leadController.getById);
router.post('/', validate(createLeadSchema), leadController.create);
router.put('/:id', validate(updateLeadSchema), leadController.update);
router.delete('/:id', leadController.delete);

// Bulk operations
router.post('/bulk', authorize('admin', 'manager'), leadController.bulkCreate);
router.put('/bulk', authorize('admin', 'manager'), leadController.bulkUpdate);
router.delete('/bulk', authorize('admin', 'manager'), leadController.bulkDelete);

// Lead actions
router.post('/:id/move', leadController.moveStage);
router.post('/:id/assign', leadController.assign);
router.post('/:id/score', leadController.updateScore);
router.post('/:id/convert', leadController.convertToClient);
router.post('/:id/notes', leadController.addNote);
router.get('/:id/activities', leadController.getActivities);

export default router;
