import { ok, created, noContent, badRequest, parseJsonBody } from "../../src/utils/http.mjs";

describe("utils/http", () => {
    test("ok() formate la réponse 200 JSON", () => {
        const res = ok({ a: 1 });
        expect(res.statusCode).toBe(200);
        expect(res.headers["Content-Type"]).toBe("application/json");
        expect(JSON.parse(res.body)).toEqual({ a: 1 });
    });

    test("created() = 201", () => {
        const res = created({ id: 123 });
        expect(res.statusCode).toBe(201);
    });

    test("noContent() = 204 et body vide", () => {
        const res = noContent();
        expect(res.statusCode).toBe(204);
        expect(res.body).toBe("");
    });

    test("badRequest() = 400 avec message", () => {
        const res = badRequest("oops");
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({ error: "oops" });
    });

    test("parseJsonBody() parse un body JSON", () => {
        const res = parseJsonBody({ body: JSON.stringify({ foo: "bar" }) });
        expect(res).toEqual({ foo: "bar" });
    });

    test("parseJsonBody() retourne {} si body vide ou invalide", () => {
        expect(parseJsonBody({})).toEqual({});
        expect(parseJsonBody({ body: "not-json" })).toEqual({});
    });
});