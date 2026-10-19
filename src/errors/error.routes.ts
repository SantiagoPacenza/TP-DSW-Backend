import { Router } from 'express';
import { registrarErrorDesdeFrontend } from './error.controller.js';

export const erroresRouter = Router();

erroresRouter.post('/', registrarErrorDesdeFrontend);