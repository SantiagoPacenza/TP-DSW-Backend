import type { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { manejarError, esFechaValida, hoyISO } from '../shared/utils.js';
import { Membresia, EstadoMembresia } from '../membresia/membresia.entity.js';
import { Pago } from './pago.entity.js';

const em = orm.em;

// Listar todos los pagos
async function findAll(req: Request, res: Response) {
  try {
    const pagos = await em.find(
      Pago,
      {},
      {
        populate: ['membresia'],
      },
    );

    res.status(200).json({
      message: 'Pagos encontrados',
      data: pagos,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Buscar un pago por membresía e idPago
async function findOne(req: Request, res: Response) {
  try {
    const membresiaId = Number(req.params.membresiaId);
    const idPago = Number(req.params.idPago);

    if (
      !Number.isSafeInteger(membresiaId) ||
      membresiaId <= 0 ||
      !Number.isSafeInteger(idPago) ||
      idPago <= 0
    ) {
      return res.status(400).json({
        message: 'Los identificadores deben ser números enteros positivos',
      });
    }

    const pago = await em.findOne(
      Pago,
      { idPago, membresia: { id: membresiaId } },
      { populate: ['membresia'] },
    );

    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    res.status(200).json({
      message: 'Pago encontrado',
      data: pago,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Crear un pago
async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput as Record<string, unknown>;

    const membresiaId = datos.membresiaId as number;
    const membresia = await em.findOne(Membresia, { id: membresiaId });

    if (!membresia) {
      return res.status(404).json({
        message: 'La membresía asociada no existe',
      });
    }

    if (membresia.estadoMembresia === EstadoMembresia.CANCELADA) {
      return res.status(400).json({
        message: 'Error de validación',
        errores: ['No se pueden registrar pagos para una membresía cancelada.'],
      });
    }

    // Obtener el último número de pago de esa membresía.
    const ultimoPago = await em.find(
      Pago,
      { membresia: membresia },
      { orderBy: { idPago: 'DESC' }, limit: 1 },
    );

    const idPago = (ultimoPago[0]?.idPago ?? 0) + 1;

    const pago = em.create(Pago, {
      idPago,
      monto: datos.monto as string,
      metodoPago: datos.metodoPago as string,
      fechaLimitePago: datos.fechaLimitePago as string,
      fechaPago: null,
      membresia,
    });

    await em.flush();

    res.status(201).json({
      message: 'Pago creado',
      data: pago,
    });
  } catch (error) {
    manejarError(res, error, {
      mensajeDuplicado:
        'No se pudo registrar el pago porque se registró otro pago para la misma membresía al mismo tiempo.',
      req,
    });
  }
}

//registrar que un pago fue abonado y guardar automáticamente la fecha en que se confirmó
async function confirmarPago(req: Request, res: Response) {
  try {
    const membresiaId = Number(req.params.membresiaId);
    const idPago = Number(req.params.idPago);

    if (
      !Number.isSafeInteger(membresiaId) ||
      membresiaId <= 0 ||
      !Number.isSafeInteger(idPago) ||
      idPago <= 0
    ) {
      return res.status(400).json({
        message: 'Los identificadores deben ser números enteros positivos',
      });
    }

    const pago = await orm.em.findOne(Pago, {
      idPago,
      membresia: { id: membresiaId },
    });

    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    if (pago.fechaPago) {
      return res.status(409).json({
        message: 'El pago ya fue confirmado',
      });
    }

    pago.fechaPago = hoyISO();

    await orm.em.flush();

    return res.status(200).json({
      message: 'Pago confirmado correctamente',
      data: pago,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Actualizar un pago
async function update(req: Request, res: Response) {
  try {
    const membresiaId = Number(req.params.membresiaId);
    const idPago = Number(req.params.idPago);

    if (
      !Number.isSafeInteger(membresiaId) ||
      membresiaId <= 0 ||
      !Number.isSafeInteger(idPago) ||
      idPago <= 0
    ) {
      return res.status(400).json({
        message: 'Los identificadores deben ser números enteros positivos',
      });
    }

    const pago = await em.findOne(Pago, {
      idPago,
      membresia: { id: membresiaId },
    });

    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const datos = req.body.sanitizedInput as Record<string, unknown>;

    // La membresía y el idPago identifican al pago y no se modifican.
    em.assign(pago, datos);
    await em.flush();

    res.status(200).json({
      message: 'Pago actualizado',
      data: pago,
    });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Eliminar un pago
async function remove(req: Request, res: Response) {
  try {
    const membresiaId = Number(req.params.membresiaId);
    const idPago = Number(req.params.idPago);

    if (
      !Number.isSafeInteger(membresiaId) ||
      membresiaId <= 0 ||
      !Number.isSafeInteger(idPago) ||
      idPago <= 0
    ) {
      return res.status(400).json({
        message: 'Los identificadores deben ser números enteros positivos',
      });
    }

    const pago = await em.findOne(Pago, {
      idPago,
      membresia: { id: membresiaId },
    });

    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    await em.remove(pago).flush();

    res.status(200).json({ message: 'Pago eliminado' });
  } catch (error) {
    manejarError(res, error, { req });
  }
}

// Validar los datos recibidos
function sanitizePagoInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = [];
  const esPatch = req.method === 'PATCH';
  const esPost = req.method === 'POST';

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores: ['El cuerpo debe ser un objeto'],
    });
  }

  // Validar membresiaId: solo se recibe al crear un pago.
  if (esPost) {
    if (!Number.isSafeInteger(body.membresiaId) || body.membresiaId <= 0) {
      errores.push('El id de la membresía debe ser un entero positivo');
    }
  } else if (body.membresiaId !== undefined) {
    errores.push('No se puede cambiar la membresía de un pago');
  }

  // Validar monto
  if (body.monto === undefined) {
    if (!esPatch) errores.push('El monto es obligatorio');
  } else if (
    typeof body.monto !== 'number' ||
    !Number.isFinite(body.monto) ||
    body.monto <= 0
  ) {
    errores.push('El monto debe ser un número mayor que cero');
  }

  // Validar método de pago
  if (body.metodoPago === undefined) {
    if (!esPatch) errores.push('El método de pago es obligatorio');
  } else if (
    typeof body.metodoPago !== 'string' ||
    body.metodoPago.trim().length === 0 ||
    body.metodoPago.trim().length > 50
  ) {
    errores.push('El método de pago debe tener entre 1 y 50 caracteres');
  }

  // Validar fecha límite
  if (body.fechaLimitePago === undefined) {
    if (!esPatch) errores.push('La fecha límite de pago es obligatoria');
  } else if (
    typeof body.fechaLimitePago !== 'string' ||
    !esFechaValida(body.fechaLimitePago.trim())
  ) {
    errores.push('La fecha límite debe ser válida y tener formato YYYY-MM-DD');
  }

  //validar que el usuario no haya mandado una fecha arbitria en el JSON
  if (body.fechaPago !== undefined) {
  errores.push(
    'La fecha de pago se registra únicamente al confirmar el pago',
  );
}


  if (errores.length > 0) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errores,
    });
  }

  const datosLimpios: Record<string, unknown> = {};

  if (esPost) datosLimpios.membresiaId = body.membresiaId;

  if (body.monto !== undefined) {
    datosLimpios.monto = String(body.monto);
  }

  if (body.metodoPago !== undefined) {
    datosLimpios.metodoPago = body.metodoPago.trim();
  }

  if (body.fechaLimitePago !== undefined) {
    datosLimpios.fechaLimitePago = body.fechaLimitePago.trim();
  }

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({
      message: 'No hay datos para modificar',
    });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

export { findAll, findOne, add, update, remove, confirmarPago, sanitizePagoInput };

////SSSSSSSSSSSSSSSSSSSSSSS
