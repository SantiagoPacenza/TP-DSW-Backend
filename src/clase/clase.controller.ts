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

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      datosLimpios.entrenadorId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para crear una clase a nombre de otro entrenador.',
      });
    }

    // Verificar que el Entrenador relacionado exista
    const entrenadorEntity = await em.findOne(Usuario, {
      id: datosLimpios.entrenadorId,
    });
    if (!entrenadorEntity) {
      return res.status(404).json({ message: 'El Entrenador asociado no existe' });
    }

    // ¡VALIDACIÓN DE ROL! Aseguramos que solo un usuario con rol 'entrenador' pueda asociarse con una clase
    if (entrenadorEntity.rol !== RolUsuario.ENTRENADOR) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: [
          'Solo los usuarios con rol de entrenador pueden dictar clases.',
        ],
      });
    }

    // Verificar que la Disciplina relacionada exista
    const disciplinaEntity = await em.findOne(Disciplina, {
      id: datosLimpios.disciplinaId,
    });
    if (!disciplinaEntity) {
      return res
        .status(404)
        .json({ message: 'La Disciplina asociada no existe' });
    }

    // Verificar que el entrenador esté habilitado para dictar esa disciplina
    await entrenadorEntity.disciplinas.init();
    if (!entrenadorEntity.disciplinas.contains(disciplinaEntity)) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: [
          'El entrenador no está habilitado para dictar esa disciplina.',
        ],
      });
    }

    datosLimpios.disciplina = disciplinaEntity;
    datosLimpios.entrenador = entrenadorEntity;
    delete datosLimpios.disciplinaId;
    delete datosLimpios.entrenadorId;

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

    const clase = await em.findOne(
      Clase,
      { id },
      { populate: ['entrenador', 'disciplina'] },
    );
    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    const datosLimpios = req.body.sanitizedInput;

    const usuarioAutenticado = (req as any).usuario;
    if (usuarioAutenticado.rol === RolUsuario.ENTRENADOR) {
      if (clase.entrenador.id !== usuarioAutenticado.id) {
        return res.status(403).json({
          message: 'No tenés permiso para modificar una clase de otro entrenador.',
        });
      }
      if (
        datosLimpios.entrenadorId !== undefined &&
        datosLimpios.entrenadorId !== usuarioAutenticado.id
      ) {
        return res.status(403).json({
          message: 'No tenés permiso para reasignar la clase a otro entrenador.',
        });
      }
    }

    // En PATCH puede cambiar solo uno; tomamos los valores actuales por defecto para validar la combinación final
    let entrenadorFinal = clase.entrenador;
    let disciplinaFinal = clase.disciplina;

    // Si mandan entrenadorId en el update, verificar que exista y tenga rol de entrenador
    if (datosLimpios.entrenadorId !== undefined) {
      const entrenadorEntity = await em.findOne(Usuario, {
        id: datosLimpios.entrenadorId,
      });

      if (!entrenadorEntity) {
        return res
          .status(404)
          .json({ message: 'El Entrenador asociado no existe' });
      }

      if (entrenadorEntity.rol !== RolUsuario.ENTRENADOR) {
        return res.status(400).json({
          message: 'Error de validación',
          errores: [
            'Solo los usuarios con rol de entrenador pueden dictar clases.',
          ],
        });
      }

      // Si vino un entrenador nuevo en el body, lo actualizamos:
      entrenadorFinal = entrenadorEntity;
      datosLimpios.entrenador = entrenadorEntity;

      delete datosLimpios.entrenadorId;
    }

    // Si mandan disciplinaId en el update, verificar que exista
    if (datosLimpios.disciplinaId !== undefined) {
      const disciplinaEntity = await em.findOne(Disciplina, {
        id: datosLimpios.disciplinaId,
      });

      if (!disciplinaEntity) {
        return res
          .status(404)
          .json({ message: 'La Disciplina asociada no existe' });
      }

      // Si vino una disciplina nueva en el body, la actualizamos:
      disciplinaFinal = disciplinaEntity;
      datosLimpios.disciplina = disciplinaEntity;

      delete datosLimpios.disciplinaId;
    }

    // Si cambió el entrenador o la disciplina, verificar que el entrenador esté habilitado
    if (
      datosLimpios.entrenador !== undefined ||
      datosLimpios.disciplina !== undefined
    ) {
      await entrenadorFinal.disciplinas.init();
      if (!entrenadorFinal.disciplinas.contains(disciplinaFinal)) {
        return res.status(400).json({
          message: 'Error de validación',
          errores: [
            'El entrenador no está habilitado para dictar esa disciplina.',
          ],
        });
      }
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

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.ENTRENADOR &&
      clase.entrenador.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para eliminar una clase de otro entrenador.',
      });
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
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  // Validar 'cupos' (entero)
  const cupos = body.cupos;
  if (cupos === undefined) {
    if (req.method !== 'PATCH')
      errores.push('El número de cupos es obligatorio');
  } else if (
    typeof cupos !== 'number' ||
    isNaN(cupos) ||
    !Number.isInteger(cupos) ||
    cupos <= 0
  ) {
    errores.push('El número de cupos debe ser un número entero válido');
  }

  // Validar 'diaSemana' (debe ser un valor del enum DiaSemana)
  if (body.diaSemana === undefined) {
    if (req.method !== 'PATCH')
      errores.push('El dia de la semana para la clase obligatorio');
  } else if (!Object.values(DiaSemana).includes(body.diaSemana)) {
    errores.push(
      `El día de la semana debe ser uno de: ${Object.values(DiaSemana).join(', ')}`,
    );
  }

  // Validar 'horaInicio' (formato HH:mm simple)
  if (body.horaInicio === undefined) {
    if (req.method !== 'PATCH')
      errores.push('La hora de inicio es obligatoria');
  } else if (
    typeof body.horaInicio !== 'string' ||
    !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.horaInicio)
  ) {
    errores.push('La hora de inicio debe tener el formato HH:mm');
  }

  // Validar 'horaFin'
  if (body.horaFin === undefined) {
    if (req.method !== 'PATCH') errores.push('La hora de fin es obligatoria');
  } else if (
    typeof body.horaFin !== 'string' ||
    !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.horaFin)
  ) {
    errores.push('La hora de fin debe tener el formato HH:mm');
  }

  // Validar 'entrenadorId' (debe venir el ID o la referencia)
  if (body.entrenadorId === undefined) {
    if (req.method !== 'PATCH') errores.push('El entrenador es obligatorio');
  } else if (
    typeof body.entrenadorId !== 'number' ||
    !Number.isInteger(body.entrenadorId) ||
    body.entrenadorId <= 0
  ) {
    errores.push('El id del entrenador debe ser un número entero válido');
  }

  // Validar 'disciplinaId' (debe venir el ID o la referencia)
  if (body.disciplinaId === undefined) {
    if (req.method !== 'PATCH') errores.push('La disciplina es obligatoria');
  } else if (
    typeof body.disciplinaId !== 'number' ||
    !Number.isInteger(body.disciplinaId) ||
    body.disciplinaId <= 0
  ) {
    errores.push('El id de la disciplina debe ser un número entero válido');
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Construir objeto limpio convirtiendo tipos si es necesario para la BD
  const datosLimpios: Record<string, unknown> = {
    cupos: body.cupos,
    diaSemana: body.diaSemana,
    horaInicio: body.horaInicio?.trim(),
    horaFin: body.horaFin?.trim(),
    entrenadorId: body.entrenadorId,
    disciplinaId: body.disciplinaId,
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
