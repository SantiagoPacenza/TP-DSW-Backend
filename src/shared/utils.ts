import type { Request, Response } from 'express';
import {
  UniqueConstraintViolationException,
  ForeignKeyConstraintViolationException,
} from '@mikro-orm/core';
import { registrarErrorCompleto } from '../errors/error.controller.js';
import { OrigenError } from '../errors/error.entity.js';

// Devuelve el ID de la URL si es válido o responde 400 y devuelve null.
// Se valida con regex porque parseInt("12abc") daría 12 sin quejarse.
export function leerId(req: Request, res: Response): number | null {
  const valor = req.params.id;
  const id = Number(valor);

  if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ message: 'El id debe ser un número entero' });
    return null;
  }

  return Number(valor);
}

// Manejo centralizado de errores.
export function manejarError(
  res: Response,
  error: unknown,
  opciones?: {
    mensajeDuplicado?: string;
    mensajeForeignKey?: string;
    req?: Request;
  },
) {
  const {
    mensajeDuplicado = 'Ya existe un registro con esos datos.',
    mensajeForeignKey = 'No se pudo completar la operación debido a un conflicto de relación con otros registros.',
    req,
  } = opciones ?? {};

  // Si la respuesta ya se envió, se registra el error sin intentar responder nuevamente
  if (res.headersSent) {
    const tipoError =
      error instanceof Error ? error.constructor.name : 'UnknownError';
    registrarErrorCompleto(error, tipoError, OrigenError.BACKEND, req);
    return;
  }

  // 1. Error por registro duplicado (UNIQUE).
  if (error instanceof UniqueConstraintViolationException) {
    registrarErrorCompleto(
      error,
      'UniqueConstraintViolation',
      OrigenError.BACKEND,
      req,
    );

    return res.status(409).json({
      message: mensajeDuplicado,
    });
  }

  // 2. Error por restricción de clave foránea (FOREIGN KEY).
  if (error instanceof ForeignKeyConstraintViolationException) {
    registrarErrorCompleto(
      error,
      'ForeignKeyConstraintViolationException',
      OrigenError.BACKEND,
      req,
    );

    return res.status(409).json({
      message: mensajeForeignKey,
    });
  }

  // 3. Cualquier otro error (500).
  const tipoError =
    error instanceof Error ? error.constructor.name : 'UnknownError';

  registrarErrorCompleto(error, tipoError, OrigenError.BACKEND, req);

  return res.status(500).json({
    message: 'Error interno del servidor',
  });
}

// Devuelve la fecha actual en hora local del servidor.
// Formato: YYYY-MM-DD
export function hoyISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

// Comprueba que el texto represente una fecha real YYYY-MM-DD.
export function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }

  const [anio, mes, dia] = texto.split('-').map(Number);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

// Suma meses sin desbordar el último día del mes.
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);

  const destino = new Date(Date.UTC(anio, mes - 1 + meses, 1));

  const ultimoDia = new Date(
    Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0),
  ).getUTCDate();

  destino.setUTCDate(Math.min(dia, ultimoDia));

  return destino.toISOString().slice(0, 10);
}
