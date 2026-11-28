import { describe, test, expect } from 'vitest';



//
// TEST UNITARIO de IDs de disciplinas sin duplicados ni negativos.
//

// En este test se comprueba que al asignar disciplinas a un entrenador solo se acepten IDs numéricos positivos 
// y sin repetidos:
// Que acepte [1, 2, 3].
// Que rechace [1, 1] (duplicados), [0, 2] o [-1] (no positivos), o algo que no sea un array.



// Verifica que disciplinaIds sea una lista de números enteros positivos (> 0) y sin repetidos
function esListaDisciplinaIdsValida(disciplinaIds: unknown): boolean {
  // Si no es un arreglo (por ejemplo un texto o número suelto), se rechaza
  if (!Array.isArray(disciplinaIds)) return false;

  // Cada elemento debe ser número, entero y mayor que cero
  const todosSonEnterosPositivos = disciplinaIds.every(
    (id) => typeof id === 'number' && Number.isInteger(id) && id > 0,
  );

  // Al meterlo en un Set (que elimina repetidos), el tamaño debe seguir siendo igual
  const sinDuplicados = new Set(disciplinaIds).size === disciplinaIds.length;

  return todosSonEnterosPositivos && sinDuplicados;
}

describe('Validación de asignación de disciplinas a entrenador', () => {
  test('acepta una lista de IDs enteros positivos sin repetir', () => {
    // Lista válida con varios IDs y lista vacía (quitar/dejar sin disciplinas)
    expect(esListaDisciplinaIdsValida([1, 2, 3])).toBe(true);
    expect(esListaDisciplinaIdsValida([])).toBe(true);
  });

  test('rechaza listas con IDs duplicados, negativos, cero o datos que no sean array', () => {
    // Tiene el 1 repetido
    expect(esListaDisciplinaIdsValida([1, 1, 2])).toBe(false);
    // Tiene cero
    expect(esListaDisciplinaIdsValida([0, 2])).toBe(false);
    // Tiene un número negativo
    expect(esListaDisciplinaIdsValida([-5, 3])).toBe(false);
    // No es un array, es un string
    expect(esListaDisciplinaIdsValida('1,2,3')).toBe(false);
  });
});