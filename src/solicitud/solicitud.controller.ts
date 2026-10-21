
import type { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { leerId, manejarError } from '../shared/utils.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import { Solicitud, EstadoSolicitud } from './solicitud.entity.js';

const em = orm.em;

function sanitizeSolicitudInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const errores: string[] = [];
  const esParcial = req.method === 'PATCH';

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

  const camposNumericos = ['peso', 'masaMuscular', 'altura'];

  for (const campo of camposNumericos) {
    const valor = body[campo];

    if (valor === undefined) {
      if (!esParcial) {
        errores.push(`El campo ${campo} es obligatorio`);
      }
    } else if (
      typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      errores.push(`El campo ${campo} debe ser un número mayor que cero`);
    }
  }

  if (body.objetivo === undefined) {
    if (!esParcial) {
      errores.push('El objetivo es obligatorio');
    }
  } else if (
    typeof body.objetivo !== 'string' ||
    body.objetivo.trim() === ''
  ) {
    errores.push('El objetivo debe ser un texto que no esté vacío');
  } else if (body.objetivo.trim().length > 200) {
    errores.push('El objetivo no puede superar los 200 caracteres');
  }

  if (body.clienteId === undefined) {
    if (!esParcial) {
      errores.push('El clienteId es obligatorio');
    }
  } else if (
    !Number.isSafeInteger(body.clienteId) ||
    body.clienteId <= 0
  ) {
    errores.push('El clienteId debe ser un número entero positivo');
  }

  const lesiones = body.lesionesPrevias;

  if (
    lesiones !== undefined &&
    lesiones !== null &&
    typeof lesiones !== 'string'
  ) {
    errores.push('Las lesiones previas deben ser un texto');
  } else if (
    typeof lesiones === 'string' &&
    lesiones.trim().length > 500
  ) {
    errores.push('Las lesiones previas no pueden superar los 500 caracteres');
  }


  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  const datosLimpios: Record<string, unknown> = {};

  for (const campo of camposNumericos) {
    if (body[campo] !== undefined) {
      datosLimpios[campo] = body[campo];
    }
  }

  if (body.objetivo !== undefined) {
    datosLimpios.objetivo = body.objetivo.trim();
  }

  if (body.clienteId !== undefined) {
    datosLimpios.clienteId = body.clienteId;
  }

  if (lesiones !== undefined) {
    datosLimpios.lesionesPrevias =
      typeof lesiones === 'string' ? lesiones.trim() : null;
  }


  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({
      message: 'No hay datos para modificar',
    });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

async function findAll(_req: Request, res: Response) {
  try {
    const solicitudes = await em.find(
      Solicitud,
      {},
      { populate: ['cliente'] },
    );

    res.status(200).json({
      message: 'Solicitudes encontradas',
      data: solicitudes,
    });
  } catch (error) {
    manejarError(res, error);
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const solicitud = await em.findOne(
      Solicitud,
      { id },
      { populate: ['cliente'] },
    );

    if (!solicitud) {
      return res.status(404).json({
        message: 'Solicitud no encontrada',
      });
    }

    res.status(200).json({
      message: 'Solicitud encontrada',
      data: solicitud,
    });
  } catch (error) {
    manejarError(res, error);
  }
}

async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput as Record<string, unknown>;
    const clienteId = datos.clienteId as number;

    const cliente = await em.findOne(Usuario, { id: clienteId });

    if (!cliente || cliente.rol !== RolUsuario.CLIENTE) {
      return res.status(400).json({
        message: 'El cliente indicado no existe o no tiene rol de cliente',
      });
    }

    const hoy = new Date();
    const fechaSolicitud = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, '0'),
      String(hoy.getDate()).padStart(2, '0'),
    ].join('-');

    const solicitud = em.create(Solicitud, {
      peso: datos.peso as number,
      masaMuscular: datos.masaMuscular as number,
      altura: datos.altura as number,
      objetivo: datos.objetivo as string,
      lesionesPrevias: datos.lesionesPrevias as string | null | undefined,
      fechaSolicitud,
      estado: EstadoSolicitud.PENDIENTE,
      cliente,
    });

    await em.flush();

    res.status(201).json({
      message: 'Solicitud creada',
      data: solicitud,
    });
  } catch (error) {
    manejarError(res, error);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const solicitud = await em.findOne(Solicitud, { id });

    if (!solicitud) {
      return res.status(404).json({
        message: 'Solicitud no encontrada',
      });
    }

    const datos = req.body.sanitizedInput as Record<string, unknown>;
    const clienteId = datos.clienteId;

    if (clienteId !== undefined) {
      const cliente = await em.findOne(Usuario, {
        id: clienteId as number,
      });

      if (!cliente || cliente.rol !== RolUsuario.CLIENTE) {
        return res.status(400).json({
          message: 'El cliente indicado no existe o no tiene rol de cliente',
        });
      }

      solicitud.cliente = cliente;
    }

    if (datos.peso !== undefined) {
      solicitud.peso = datos.peso as number;
    }

    if (datos.masaMuscular !== undefined) {
      solicitud.masaMuscular = datos.masaMuscular as number;
    }

    if (datos.altura !== undefined) {
      solicitud.altura = datos.altura as number;
    }

    if (datos.objetivo !== undefined) {
      solicitud.objetivo = datos.objetivo as string;
    }

    if (datos.lesionesPrevias !== undefined) {
      solicitud.lesionesPrevias =
        datos.lesionesPrevias as string | undefined;
    }

    await em.flush();

    res.status(200).json({
      message: 'Solicitud actualizada',
      data: solicitud,
    });
  } catch (error) {
    manejarError(res, error);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const solicitud = await em.findOne(Solicitud, { id });

    if (!solicitud) {
      return res.status(404).json({
        message: 'Solicitud no encontrada',
      });
    }

    await em.remove(solicitud).flush();

    res.status(200).json({
      message: 'Solicitud eliminada',
    });
  } catch (error) {
    manejarError(res, error);
  }
}

export {
  sanitizeSolicitudInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};
