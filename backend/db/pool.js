'use strict';
const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = require('../config');

let mysqlLib  = null;
let mysqlPool = null;

function getMysqlPool() {
  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    throw new Error('MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE are required in backend/.env');
  }

  if (!mysqlLib) {
    try {
      mysqlLib = require('mysql2/promise');
    } catch {
      throw new Error('mysql2 package is missing. Run: npm install mysql2');
    }
  }

  if (!mysqlPool) {
    mysqlPool = mysqlLib.createPool({
      host:             MYSQL_HOST,
      port:             MYSQL_PORT,
      user:             MYSQL_USER,
      password:         MYSQL_PASSWORD,
      database:         MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit:  10,
      queueLimit:       0,
      charset:          'utf8mb4',
    });
  }

  return mysqlPool;
}

function getPoolInstance() {
  return mysqlPool;
}

module.exports = { getMysqlPool, getPoolInstance };
