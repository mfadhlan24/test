import { Router } from 'express';
import { searchByName, submitLink } from '../controllers/sheetController.js';

const router = Router();

router.get('/search', searchByName);
router.post('/submit', submitLink);

export default router;
