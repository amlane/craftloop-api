const request = require("supertest");

const server = require("../API/server.js");
const db = require("../data/dbConfig.js");

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.destroy();
});

beforeEach(async () => {
  await db("users").del(); // cascades to patterns, pattern_yarns, pattern_supplies, pattern_photos
});

async function registerUser(username, password) {
  const res = await request(server)
    .post("/api/auth/register")
    .send({ username, password, email: `${username}@example.com` });
  return res.body.token;
}

describe("PATCH /api/users/me/password", () => {
  it("rejects an incorrect current password", async () => {
    const token = await registerUser("pwuser1", "original1");

    const res = await request(server)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "wrong", newPassword: "newpassword1" });

    expect(res.status).toBe(401);
  });

  it("rejects a new password under 8 characters", async () => {
    const token = await registerUser("pwuser2", "original1");

    const res = await request(server)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "original1", newPassword: "short" });

    expect(res.status).toBe(400);
  });

  it("changes the password so the old one stops working and the new one logs in", async () => {
    const token = await registerUser("pwuser3", "original1");

    const change = await request(server)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "original1", newPassword: "newpassword1" });
    expect(change.status).toBe(200);

    const oldLogin = await request(server)
      .post("/api/auth/login")
      .send({ username: "pwuser3", password: "original1" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(server)
      .post("/api/auth/login")
      .send({ username: "pwuser3", password: "newpassword1" });
    expect(newLogin.status).toBe(200);
  });
});

describe("DELETE /api/users/me", () => {
  it("rejects an incorrect password", async () => {
    const token = await registerUser("deluser1", "deleteme1");

    const res = await request(server)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "wrong" });

    expect(res.status).toBe(401);

    const stillThere = await db("users")
      .where({ username: "deluser1" })
      .first();
    expect(stillThere).toBeDefined();
  });

  it("deletes the account, cascades their patterns, and invalidates their token", async () => {
    const token = await registerUser("deluser2", "deleteme1");

    const create = await request(server)
      .post("/api/patterns")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Orphaned pattern" });
    const patternId = create.body.id;

    const del = await request(server)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "deleteme1" });
    expect(del.status).toBe(204);

    const userRow = await db("users").where({ username: "deluser2" }).first();
    expect(userRow).toBeUndefined();

    const patternRow = await db("patterns").where({ id: patternId }).first();
    expect(patternRow).toBeUndefined();

    const afterDelete = await request(server)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(afterDelete.status).toBe(401);
  });
});
