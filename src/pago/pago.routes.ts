import { Router } from 'express';
import { findAll, findOne, add, update, remove, confirmarPago, sanitizePagoInput } from './pago.controller.js';

export const pagoRouter = Router();

pagoRouter.get('/', findAll);
pagoRouter.get('/:membresiaId/:idPago', findOne);
pagoRouter.post('/', sanitizePagoInput, add);
pagoRouter.put('/:membresiaId/:idPago', sanitizePagoInput, update);
pagoRouter.patch('/:membresiaId/:idPago', sanitizePagoInput, update);
pagoRouter.patch('/:membresiaId/:idPago/confirmar', confirmarPago);
pagoRouter.delete('/:membresiaId/:idPago', remove);