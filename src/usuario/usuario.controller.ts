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

  // Lista de textos vacia. errores.push guarda
  // un mensaje de error y se responden todos juntos.
  const errores: string[] = [];

  // Cada campo de texto con su largo máximo
  const maxCaracteres: Record<string, number> = {
    nombre: 30,
    apellido: 30,
    nombreUsuario: 30,
    email: 100,
  };

  // Mismas reglas para los cuatro, por eso el for.
  // Si el campo no vino (undefined), solo es error cuando no es PATCH.
  // trim() saca los espacios, así un nombre de solo espacio cuenta como vacío.
  for (const campo of Object.keys(maxCaracteres)) {
    const valor = body[campo];
    if (valor === undefined) {
      if (req.method !== 'PATCH') errores.push(`El ${campo} es obligatorio`);
    } else if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El ${campo} debe ser un texto que no esté vacío`);
    } else if (valor.trim().length > maxCaracteres[campo]) {
      errores.push(
        `El ${campo} no puede tener más de ${maxCaracteres[campo]} caracteres`,
      );
    }
  }

  // Email: algo + @ + algo + . + algo, sin espacios
  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof body.email === 'string' && !formatoEmail.test(body.email.trim())) {
    errores.push('El email no tiene un formato válido');
  }

  // Por ahora el rol viene en el body. Con el login se protege.
  if (body.rol === undefined) {
    if (req.method !== 'PATCH') errores.push('El rol es obligatorio');
  } else if (!Object.values(RolUsuario).includes(body.rol)) {
    errores.push(
      `El rol debe ser uno de: ${Object.values(RolUsuario).join(', ')}`,
    );
  }

  // fecha de nacimiento válida, no futura y formato AAAA-MM-DD.
  if (body.fechaNacimiento === undefined) {
    if (req.method !== 'PATCH') {
      errores.push('La fecha de nacimiento es obligatoria');
    }
  } else if (
    typeof body.fechaNacimiento !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaNacimiento)
  ) {
    errores.push('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
  } else {
    const fecha = new Date(body.fechaNacimiento);

    if (
      isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== body.fechaNacimiento
    ) {
      errores.push('La fecha de nacimiento no es una fecha válida');
    } else if (fecha > new Date()) {
      errores.push('La fecha de nacimiento no puede ser en el futuro');
    }
  }

  // Obligatoria solo en POST. En PUT y PATCH, si no viene, se conserva la actual.
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
  } else if (typeof tel === 'string' && tel.trim().length > 25) {
    errores.push('El teléfono no puede tener más de 25 caracteres');
  }

  // Si se anoto algun problema, se devuelve 400 con la lista de errores.
  // El return evita que se llegue a next() con datos inválidos.
  if (errores.length > 0) {
    return res.status(400).json({ message: 'Datos inválidos', errores });
  }

  // Solo pasan los campos de la entidad; lo demás que mande el cliente se ignora.
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

  if (Object.keys(datosLimpios).length === 0) {
    return res.status(400).json({ message: 'No hay datos para modificar' });
  }

  req.body.sanitizedInput = datosLimpios;
  next();
}

// Devuelve el id de la URL o responde 400 y devuelve null.
// Se valida con regex porque parseInt("12abc") daría 12 sin quejarse.
function leerId(req: Request, res: Response): number | null {
  const valor = req.params.id;

  if (!/^\d+$/.test(valor)) {
    res.status(400).json({ message: 'El id debe ser un número entero' });
    return null;
  }
  return Number(valor);
}

// Duplicado (campo único) -> 409. Cualquier otro error -> 500 genérico.
// El detalle va a la consola para no exponer datos internos (como nombres
// de tablas, consultas SQL, etc.) al cliente.
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

// findOne y no findOneOrFail: devuelve null si no existe
// queremos distinguir "no existe" (404) de un fallo real.
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
    await em.flush(); // 409 si mismo nombreUsuario o email que otro usuario
    res.status(200).json({ message: 'Usuario actualizado', data: usuario });
  } catch (error) {
    manejarError(res, error);
  }
}

// Se busca antes de borrar para poder responder 404 si no existe (getReference no avisa)
// TODO: con membresías asociadas va a fallar por clave foránea (hoy da 500)
async function remove(req: Request, res: Response) {
  try {
    const id = leerId(req, res);
    if (id === null) return;

    const usuario = await em.findOne(Usuario, { id });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await em.remove(usuario).flush();
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    manejarError(res, error);
  }
}

export { sanitizeUsuarioInput, findAll, findOne, add, update, remove };
