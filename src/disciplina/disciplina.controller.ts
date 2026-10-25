import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Disciplina } from './disciplina.entity.js';

const em = orm.em;

// Valida y limpia los datos antes de llegar al controller.
// POST y PUT exigen el nombre; PATCH permite modificar solo lo enviado.
function sanitizeDisciplinaInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const body: unknown = req.body;
  const errores: string[] = [];

  // El cuerpo debe ser un objeto.
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  const input = body as Record<string, unknown>;

  // Nombre obligatorio en POST y PUT.
  if (input.nombre === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('El nombre es obligatorio');
    }
  } else if (
    typeof input.nombre !== 'string' ||
    input.nombre.trim() === ''
  ) {
    errores.push('El nombre debe ser un texto que no esté vacío');
  }

  // Descripción opcional, pero debe ser texto si se envía.
  if (
    input.descripcion !== undefined &&
    typeof input.descripcion !== 'string'
  ) {
    errores.push('La descripción debe ser un texto');
  }

  // Devuelve todos los errores detectados.
  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  // Construye el objeto con los campos permitidos.
  const datosLimpios: Record<string, unknown> = {};

  if (input.nombre !== undefined) {
    datosLimpios.nombre = (input.nombre as string).trim();
  }

  if (input.descripcion !== undefined) {
    datosLimpios.descripcion =
      (input.descripcion as string).trim();
  }

  // No permite una actualización sin datos.
  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({
      message: 'No hay datos para modificar',
    });
  }

  req.body.sanitizedInput = datosLimpios;

  next();
}

// Obtener todas las disciplinas.
async function findAll(req: Request, res: Response) {
  try {
    const disciplinas = await em.find(Disciplina, {});

    return res.status(200).json({
      message: 'Disciplinas encontradas',
      data: disciplinas,
    });
  } catch (error) {
    return manejarError(res, error, { req });
  }
}

// Obtener una disciplina por ID.
async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

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
  } catch (error) {
    return manejarError(res, error, { req });
  }
}

// Crear una disciplina.
async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;
    
    const disciplina = em.create(Disciplina, datos);
    await em.flush();

    return res.status(201).json({
      message: 'Disciplina creada',
      data: disciplina,
    });
  } catch (error) {
    return manejarError(res, error, {
      mensajeDuplicado: 'Ya existe una disciplina con ese nombre',
      req,
    });
  }
}

// Actualizar una disciplina.
async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const disciplina = await em.findOne(Disciplina, { id });

    if (!disciplina) {
      return res.status(404).json({
        message: 'Disciplina no encontrada',
      });
    }

    const datos = req.body.sanitizedInput;

    em.assign(disciplina, datos);
    await em.flush();

    return res.status(200).json({
      message: 'Disciplina actualizada',
      data: disciplina,
    });
  } catch (error) {
    return manejarError(res, error, {
      mensajeDuplicado: 'Ya existe una disciplina con ese nombre',
      req,
    });
  }
}

// Eliminar una disciplina.
async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const disciplina = await em.findOne(Disciplina, { id });

    if (!disciplina) {
      return res.status(404).json({
        message: 'Disciplina no encontrada',
      });
    }

    await em.removeAndFlush(disciplina);

    return res.status(200).json({
      message: 'Disciplina eliminada',
    });
  } catch (error) {
    return manejarError(res, error, {
      mensajeForeignKey:
        'No se puede eliminar la disciplina porque tiene clases asociadas',
      req,
    });
  }
}

export {
  sanitizeDisciplinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};

/* RECORDATORIO PROPIO PARA ENTENDER FUNCIONAMIENTOSSSSS
  Controller de Disciplina:
  - sanitizeDisciplinaInput: valida los datos recibidos, elimina espacios innecesarios y prepara los campos permitidos.
  - findAll: obtiene todas las disciplinas.
  - findOne: busca una disciplina por su ID.
  - add: crea una disciplina con los datos validados.
  - update: modifica una disciplina existente.
  - remove: elimina una disciplina.
 
  Las validaciones se realizan mediante el middleware sanitizeDisciplinaInput.
  manejarError centraliza el tratamiento de errores.
 */
