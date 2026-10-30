import type { Request, Response } from 'express';
import { ErrorEntity, OrigenError } from './error.entity.js';
import { orm } from '../shared/db/orm.js';
import fs from 'fs';
import path from 'path';

const em = orm.em;

// Función que coordina registro bases de datos y en archivo físico de los errores
export async function registrarErrorCompleto(
  error: unknown,
  tipoError: string,
  origen: OrigenError,
  req?: Request,
) {
  // De la clase Error de js obtenemos el mensaje y la traza del error
  const mensaje = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;

  // Si el request tiene el usuario inyectado por el token (ej: req.usuario.id), lo capturamos
  const usuarioId = (req as any)?.usuario?.id;

  // 1. Guardar en base de datos
  const guardado = await registrarErrorEnBD(
    mensaje,
    stackTrace,
    tipoError,
    usuarioId,
    origen,
  );

  // 2. Guardar en archivo fisico (.log)
  registrarErrorEnArchivo(mensaje, stackTrace, tipoError, usuarioId, origen);

  // 3. Mostrar en consola de desarrollo
  console.error(
    `[ERROR - ${tipoError}]:`,
    mensaje,
    stackTrace,
    usuarioId,
    origen,
  );

  return guardado;
}

// Función para recibir errores enviados desde el frontend
export async function registrarErrorDesdeFrontend(req: Request, res: Response) {
  try {
    const { mensaje, stackTrace, tipoError } = req.body ?? {};

    if (typeof mensaje !== 'string' || mensaje.trim() === '') {
      console.error('El mensaje de error es obligatorio.');
      return res.status(400).json({
        message: 'El mensaje de error es obligatorio y debe ser un texto',
      });
    }

    if (stackTrace !== undefined && typeof stackTrace !== 'string') {
      return res
        .status(400)
        .json({ message: 'El stackTrace debe ser un texto' });
    }

    if (tipoError !== undefined && typeof tipoError !== 'string') {
      return res
        .status(400)
        .json({ message: 'El tipoError debe ser un texto' });
    }

    // Recortamos el largo máximo para evitar que llenen la BD o el .log
    const mensajeLimpio = mensaje.trim().slice(0, 2000);
    const stackLimpio = stackTrace?.slice(0, 8000);
    const tipoLimpio = (tipoError?.trim() || 'FrontendError').slice(0, 100);

    // Creamos el objeto errorFront con el mensaje recibido del frontend
    const errorFront = new Error(mensajeLimpio);

    // Si el front envió stackTrace lo asignamos
    errorFront.stack = stackLimpio;
    // Si no lo envió, queda undefined para evitar guardar el stack trace autogenerado del backend (que node asigna automáticamente al objeto errorFront al hacer new Error() )

    const guardado = await registrarErrorCompleto(
      errorFront,
      tipoLimpio,
      OrigenError.FRONTEND,
      req,
    );

    if (!guardado) {
      return res.status(500).json({
        message: 'No se pudo registrar el error en la base de datos.',
      });
    }

    console.log('Error de frontend registrado con éxito.');
    return res
      .status(201)
      .json({ message: 'Error de frontend registrado con éxito.' });
  } catch (err) {
    console.error('No se pudo registrar el error de frontend.');
    return res
      .status(500)
      .json({ message: 'No se pudo registrar el error de frontend.' });
  }
}

// Función para guardar en la Base de Datos
export async function registrarErrorEnBD(
  mensaje: string,
  stackTrace?: string,
  tipoError?: string,
  usuarioId?: number,
  origen?: OrigenError,
) {
  try {
    const forkEm = em.fork();

    forkEm.create(ErrorEntity, {
      mensaje,
      stackTrace,
      tipoError,
      origen,
      usuarioId,
    });

    await forkEm.flush();
    return true;
  } catch (errBD) {
    console.error(
      'Fallo al intentar guardar el log en la base de datos:',
      errBD,
    );
    return false;
  }
}

// Función para guardar en archivo físico (error.log)
export function registrarErrorEnArchivo(
  mensaje: string,
  stackTrace?: string,
  tipoError?: string,
  usuarioId?: number,
  origen?: OrigenError,
) {
  try {
    const fechaHora = new Date().toISOString();
    const contenidoLog =
      // Guardamos cada error como una línea JSON
      JSON.stringify({
        fechaHora,
        tipoError,
        origen,
        usuarioId: usuarioId ?? null,
        mensaje,
        stackTrace: stackTrace ?? null,
      }) + '\n';

    const rutaLog = path.join(process.cwd(), 'error.log');

    fs.appendFile(rutaLog, contenidoLog, (err) => {
      if (err) {
        console.error('No se pudo escribir en el archivo error.log:', err);
      }
    });
  } catch (errFS) {
    console.error(
      'Error al intentar escribir en el archivo físico de logs:',
      errFS,
    );
  }
}
