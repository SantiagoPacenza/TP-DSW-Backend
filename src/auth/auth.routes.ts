import { Router } from 'express';
import { sanitizeUsuarioInput } from '../usuario/usuario.controller.js';
import {
  autoregistroCliente,
  loguearse
} from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/registro', sanitizeUsuarioInput, autoregistroCliente);
authRouter.post('/login', loguearse); // NO usa el sanitizador (valida directo email y contraseña en el controlador)