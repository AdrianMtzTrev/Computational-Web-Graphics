const knex = require('knex');

let db;
let _sqliteDb = null;

function getDb() {
  if (db) return db;

  const useMysql = process.env.MYSQL_URL || process.env.JAWSDB_URL;

  if (useMysql) {
    db = knex({
      client: 'mysql2',
      connection: useMysql,
      pool: { min: 0, max: 7 },
    });
  } else {
    db = createSqliteWrapper();
  }

  return db;
}

function createSqliteWrapper() {
  const initSQL = Promise.resolve().then(() => {
    const initSqlJs = require('sql.js');
    return initSqlJs();
  }).then(SQL => {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'voidstation.db');
    let sqlDb;
    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buf);
    } else {
      sqlDb = new SQL.Database();
    }

    sqlDb.run(`CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL,
      difficulty TEXT,
      time_secs INTEGER NOT NULL DEFAULT 0,
      room TEXT,
      date TEXT DEFAULT (datetime('now'))
    )`);

    _sqliteDb = { SQL, sqlDb, dbPath };
    return _sqliteDb;
  });

  function all(sql, params) {
    return initSQL.then(({ sqlDb }) => {
      const stmt = sqlDb.prepare(sql);
      if (params) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    });
  }

  function run(sql, params) {
    return initSQL.then(({ sqlDb, dbPath }) => {
      sqlDb.run(sql, params);
      const fs = require('fs');
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    });
  }

  function get(sql, params) {
    return all(sql, params).then(rows => rows[0] || null);
  }

  function insert(table, data) {
    const cols = Object.keys(data).join(', ');
    const vals = Object.keys(data).map(k => data[k]);
    const placeholders = vals.map(() => '?').join(', ');
    return run(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, vals)
      .then(() => get(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`))
      .then(row => [row.id]);
  }

  function exec(sql) {
    return initSQL.then(({ sqlDb, dbPath }) => {
      sqlDb.run(sql);
      const fs = require('fs');
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    });
  }

  function queryBuilder(name) {
    let _where = [];
    let _orderCol = null, _orderDir = 'ASC';
    let _limit = null;

    const builder = {
      select: () => builder,
      where: (col, val) => { _where.push({ col, val }); return builder; },
      orderBy: (col, dir) => { _orderCol = col; _orderDir = (dir || 'asc').toUpperCase(); return builder; },
      limit: (n) => { _limit = n; return builder; },
      first: function() { _limit = 1; return this.then(rows => rows[0] || null); },
      insert: (data) => insert(name, data),
      then: (resolve, reject) => {
        let query = `SELECT * FROM ${name}`;
        if (_where.length) {
          const clauses = _where.map(w => `${w.col}` + (w.val === null ? ' IS NULL' : ` = ?`));
          query += ' WHERE ' + clauses.join(' AND ');
        }
        if (_orderCol) query += ` ORDER BY ${_orderCol} ${_orderDir}`;
        if (_limit !== null) query += ` LIMIT ${_limit}`;
        const params = _where.filter(w => w.val !== null).map(w => w.val);
        return all(query, params).then(resolve).catch(reject);
      },
    };
    return builder;
  }

  const wrapper = (name) => queryBuilder(name);
  wrapper._sqlite = true;
  wrapper.schema = {
    hasTable: () => initSQL.then(({ sqlDb }) => {
      const rows = sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='scores'");
      return rows.length > 0 && rows[0].values.length > 0;
    }),
    createTable: (name, cb) => {
      const cols = [];
      const t = {
        increments: (n) => { cols.push(n + ' INTEGER PRIMARY KEY AUTOINCREMENT'); },
        string: (n, len) => { cols.push(n + ' TEXT'); },
        integer: (n) => { cols.push(n + ' INTEGER'); },
        timestamp: (n) => { cols.push(n + ' TEXT DEFAULT (datetime(\'now\'))'); },
        notNullable: () => {},
        defaultTo: () => {},
      };
      cb(t);
      const sql = `CREATE TABLE ${name} (${cols.join(', ')})`;
      return exec(sql);
    },
  };
  wrapper.raw = (sql) => initSQL.then(() => sql);
  wrapper.fn = { now: "datetime('now')" };

  return wrapper;
}

async function initDb() {
  const d = getDb();
  if (d._sqlite) {
    await d.schema.hasTable('scores');
  } else {
    const exists = await d.schema.hasTable('scores');
    if (!exists) {
      await d.schema.createTable('scores', t => {
        t.increments('id');
        t.string('username', 32).notNullable();
        t.integer('score').notNullable().defaultTo(0);
        t.string('mode', 32).notNullable();
        t.string('difficulty', 16);
        t.integer('time_secs').notNullable().defaultTo(0);
        t.string('room', 32);
        t.timestamp('date');
      });
    }
  }
}

module.exports = { getDb, initDb };
