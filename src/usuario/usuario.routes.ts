import { Router } from 'express';
import {
  sanitizeUsuarioInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './usuario.controller.js';
import { verificarToken, verificarAdminEntrenador, verificarAdminCliente } from '../auth/auth.middleware.js';

export const usuarioRouter = Router();

usuarioRouter.get('/'      , verificarToken, verificarAdminEntrenador, findAll);
usuarioRouter.get('/:id'   , verificarToken, findOne);                                // los 3 roles pueden acceder
usuarioRouter.post('/'     , verificarToken, verificarAdminCliente, sanitizeUsuarioInput, add);
usuarioRouter.put('/:id'   , verificarToken, sanitizeUsuarioInput, update);           // los 3 roles pueden acceder
usuarioRouter.patch('/:id' , verificarToken, sanitizeUsuarioInput, update);           // los 3 roles pueden acceder
usuarioRouter.delete('/:id', verificarToken, remove);                                 // los 3 roles pueden acceder

// 1. Ver si donde se verifican los 3 roles es lo mismo que sacarlos.
// 2. Considerar que ya se verifica el token para esos casos.
// 3. Considerar casos en donde un usuario se afecta a sí mismo: no bloquearle el permiso dejandolo afuera! agregar 
//    su verificación también.
