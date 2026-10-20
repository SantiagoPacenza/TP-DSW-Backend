import { Request, Response } from 'express';
import { manejarError } from '../shared/utils.js';
import { orm } from '../shared/db/orm.js';
import { Usuario, RolUsuario } from '../usuario/usuario.entity.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Guardamos la clave secreta en el archivo .env como variable de entorno y la accedemos así:
const SECRET_KEY_JWT = process.env.SECRET_KEY_JWT || 'clave_por_defecto';
const em = orm.em;

// ENDPOINT DE REGISTRO (Usa bcrypt para hashear)
export async function autoregistroCliente(req: Request, res: Response) {

    try {
        const datos = req.body.sanitizedInput;
        const email = datos.email;

        // Busca en base de datos usando el email único del usuario
        const validarExistencia = await em.findOne(Usuario, {email})
        if (validarExistencia !== null) {
            return res.status(400).json({message: 'El email ingresado ya está en uso. Ingrese otro email.'});
        }

        // Se guarda el hash de la contraseña, nunca el texto original
        datos.contrasenia = await bcrypt.hash(datos.contrasenia, 10);
        
        // Le damos a todos los usuarios que se registren a través del autoregistro el rol de cliente
        datos.rol = RolUsuario.CLIENTE; 

        const usuario = em.create(Usuario, datos);
        await em.flush(); // Acá MySQL rechaza los duplicados (-> 409)

        res.status(201).json({ message: 'Usuario registrado con éxito!', data: usuario });

      } catch (error) {
        manejarError(res, error, 'Problema al registrarse. Intentelo más tarde.');
      }
      
}

// ENDPOINT DE LOGIN (Usa bcrypt para comparar y JWT para firmar)
export async function loguearse (req: Request, res: Response) {
    
    try {
        const { email, contrasenia } = req.body;
    
        if(!email || !contrasenia){
            return res.status(400).json({message: 'Email y contraseña son obligatorios'});
        }

        // Busca en base de datos usando el email único del usuario
        const usuario = await em.findOne(Usuario, { email });
        if (!usuario) {
          return res.status(404).json({ message: 'No existe usuario con el email ingresado. Ingrese un email válido.' });
        }

        // Validación segura de contraseña (compara texto plano ingresado con el hash guardado en db)
        const contraseniaEsCorrecta = await bcrypt.compare(contrasenia, usuario.contrasenia)

        if(!contraseniaEsCorrecta){
            return res.status(401).json({message: 'Contraseña incorrecta.' /*'Credenciales inválidas' para no revelar info*/});
        }

        // Si son correctas las credenciales generamos token jwt para el usuario logueado.
        // El frontend solo recibe un único campo en el JSON de respuesta (por ejemplo: token: "eyJhbGciOiJIUzI1..."). 
        // Osea, no recibe un objeto separado con los datos del usuario.
        // Datos viajan al front como parte del payload o carga útil del JWT > Hay que decodificarlos allí.
        const token = jwt.sign({ 
            id: usuario.id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol
            
        }, SECRET_KEY_JWT, { expiresIn: '1h' }
        );

        // Lo enviamos en la respuesta
        return res.status(200).json({ message: '¡Login exitoso!', data: token });

      } catch (error) {
        manejarError(res, error, 'Problema al loguearse. Intentelo más tarde.');
      }

}