import assert from "assert";
import fs from "fs/promises";
import { generateOpenApiSchemas } from "../generate-schemas.js";

const sampleOpenApiSpecPath = "./test/sample-openapi.json";

async function runTests() {
    console.log("Running tests...");

    let openApiSpec;
    try {
        const specContent = await fs.readFile(sampleOpenApiSpecPath, "utf8");
        openApiSpec = JSON.parse(specContent);
    } catch (error) {
        console.error("Failed to load sample-openapi.json:", error);
        process.exit(1);
    }

    // Test Case 1: Basic schema generation and component resolution
    try {
        const schemas = await generateOpenApiSchemas(openApiSpec);

        assert.ok(schemas, "Schemas object should not be null or undefined");
        assert.ok(Object.keys(schemas).length > 0, "Should generate at least one schema");

        // Verify specific request schema
        const userCreateRequestSchema = schemas["user.createUser.request.schema.json"];
        assert.ok(userCreateRequestSchema, "user.createUser.request.schema.json should exist");
        assert.strictEqual(userCreateRequestSchema.type, "object", "UserRequest schema type should be object");
        assert.ok(userCreateRequestSchema.properties.name, "UserRequest schema should have 'name' property");
        assert.ok(userCreateRequestSchema.properties.email, "UserRequest schema should have 'email' property");
        assert.strictEqual(userCreateRequestSchema.properties.email.format, "email", "Email property should have 'email' format");

        // Verify specific response schema
        const userCreateResponseSchema = schemas["user.createUser.response.schema.json"];
        assert.ok(userCreateResponseSchema, "user.createUser.response.schema.json should exist");
        assert.strictEqual(userCreateResponseSchema.type, "object", "UserResponse schema type should be object");
        assert.ok(userCreateResponseSchema.properties.id, "UserResponse schema should have 'id' property");
        assert.ok(userCreateResponseSchema.properties.name, "UserResponse schema should have 'name' property");
        assert.ok(userCreateResponseSchema.properties.email, "UserResponse schema should have 'email' property");

        // Verify component schema
        const errorSchema = schemas["Error.schema.json"];
        assert.ok(errorSchema, "Error.schema.json should exist");
        assert.strictEqual(errorSchema.type, "object", "Error schema type should be object");
        assert.ok(errorSchema.properties.code, "Error schema should have 'code' property");
        assert.ok(errorSchema.properties.message, "Error schema should have 'message' property");

        console.log("Test Case 1 (Basic schema generation and component resolution) passed.");
    } catch (error) {
        console.error("Test Case 1 failed:", error.message);
        process.exit(1);
    }

    console.log("All tests passed!");
    process.exit(0);
}

runTests();
