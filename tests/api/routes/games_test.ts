import { assertEquals, assertNotEquals } from "jsr:@std/assert@^0.217.0";
import { gamesRouter } from "../../../apps/api/src/routes/games.ts";
import { GameSchema, GameReadSchema } from "@repo/shared";
import { z } from "zod";

Deno.test("gamesRouter: API contract validation and full CRUD lifecycle", async () => {
    const testId = `test-game-${Date.now()}`;
    const testSlug = `test-game-slug-${Date.now()}`;

    // 1. POST /add with invalid payload should return 400 with validation error details
    const invalidReq = new Request("http://localhost/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    const invalidRes = await gamesRouter.request(invalidReq);
    assertEquals(invalidRes.status, 400);
    const invalidJson = await invalidRes.json();
    assertEquals(invalidJson.error, "Invalid game payload");
    assertNotEquals(invalidJson.details, undefined);

    // 2. POST /add with valid payload conforming to GameSchema
    const validGame = {
        id: testId,
        name: "Super Contract Bros",
        slug: testSlug,
        description: "A game for testing API contracts",
        rating: 95,
        platforms: [
            { id: `plat-${testId}`, name: "Super Console", slug: `super-console-${testId}` }
        ]
    };
    // Ensure test input adheres to GameSchema contract
    GameSchema.parse(validGame);

    const addReq = new Request("http://localhost/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validGame),
    });
    const addRes = await gamesRouter.request(addReq);
    assertEquals(addRes.status, 200);
    const addJson = await addRes.json();
    assertEquals(addJson.status, "success");
    assertEquals(addJson.id, testId);

    // 3. GET / should return games conforming to GameSchema contract
    const listReq = new Request("http://localhost/");
    const listRes = await gamesRouter.request(listReq);
    assertEquals(listRes.status, 200);
    const listJson = await listRes.json();
    assertEquals(Array.isArray(listJson), true);
    // Strict schema contract verification on all items
    const parsedGames = z.array(GameSchema).parse(listJson);
    const found = parsedGames.find(g => g.id === testId);
    assertEquals(found !== undefined, true);
    assertEquals(found?.name, "Super Contract Bros");

    // 4. GET /:id should return game conforming to GameReadSchema contract
    const getReq = new Request(`http://localhost/${testId}`);
    const getRes = await gamesRouter.request(getReq);
    assertEquals(getRes.status, 200);
    const getJson = await getRes.json();
    const gameRead = GameReadSchema.parse(getJson);
    assertEquals(gameRead.id, testId);
    assertEquals(gameRead.name, "Super Contract Bros");
    assertEquals(gameRead.platforms?.length, 1);
    assertEquals(gameRead.platforms?.[0].name, "Super Console");

    // 5. GET /?slug= should return array of GameReadSchema
    const slugReq = new Request(`http://localhost/?slug=${testSlug}`);
    const slugRes = await gamesRouter.request(slugReq);
    assertEquals(slugRes.status, 200);
    const slugJson = await slugRes.json();
    const slugGames = z.array(GameReadSchema).parse(slugJson);
    assertEquals(slugGames.length, 1);
    assertEquals(slugGames[0].id, testId);

    // 6. GET /?search= should return array conforming to GameSchema
    const searchReq = new Request("http://localhost/?search=Contract");
    const searchRes = await gamesRouter.request(searchReq);
    assertEquals(searchRes.status, 200);
    const searchJson = await searchRes.json();
    const searchGames = z.array(GameSchema).parse(searchJson);
    assertEquals(searchGames.some(g => g.id === testId), true);

    // 7. DELETE /:id should return 202
    const delReq = new Request(`http://localhost/${testId}`, { method: "DELETE" });
    const delRes = await gamesRouter.request(delReq);
    assertEquals(delRes.status, 202);
    const delJson = await delRes.json();
    assertEquals(delJson.success, true);

    // 8. GET /:id should return 404 after deletion
    const notFoundRes = await gamesRouter.request(new Request(`http://localhost/${testId}`));
    assertEquals(notFoundRes.status, 404);
});
