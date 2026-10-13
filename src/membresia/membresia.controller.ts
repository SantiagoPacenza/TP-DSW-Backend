import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Membresia, EstadoMembresia } from './membresia.entity.js';

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
    const datos = req.body.sanitizedInput;

    const membresia = em.create(Membresia, datos);
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
    
    const datos = req.body.sanitizedInput;
    em.assign(membresia, datos);
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
  const maxCaracteres: Record<string, number> = {
    estado: 20,
    descripcion: 255
  };

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

  // Validar 'fechaInicio'
  if (body.fechaInicio === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La fecha de inicio es obligatoria');
    }
  } else if (
    typeof body.fechaInicio !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaInicio)
  ) {
    errores.push('La fecha de inicio debe tener el formato YYYY-MM-DD');
  } else {

    // Forzamos hora local a las 00:00
    const fecha = new Date(body.fechaInicio + 'T00:00:00');

    // Creamos la fecha de hoy pero con las horas en cero para comparar solo días
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Limpia las horas del día actual del servidor

    if (
        // comprueba si TypeScript pudo entender la fecha
        isNaN(fecha.getTime()) ||
        // compara la fecha corregida por JavaScript con lo que escribió el usuario. y atrapa fechas truchas      
        fecha.toISOString().slice(0, 10) !== body.fechaInicio
    ) {
      errores.push('La fecha de inicio no es una fecha válida');

    } else if (fecha < hoy) {
      errores.push('La fecha de inicio de una membresia no puede ser en el pasado');
    }

    // Con estas validaciones, si alguien pone la fecha de hoy, fecha < hoy dará false (es decir, la dejará pasar 
    // porque hoy no es el pasado), que es el comportamiento lógico que uno espera para una membresía.
  }

  // Validar 'fechaFin'
  if (body.fechaFin === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La fecha de fin es obligatoria');
    }
  } else if (
    typeof body.fechaFin !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaFin)
  ) {
    errores.push('La fecha de fin debe tener el formato YYYY-MM-DD');
  } else {

    // Forzamos hora local a las 00:00
    const fecha = new Date(body.fechaFin + 'T00:00:00');

    // Creamos la fecha de hoy pero con las horas en cero para comparar solo días
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Limpia las horas del día actual del servidor

    if (
        // comprueba si TypeScript pudo entender la fecha
        isNaN(fecha.getTime()) ||
        // compara la fecha corregida por JavaScript con lo que escribió el usuario. atrapa fechas truchas      
        fecha.toISOString().slice(0, 10) !== body.fechaFin
    ) {
      errores.push('La fecha de fin no es una fecha válida');

    } else if (fecha < hoy) {
      errores.push('La fecha de fin de una membresia no puede ser en el pasado');
    }

    // Con estas validaciones, si alguien pone la fecha de hoy, fecha < hoy dará false (es decir, la dejará pasar 
    // porque hoy no es el pasado), que es el comportamiento lógico que uno espera para una membresía.
  }

  // Validar 'estadoMembresia' (debe ser un valor del enum EstadoMembresia)
  if (body.estadoMembresia === undefined) {
      if (req.method !== 'PATCH') errores.push('El estado para la membresía es obligatorio');

    } else if (!Object.values(EstadoMembresia).includes(body.estadoMembresia)) {
      errores.push(
        `El estado de la membresía debe ser uno de: ${Object.values(EstadoMembresia).join(', ')}`,
      );
    }

  // Construir objeto limpio convirtiendo tipos si es necesario para la BD
  const datosLimpios: Record<string, unknown> = {
    fechaInicio: body.fechaInicio.trim(),
    fechaFin: body.fechaFin.trim(),
    estadoMembresia: body.estadoMembresia.trim()
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

export { findAll, findOne, add, update, remove, sanitizeMembresiaInput };