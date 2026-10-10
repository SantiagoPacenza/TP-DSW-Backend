
import type { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { leerId, manejarError } from '../shared/utils.js';
import { Disciplina } from './disciplina.entity.js';

const em = orm.em;

// Error propio para distinguir validaciones de errores internos.
class ErrorValidacion extends Error {}

// Limpia y valida los datos recibidos.
type DisciplinaInput = {
  nombre: string;
  descripcion?: string;
};

const sanitizeDisciplinaInput = (body: unknown): DisciplinaInput => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ErrorValidacion('El cuerpo debe ser un objeto');
  }

  const input = body as Record<string, unknown>;

  if (typeof input.nombre !== 'string' || !input.nombre.trim()) {
    throw new ErrorValidacion('El nombre es obligatorio');
  }

  if (
    input.descripcion !== undefined &&
    typeof input.descripcion !== 'string'
  ) {
    throw new ErrorValidacion('La descripción debe ser un texto');
  }

  const nombre = input.nombre.trim();
  const descripcion =
    typeof input.descripcion === 'string'
      ? input.descripcion.trim()
      : undefined;

  return {
    nombre,
    ...(descripcion !== undefined ? { descripcion } : {}),
  };
};

// Responde 400 si los datos son inválidos.
// Para otros errores, utiliza la función compartida.
const manejarErrorDisciplina = (
  res: Response,
  error: unknown,
  mensajeDuplicado: string,
) => {
  if (error instanceof ErrorValidacion) {
    return res.status(400).json({ message: error.message });
  }

  return manejarError(res, error, mensajeDuplicado);
};

// Obtener todas las disciplinas
const findAll = async (_req: Request, res: Response) => {
  try {
    const disciplinas = await em.find(Disciplina, {});
    return res.status(200).json({
      message: 'Todas las disciplinas',
      data: disciplinas,
    });
  } catch (error: unknown) {
    return manejarError(res, error);
  }
};

// Obtener una disciplina por ID
const findOne = async (req: Request, res: Response) => {
  const id = leerId(req, res);
  if (id === null) return;

  try {
    const disciplina = await em.findOne(Disciplina, { id });

    if (!disciplina) {
      return res.status(404).json({
        message: 'Disciplina no encontrada',
      });
    }

    return res.status(200).json({
      message: 'Disciplina encontrada',
      data: disciplina,
    });
  } catch (error: unknown) {
    return manejarError(res, error);
  }
};

// Crear una disciplina
const add = async (req: Request, res: Response) => {
  try {
    const input = sanitizeDisciplinaInput(req.body);
    const disciplina = em.create(Disciplina, input);

    await em.flush();

    return res.status(201).json({
      message: 'Disciplina creada',
      data: disciplina,
    });
  } catch (error: unknown) {
    return manejarErrorDisciplina(
      res,
      error,
      'Ya existe una disciplina con ese nombre',
    );
  }
};

// Actualizar una disciplina
const update = async (req: Request, res: Response) => {
  const id = leerId(req, res);
  if (id === null) return;

  try {
    const input = sanitizeDisciplinaInput(req.body);
    const disciplina = await em.findOne(Disciplina, { id });

    if (!disciplina) {
      return res.status(404).json({
        message: 'Disciplina no encontrada para actualizar',
      });
    }

    em.assign(disciplina, input);
    await em.flush();

    return res.status(200).json({
      message: 'Disciplina actualizada',
      data: disciplina,
    });
  } catch (error: unknown) {
    return manejarErrorDisciplina(
      res,
      error,
      'Ya existe una disciplina con ese nombre',
    );
  }
};

// Eliminar una disciplina
const remove = async (req: Request, res: Response) => {
  const id = leerId(req, res);
  if (id === null) return;

  try {
    const disciplina = await em.findOne(Disciplina, { id });

    if (!disciplina) {
      return res.status(404).json({
        message: 'Disciplina no encontrada para eliminar',
      });
    }

    await em.removeAndFlush(disciplina);

    return res.status(200).json({
      message: 'Disciplina eliminada con éxito',
    });
  } catch (error: unknown) {
    return manejarError(res, error);
  }
};

export { findAll, findOne, add, update, remove };
