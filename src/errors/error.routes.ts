import { Router } from 'express';
import { registrarErrorDesdeFrontend } from './error.controller.js';
import { verificarTokenOpcional } from '../auth/auth.middleware.js';

export const erroresRouter = Router();

erroresRouter.post('/', verificarTokenOpcional, registrarErrorDesdeFrontend);
