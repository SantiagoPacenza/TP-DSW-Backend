import type { Request, Response} from 'express';
import { ErrorEntity, OrigenError } from "./error.entity.js";
import { orm } from "../shared/db/orm.js";
import fs from 'fs';
import path from 'path';

const em = orm.em;

// Función que coordina registro bases de datos y en archivo físico de los errores
export function registrarErrorCompleto(error: unknown, tipoError: string, origen: OrigenError, req?: Request) {
  
  // De la clase Error de js obtenemos el mensaje y la traza del error
  const mensaje = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;

  // Si el request tiene el usuario inyectado por el token (ej: req.usuario.id), lo capturamos
  // Capturamos el ID de usuario si fue inyectado en el request por el middleware de auth
  const usuarioId = req && (req as any).usuario ?  (req as any).usuario.id : undefined;

  // 1. Guardar en base de datos
  registrarErrorEnBD(mensaje, stackTrace, tipoError, usuarioId, origen);

  // 2. Guardar en archivo fisico (.log)
  registrarErrorEnArchivo(mensaje, stackTrace, tipoError, usuarioId, origen);

  // 3. Mostrar en consola de desarrollo
  console.error(`[ERROR - ${tipoError}]:`, mensaje, stackTrace, usuarioId, origen)

}

// Función para recibir errores enviados desde el frontend
export async function registrarErrorDesdeFrontend (req: Request, res: Response) {

    try {
        const { mensaje, stackTrace, tipoError } = req.body;

        if (!mensaje) {
            console.error('El mensaje de error es obligatorio.');
            return res.status(400).json({message: 'El mensaje de error es obligatorio'});
        }

        const errorFront = new Error(mensaje);
        if (stackTrace) errorFront.stack = stackTrace;
        
        registrarErrorCompleto(errorFront, tipoError || 'FrontendError', OrigenError.FRONTEND, req);

        console.log('Error de frontend registrado con éxito.');
        return res.status(201).json({message: 'Error de frontend registrado con éxito.'});
        
    }
    catch(err) {
        console.error('No se pudo registrar el error de frontend.');
        return res.status(500).json({message: 'No se pudo registrar el error de frontend.' });
    }
}

// Función para guardar en la Base de Datos
export async function registrarErrorEnBD(mensaje: string, stackTrace?: string, tipoError?: string, usuarioId?: number, origen?: OrigenError) {
  
    try {
    const forkEm = em.fork();

    const log = forkEm.create(ErrorEntity, {
      mensaje,
      stackTrace,
      tipoError,
      origen,
      UsuarioId: usuarioId /*? forkEm.getReference(eval('Usuario'), usuarioId) : undefined // O pasándole la referencia si está disponible*/
    });

    await forkEm.flush();

  } catch (errBD) {
    console.error('Fallo al intentar guardar el log en la base de datos:', errBD);
  }
}

// Función para guardar en archivo físico (error.log)
export function registrarErrorEnArchivo(mensaje: string, stackTrace?: string, tipoError?: string, usuarioId?: number, origen?: OrigenError) {
  
    try {
    const fechaHora = new Date().toISOString();
    const contenidoLog = `[${fechaHora}] [TIPO: ${tipoError}] MENSAJE: ${mensaje}\nSTACK: ${stackTrace || 'N/A'}\nUSUARIO_ID: ${usuarioId || ''}\n----------------------------------------\n`;

    const rutaLog = path.join(process.cwd(), 'error.log');

    fs.appendFile(rutaLog, contenidoLog, (err) => {
      if (err) {
        console.error('No se pudo escribir en el archivo error.log:', err);
      }
    });

  } catch (errFS) {
    console.error('Error al intentar escribir en el archivo físico de logs:', errFS);
  }
}