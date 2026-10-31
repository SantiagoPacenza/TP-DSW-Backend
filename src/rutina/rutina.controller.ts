import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Rutina, EstadoRutina } from './rutina.entity.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';

const em = orm.em;

function sanitizeRutinaInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  const maxCaracteres: Record<string, number> = {
    nombre: 80,
    descripcion: 2000,
  };

  for (const campo of Object.keys(maxCaracteres)) {
    const valor = body[campo];

    if (valor === undefined) {
      if (req.method !== 'PATCH') {
        errores.push(`El campo ${campo} es obligatorio`);
      }
    } else if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El campo ${campo} debe ser un texto que no esté vacío`);
    } else if (valor.trim().length > maxCaracteres[campo]) {
      errores.push(
        `El campo ${campo} no puede tener más de ${maxCaracteres[campo]} caracteres`,
      );
    }
  }

  // Validar estado (opcional al crear; la entidad usa ACTIVA por defecto)
  const estado = body.estado;
  if (
    estado !== undefined &&
    !Object.values(EstadoRutina).includes(estado as EstadoRutina)
  ) {
    errores.push(
      `El estado debe ser uno de: ${Object.values(EstadoRutina).join(', ')}`,
    );
  }

  const entrenadorId = body.entrenadorId;

  if (entrenadorId === undefined) {
    // Una rutina no puede cambiar de entrenador, por eso solo obligatorio al crear la rutina.
    if (req.method === 'POST') {
      errores.push('El Id del entrenador es obligatorio');
    }
  } else if (
    typeof entrenadorId !== 'number' ||
    !Number.isSafeInteger(entrenadorId) ||
    entrenadorId <= 0
  ) {
    errores.push('El Id del entrenador debe ser un número entero válido');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  const datosLimpios: Record<string, unknown> = {};

  if (body.nombre !== undefined) datosLimpios.nombre = body.nombre.trim();
  if (body.descripcion !== undefined)
    datosLimpios.descripcion = body.descripcion.trim();
  if (body.estado !== undefined) datosLimpios.estado = body.estado;
  if (body.entrenadorId !== undefined)
    datosLimpios.entrenadorId = body.entrenadorId;

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({
      message: 'No hay datos para modificar',
    });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

// Obtener todas las rutinas
async function findAll(req: Request, res: Response) {
  try {
    const rutinas = await em.find(Rutina, {}, { populate: ['entrenador'] });

    res.status(200).json({
      message: 'Rutinas encontradas',
      data: rutinas,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Obtener una rutina por ID
async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const rutina = await em.findOne(
      Rutina,
      { id },
      { populate: ['entrenador'] },
    );

    if (!rutina) {
      return res.status(404).json({
        message: 'Rutina no encontrada',
      });
    }

    res.status(200).json({
      message: 'Rutina encontrada',
      data: rutina,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Crear una rutina
async function add(req: Request, res: Response) {
  try {
    const datosLimpios = req.body.sanitizedInput;

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      datosLimpios.entrenadorId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para crear una rutina a nombre de otro entrenador.',
      });
    }

    // Verificamos que el entrenador exista
    const entrenador = await em.findOne(Usuario, {
      id: datosLimpios.entrenadorId,
    });

    if (!entrenador) {
      return res.status(404).json({
        message: 'Entrenador no encontrado',
      });
    }

    // Validamos que el usuario tenga el rol de entrenador
    if (entrenador.rol !== RolUsuario.ENTRENADOR) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: [
          'Solo los usuarios con rol de entrenador pueden crear rutinas.',
        ],
      });
    }

    datosLimpios.entrenador = entrenador;
    delete datosLimpios.entrenadorId; // Eliminamos entrenadorId ya que no es un campo de la entidad Rutina

    const rutina = em.create(Rutina, datosLimpios);
    await em.flush();
    res.status(201).json({
      message: 'Rutina creada',
      data: rutina,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Actualizar una rutina
async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const rutina = await em.findOne(Rutina, { id });

    if (!rutina) {
      return res.status(404).json({
        message: 'Rutina no encontrada',
      });
    }

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      rutina.entrenador.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para modificar una rutina de otro entrenador.',
      });
    }

    const datosLimpios = req.body.sanitizedInput;

    // El entrenador que creó la rutina no se puede cambiar.
    // Si viene el mismo que ya tiene, se ignora (así un PUT con el objeto completo no falla).
    if (datosLimpios.entrenadorId !== undefined) {
      if (datosLimpios.entrenadorId !== rutina.entrenador.id) {
        return res.status(409).json({
          message: 'El entrenador de una rutina no se puede modificar',
        });
      }
      delete datosLimpios.entrenadorId;
    }

    em.assign(rutina, datosLimpios);
    await em.flush();
    res.status(200).json({
      message: 'Rutina actualizada',
      data: rutina,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Eliminar una rutina
async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const rutina = await em.findOne(Rutina, { id });

    if (!rutina) {
      return res.status(404).json({
        message: 'Rutina no encontrada',
      });
    }

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      rutina.entrenador.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para eliminar una rutina de otro entrenador.',
      });
    }

    await em.remove(rutina).flush();

    res.status(200).json({
      message: 'Rutina eliminada',
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

export { findAll, findOne, add, update, remove, sanitizeRutinaInput };
