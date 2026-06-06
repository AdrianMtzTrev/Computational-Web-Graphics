const knex = require('knex');

let db;

function getDb() {
  if (db) return db;

  const useMysql = process.env.MYSQL_URL || process.env.JAWSDB_URL;
  const connection = useMysql || { filename: './voidstation.db' };

  db = knex({
    client: useMysql ? 'mysql2' : 'better-sqlite3',
    connection,
    useNullAsDefault: !useMysql,
    pool: useMysql ? { min: 0, max: 7 } : undefined,
  });

  return db;
}

async function initDb() {
  const db = getDb();
  const hasMysql = !!process.env.MYSQL_URL;

  if (hasMysql) {
    const exists = await db.schema.hasTable('scores');
    if (!exists) {
      await db.schema.createTable('users', t => {
        t.increments('id');
        t.string('username', 32).notNullable().unique();
        t.string('password', 255).notNullable();
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      await db.schema.createTable('scores', t => {
        t.increments('id');
        t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
        t.integer('score').notNullable().defaultTo(0);
        t.enu('mode', ['story', 'nodamage']).notNullable();
        t.string('difficulty', 16);
        t.integer('time_secs').notNullable().defaultTo(0);
        t.string('room', 32);
        t.timestamp('date').defaultTo(db.fn.now());
      });
    }
  } else {
    await db.schema.createTable('scores', t => {
      t.increments('id');
      t.string('username', 32).notNullable();
      t.integer('score').notNullable().defaultTo(0);
      t.string('mode', 32).notNullable();
      t.string('difficulty', 16);
      t.integer('time_secs').notNullable().defaultTo(0);
      t.string('room', 32);
      t.timestamp('date').defaultTo(db.fn.now());
    });
  }
}

module.exports = { getDb, initDb };
