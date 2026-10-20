import type { Request, Response } from 'express';
import { UniqueConstraintViolationException, ForeignKeyConstraintViolationException } from '@mikro-orm/core';
import { registrarErrorCompleto } from '../errors/error.controller.js';
import { OrigenError } from '../errors/error.entity.js';

// Devuelve el ID de la URL si es válido o responde 400 y devuelve null.
// Se valida con regex porque parseInt("12abc") daría 12 sin quejarse.
export function leerId(req: Request, res: Response): number | null {

  const valor = req.params.id;

  if (!/^\d+$/.test(valor)) { // Expresión regular valida que sea entero

    // Creamos el error para el log
    const errorIdInvalido = new Error(`El ID proporcionado '${valor} no es un número entero válido.'`)

    // Registramos en DB y archivo indicando que viene del backend, dado que allí se produce la validación
    registrarErrorCompleto(errorIdInvalido, 'ErrorDeValidación_LeerIdFunction', OrigenError.BACKEND, req);
    
    res.status(400).json({ message: 'El id debe ser un número entero' });
    return null;
  }

  return Number(valor);
}

// Manejo centralizado de errores.
export function manejarError(res: Response, error: unknown, mensajePersonalizado?: string, req?: Request) {

  // 1. Manejo de Registro Duplicado (409)
  if (error instanceof UniqueConstraintViolationException) {
    // Duplicado (campo único) -> 409. Cualquier otro error -> 500 genérico.
    // El mensaje de duplicado se adapta a cada entidad.

    registrarErrorCompleto(error, 'UniqueConstraintViolation', OrigenError.BACKEND, req);
    
    return res.status(409).json({ message: mensajePersonalizado || 'Ya existe un registro con esos datos.' });
  }

  // 2. Manejo de Restricción de Clave Foránea
  if (error instanceof ForeignKeyConstraintViolationException) {
    
    registrarErrorCompleto(error, 'ForeignKeyConstraintViolationException', OrigenError.BACKEND, req );
    
    return res.status(409).json({ message: 'No se puede eliminar o modificar el registro ya que está vinculado con datos asociados en otra entidad del sistema' });
  }

  // 3. Error genérico del servidor (500)
  const tipoError = error instanceof Error ? error.constructor.name : 'UnknownError';
  registrarErrorCompleto(error, tipoError, OrigenError.BACKEND, req)

  return res.status(500).json({ message: 'Error interno del servidor' });

}