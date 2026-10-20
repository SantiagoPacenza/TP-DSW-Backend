import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Categoria } from '../categoria/categoria.entity.js';

@Entity()
export class Ejercicio extends BaseEntity {
  @Property({ type: 'string', length: 80, nullable: false, unique: true })
  nombre!: string;

  @Property({ type: 'string', length: 255, nullable: true })
  descripcion?: string;

  // Relación N:1: Muchos Ejercicios pertenecen a 1 sola Categoría (obligatoria).
  // Sin cascade: no se puede borrar una categoría que tenga ejercicios.
  @ManyToOne(() => 'Categoria', { nullable: false })
  categoria!: Categoria;
}
