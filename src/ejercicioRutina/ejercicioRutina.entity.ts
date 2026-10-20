import { Entity, Property, ManyToOne, Unique, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Rutina } from '../rutina/rutina.entity.js';
import type { Ejercicio } from '../ejercicio/ejercicio.entity.js';

// Día de entrenamiento dentro de la rutina: Día A, Día B, Día C...
export enum DiaRutina {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

// Tiene su propio id (de BaseEntity) y no una PK compuesta rutina+ejercicio,
// porque el mismo ejercicio puede aparecer varias veces en una rutina
// (por ejemplo, sentadillas el día 1 y el día 3).
// Lo que no puede repetirse es la posición: un solo ejercicio por (rutina, día, orden).
@Entity()
@Unique({ properties: ['rutina', 'dia', 'orden'] })
export class EjercicioRutina extends BaseEntity {
  @Property({ type: 'smallint', unsigned: true, nullable: false })
  repeticiones!: number;

  @Property({ type: 'smallint', unsigned: true, nullable: false })
  series!: number;

  // Día de entrenamiento dentro de la rutina (A, B, C...), no día de la semana.
  @Enum(() => DiaRutina)
  dia!: DiaRutina;

  // Orden de ejecución dentro de ese día (1, 2, 3...).
  @Property({ type: 'smallint', unsigned: true, nullable: false })
  orden!: number;

  // Relación N:1: Muchos EjercicioRutina pertenecen a 1 sola Rutina.
  // Si se borra la rutina, se borran sus renglones (deleteRule: 'cascade').
  @ManyToOne(() => 'Rutina', { nullable: false, deleteRule: 'cascade' })
  rutina!: Rutina;

  // Relación N:1: Muchos EjercicioRutina usan 1 solo Ejercicio.
  // Sin cascade: no se puede borrar un ejercicio que esté en alguna rutina.
  @ManyToOne(() => 'Ejercicio', { nullable: false })
  ejercicio!: Ejercicio;
}
