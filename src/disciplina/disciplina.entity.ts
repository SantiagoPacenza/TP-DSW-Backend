import { Entity, Property, ManyToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Usuario } from '../usuario/usuario.entity.js';

@Entity()
export class Disciplina extends BaseEntity {

  @Property({ nullable: false, unique: true })
  nombre!: string;

  @Property({ nullable: true })
  descripcion?: string;

  // Relación Muchos a Muchos: Una Disciplina tiene muchos Entrenadores que la dictan.
  @ManyToMany(() => 'Usuario', (usuario: Usuario) => usuario.disciplinas)
  entrenadores = new Collection<Usuario>(this);

}