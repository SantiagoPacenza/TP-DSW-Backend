import type { Request, Response, NextFunction } from 'express';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Plan } from './plan.entity.js';

const em = orm.em;

async function findAll(_req: Request, res: Response) {
  try {
    const planes = await em.find(Plan, {});
    res.status(200).json({ message: 'Planes encontrados', data: planes });
  } catch (error) {
    manejarError(res, error, 'Error al obtener los planes.');
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const plan = await em.findOne(Plan, { id });
    if (!plan) {
      return res.status(404).json({ message: 'Plan no encontrado' });
    }
    res.status(200).json({ message: 'Plan encontrado', data: plan });
  } catch (error) {
    manejarError(res, error, 'Error al obtener el plan.');
  }
}

async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;

    const plan = em.create(Plan, datos);
    await em.flush();
    res.status(201).json({ message: 'Plan creado', data: plan });
  } catch (error) {
    manejarError(res, error, 'Error al crear nuevo plan.');
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const plan = await em.findOne(Plan, { id });
    if (!plan) {
      return res.status(404).json({ message: 'Plan no encontrado.' });
    }
    
    const datos = req.body.sanitizedInput;
    em.assign(plan, datos);
    await em.flush();
    res.status(200).json({ message: 'Plan actualizado', data: plan });
  
  } catch (error) {
    manejarError(res, error, 'Error al actualizar plan.');
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const plan = await em.findOne(Plan, { id });
    if (!plan) {
      return res.status(404).json({ message: 'Plan no encontrado' });
    }

    await em.remove(plan).flush();
    res.status(200).json({ message: 'Plan eliminado' });

  } catch (error) {
    manejarError(res, error, 'Error al eliminar plan.');
  }
}

function sanitizePlanInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = [];
  const maxCaracteres: Record<string, number> = {
    nombre: 80,
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

  // 1. Validar 'nombre' y 'descripción' (campos de texto)
  for (const campo of Object.keys(maxCaracteres)) {
    const valor = body[campo];
    if (valor === undefined) {
      if (req.method !== 'PATCH') errores.push(`El campo ${campo} es obligatorio`);

    } else if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El campo ${campo} debe ser un texto que no esté vacío`);
      
    } else if (valor.trim().length > maxCaracteres[campo]) {
      errores.push(
        `El campo ${campo} no puede tener más de ${maxCaracteres[campo]} caracteres`,
      );
    }
  }

  // 2. Validar 'precio' (decimal)
  const precio = body.precio;
  if (precio === undefined) {
    if (req.method !== 'PATCH') errores.push('El precio es obligatorio');

  } else if (typeof precio !== 'number' || isNaN(precio) || precio < 0) {
    errores.push('El precio debe ser un número válido');
  }

  // 3. Validar 'duracionEnMeses' (entero)
  const duracion = body.duracionEnMeses;
  if (duracion === undefined) {
    if (req.method !== 'PATCH') errores.push('La duración en meses es obligatoria');

  } else if (typeof duracion !== 'number' || isNaN(duracion) || !Number.isInteger(duracion) || duracion <= 0) {
    errores.push('La duración en meses debe ser un número entero válido');
  }

  // 4. Validar 'incluyeClasesGrupales' (booleano)
  const incluyeClases = body.incluyeClasesGrupales;
  if (incluyeClases === undefined) {
    if (req.method !== 'PATCH') errores.push('El campo "Incluye clases grupales" es obligatorio');

  } else if (typeof incluyeClases !== 'boolean') {
    errores.push('El campo Incluye Clases Grupales debe ser un booleano (true o false)');
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Construir objeto limpio convirtiendo tipos si es necesario para la BD
  const datosLimpios: Record<string, unknown> = {
    nombre: body.nombre?.trim(),
    precio: body.precio !== undefined ? body.precio.toString() : undefined,
    incluyeClasesGrupales: body.incluyeClasesGrupales,
    duracionEnMeses: body.duracionEnMeses !== undefined ? body.duracionEnMeses.toString() : undefined,
    descripcion: body.descripcion?.trim(),
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

export { findAll, findOne, add, update, remove, sanitizePlanInput };