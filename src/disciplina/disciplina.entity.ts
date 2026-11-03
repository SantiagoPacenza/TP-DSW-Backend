import { Entity, Property, ManyToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Usuario } from '../usuario/usuario.entity.js';

@Entity()
export class Disciplina extends BaseEntity {

  @Property({ length: 80, nullable: false, unique: true })
  nombre!: string;

  @Property({ type: 'string', length: 255, nullable: true })
  descripcion?: string | null;

  // Relación Muchos a Muchos: Una Disciplina tiene muchos Entrenadores que la dictan.
  @ManyToMany(() => 'Usuario', (usuario: Usuario) => usuario.disciplinas)
  entrenadores = new Collection<Usuario>(this);

}
