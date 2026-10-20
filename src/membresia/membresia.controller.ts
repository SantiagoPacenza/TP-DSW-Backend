import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError, sumarMeses, esFechaValida, hoyISO } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Membresia, EstadoMembresia } from './membresia.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Plan } from '../plan/plan.entity.js';

// UNA MEMBRESIA SE GENERA AUTOMÁTICAMENTE CUANDO EL CLIENTE CONTRATA UN PLAN.
// LO QUE EL CLIENTE VE EN LA INTERFAZ DE USUARIO ES LA SELECCIÓN DE UN PLAN.
// AL SELECCIONAR EL PLAN SE CREA LA MEMBRESIA INTERNAMENTE Y SE LE INFORMA fechaInicio Y fechaFin DE SU MEMBRESÍA.

const em = orm.em;

async function findAll(_req: Request, res: Response) {
  try {
    const membresias = await em.find(Membresia, {});
    res.status(200).json({ message: 'Membresias encontradas', data: membresias });
  } catch (error) {
    manejarError(res, error, 'Error al obtener las membresias.');
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const membresia = await em.findOne(Membresia, { id });
    if (!membresia) {
      return res.status(404).json({ message: 'Membresia no encontrada' });
    }
    res.status(200).json({ message: 'Membresia encontrada', data: membresia });
  } catch (error) {
    manejarError(res, error, 'Error al obtener la membresia.');
  }
}

async function add(req: Request, res: Response) {
  try {
    const datosLimpios = req.body.sanitizedInput;

    // 1. Verificar que el Usuario relacionado exista
    const usuarioEntity = await em.findOne(Usuario, { id: datosLimpios.usuarioId });
    if (!usuarioEntity) {
      return res.status(404).json({ message: 'El Usuario asociado no existe' });
    }

    // 2. ¡VALIDACIÓN DE ROL! Asegurar que solo un cliente pueda tener membresías
    if (usuarioEntity.rol !== 'cliente') {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errores: ['Solo los usuarios con rol de cliente pueden contratar membresías.'] 
      });
    }

    // 3. Verificar que el Plan relacionado exista
    const planEntity = await em.findOne(Plan, { id: datosLimpios.planId });
    if (!planEntity) {
      return res.status(404).json({ message: 'El Plan asociado no existe' });
    }

    // 4. Asignar las entidades y limpiar los IDs planos
    datosLimpios.usuario = usuarioEntity;
    datosLimpios.plan = planEntity;
    delete datosLimpios.usuarioId;
    delete datosLimpios.planId;

    const membresia = em.create(Membresia, datosLimpios);
    await em.flush();
    res.status(201).json({ message: 'Membresia creada', data: membresia });
  } catch (error) {
    manejarError(res, error, 'Error al crear nueva membresia.');
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const membresia = await em.findOne(Membresia, { id });
    if (!membresia) {
      return res.status(404).json({ message: 'Membresia no encontrada.' });
    }
    
    const datosLimpios = req.body.sanitizedInput;

    // Si mandan usuarioId en el update, validar rol y existencia
    if (datosLimpios.usuarioId !== undefined) {
      const usuarioEntity = await em.findOne(Usuario, { id: datosLimpios.usuarioId });
      if (!usuarioEntity) {
        return res.status(404).json({ message: 'El Usuario asociado no existe' });
      }
      if (usuarioEntity.rol !== 'cliente') {
        return res.status(400).json({ 
          message: 'Error de validación', 
          errores: ['Solo los usuarios con rol de cliente pueden contratar membresías.'] 
        });
      }
      datosLimpios.usuario = usuarioEntity;
      delete datosLimpios.usuarioId;
    }

    // Si mandan planId en el update, verificar existencia
    if (datosLimpios.planId !== undefined) {
      const planEntity = await em.findOne(Plan, { id: datosLimpios.planId });
      if (!planEntity) {
        return res.status(404).json({ message: 'El Plan asociado no existe' });
      }
      datosLimpios.plan = planEntity;
      delete datosLimpios.planId;
    }

    em.assign(membresia, datosLimpios);
    await em.flush();
    res.status(200).json({ message: 'Membresia actualizada', data: membresia });
  
  } catch (error) {
    manejarError(res, error, 'Error al actualizar membresia.');
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const membresia = await em.findOne(Membresia, { id });
    if (!membresia) {
      return res.status(404).json({ message: 'Membresia no encontrada' });
    }

    await em.remove(membresia).flush();
    res.status(200).json({ message: 'Membresia eliminada' });

  } catch (error) {
    manejarError(res, error, 'Error al eliminar membresia.');
  }
}

function sanitizeMembresiaInput(req: Request, res: Response, next: NextFunction) {
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

  // 1. Validar 'usuarioId'
  if (body.usuarioId === undefined) {
    if (req.method !== 'PATCH') errores.push('El ID de usuario es obligatorio');

  } else if (typeof body.usuarioId !== 'number' || !Number.isInteger(body.usuarioId) || body.usuarioId <= 0) {
    errores.push('El ID de usuario debe ser un número entero válido');
  }

  // 2. Validar 'planId'
  if (body.planId === undefined) {
    if (req.method !== 'PATCH') errores.push('El ID de plan es obligatorio');

  } else if (typeof body.planId !== 'number' || !Number.isInteger(body.planId) || body.planId <= 0) {
    errores.push('El ID de plan debe ser un número entero válido');
  }

  // 3. Validar 'fechaInicio'
  
  // 3. Validar 'fechaInicio'
  if (body.fechaInicio === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La fecha de inicio es obligatoria');
    }
  } else if (
    typeof body.fechaInicio !== 'string' ||
    !esFechaValida(body.fechaInicio.trim())
  ) {
    errores.push(
      'La fecha de inicio debe ser una fecha válida con formato YYYY-MM-DD'
    );
  } else if (body.fechaInicio.trim() < hoyISO()) {
    errores.push(
      'La fecha de inicio de una membresía no puede ser en el pasado'
    );
  }


  // 4. Validar 'fechaFin'
  
  // 4. Validar 'fechaFin'
  if (body.fechaFin === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La fecha de fin es obligatoria');
    }
  } else if (
    typeof body.fechaFin !== 'string' ||
    !esFechaValida(body.fechaFin.trim())
  ) {
    errores.push(
      'La fecha de fin debe ser una fecha válida con formato YYYY-MM-DD'
    );
  } else if (body.fechaFin.trim() < hoyISO()) {
    errores.push(
      'La fecha de fin de una membresía no puede ser en el pasado'
    );
  }


  // 5. Validar 'estadoMembresia'
  if (body.estadoMembresia === undefined) {
    if (req.method !== 'PATCH') errores.push('El estado para la membresía es obligatorio');
  } else if (!Object.values(EstadoMembresia).includes(body.estadoMembresia)) {
    errores.push(
      `El estado de la membresía debe ser uno de: ${Object.values(EstadoMembresia).join(', ')}`,
    );
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Construir objeto limpio asegurando que solo se incluyan los campos provistos
  const datosLimpios: Record<string, unknown> = {};

  if (body.usuarioId !== undefined) datosLimpios.usuarioId = body.usuarioId;
  if (body.planId !== undefined) datosLimpios.planId = body.planId;
  if (body.fechaInicio !== undefined) datosLimpios.fechaInicio = body.fechaInicio.trim();
  if (body.fechaFin !== undefined) datosLimpios.fechaFin = body.fechaFin.trim();
  if (body.estadoMembresia !== undefined) datosLimpios.estadoMembresia = String(body.estadoMembresia).trim();

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

export { findAll, findOne, add, update, remove, sanitizeMembresiaInput };