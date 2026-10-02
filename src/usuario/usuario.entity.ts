import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

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
}
