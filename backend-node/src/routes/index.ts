import { Router } from 'express';
import { getHealth } from '../controllers/healthController';
import { getIndex } from '../controllers/indexController';
import { getTimeline } from '../controllers/replayController';
import {
  exportCsv, getCompanies, getEvents, getModelReport, getPipeline, getPosts, getUniverse,
} from '../controllers/signalsController';
import { getPortfolio, getScenarios, runScenario } from '../controllers/stressController';
import { postRun, postScore } from '../controllers/workbenchController';
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
router.get('/replay/timeline', getTimeline);

// Module A: index rebalancer
router.get('/index', getIndex);

// Module B: stress tester
router.get('/stress/portfolio', getPortfolio);
router.get('/stress/scenarios', getScenarios);
router.post('/stress/run', runScenario);

// Live scoring and the Python workbench (sidecar)
router.post('/score', asyncHandler(postScore));
router.post('/workbench/run', asyncHandler(postRun));

export default router;
