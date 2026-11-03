import type { Request, Response, NextFunction } from 'express';
import type { FilterQuery } from '@mikro-orm/core';
import { leerId, manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Plan } from './plan.entity.js';
import { RolUsuario } from '../usuario/usuario.entity.js';

const em = orm.em;

async function findAll(req: Request, res: Response) {
  try {
    const rol = (req as any).usuario?.rol;

    const filtro: FilterQuery<Plan> =
      rol === RolUsuario.CLIENTE
        ? { activo: true }
        : {};

    const planes = await em.find(Plan, filtro);

    res.status(200).json({
      message: 'Planes encontrados',
      data: planes,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const rol = (req as any).usuario?.rol;

    const filtro =
      rol === RolUsuario.CLIENTE
        ? { id, activo: true }
        : { id };

    const plan = await em.findOne(Plan, filtro);

    if (!plan) {
      return res.status(404).json({
        message: 'Plan no encontrado',
      });
    }

    res.status(200).json({
      message: 'Plan encontrado',
      data: plan,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;

    const plan = em.create(Plan, datos);
    await em.flush();
    res.status(201).json({ message: 'Plan creado', data: plan });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'Ya existe un plan con ese nombre',
      req,
    });
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
    manejarError(res, error, {
      mensajeDuplicado: 'Ya existe un plan con ese nombre',
      req,
    });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const plan = await em.findOne(
      Plan,
      { id },
      { populate: ['membresias'] },
    );

    if (!plan) {
      return res.status(404).json({
        message: 'Plan no encontrado',
      });
    }

    if (plan.membresias.length > 0) {
      return res.status(409).json({
        message:
          'No se puede eliminar el plan porque tiene membresías asociadas. Desactívelo en su lugar.',
      });
    }

    await em.remove(plan).flush();

    return res.status(200).json({
      message: 'Plan eliminado',
    });
  } catch (error) {
    manejarError(res, error, { req });
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
  if (precio !== undefined) {
    if (
      typeof precio !== 'number' || //rechaza textos, etc
      !Number.isFinite(precio) || //que no sea infinito (1e999 puede convertirse en Infinity)
      precio < 0 || //no negativos
      precio > 99999999.99  //Evita superar la col de MySQL
    ) {
      errores.push(
        'El precio debe ser un número entre 0 y 99999999.99'
      );
    } else if (
      Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-6  //Detecta más de 2 decimales
    ) {
      errores.push('El precio no puede tener más de 2 decimales');
    }
  }

  // 3. Validar 'duracionEnMeses' (entero)
  const duracion = body.duracionEnMeses;

  if (duracion === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La duración en meses es obligatoria');
    }
  } else if (
    typeof duracion !== 'number' ||
    !Number.isInteger(duracion) ||
    duracion < 1 ||
    duracion > 120
  ) {
    errores.push(
    'La duración en meses debe ser un número entero entre 1 y 120',
    );
  }

  // 4. Validar 'incluyeClasesGrupales' (booleano)
  const incluyeClases = body.incluyeClasesGrupales;
  if (incluyeClases === undefined) {
    if (req.method !== 'PATCH') errores.push('El campo "Incluye clases grupales" es obligatorio');

  } else if (typeof incluyeClases !== 'boolean') {
    errores.push('El campo Incluye Clases Grupales debe ser un booleano (true o false)');
  }

  const activo = body.activo;
  if (activo !== undefined && typeof activo !== 'boolean') {
    errores.push('El campo activo debe ser verdadero o falso');
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }



  // Construir objeto limpio convirtiendo tipos si es necesario para la BD
  const datosLimpios: Record<string, unknown> = {
    nombre: body.nombre?.trim(),
    precio: body.precio !== undefined ? body.precio.toFixed(2) : undefined,  //toFixed convierte a texto con 2 decimales (toString no agrega decimales)
    incluyeClasesGrupales: body.incluyeClasesGrupales,
    duracionEnMeses: body.duracionEnMeses,
    descripcion: body.descripcion?.trim(),
    activo: body.activo,
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
