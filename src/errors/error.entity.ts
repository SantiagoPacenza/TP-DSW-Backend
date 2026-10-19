import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';

export enum OrigenError {
  BACKEND = 'backend',
  FRONTEND = 'frontend'
}

@Entity({ tableName: 'errores_log'})
export class ErrorEntity {

  @PrimaryKey()
  id?: number;
    
  @Property({ onCreate: () => new Date() })
  createdAt?: Date;

  @Enum(() => OrigenError)
  origen?: OrigenError;

  @Property({ type: 'string', nullable: true })
  tipoError?: string;

  @Property({ type: 'text' })
  mensaje!: string;

  @Property({ type: 'text', nullable: true })
  stackTrace?: string;

  @Property({ nullable: true }) // Si viene null es un usuario sin loguear
  UsuarioId?: number;

}
