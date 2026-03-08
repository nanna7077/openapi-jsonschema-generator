#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { generateOpenApiSchemas } from "./generate-schemas.js";

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error(
            "Usage: openapi-langserver-schemas <openapi-json-file> [output-directory]",
        );
        process.exit(1);
    }

    const openapiFilePath = args[0];
    const outputDir = args[1] || "schemas";

    try {
        await fs.mkdir(outputDir, { recursive: true });
        const spec = await fs.readFile(openapiFilePath, "utf8");
        const schemas = await generateOpenApiSchemas(JSON.parse(spec));

        for (const [fileName, schemaContent] of Object.entries(schemas)) {
            const outputPath = path.join(outputDir, fileName);
            await fs.writeFile(outputPath, JSON.stringify(schemaContent, null, 2), "utf8");
            console.log(`Generated schema: ${outputPath}`);
        }

        console.log("Schema generation complete.");
    } catch (error) {
        console.error("Error generating schemas:", error);
        process.exit(1);
    }
}

main();
