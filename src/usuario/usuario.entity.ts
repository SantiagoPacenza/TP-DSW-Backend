import { Entity, Enum, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Membresia } from '../membresia/membresia.entity.js';

export enum RolUsuario {
  ADMIN = 'admin',
  CLIENTE = 'cliente',
  ENTRENADOR = 'entrenador',
}

@Entity()
export class Usuario extends BaseEntity {
  @Enum(() => RolUsuario)
  rol!: RolUsuario;

  @Property({ nullable: false })
  nombre!: string;

  @Property({ nullable: false })
  apellido!: string;

  @Property({ type: 'date' })
  fechaNacimiento!: string;

  @Property({ unique: true })
  nombreUsuario!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  contrasenia!: string;

  @Property({ nullable: true })
  telefono?: string;

  // Relación: 1 Usuario (con rol cliente) puede tener N Membresías
  @OneToMany(() => Membresia, (membresia) => membresia.usuario)
  membresias = new Collection<Membresia>(this);

}
