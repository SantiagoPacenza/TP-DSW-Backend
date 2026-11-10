import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { Usuario, RolUsuario } from '../../usuario/usuario.entity.js';

export const orm = await MikroORM.init({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  driver: MySqlDriver,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  highlighter: new SqlHighlighter(),
  debug: process.env.NODE_ENV !== 'production',
  schemaGenerator: {
    // solo en desarrollo
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
});

export const syncSchema = async () => {
  const generator = orm.schema;
  /*   
  await generator.dropSchema() // Uncomment to drop the schema
  await generator.createSchema() // Uncomment to create the schema from scratch
  */
  await generator.updateSchema();
};

export const asegurarAdminInicial = async () => {
  const em = orm.em.fork();

  const existeAdmin = await em.findOne(Usuario, { rol: RolUsuario.ADMIN });

  if (existeAdmin) {
    return;
  }

  const passwordHasheada = await bcrypt.hash('admin1234', 10);

  em.create(Usuario, {
    nombre: 'Admin',
    apellido: 'Gimnasio',
    fechaNacimiento: '1990-01-01',
    nombreUsuario: 'adminprueba',
    email: 'admin@gmail.com',
    contrasenia: passwordHasheada,
    telefono: '3410000000',
    rol: RolUsuario.ADMIN,
  });

  await em.flush();
  console.log('Usuario Administrador inicial creado con éxito.');
};
