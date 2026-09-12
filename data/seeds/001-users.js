const bcrypt = require("bcryptjs");

exports.seed = async function (knex) {
  await knex("users").del();

  await knex("users").insert([
    {
      email: "twelvexstring@gmail.com",
      username: "amanda",
      password: bcrypt.hashSync("123", 12),
    },
    {
      email: "heyhermano@gmail.com",
      username: "herman",
      password: bcrypt.hashSync("password123", 12),
    },
  ]);
};
