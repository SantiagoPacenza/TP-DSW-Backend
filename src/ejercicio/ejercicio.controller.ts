import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Ejercicio } from './ejercicio.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';

const em = orm.em;

// Valida y limpia los datos antes de llegar al controller.
// POST y PUT exigen nombre y categoriaId; PATCH solo valida lo que viene.
// La descripción es opcional: se puede omitir, o mandar null para borrarla.
function sanitizeEjercicioInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const errores: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  if (body.nombre === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('El nombre es obligatorio');
    }
  } else if (typeof body.nombre !== 'string' || body.nombre.trim() === '') {
    errores.push('El nombre debe ser un texto que no esté vacío');
  } else if (body.nombre.trim().length > 80) {
    errores.push('El nombre no puede tener más de 80 caracteres');
  }

  if (body.descripcion !== undefined && body.descripcion !== null) {
    if (typeof body.descripcion !== 'string') {
      errores.push('La descripción debe ser un texto');
    } else if (body.descripcion.trim().length > 255) {
      errores.push('La descripción no puede tener más de 255 caracteres');
    }
  }

  if (body.categoriaId === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('El Id de la categoría es obligatorio');
    }
  } else if (
    typeof body.categoriaId !== 'number' ||
    !Number.isSafeInteger(body.categoriaId) ||
    body.categoriaId <= 0
  ) {
    errores.push('El Id de la categoría debe ser un número entero válido');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  const datosLimpios: Record<string, unknown> = {};

  if (body.nombre !== undefined) datosLimpios.nombre = body.nombre.trim();
  // null o texto vacío borran la descripción.
  if (body.descripcion !== undefined) {
    datosLimpios.descripcion =
      body.descripcion === null ? null : body.descripcion.trim() || null;
  }
  if (body.categoriaId !== undefined)
    datosLimpios.categoriaId = body.categoriaId;

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({
      message: 'No hay datos para modificar',
    });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

async function findAll(req: Request, res: Response) {
  try {
    const ejercicios = await em.find(
      Ejercicio,
      {},
      { populate: ['categoria'] },
    );
    res
      .status(200)
      .json({ message: 'Ejercicios encontrados', data: ejercicios });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const ejercicio = await em.findOne(
      Ejercicio,
      { id },
      { populate: ['categoria'] },
    );

    if (!ejercicio) {
      return res.status(404).json({
        message: 'Ejercicio no encontrado',
      });
    }

    res.status(200).json({
      message: 'Ejercicio encontrado',
      data: ejercicio,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const datosLimpios = req.body.sanitizedInput;

    const categoria = await em.findOne(Categoria, {
      id: datosLimpios.categoriaId,
    });

    if (!categoria) {
      return res.status(404).json({
        message: 'Categoría no encontrada',
      });
    }

    datosLimpios.categoria = categoria;
    delete datosLimpios.categoriaId; // no es un campo de la entidad Ejercicio

    const ejercicio = em.create(Ejercicio, datosLimpios);
    await em.flush();

    res.status(201).json({
      message: 'Ejercicio creado',
      data: ejercicio,
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'Ya existe un ejercicio con ese nombre',
      req,
    });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const ejercicio = await em.findOne(Ejercicio, { id });

    if (!ejercicio) {
      return res.status(404).json({
        message: 'Ejercicio no encontrado',
      });
    }

    const datosLimpios = req.body.sanitizedInput;

    // Si cambia la categoría, verificamos que exista.
    if (datosLimpios.categoriaId !== undefined) {
      const categoria = await em.findOne(Categoria, {
        id: datosLimpios.categoriaId,
      });

      if (!categoria) {
        return res.status(404).json({
          message: 'Categoría no encontrada',
        });
      }

      datosLimpios.categoria = categoria;
      delete datosLimpios.categoriaId;
    }

    em.assign(ejercicio, datosLimpios);
    await em.flush();

    res.status(200).json({
      message: 'Ejercicio actualizado',
      data: ejercicio,
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'Ya existe un ejercicio con ese nombre',
      req,
    });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const ejercicio = await em.findOne(Ejercicio, { id });

    if (!ejercicio) {
      return res.status(404).json({
        message: 'Ejercicio no encontrado',
      });
    }

    await em.remove(ejercicio).flush();

    res.status(200).json({
      message: 'Ejercicio eliminado',
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeForeignKey:
        'No se puede eliminar el ejercicio porque forma parte de alguna rutina',
      req,
    });
  }
}

export { sanitizeEjercicioInput, findAll, findOne, add, update, remove };
