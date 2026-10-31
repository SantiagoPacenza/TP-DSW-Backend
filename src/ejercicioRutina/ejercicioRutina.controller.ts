import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { DiaRutina, EjercicioRutina } from './ejercicioRutina.entity.js';
import { Rutina } from '../rutina/rutina.entity.js';
import { Ejercicio } from '../ejercicio/ejercicio.entity.js';
import { RolUsuario } from '../usuario/usuario.entity.js';

const em = orm.em;

const RANGOS: Record<string, { min: number; max: number }> = {
  repeticiones: { min: 1, max: 100 },
  series: { min: 1, max: 10 },
  orden: { min: 1, max: 30 },
};

// Un EjercicioRutina es un renglón de una rutina: "este ejercicio, tantas series
// de tantas repeticiones, en este día, en este orden".
// POST exige todos los campos. PUT exige todos menos rutinaId (que no se puede cambiar).
// PATCH solo valida lo que viene.
function sanitizeEjercicioRutinaInput(
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

  for (const campo of Object.keys(RANGOS)) {
    const valor = body[campo];
    const { min, max } = RANGOS[campo];

    if (valor === undefined) {
      if (req.method !== 'PATCH') {
        errores.push(`El campo ${campo} es obligatorio`);
      }
    } else if (!Number.isInteger(valor) || valor < min || valor > max) {
      errores.push(
        `El campo ${campo} debe ser un número entero entre ${min} y ${max}`,
      );
    }
  }

  // dia: letra del día de entrenamiento (A, B, C...). Se acepta en minúscula y se pasa a mayúscula.
  if (body.dia === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('El campo dia es obligatorio');
    }
  } else if (
    typeof body.dia !== 'string' ||
    !Object.values(DiaRutina).includes(
      body.dia.trim().toUpperCase() as DiaRutina,
    )
  ) {
    errores.push(
      `El campo dia debe ser una de estas letras: ${Object.values(DiaRutina).join(', ')}`,
    );
  }

  // rutinaId: obligatorio solo al crear. Después es inmutable
  if (body.rutinaId === undefined) {
    if (req.method === 'POST') {
      errores.push('El Id de la rutina es obligatorio');
    }
  } else if (
    typeof body.rutinaId !== 'number' ||
    !Number.isSafeInteger(body.rutinaId) ||
    body.rutinaId <= 0
  ) {
    errores.push('El Id de la rutina debe ser un número entero válido');
  }

  if (body.ejercicioId === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('El Id del ejercicio es obligatorio');
    }
  } else if (
    typeof body.ejercicioId !== 'number' ||
    !Number.isSafeInteger(body.ejercicioId) ||
    body.ejercicioId <= 0
  ) {
    errores.push('El Id del ejercicio debe ser un número entero válido');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  const datosLimpios: Record<string, unknown> = {};

  for (const campo of Object.keys(RANGOS)) {
    if (body[campo] !== undefined) datosLimpios[campo] = body[campo];
  }
  if (body.dia !== undefined) datosLimpios.dia = body.dia.trim().toUpperCase();
  if (body.rutinaId !== undefined) datosLimpios.rutinaId = body.rutinaId;
  if (body.ejercicioId !== undefined)
    datosLimpios.ejercicioId = body.ejercicioId;

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({
      message: 'No hay datos para modificar',
    });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

// Obtener los renglones, ordenados por día y orden de ejecución.
// Filtro opcional por rutina: GET /api/ejercicios-rutina?rutinaId=3
async function findAll(req: Request, res: Response) {
  try {
    const rutinaIdQuery = req.query.rutinaId;
    let filtro = {};

    if (rutinaIdQuery !== undefined) {
      const rutinaId = Number(rutinaIdQuery);
      if (
        typeof rutinaIdQuery !== 'string' ||
        !/^\d+$/.test(rutinaIdQuery) ||
        !Number.isSafeInteger(rutinaId) ||
        rutinaId <= 0
      ) {
        return res.status(400).json({
          message: 'El rutinaId debe ser un número entero válido',
        });
      }

      const rutina = await em.findOne(Rutina, { id: rutinaId });
      if (!rutina) {
        return res.status(404).json({
          message: 'Rutina no encontrada',
        });
      }

      filtro = { rutina };
    }

    const renglones = await em.find(EjercicioRutina, filtro, {
      populate: ['ejercicio'],
      orderBy: { dia: 'asc', orden: 'asc' },
    });

    res.status(200).json({
      message: 'Ejercicios de rutina encontrados',
      data: renglones,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const renglon = await em.findOne(
      EjercicioRutina,
      { id },
      { populate: ['ejercicio'] },
    );

    if (!renglon) {
      return res.status(404).json({
        message: 'Ejercicio de rutina no encontrado',
      });
    }

    res.status(200).json({
      message: 'Ejercicio de rutina encontrado',
      data: renglon,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const { rutinaId, ejercicioId, ...datosRenglon } = req.body.sanitizedInput;

    const rutina = await em.findOne(Rutina, { id: rutinaId });
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
        message: 'No tenés permiso para agregar ejercicios a una rutina de otro entrenador.',
      });
    }

    const ejercicio = await em.findOne(Ejercicio, { id: ejercicioId });
    if (!ejercicio) {
      return res.status(404).json({
        message: 'Ejercicio no encontrado',
      });
    }

    const renglon = em.create(EjercicioRutina, {
      ...datosRenglon,
      rutina,
      ejercicio,
    });
    await em.flush();

    res.status(201).json({
      message: 'Ejercicio agregado a la rutina',
      data: renglon,
    });
  } catch (error) {
    // UNIQUE (rutina, dia, orden): esa posición ya está ocupada.
    manejarError(res, error, {
      mensajeDuplicado:
        'Ya existe un ejercicio en ese día y orden de la rutina',
      req,
    });
  }
}

// Actualizar un renglón (sirve para PUT y PATCH).
async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const renglon = await em.findOne(
      EjercicioRutina,
      { id },
      { populate: ['rutina'] },
    );
    if (!renglon) {
      return res.status(404).json({
        message: 'Ejercicio de rutina no encontrado',
      });
    }

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      renglon.rutina.entrenador.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para modificar ejercicios de una rutina de otro entrenador.',
      });
    }

    const datosLimpios = req.body.sanitizedInput;

    // La rutina de un renglón no se puede cambiar. Si viene la misma que ya
    // tiene, se ignora (así un PUT con el objeto completo no falla).
    if (datosLimpios.rutinaId !== undefined) {
      if (datosLimpios.rutinaId !== renglon.rutina.id) {
        return res.status(409).json({
          message: 'La rutina de un ejercicio de rutina no se puede modificar',
        });
      }
      delete datosLimpios.rutinaId;
    }

    // Si cambia el ejercicio, verificamos que exista.
    if (datosLimpios.ejercicioId !== undefined) {
      const ejercicio = await em.findOne(Ejercicio, {
        id: datosLimpios.ejercicioId,
      });
      if (!ejercicio) {
        return res.status(404).json({
          message: 'Ejercicio no encontrado',
        });
      }
      datosLimpios.ejercicio = ejercicio;
      delete datosLimpios.ejercicioId;
    }

    // Si solo venía rutinaId (igual al actual), no hay nada que modificar.
    if (Object.keys(datosLimpios).length > 0) {
      em.assign(renglon, datosLimpios);
      await em.flush();
    }

    res.status(200).json({
      message: 'Ejercicio de rutina actualizado',
      data: renglon,
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado:
        'Ya existe un ejercicio en ese día y orden de la rutina',
      req,
    });
  }
}

// Quitar un ejercicio de una rutina.
async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const renglon = await em.findOne(
      EjercicioRutina,
      { id },
      { populate: ['rutina'] },
    );
    if (!renglon) {
      return res.status(404).json({
        message: 'Ejercicio de rutina no encontrado',
      });
    }

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      renglon.rutina.entrenador.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para quitar ejercicios de una rutina de otro entrenador.',
      });
    }

    await em.remove(renglon).flush();

    res.status(200).json({
      message: 'Ejercicio quitado de la rutina',
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

export { sanitizeEjercicioRutinaInput, findAll, findOne, add, update, remove };
