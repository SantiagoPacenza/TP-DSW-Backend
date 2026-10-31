import { Router } from 'express';
import {
  findAll,
  findOne,
  add,
  update,
  remove,
  confirmarPago,
  sanitizePagoInput,
} from './pago.controller.js';
import {
  verificarToken,
  isAdmin,
  isAdminCliente,
} from '../auth/auth.middleware.js';

export const pagoRouter = Router();

pagoRouter.get('/', verificarToken, findAll);
pagoRouter.get('/:membresiaId/:idPago', verificarToken, findOne);
pagoRouter.post('/', verificarToken, isAdminCliente, sanitizePagoInput, add);
pagoRouter.put('/:membresiaId/:idPago', verificarToken, isAdmin, sanitizePagoInput, update);
pagoRouter.patch('/:membresiaId/:idPago', verificarToken, isAdmin, sanitizePagoInput, update);
pagoRouter.patch('/:membresiaId/:idPago/confirmar', verificarToken, isAdminCliente, confirmarPago);
pagoRouter.delete('/:membresiaId/:idPago', verificarToken, isAdmin, remove);
