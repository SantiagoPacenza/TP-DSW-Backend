import type { Request, Response, NextFunction } from 'express';
import { manejarError, hoyISO, esFechaValida } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Inscripcion, EstadoInscripcion } from './inscripcion.entity.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import { Clase } from '../clase/clase.entity.js';
import { Membresia, EstadoMembresia } from '../membresia/membresia.entity.js';

const em = orm.em;

// La URL conserva la fecha para consultar la inscripción; la PK es cliente + clase.
function leerParametrosInscripcion(req: Request, res: Response) {
  const { clienteId, claseId, fechaInscripcion } = req.params;

  if (!/^\d+$/.test(clienteId) || !/^\d+$/.test(claseId)) {
    res.status(400).json({
      message: 'El id de Cliente y el id de Clase deben ser números enteros',
    });
    return null;
  }

  if (!esFechaValida(fechaInscripcion)) {
    res
      .status(400)
      .json({
        message: 'La fecha de inscripcion debe tener el formato YYYY-MM-DD',
      });
    return null;
  }

  return {
    clienteId: Number(clienteId),
    claseId: Number(claseId),
    fechaInscripcion,
  };
}

async function findAll(req: Request, res: Response) {
  try {
    const usuarioAutenticado = (req as any).usuario;
    const filtro =
      usuarioAutenticado.rol === RolUsuario.CLIENTE
        ? { cliente: usuarioAutenticado.id }
        : {};

    const inscripciones = await em.find(Inscripcion, filtro, {
      populate: ['cliente', 'clase'],
    });
    res
      .status(200)
      .json({ message: 'Inscripciones encontradas', data: inscripciones });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const claveCompuesta = leerParametrosInscripcion(req, res);
    if (claveCompuesta === null) return;

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      claveCompuesta.clienteId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message:
          'No tenés permiso para consultar una inscripción de otro cliente.',
      });
    }

    const inscripcion = await em.findOne(
      Inscripcion,
      {
        cliente: claveCompuesta.clienteId,
        clase: claveCompuesta.claseId,
        fechaInscripcion: claveCompuesta.fechaInscripcion,
      },
      { populate: ['cliente', 'clase'] },
    );

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }
    res
      .status(200)
      .json({ message: 'Inscripción encontrada', data: inscripcion });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

async function add(req: Request, res: Response) {
  try {
    const datosLimpios = req.body.sanitizedInput;

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      datosLimpios.clienteId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message: 'No tenés permiso para inscribir a otro cliente.',
      });
    }

    // Verificar que el Cliente relacionado exista
    const clienteEntity = await em.findOne(Usuario, {
      id: datosLimpios.clienteId,
    });
    if (!clienteEntity) {
      return res.status(404).json({ message: 'El Cliente asociado no existe' });
    }

    // ¡VALIDACIÓN DE ROL! Aseguramos que solo un usuario con rol 'cliente' pueda inscribirse a una clase
    if (clienteEntity.rol !== RolUsuario.CLIENTE) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: [
          'Solo los usuarios con rol de cliente pueden inscribirse a las clases.',
        ],
      });
    }

    // Verificar que el cliente tenga una membresía activa y vigente cuyo plan incluya clases grupales
    const membresiaHabilitante = await em.findOne(Membresia, {
      cliente: clienteEntity,
      estadoMembresia: EstadoMembresia.ACTIVA,
      fechaFin: { $gte: hoyISO() },
      plan: { incluyeClasesGrupales: true },
    });
    if (!membresiaHabilitante) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: [
          'El cliente no tiene una membresía activa y vigente que incluya clases grupales.',
        ],
      });
    }

    // Verificar que la Clase relacionada exista
    const claseEntity = await em.findOne(Clase, { id: datosLimpios.claseId });
    if (!claseEntity) {
      return res.status(404).json({ message: 'La Clase asociada no existe' });
    }

    // Control de cupos: verificar que la clase no haya superado su cupo máximo
    const inscriptosActuales = await em.count(Inscripcion, {
      clase: claseEntity,
      estadoInscripcion: EstadoInscripcion.ACTIVA,
    });
    if (inscriptosActuales >= claseEntity.cupos) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: ['No hay cupos disponibles para esta clase.'],
      });
    }

    datosLimpios.cliente = clienteEntity;
    datosLimpios.clase = claseEntity;
    delete datosLimpios.clienteId;
    delete datosLimpios.claseId;

    const inscripcion = em.create(Inscripcion, datosLimpios);
    await em.flush();
    res.status(201).json({ message: 'Inscripción creada', data: inscripcion });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'El cliente ya tiene una inscripción en esa clase',
      req,
    });
  }
}

