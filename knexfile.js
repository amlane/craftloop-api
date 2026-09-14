// Knex configuration. Values can be overridden via environment variables
// (see .env.example). The active environment is chosen by NODE_ENV.

require("dotenv").config({ quiet: true });

const sharedPgOptions = {
  client: "pg",
  migrations: {
    directory: "./data/migrations",
  },
  seeds: {
    directory: "./data/seeds",
  },
};

module.exports = {
  development: {
    ...sharedPgOptions,
    connection: process.env.DATABASE_URL_LOCAL,
  },

  test: {
    ...sharedPgOptions,
    connection: process.env.DATABASE_URL_TEST,
  },

  production: {
    ...sharedPgOptions,
    connection: process.env.DATABASE_URL_LOCAL,
  },
};

/*
Note: Many managed Postgres providers require SSL on the connection (ssl: { rejectUnauthorized: false } or similar) or the connection gets refused. Not a concern for local Docker, so no action needed yet but may come up during prod deployment.
*/
