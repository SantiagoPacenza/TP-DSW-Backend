import { Router, Request, Response, NextFunction } from 'express';
import { sanitizeUsuarioInput } from '../usuario/usuario.controller.js';
import { RolUsuario } from '../usuario/usuario.entity.js';
import {
  autoregistroCliente,
  loguearse,
} from './auth.controller.js';

export const authRouter = Router();

// Fija el rol de cliente antes del sanitizador para que el formulario de registro no tenga que enviar "rol"
function fijarRolCliente(req: Request, _res: Response, next: NextFunction) {
  if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
    req.body.rol = RolUsuario.CLIENTE;
  }
  next();
}

authRouter.post('/registro', fijarRolCliente, sanitizeUsuarioInput, autoregistroCliente);
authRouter.post('/login', loguearse); // NO usa el sanitizador (valida directo email y contraseña en el controlador)