async function update(req: Request, res: Response) {
  try {
    const claveCompuesta = leerParametrosInscripcion(req, res);
    if (claveCompuesta === null) return;

    const datosLimpios = req.body.sanitizedInput;

    const usuarioAutenticado = (req as any).usuario;
    if (usuarioAutenticado.rol === RolUsuario.CLIENTE) {
      if (claveCompuesta.clienteId !== usuarioAutenticado.id) {
        return res.status(403).json({
          message:
            'No tenés permiso para modificar una inscripción de otro cliente.',
        });
      }
    }

    const inscripcion = await em.findOne(Inscripcion, {
      cliente: claveCompuesta.clienteId,
      clase: claveCompuesta.claseId,
      fechaInscripcion: claveCompuesta.fechaInscripcion,
    });

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }

    // Los identificadores y la fecha no se modifican por PUT/PATCH.
    if (
      (datosLimpios.clienteId !== undefined &&
        datosLimpios.clienteId !== claveCompuesta.clienteId) ||
      (datosLimpios.claseId !== undefined &&
        datosLimpios.claseId !== claveCompuesta.claseId) ||
      (datosLimpios.fechaInscripcion !== undefined &&
        datosLimpios.fechaInscripcion !== claveCompuesta.fechaInscripcion)
    ) {
      return res.status(409).json({
        message:
          'El cliente, la clase y la fecha de la inscripción no se pueden modificar',
      });
    }

    // Solo se cuentan cupos si pasa de cancelada/finalizada a activa.
    if (
      datosLimpios.estadoInscripcion === EstadoInscripcion.ACTIVA &&
      inscripcion.estadoInscripcion !== EstadoInscripcion.ACTIVA
    ) {
      const claseEntity = await em.findOne(Clase, {
        id: claveCompuesta.claseId,
      });
      if (claseEntity) {
        const inscriptosActuales = await em.count(Inscripcion, {
          clase: claseEntity,
          estadoInscripcion: EstadoInscripcion.ACTIVA,
        });
        if (inscriptosActuales >= claseEntity.cupos) {
          return res.status(400).json({
            message: 'Error de validación',
            errores: [
              'No hay cupos disponibles para reactivar la inscripción en esta clase.',
            ],
          });
        }
      }
    }

    if (datosLimpios.estadoInscripcion !== undefined) {
      inscripcion.estadoInscripcion = datosLimpios.estadoInscripcion;
    }

    await em.flush();
    res
      .status(200)
      .json({ message: 'Inscripción actualizada', data: inscripcion });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado: 'El cliente ya tiene una inscripción en esa clase',
      req,
    });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const claveCompuesta = leerParametrosInscripcion(req, res);
    if (claveCompuesta === null) return;

    const usuarioAutenticado = (req as any).usuario;
    if (
      usuarioAutenticado.rol === RolUsuario.CLIENTE &&
      claveCompuesta.clienteId !== usuarioAutenticado.id
    ) {
      return res.status(403).json({
        message:
          'No tenés permiso para eliminar una inscripción de otro cliente.',
      });
    }

    const inscripcion = await em.findOne(Inscripcion, {
      cliente: claveCompuesta.clienteId,
      clase: claveCompuesta.claseId,
      fechaInscripcion: claveCompuesta.fechaInscripcion,
    });

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }

    await em.remove(inscripcion).flush();
    res.status(200).json({ message: 'Inscripción eliminada' });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

function sanitizeInscripcionInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const errores: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  // Validar 'clienteId'
  if (body.clienteId === undefined) {
    if (req.method === 'POST') errores.push('El ID de cliente es obligatorio');
  } else if (
    typeof body.clienteId !== 'number' ||
    !Number.isInteger(body.clienteId) ||
    body.clienteId <= 0
  ) {
    errores.push('El ID de cliente debe ser un número entero válido');
  }

  // Validar 'claseId'
  if (body.claseId === undefined) {
    if (req.method === 'POST') errores.push('El ID de clase es obligatorio');
  } else if (
    typeof body.claseId !== 'number' ||
    !Number.isInteger(body.claseId) ||
    body.claseId <= 0
  ) {
    errores.push('El ID de clase debe ser un número entero válido');
  }

  // Al crear siempre nace activa. En PUT/PATCH se valida el estado recibido.
  if (req.method !== 'POST') {
    if (body.estadoInscripcion === undefined) {
      if (req.method === 'PUT')
        errores.push('El estado de la inscripción es obligatorio');
    } else if (
      !Object.values(EstadoInscripcion).includes(body.estadoInscripcion)
    ) {
      errores.push('El estado debe ser activa, finalizada o cancelada');
    }
  }

  // Validar o asignar 'fechaInscripcion' de forma segura (fecha actual)
  let fechaInscripcionFinal: string | undefined = undefined;

  if (req.method === 'POST') {
    fechaInscripcionFinal = hoyISO();
  } else if (body.fechaInscripcion !== undefined) {
    if (
      typeof body.fechaInscripcion !== 'string' ||
      !esFechaValida(body.fechaInscripcion.trim())
    ) {
      errores.push(
        'La fecha de inscripción debe ser una fecha válida con formato YYYY-MM-DD',
      );
    } else {
      fechaInscripcionFinal = body.fechaInscripcion.trim();
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Construir objeto limpio asegurando incluir fechaInscripcion
  const datosLimpios: Record<string, unknown> = {};

  if (body.clienteId !== undefined) datosLimpios.clienteId = body.clienteId;
  if (body.claseId !== undefined) datosLimpios.claseId = body.claseId;
  if (fechaInscripcionFinal !== undefined)
    datosLimpios.fechaInscripcion = fechaInscripcionFinal;
  if (req.method === 'POST') {
    datosLimpios.estadoInscripcion = EstadoInscripcion.ACTIVA;
  } else if (body.estadoInscripcion !== undefined) {
    datosLimpios.estadoInscripcion = body.estadoInscripcion;
  }

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

export { findAll, findOne, add, update, remove, sanitizeInscripcionInput };
