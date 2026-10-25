import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import { Clase, DiaSemana } from './clase.entity.js';
import { Disciplina } from '../disciplina/disciplina.entity.js';

const em = orm.em;

async function findAll(req: Request, res: Response) {
  try {
    const clases = await em.find(Clase, {});
    res.status(200).json({ message: 'Clases encontradas', data: clases });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const clase = await em.findOne(Clase, { id });
    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }
    res.status(200).json({ message: 'Clase encontrada', data: clase });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const datosLimpios = req.body.sanitizedInput;

    // Verificar que el Usuario relacionado exista
    const usuarioEntity = await em.findOne(Usuario, { id: datosLimpios.usuarioId });
    if (!usuarioEntity) {
      return res.status(404).json({ message: 'El Usuario asociado no existe' });
    }

    // ¡VALIDACIÓN DE ROL! Aseguramos que solo un usuario con rol 'entrenador' pueda asociarse con una clase
    if (usuarioEntity.rol !== RolUsuario.ENTRENADOR) {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errores: ['Solo los usuarios con rol de entrenador pueden inscribirse a las clases.'] 
      });
    }

    // Verificar que la Disciplina relacionada exista
    const disciplinaEntity = await em.findOne(Disciplina, { id: datosLimpios.disciplinaId });
    if (!disciplinaEntity) {
      return res.status(404).json({ message: 'La Disciplina asociada no existe' });
    }

    datosLimpios.disciplina = disciplinaEntity;
    datosLimpios.usuario = usuarioEntity;
    delete datosLimpios.disciplinaId;
    delete datosLimpios.usuarioId;

    const clase = em.create(Clase, datosLimpios);
    await em.flush();
    res.status(201).json({ message: 'Clase creada', data: clase });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const clase = await em.findOne(Clase, { id });
    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada.' });
    }
    
    const datosLimpios = req.body.sanitizedInput;

    // Si mandan usuarioId en el update, verificar que exista
    if (datosLimpios.usuarioId !== undefined) {
      const usuarioEntity = await em.findOne(Usuario, { id: datosLimpios.usuarioId });

      if (!usuarioEntity) {
        return res.status(404).json({ message: 'El Usuario asociado no existe' });
      }

      datosLimpios.usuario = usuarioEntity;
      delete datosLimpios.usuarioId;
    }

    // Si mandan disciplinaId en el update, verificar que exista
    if (datosLimpios.disciplinaId !== undefined) {
      const disciplinaEntity = await em.findOne(Disciplina, { id: datosLimpios.disciplinaId });

      if (!disciplinaEntity) {
        return res.status(404).json({ message: 'La Disciplina asociada no existe' });
      }
      datosLimpios.disciplina = disciplinaEntity;
      delete datosLimpios.disciplinaId;
    }

    em.assign(clase, datosLimpios);
    await em.flush();
    res.status(200).json({ message: 'Clase actualizada', data: clase });
  
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const clase = await em.findOne(Clase, { id });
    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    await em.remove(clase).flush();
    res.status(200).json({ message: 'Clase eliminada' });

  } catch (error) {
    manejarError(res, error, { req });
  }
}

function sanitizeClaseInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
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

  // Validar 'cupos' (entero)
  const cupos = body.cupos;
  if (cupos === undefined) {
    if (req.method !== 'PATCH') errores.push('El número de cupos es obligatorio');

  } else if (typeof cupos !== 'number' || isNaN(cupos) || !Number.isInteger(cupos) || cupos <= 0) {
    errores.push('El número de cupos debe ser un número entero válido');
  }

  // Validar 'diaSemana' (debe ser un valor del enum DiaSemana)
  if (body.diaSemana === undefined) {
      if (req.method !== 'PATCH') errores.push('El dia de la semana para la clase obligatorio');

    } else if (!Object.values(DiaSemana).includes(body.diaSemana)) {
      errores.push(
        `El día de la semana debe ser uno de: ${Object.values(DiaSemana).join(', ')}`,
      );
  }

  // Validar 'horaInicio' (formato HH:mm simple)
  if (body.horaInicio === undefined) {
    if (req.method !== 'PATCH') errores.push('La hora de inicio es obligatoria');

  } else if (typeof body.horaInicio !== 'string' || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.horaInicio)) {
    errores.push('La hora de inicio debe tener el formato HH:mm');
  }

  // Validar 'horaFin'
  if (body.horaFin === undefined) {
    if (req.method !== 'PATCH') errores.push('La hora de fin es obligatoria');

  } else if (typeof body.horaFin !== 'string' || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.horaFin)) {
    errores.push('La hora de fin debe tener el formato HH:mm');
  }

  // Validar 'usuarioId' (debe venir el ID o la referencia)
  if (body.usuarioId === undefined) {
    if (req.method !== 'PATCH') errores.push('El entrenador es obligatorio');

  } else if (typeof body.usuarioId !== 'number') {
    errores.push('El id del entrenador debe ser un número');
  }

  // Validar 'disciplinaId' (debe venir el ID o la referencia)
  if (body.disciplinaId === undefined) {
    if (req.method !== 'PATCH') errores.push('La disciplina es obligatoria');

  } else if (typeof body.disciplinaId !== 'number') {
    errores.push('El id de la disciplina debe ser un número');
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Construir objeto limpio convirtiendo tipos si es necesario para la BD
  const datosLimpios: Record<string, unknown> = {
    cupos: body.cupos,
    diaSemana: body.diaSemana,
    horaInicio: body.horaInicio.trim(),
    horaFin: body.horaFin.trim(),
    disciplinaId: body.disciplinaId
  };
  
  Object.keys(datosLimpios).forEach((campo) => {
    if (datosLimpios[campo] === undefined) delete datosLimpios[campo];
  });

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

export { findAll, findOne, add, update, remove, sanitizeClaseInput };
