import { describe, test, expect } from 'vitest';



//
// TEST UNITARIO que prueba que el rol no cambia al editar.
//

// En este test verifico que al editar un usuario no se pueda cambiar su rol por otro distinto, evitando cambios 
// de permisos por error o fraude:
// Si el usuario es "cliente" y mandan "admin", se bloquea.
// Si el usuario es "cliente" y mandan "cliente", se permite.



// Regla de negocio: si no se envía un rol nuevo al editar, se permite;
// si se envía, tiene que ser igual al rol que el usuario ya tenía.
function puedeActualizarRol(rolActual: string, rolNuevo?: string): boolean {
  if (rolNuevo === undefined) return true;
  return rolNuevo === rolActual;
}

describe('Regla de inmutabilidad del rol de usuario', () => {
  test('permite editar un usuario si no se envía rol o si se envía el mismo que ya tiene', () => {
    // No mandaron el campo rol (ej. editar nombre o teléfono)
    expect(puedeActualizarRol('cliente', undefined)).toBe(true);
    // Mandaron el mismo rol que ya tenía
    expect(puedeActualizarRol('cliente', 'cliente')).toBe(true);
    expect(puedeActualizarRol('entrenador', 'entrenador')).toBe(true);
  });

  test('bloquea el cambio si intentan modificar el rol por uno distinto', () => {
    // Un cliente intentando pasar a admin o un entrenador intentando pasar a admin
    expect(puedeActualizarRol('cliente', 'admin')).toBe(false);
    expect(puedeActualizarRol('entrenador', 'admin')).toBe(false);
  });
});