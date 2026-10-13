import type { Request, Response, NextFunction } from 'express';
import { manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Inscripcion, EstadoInscripcion } from './inscripcion.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Clase } from '../clase/clase.entity.js';

const em = orm.em;

// Función auxiliar para leer y validar la clave compuesta cuádruple desde los parámetros de la URL
function leerIdClaveCompuestaTriple(req: Request, res: Response) {
  const { usuarioId, claseId, fechaInscripcion } = req.params;

  if (!/^\d+$/.test(usuarioId) || !/^\d+$/.test(claseId)) {
    res.status(400).json({ message: 'El id de Usuario y el id de Clase deben ser números enteros' });
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInscripcion)) {
    res.status(400).json({ message: 'La fecha de inscripcion debe tener el formato YYYY-MM-DD' });
    return null;
  }

  return {
    usuarioId: Number(usuarioId),
    claseId: Number(claseId),
    fechaInscripcion
  };
}

async function findAll(_req: Request, res: Response) {
  try {
    const inscripciones = await em.find(Inscripcion, {}, { populate: ['usuario', 'clase'] });
    res.status(200).json({ message: 'Inscripciones encontradas', data: inscripciones });
  } catch (error) {
    manejarError(res, error, 'Error al obtener las inscripciones.');
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const claveCompuesta = leerIdClaveCompuestaTriple(req, res);
    if (claveCompuesta === null) return;

    const inscripcion = await em.findOne(Inscripcion, { 
        usuario: claveCompuesta.usuarioId, 
        clase: claveCompuesta.claseId,
        fechaInscripcion: claveCompuesta.fechaInscripcion 
    }, { populate: ['usuario', 'clase'] });

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }
    res.status(200).json({ message: 'Inscripción encontrada', data: inscripcion });
  } catch (error) {
    manejarError(res, error, 'Error al obtener la inscripción.');
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

    // ¡VALIDACIÓN DE ROL! Aseguramos que solo un usuario con rol 'cliente' pueda inscribirse a una clase
    if (usuarioEntity.rol !== 'cliente') {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errores: ['Solo los usuarios con rol de cliente pueden inscribirse a las clases.'] 
      });
    }

    // Verificar que la Clase relacionada exista
    const claseEntity = await em.findOne(Clase, { id: datosLimpios.claseId });
    if (!claseEntity) {
      return res.status(404).json({ message: 'La Clase asociada no existe' });
    }

    datosLimpios.usuario = usuarioEntity;
    datosLimpios.clase = claseEntity;
    delete datosLimpios.usuarioId;
    delete datosLimpios.claseId;

    const inscripcion = em.create(Inscripcion, datosLimpios);
    await em.flush();
    res.status(201).json({ message: 'Inscripción creada', data: inscripcion });
  } catch (error) {
    manejarError(res, error, 'Error al crear nueva inscripción.');
  }
}

async function update(req: Request, res: Response) {
  try {
    const claveCompuesta = leerIdClaveCompuestaTriple(req, res);
    if (claveCompuesta === null) return;

    const inscripcion = await em.findOne(Inscripcion, { 
        usuario: claveCompuesta.usuarioId, 
        clase: claveCompuesta.claseId,
        fechaInscripcion: claveCompuesta.fechaInscripcion 
    });

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada.' });
    }
    
    const datosLimpios = req.body.sanitizedInput;

    // Si cambian de usuario en la actualización
    if (datosLimpios.usuarioId !== undefined) {
      const usuarioEntity = await em.findOne(Usuario, { id: datosLimpios.usuarioId });
      if (!usuarioEntity) return res.status(404).json({ message: 'El Usuario asociado no existe' });
      if (usuarioEntity.rol !== 'cliente') {
        return res.status(400).json({ message: 'Error de validación', errores: ['Solo los usuarios con rol de cliente pueden inscribirse a las clases.'] });
      }
      datosLimpios.usuario = usuarioEntity;
      delete datosLimpios.usuarioId;
    }

    // Si cambian de clase en la actualización
    if (datosLimpios.claseId !== undefined) {
      const claseEntity = await em.findOne(Clase, { id: datosLimpios.claseId });
      if (!claseEntity) return res.status(404).json({ message: 'La Clase asociada no existe' });
      datosLimpios.clase = claseEntity;
      delete datosLimpios.claseId;
    }

    em.assign(inscripcion, datosLimpios);
    await em.flush();
    res.status(200).json({ message: 'Inscripción actualizada', data: inscripcion });
  
  } catch (error) {
    manejarError(res, error, 'Error al actualizar inscripción.');
  }
}

async function remove(req: Request, res: Response) {
  try {
    const claveCompuesta = leerIdClaveCompuestaTriple(req, res);
    if (claveCompuesta === null) return;

    const inscripcion = await em.findOne(Inscripcion, { 
        usuario: claveCompuesta.usuarioId, 
        clase: claveCompuesta.claseId,
        fechaInscripcion: claveCompuesta.fechaInscripcion 
    });

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }

    await em.remove(inscripcion).flush();
    res.status(200).json({ message: 'Inscripción eliminada' });

  } catch (error) {
    manejarError(res, error, 'Error al eliminar inscripciÓn.');
  }
}

function sanitizeInscripcionInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  // Validar 'usuarioId'
  if (body.usuarioId === undefined) {
    if (req.method !== 'PATCH') errores.push('El ID de usuario es obligatorio');
  } else if (typeof body.usuarioId !== 'number' || !Number.isInteger(body.usuarioId) || body.usuarioId <= 0) {
    errores.push('El ID de usuario debe ser un número entero válido');
  }

  // Validar 'claseId'
  if (body.claseId === undefined) {
    if (req.method !== 'PATCH') errores.push('El ID de clase es obligatorio');
  } else if (typeof body.claseId !== 'number' || !Number.isInteger(body.claseId) || body.claseId <= 0) {
    errores.push('El ID de clase debe ser un número entero válido');
  }

  // Validar 'estadoInscripcion'
  if (body.estadoInscripcion === undefined) {
      if (req.method !== 'PATCH') errores.push('El estado para la inscripción es obligatorio');
  } else if (!Object.values(EstadoInscripcion).includes(body.estadoInscripcion)) {
    errores.push(
      `El estado de la inscripción debe ser uno de: ${Object.values(EstadoInscripcion).join(', ')}`,
    );
  }

  // Validar o asignar 'fechaInscripcion' de forma segura (fecha actual)
  let fechaInscripcionFinal: string | undefined = undefined;

  if (req.method === 'POST') {
    fechaInscripcionFinal = new Date().toISOString().slice(0, 10);

  } else if (body.fechaInscripcion !== undefined) {
    if (typeof body.fechaInscripcion !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaInscripcion)) {
      errores.push('La fecha de inscripción debe tener el formato YYYY-MM-DD');
    } else {
      fechaInscripcionFinal = body.fechaInscripcion.trim();
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Construir objeto limpio asegurando incluir fechaInscripcion
  const datosLimpios: Record<string, unknown> = {};

  if (body.usuarioId !== undefined) datosLimpios.usuarioId = body.usuarioId;
  if (body.claseId !== undefined) datosLimpios.claseId = body.claseId;
  if (fechaInscripcionFinal !== undefined) datosLimpios.fechaInscripcion = fechaInscripcionFinal;
  if (body.estadoInscripcion !== undefined) datosLimpios.estadoInscripcion = String(body.estadoInscripcion).trim();

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

export { findAll, findOne, add, update, remove, sanitizeInscripcionInput };