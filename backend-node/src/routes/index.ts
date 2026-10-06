import { Router } from 'express';
import { getHealth } from '../controllers/healthController';
import {
  exportCsv, getCompanies, getEvents, getModelReport, getPipeline, getPosts, getUniverse,
} from '../controllers/signalsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/health', asyncHandler(getHealth));

// Engine output
router.get('/universe', getUniverse);
router.get('/signals/companies', getCompanies);
router.get('/signals/events', getEvents);
router.get('/signals/posts', getPosts);
router.get('/signals/export.csv', exportCsv);
router.get('/pipeline', getPipeline);
router.get('/model', getModelReport);

export default router;
