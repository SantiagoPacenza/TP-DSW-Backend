import type { Request, Response } from 'express';
import { UniqueConstraintViolationException } from '@mikro-orm/core';

// Devuelve el ID de la URL si es válido o responde 400 y devuelve null.
// Se valida con regex porque parseInt("12abc") daría 12 sin quejarse.
export function leerId(req: Request, res: Response): number | null {
  const valor = req.params.id;

  if (!/^\d+$/.test(valor)) {
    res.status(400).json({ message: 'El id debe ser un número entero' });
    return null;
  }
  return Number(valor);
}

// Duplicado (campo único) -> 409. Cualquier otro error -> 500 genérico.
// El mensaje de duplicado se adapta a cada entidad.
// El detalle va a la consola para no exponer datos internos (como nombres de tablas, consultas SQL, etc.) al cliente.
export function manejarError(
  res: Response,
  error: unknown,
  mensajeDuplicado = 'Ya existe un registro con esos datos',
) {
  if (error instanceof UniqueConstraintViolationException) {
    return res.status(409).json({ message: mensajeDuplicado });
  }
  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor' });
}
