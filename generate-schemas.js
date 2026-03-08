const fs = require("fs/promises");
const path = require("path");
const SwaggerParser = require("@apidevtools/swagger-parser");

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: node generate-schemas.js <openapi-json-file> [output-directory]",
    );
    process.exit(1);
  }

  const openapiFilePath = args[0];
  const outputDir = args[1] || "schemas";

  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory '${outputDir}' ensured.`);
  } catch (error) {
    console.error(`Error creating output directory '${outputDir}':`, error);
    process.exit(1);
  }

  console.log(`Processing OpenAPI file: ${openapiFilePath}`);
  console.log(`Outputting schemas to: ${outputDir}`);

  try {
    const api = await SwaggerParser.dereference(openapiFilePath);
    console.log("OpenAPI spec bundled and dereferenced successfully.");

    // Helper to generate operationId if missing
    const generateOperationId = (method, path) => {
      // Convert path parameters like {id} to ById
      const simplifiedPath = path.replace(/\{(\w+)\}/g, "By$1");
      // Remove leading slash and replace subsequent slashes with camelCase
      const camelCasePath = simplifiedPath
        .split("/")
        .filter((segment) => segment.length > 0)
        .map((segment, index) => {
          if (index === 0) return segment;
          return segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join("");

      return `${method}${camelCasePath}`;
    };

    for (const pathKey in api.paths) {
      const pathItem = api.paths[pathKey];

      for (const method in pathItem) {
        // Filter out non-HTTP methods (e.g., parameters, summary, description)
        if (
          ![
            "get",
            "post",
            "put",
            "delete",
            "patch",
            "head",
            "options",
            "trace",
          ].includes(method)
        ) {
          continue;
        }

        const operation = pathItem[method];

        const tag =
          operation.tags && operation.tags.length > 0
            ? operation.tags[0]
            : "default";
        const operationId =
          operation.operationId || generateOperationId(method, pathKey);

        const baseFileName = `${tag}.${operationId}`;

        // 2. Request schema extraction
        const requestBody = operation.requestBody;
        if (
          requestBody &&
          requestBody.content &&
          requestBody.content["application/json"] &&
          requestBody.content["application/json"].schema
        ) {
          const requestSchema = requestBody.content["application/json"].schema;
          const fullRequestSchema = {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            ...requestSchema,
          };
          const requestFileName = `${baseFileName}.request.schema.json`;
          const requestOutputPath = path.join(outputDir, requestFileName);
          await fs.writeFile(
            requestOutputPath,
            JSON.stringify(fullRequestSchema, null, 2),
            "utf8",
          );
          console.log(`Generated request schema: ${requestOutputPath}`);
        } else {
          console.log(
            `No application/json request body schema found for ${method.toUpperCase()} ${pathKey}. Skipping request schema generation.`,
          );
        }

        // 3. Response schema extraction
        const responses = operation.responses;
        if (responses) {
          let responseSchema = null;
          let statusCode = null;

          // Prioritize 200, then 201, then default
          for (const status of ["200", "201", "default"]) {
            if (
              responses[status] &&
              responses[status].content &&
              responses[status].content["application/json"] &&
              responses[status].content["application/json"].schema
            ) {
              responseSchema =
                responses[status].content["application/json"].schema;
              statusCode = status;
              break;
            }
          }

          if (responseSchema) {
            const fullResponseSchema = {
              $schema: "https://json-schema.org/draft/2020-12/schema",
              ...responseSchema,
            };
            const responseFileName = `${baseFileName}.response.schema.json`;
            const responseOutputPath = path.join(outputDir, responseFileName);
            await fs.writeFile(
              responseOutputPath,
              JSON.stringify(fullResponseSchema, null, 2),
              "utf8",
            );
            console.log(
              `Generated response schema (${statusCode}): ${responseOutputPath}`,
            );
          } else {
            console.log(
              `No application/json response schema found for ${method.toUpperCase()} ${pathKey} (200, 201, or default). Skipping response schema generation.`,
            );
          }
        } else {
          console.log(
            `No responses found for ${method.toUpperCase()} ${pathKey}. Skipping response schema generation.`,
          );
        }
      }
    }
    console.log("Schema generation complete.");
  } catch (error) {
    console.error("Error processing OpenAPI file:", error);
    process.exit(1);
  }
}

main();
