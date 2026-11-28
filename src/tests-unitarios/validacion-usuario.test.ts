// Funciones básicas de Vitest para agrupar pruebas y verificar resultados
import { describe, test, expect } from 'vitest';



//
// TEST UNITARIO de formato de email y longitud de contraseña.
//

// En este test se verifica que el sistema rechace emails con formato incorrecto y contraseñas que no cumplan con el 
// rango de longitud permitido antes de procesar el usuario:
// Que un email sin @ o con espacios (por ejemplo "correo-invalido" o "juan@" ) se rechace.
// Que un email bien formado (por ejemplo "ana@gimnasio.com") pase.
// Que una contraseña muy corta (menos de 8 caracteres) o demasiado larga (más de 72 caracteres) se rechace, y una 
// de longitud válida (entre 8 y 72) pase.



// Función auxiliar que revisa si el correo tiene un formato válido (texto@dominio.algo)
function validarEmail(email: string): boolean {
  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // .trim() quita espacios sobrantes al principio o al final antes de revisar
  return formatoEmail.test(email.trim());
}

// Función auxiliar que revisa que la contraseña no sea solo espacios y tenga entre 8 y 72 caracteres
function validarLongitudContrasenia(contrasenia: string): boolean {
  if (contrasenia.trim() === '') return false;
  return contrasenia.length >= 8 && contrasenia.length <= 72;
}

describe('Validación de datos de usuario', () => {
  test('acepta emails con formato válido y rechaza los mal formados', () => {
    // Casos válidos (incluso con espacios alrededor)
    expect(validarEmail('ana@gimnasio.com')).toBe(true);
    expect(validarEmail('  juan.perez@dominio.com.ar  ')).toBe(true);

    // Casos inválidos: sin @, sin dominio o con espacios en el medio
    expect(validarEmail('correo-sin-arroba.com')).toBe(false);
    expect(validarEmail('juan@')).toBe(false);
    expect(validarEmail('juan @gimnasio.com')).toBe(false);
  });

  test('exige que la contraseña tenga entre 8 y 72 caracteres y no sea solo espacios', () => {
    // Contraseña válida de longitud intermedia
    expect(validarLongitudContrasenia('ClaveSegura123')).toBe(true);

    // Demasiado corta (7 caracteres)
    expect(validarLongitudContrasenia('1234567')).toBe(false);
    // Solo espacios en blanco
    expect(validarLongitudContrasenia('        ')).toBe(false);
    // Demasiado larga (73 caracteres)
    expect(validarLongitudContrasenia('a'.repeat(73))).toBe(false);
  });
});