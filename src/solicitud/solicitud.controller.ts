import type { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { leerId, manejarError, hoyISO } from '../shared/utils.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import { Solicitud, EstadoSolicitud } from './solicitud.entity.js';
import { Membresia, EstadoMembresia } from '../membresia/membresia.entity.js';

const em = orm.em;

function sanitizeSolicitudInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const errores: string[] = [];
  const esParcial = req.method === 'PATCH';

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
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
  } else if (typeof body.objetivo !== 'string' || body.objetivo.trim() === '') {
    errores.push('El objetivo debe ser un texto que no esté vacío');
  } else if (body.objetivo.trim().length > 200) {
    errores.push('El objetivo no puede superar los 200 caracteres');
  }

  if (body.clienteId === undefined) {
    if (req.method === 'POST') {
      errores.push('El clienteId es obligatorio');
    }
  } else if (!Number.isSafeInteger(body.clienteId) || body.clienteId <= 0) {
    errores.push('El clienteId debe ser un número entero positivo');
  }

  // El cliente siempre crea la solicitud pendiente; el estado se gestiona al actualizar.
  if (
    req.method !== 'POST' &&
    body.estado !== undefined &&
    !Object.values(EstadoSolicitud).includes(body.estado)
  ) {
    errores.push('El estado debe ser pendiente, aprobada o rechazada');
  }

  const lesiones = body.lesionesPrevias;

  if (
    lesiones !== undefined &&
    lesiones !== null &&
    typeof lesiones !== 'string'
  ) {
    errores.push('Las lesiones previas deben ser un texto');
  } else if (typeof lesiones === 'string' && lesiones.trim().length > 500) {
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

  if (req.method !== 'POST' && body.estado !== undefined) {
    datosLimpios.estado = body.estado;
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

// DTO para el listado y el detalle, sin exponer datos personales del cliente.
function obtenerDatosSolicitud(solicitud: Solicitud) {
  return {
    id: solicitud.id,
    fechaSolicitud: solicitud.fechaSolicitud,
    peso: solicitud.peso,
    masaMuscular: solicitud.masaMuscular,
    altura: solicitud.altura,
    objetivo: solicitud.objetivo,
    lesionesPrevias: solicitud.lesionesPrevias,
    estado: solicitud.estado,
    cliente: {
      id: solicitud.cliente.id,
      nombre: solicitud.cliente.nombre,
      apellido: solicitud.cliente.apellido,
      email: solicitud.cliente.email,
    },
  };
}

async function findAll(req: Request, res: Response) {
  try {
    let estado: any = req.query.estado;

    if (estado !== undefined) {
      estado = typeof estado === 'string' ? estado.trim().toLowerCase() : '';

      if (!Object.values(EstadoSolicitud).includes(estado)) {
        return res.status(400).json({
          message: 'El estado debe ser pendiente, aprobada o rechazada',
        });
      }
    }

    const filtro = estado ? { estado } : {};
    const solicitudes = await em.find(Solicitud, filtro, {
      populate: ['cliente'],
    });

    const datos = solicitudes.map(obtenerDatosSolicitud);

    res.status(200).json({
      message: 'Solicitudes encontradas',
      data: datos,
    });
  } catch (error) {
    manejarError(res, error, { req });
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

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      solicitud.cliente.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message:
          'No tenés permiso para consultar una solicitud de otro cliente.',
      });
    }

    const datos = obtenerDatosSolicitud(solicitud);

    res.status(200).json({
      message: 'Solicitud encontrada',
      data: datos,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;
    const clienteId = datos.clienteId;

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      clienteId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message:
          'No tenés permiso para crear una solicitud a nombre de otro cliente.',
      });
    }

    const cliente = await em.findOne(Usuario, { id: clienteId });

    if (!cliente) {
      return res.status(404).json({
        message: 'El Usuario asociado no existe',
      });
    }

    if (cliente.rol !== RolUsuario.CLIENTE) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: [
          'Solo los usuarios con rol de cliente pueden crear solicitudes.',
        ],
      });
    }

    const membresiaVigente = await em.findOne(Membresia, {
      cliente,
      estadoMembresia: EstadoMembresia.ACTIVA,
      fechaFin: { $gte: hoyISO() },
    });
    if (!membresiaVigente) {
      return res.status(400).json({
        message:
          'El cliente necesita una membresía activa y vigente para solicitar una rutina',
      });
    }

    const solicitud = em.create(Solicitud, {
      peso: datos.peso,
      masaMuscular: datos.masaMuscular,
      altura: datos.altura,
      objetivo: datos.objetivo,
      lesionesPrevias: datos.lesionesPrevias,
      fechaSolicitud: hoyISO(),
      estado: EstadoSolicitud.PENDIENTE,
      cliente,
    });

    await em.flush();

    res.status(201).json({
      message: 'Solicitud creada',
      data: solicitud,
    });
  } catch (error) {
    manejarError(res, error, { req });
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

    const datos = req.body.sanitizedInput;
    const clienteId = datos.clienteId;

    if (clienteId !== undefined && clienteId !== solicitud.cliente.id) {
      return res.status(409).json({
        message: 'El cliente de una solicitud no se puede modificar',
      });
    }

    if (datos.peso !== undefined) {
      solicitud.peso = datos.peso;
    }

    if (datos.masaMuscular !== undefined) {
      solicitud.masaMuscular = datos.masaMuscular;
    }

    if (datos.altura !== undefined) {
      solicitud.altura = datos.altura;
    }

    if (datos.objetivo !== undefined) {
      solicitud.objetivo = datos.objetivo;
    }

    if (datos.estado !== undefined) {
      solicitud.estado = datos.estado;
    }

    if (datos.lesionesPrevias !== undefined) {
      solicitud.lesionesPrevias =
        datos.lesionesPrevias !== null ? datos.lesionesPrevias : null;
    }

    await em.flush();

    res.status(200).json({
      message: 'Solicitud actualizada',
      data: solicitud,
    });
  } catch (error) {
    manejarError(res, error, { req });
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

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      solicitud.cliente.id !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message:
          'No tenés permiso para eliminar una solicitud de otro cliente.',
      });
    }

    await em.remove(solicitud).flush();

    res.status(200).json({
      message: 'Solicitud eliminada',
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeForeignKey:
        'No se puede eliminar la solicitud porque tiene una rutina asociada',
      req,
    });
  }
}

export { sanitizeSolicitudInput, findAll, findOne, add, update, remove };
