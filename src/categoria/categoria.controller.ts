import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Categoria } from './categoria.entity.js';

const em = orm.em;

function sanitizeCategoriaInput(
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

  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  const datosLimpios: Record<string, unknown> = {};
  if (body.nombre !== undefined) datosLimpios.nombre = body.nombre.trim();

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

async function findAll(_req: Request, res: Response) {
  try {
    const categorias = await em.find(Categoria, {});

    res.status(200).json({
      message: 'Categorías encontradas',
      data: categorias,
    });
  } catch (error) {
    manejarError(res, error);
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const categoria = await em.findOne(Categoria, { id });

    if (!categoria) {
      return res.status(404).json({
        message: 'Categoría no encontrada',
      });
    }

    res.status(200).json({
      message: 'Categoría encontrada',
      data: categoria,
    });
  } catch (error) {
    manejarError(res, error);
  }
}

async function add(req: Request, res: Response) {
  try {
    const categoria = em.create(Categoria, req.body.sanitizedInput);
    await em.flush();

    res.status(201).json({
      message: 'Categoría creada',
      data: categoria,
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'Ya existe una categoría con ese nombre',
      req,
    });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const categoria = await em.findOne(Categoria, { id });

    if (!categoria) {
      return res.status(404).json({
        message: 'Categoría no encontrada',
      });
    }

    em.assign(categoria, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({
      message: 'Categoría actualizada',
      data: categoria,
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'Ya existe una categoría con ese nombre',
      req,
    });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const categoria = await em.findOne(Categoria, { id });

    if (!categoria) {
      return res.status(404).json({
        message: 'Categoría no encontrada',
      });
    }

    await em.remove(categoria).flush();

    res.status(200).json({
      message: 'Categoría eliminada',
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeForeignKey:
        'No se puede eliminar la categoría porque tiene ejercicios asociados',
      req,
    });
  }
}

export { sanitizeCategoriaInput, findAll, findOne, add, update, remove };
