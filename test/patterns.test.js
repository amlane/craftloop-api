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

async function registerUser(username, role = "user") {
  const res = await request(server)
    .post("/api/auth/register")
    .send({ username, password: "pw123456", email: `${username}@example.com` });

  if (role === "admin") {
    await db("users").where({ username }).update({ role: "admin" });
  }

  return res.body.token;
}

describe("pattern ownership", () => {
  it("lets the owner view, edit, and delete their own pattern", async () => {
    const token = await registerUser("owner");

    const create = await request(server)
      .post("/api/patterns")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Pattern" });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const get = await request(server)
      .get(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(200);

    const put = await request(server)
      .put(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Renamed" });
    expect(put.status).toBe(201);
    expect(put.body.title).toBe("Renamed");

    const del = await request(server)
      .delete(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it("blocks a non-owner, non-admin from viewing, editing, or deleting someone else's pattern", async () => {
    const ownerToken = await registerUser("owner2");
    const otherToken = await registerUser("other");

    const create = await request(server)
      .post("/api/patterns")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Private Pattern" });
    const id = create.body.id;

    const get = await request(server)
      .get(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(get.status).toBe(401);

    const put = await request(server)
      .put(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked" });
    expect(put.status).toBe(401);

    const del = await request(server)
      .delete(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(del.status).toBe(401);
  });

  it("lets an admin view, edit, and delete any pattern", async () => {
    const ownerToken = await registerUser("owner3");
    const adminToken = await registerUser("admin1", "admin");

    const create = await request(server)
      .post("/api/patterns")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Someone Elses Pattern" });
    const id = create.body.id;

    const get = await request(server)
      .get(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(get.status).toBe(200);

    const put = await request(server)
      .put(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Admin Edited" });
    expect(put.status).toBe(201);

    const del = await request(server)
      .delete(`/api/patterns/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(204);
  });
});

describe("GET /api/patterns (unfiltered list)", () => {
  it("403s for a non-admin", async () => {
    const token = await registerUser("lister");
    const res = await request(server)
      .get("/api/patterns")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("200s for an admin", async () => {
    const token = await registerUser("admin2", "admin");
    const res = await request(server)
      .get("/api/patterns")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/users/:id/role", () => {
  it("403s for a non-admin", async () => {
    const token = await registerUser("promoter");
    const target = await request(server).post("/api/auth/register").send({
      username: "target",
      password: "pw123456",
      email: "target@example.com",
    });

    const res = await request(server)
      .patch(`/api/users/${target.body.user.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("lets an admin grant and revoke admin on another user", async () => {
    const adminToken = await registerUser("admin3", "admin");
    const target = await request(server).post("/api/auth/register").send({
      username: "promotable",
      password: "pw123456",
      email: "promotable@example.com",
    });
    const targetId = target.body.user.id;

    const grant = await request(server)
      .patch(`/api/users/${targetId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "admin" });
    expect(grant.status).toBe(200);
    expect(grant.body.role).toBe("admin");

    const revoke = await request(server)
      .patch(`/api/users/${targetId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "user" });
    expect(revoke.status).toBe(200);
    expect(revoke.body.role).toBe("user");
  });

  it("blocks an admin from changing their own role", async () => {
    const adminToken = await registerUser("admin4", "admin");
    const me = await request(server)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(server)
      .patch(`/api/users/${me.body.id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "user" });
    expect(res.status).toBe(400);
  });
});
