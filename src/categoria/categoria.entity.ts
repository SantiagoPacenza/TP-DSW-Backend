import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Ejercicio } from '../ejercicio/ejercicio.entity.js';

@Entity()
export class Categoria extends BaseEntity {
  @Property({ type: 'string', length: 80, nullable: false, unique: true })
  nombre!: string;

  // Relación 1:N: Una Categoría tiene muchos Ejercicios.
  @OneToMany(() => 'Ejercicio', (ejercicio: Ejercicio) => ejercicio.categoria)
  ejercicios = new Collection<Ejercicio>(this);
}
