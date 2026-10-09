import type { Request, Response, NextFunction } from 'express';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import bcrypt from 'bcryptjs';
import { orm } from '../shared/db/orm.js';
import { Usuario, RolUsuario } from './usuario.entity.js';

const em = orm.em;

// Revisa y limpia el body antes del controller (POST, PUT y PATCH).
// POST y PUT exigen todos los datos; PATCH solo valida lo que viene.
// La contraseña solo es obligatoria en POST.
function sanitizeUsuarioInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errores: string[] = []; // Se juntan todos los errores y se responden juntos

  // Mismas reglas para los cuatro, por eso el for
  const camposTexto = ['nombre', 'apellido', 'nombreUsuario', 'email'];
  for (const campo of camposTexto) {
    const valor = body[campo];
    if (valor === undefined) {
      if (req.method !== 'PATCH') errores.push(`El ${campo} es obligatorio`);
    } else if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El ${campo} debe ser un texto que no esté vacío`);
    }
  }

  // Validación mínima: no comprueba que el mail exista
  if (typeof body.email === 'string' && !body.email.includes('@')) {
    errores.push('El email no tiene un formato válido');
  }

  // Por ahora el rol viene en el body (endpoint de admin). Con el login se protege
  if (body.rol === undefined) {
    if (req.method !== 'PATCH') errores.push('El rol es obligatorio');
  } else if (!Object.values(RolUsuario).includes(body.rol)) {
    errores.push(
      `El rol debe ser uno de: ${Object.values(RolUsuario).join(', ')}`,
    );
  }

  // Solo formato: 1995-02-31 pasa y MySQL lo rechaza al guardar (500)
  if (body.fechaNacimiento === undefined) {
    if (req.method !== 'PATCH')
      errores.push('La fecha de nacimiento es obligatoria');
  } else if (
    typeof body.fechaNacimiento !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaNacimiento)
  ) {
    errores.push('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
  }

  // Obligatoria solo en POST. En PUT y PATCH, si no viene, se conserva la actual
  if (body.contrasenia === undefined) {
    if (req.method === 'POST') errores.push('La contraseña es obligatoria');
  } else if (
    typeof body.contrasenia !== 'string' ||
    body.contrasenia.length < 6
  ) {
    errores.push('La contraseña debe ser un texto de al menos 6 caracteres');
  }

  // Opcional; null permite borrarlo
  const tel = body.telefono;
  if (tel !== undefined && tel !== null && typeof tel !== 'string') {
    errores.push('El teléfono debe ser un texto');
  }

  // El return evita que se llegue a next() con datos inválidos
  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Solo pasan los campos de la entidad; lo demás que mande el cliente se ignora
  const datosLimpios: Record<string, unknown> = {
    rol: body.rol,
    nombre: body.nombre?.trim(),
    apellido: body.apellido?.trim(),
    fechaNacimiento: body.fechaNacimiento,
    nombreUsuario: body.nombreUsuario?.trim(),
    email: body.email?.trim(),
    contrasenia: body.contrasenia,
    telefono: body.telefono,
  };
  Object.keys(datosLimpios).forEach((campo) => {
    if (datosLimpios[campo] === undefined) delete datosLimpios[campo];
  });

  req.body.sanitizedInput = datosLimpios;
  next();
}

// Devuelve el id de la URL o responde 400 y devuelve null.
// Se valida con regex porque parseInt("12abc") daría 12
function leerId(req: Request, res: Response): number | null {
  if (!/^\d+$/.test(req.params.id)) {
    res.status(400).json({ message: 'El id debe ser un número entero' });
    return null;
  }
  return Number(req.params.id);
}

// Duplicado (campo único) -> 409. Cualquier otro error -> 500 genérico,
// el detalle va a la consola para no exponer datos internos
function manejarError(res: Response, error: unknown) {
  if (error instanceof UniqueConstraintViolationException) {
    return res
      .status(409)
      .json({ message: 'El nombre de usuario o el email ya está en uso' });
  }
  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor' });
}

// La contraseña no sale en la respuesta por el hidden: true de la entidad
async function findAll(_req: Request, res: Response) {
  try {
    const usuarios = await em.find(Usuario, {});
    res.status(200).json({ message: 'Usuarios encontrados', data: usuarios });
  } catch (error) {
    manejarError(res, error);
  }
}

// findOne y no findOneOrFail: devuelve null si no existe y así el 404
// no se mezcla con los errores reales del catch
async function findOne(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json({ message: 'Usuario encontrado', data: usuario });
  } catch (error) {
    manejarError(res, error);
  }
}

// Se guarda el hash de la contraseña, nunca el texto original
async function add(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;
    datos.contrasenia = await bcrypt.hash(datos.contrasenia, 10);

    const usuario = em.create(Usuario, datos);
    await em.flush(); // Acá MySQL rechaza los duplicados (-> 409)
    res.status(201).json({ message: 'Usuario creado', data: usuario });
  } catch (error) {
    manejarError(res, error);
  }
}

// Sirve para PUT y PATCH: la diferencia ya se resolvió en el sanitize
async function update(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const datos = req.body.sanitizedInput;
    // Solo se hashea si vino una contraseña nueva
    if (datos.contrasenia) {
      datos.contrasenia = await bcrypt.hash(datos.contrasenia, 10);
    }
    em.assign(usuario, datos);
    await em.flush();
    res.status(200).json({ message: 'Usuario actualizado', data: usuario });
  } catch (error) {
    manejarError(res, error);
  }
}

// Se busca antes de borrar para poder responder 404 (getReference no avisa)
// TODO: con membresías asociadas va a fallar por clave foránea (hoy da 500)
async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await em.removeAndFlush(usuario);
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    manejarError(res, error);
  }
}

export { sanitizeUsuarioInput, findAll, findOne, add, update, remove };
