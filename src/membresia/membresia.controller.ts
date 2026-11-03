import type { Request, Response, NextFunction } from 'express';
import {
  leerId,
  manejarError,
  sumarMeses,
  esFechaValida,
  hoyISO,
} from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Membresia, EstadoMembresia } from './membresia.entity.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import { Plan } from '../plan/plan.entity.js';

const em = orm.em;

async function findAll(req: Request, res: Response) {
  try {
    const usuarioAutenticado = (req as any).usuario;
    const filtro =
      usuarioAutenticado.rol === RolUsuario.CLIENTE
        ? { cliente: usuarioAutenticado.id }
        : {};
    const membresias = await em.find(Membresia, filtro);

    res.status(200).json({
      message: 'Membresias encontradas',
      data: membresias,
    });
  } catch (error) {
    manejarError(res, error, { req });
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
    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      membresia.cliente.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para consultar una membresía de otro cliente.',
      });
    }

    res.status(200).json({
      message: 'Membresia encontrada',
      data: membresia,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;
    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      datos.clienteId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para crear una membresía a nombre de otro cliente.',
      });
    }

    // 1. Verificar que el Cliente relacionado exista
    const cliente = await em.findOne(Usuario, { id: datos.clienteId });
    if (!cliente) {
      return res.status(404).json({ message: 'El Cliente asociado no existe' });
    }

    // 2. Asegurar que solo un cliente pueda tener membresías
    if (cliente.rol !== RolUsuario.CLIENTE) {
      return res.status(400).json({
        message: 'Solo los usuarios con rol de cliente pueden contratar membresías',
      });
    }

    // 3. Verificar que el Plan relacionado exista y esté activo
    const plan = await em.findOne(Plan, { id: datos.planId });
    if (!plan) {
      return res.status(404).json({ message: 'El Plan asociado no existe' });
    }
    if (!plan.activo) {
      return res.status(400).json({
        message: 'No se puede contratar una membresía con un plan inactivo',
      });
    }

    // 4. Verificar que el cliente no tenga ya una membresía activa vigente
    const activas = await em.count(Membresia, {
      cliente,
      estadoMembresia: EstadoMembresia.ACTIVA,
      fechaFin: { $gte: hoyISO() },
    });
    if (activas > 0) {
      return res.status(409).json({
        message: 'El cliente ya tiene una membresía activa vigente',
      });
    }

    // 5. Calcular fechas a partir del plan y crear la membresía
    const fechaInicio = hoyISO();
    const fechaFin = sumarMeses(fechaInicio, Number(plan.duracionEnMeses));
    const membresia = em.create(Membresia, {
      cliente,
      plan,
      fechaInicio,
      fechaFin,
      estadoMembresia: EstadoMembresia.ACTIVA,
    });
    await em.flush();

    return res.status(201).json({
      message: 'Membresia creada',
      data: membresia,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;
    const datos = req.body.sanitizedInput;

    const membresia = await em.findOne(Membresia, { id });
    if (!membresia) {
      return res.status(404).json({ message: 'Membresia no encontrada' });
    }

    if (datos.clienteId !== undefined) {
      const cliente = await em.findOne(Usuario, { id: datos.clienteId });
      if (!cliente) {
        return res.status(404).json({ message: 'El Cliente asociado no existe' });
      }
      if (cliente.rol !== RolUsuario.CLIENTE) {
        return res.status(400).json({
          message: 'Solo los usuarios con rol de cliente pueden contratar membresías',
        });
      }
      datos.cliente = cliente;
      delete datos.clienteId;
    }

    if (datos.planId !== undefined) {
      const plan = await em.findOne(Plan, { id: datos.planId });
      if (!plan) {
        return res.status(404).json({ message: 'El Plan asociado no existe' });
      }
      if (!plan.activo) {
        return res.status(400).json({
          message: 'No se puede asociar una membresía a un plan inactivo',
        });
      }
      datos.plan = plan;
      delete datos.planId;
    }

    const fechaInicio = datos.fechaInicio ?? membresia.fechaInicio;
    const fechaFin = datos.fechaFin ?? membresia.fechaFin;
    if (fechaFin < fechaInicio) {
      return res.status(400).json({
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
      });
    }

    em.assign(membresia, datos);
    await em.flush();

    return res.status(200).json({
      message: 'Membresia actualizada',
      data: membresia,
    });
  } catch (error) {
    manejarError(res, error, { req });
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
    manejarError(res, error, {
      mensajeForeignKey: 'No se puede eliminar la membresía porque tiene pagos asociados',
      req,
    });
  }
}

function sanitizeMembresiaInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = [];
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({ message: 'El cuerpo debe ser un objeto' });
  }

  for (const campo of ['clienteId', 'planId']) {
    if (body[campo] === undefined) {
      if (req.method === 'POST' || req.method === 'PUT') {
        errores.push('El campo ' + campo + ' es obligatorio');
      }
    } else if (!Number.isSafeInteger(body[campo]) || body[campo] <= 0) {
      errores.push('El campo ' + campo + ' debe ser un entero positivo');
    }
  }

  // Al crear se ignoran las fechas y el estado recibidos: los calcula el servidor.
  if (req.method !== 'POST') {
    for (const campo of ['fechaInicio', 'fechaFin']) {
      if (body[campo] === undefined) {
        if (req.method === 'PUT') errores.push('El campo ' + campo + ' es obligatorio');
      } else if (typeof body[campo] !== 'string' || !esFechaValida(body[campo].trim())) {
        errores.push('El campo ' + campo + ' debe ser una fecha válida YYYY-MM-DD');
      }
    }
    if (body.estadoMembresia === undefined) {
      if (req.method === 'PUT') errores.push('El estado de la membresía es obligatorio');
    } else if (!Object.values(EstadoMembresia).includes(body.estadoMembresia)) {
      errores.push('El estado debe ser activa, vencida o cancelada');
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }
  const datos: Record<string, unknown> = {};
  if (body.clienteId !== undefined) datos.clienteId = body.clienteId;
  if (body.planId !== undefined) datos.planId = body.planId;
  if (req.method !== 'POST') {
    if (body.fechaInicio !== undefined) datos.fechaInicio = body.fechaInicio.trim();
    if (body.fechaFin !== undefined) datos.fechaFin = body.fechaFin.trim();
    if (body.estadoMembresia !== undefined) datos.estadoMembresia = body.estadoMembresia;
  }
  if (Object.keys(datos).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }
  req.body.sanitizedInput = datos;
  next();
}

export { findAll, findOne, add, update, remove, sanitizeMembresiaInput };
