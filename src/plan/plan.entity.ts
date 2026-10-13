import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Membresia } from '../membresia/membresia.entity.js';

@Entity()
export class Plan extends BaseEntity {
  
  @Property({ type: 'string', length: 80, unique: true, nullable: false })
  nombre!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  precio!: string; // Mapeado como string para preservar la precisión monetaria/decimal exacta

  @Property({ type: 'boolean' })
  incluyeClasesGrupales!: boolean;

  @Property({ type: 'int' })
  duracionEnMeses!: string;

  @Property({ type: 'string', length: 255 })
  descripcion!: string;

  // Relación: 1 Plan puede tener N Membresías (tipamos explícitamente el parámetro)
  @OneToMany(() => 'Membresia', (membresia: Membresia) => membresia.plan)
  membresias = new Collection<Membresia>(this);

}