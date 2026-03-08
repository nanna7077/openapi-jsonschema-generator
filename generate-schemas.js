import SwaggerParser from "@apidevtools/swagger-parser";

export async function generateOpenApiSchemas(spec) {
    const schemas = {};

    const generateOperationId = (method, path) => {
        const simplifiedPath = path.replace(/\{(\w+)\}/g, "By$1");
        const camelCasePath = simplifiedPath
            .split("/")
            .filter((s) => s.length)
            .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
            .join("");
        return `${method}${camelCasePath}`;
    };

    const resolveRefs = (schema, api) => {
        const resolvedSchema = JSON.parse(JSON.stringify(schema));
        const resolve = (obj) => {
            if (obj.$ref) {
                const refPath = obj.$ref.split("/");
                const refName = refPath[refPath.length - 1];
                // eslint-disable-next-line no-prototype-builtins
                if (api.components && api.components.schemas && api.components.schemas.hasOwnProperty(refName)) {
                    return resolve(api.components.schemas[refName]);
                }
                return obj;
            }
            if (obj.properties) {
                for (const prop in obj.properties) {
                    obj.properties[prop] = resolve(obj.properties[prop]);
                }
            }
            if (obj.items) {
                obj.items = resolve(obj.items);
            }
            return obj;
        };
        return resolve(resolvedSchema);
    };

    try {
        const api = await SwaggerParser.dereference(spec);

        for (const pathKey in api.paths) {
            const pathItem = api.paths[pathKey];
            for (const method in pathItem) {
                if (!["get", "post", "put", "delete", "patch", "head", "options", "trace"].includes(method)) continue;

                const operation = pathItem[method];
                const tag = operation.tags?.[0] || "default";
                const operationId = operation.operationId || generateOperationId(method, pathKey);
                const baseFileName = `${tag}.${operationId}`;

                if (operation.requestBody?.content?.["application/json"]?.schema) {
                    let requestSchema = operation.requestBody.content["application/json"].schema;
                    requestSchema = resolveRefs(requestSchema, api);
                    schemas[`${baseFileName}.request.schema.json`] = {
                        $schema: "https://json-schema.org/draft/2020-12/schema",
                        ...requestSchema,
                    };
                }

                if (operation.responses) {
                    for (const status of ["200", "201", "default"]) {
                        if (operation.responses[status]?.content?.["application/json"]?.schema) {
                            let responseSchema = operation.responses[status].content["application/json"].schema;
                            responseSchema = resolveRefs(responseSchema, api);
                            schemas[`${baseFileName}.response.schema.json`] = {
                                $schema: "https://json-schema.org/draft/2020-12/schema",
                                ...responseSchema,
                            };
                            break;
                        }
                    }
                }
            }
        }

        if (api.components && api.components.schemas) {
            for (const schemaName in api.components.schemas) {
                let componentSchema = api.components.schemas[schemaName];
                componentSchema = resolveRefs(componentSchema, api);
                schemas[`${schemaName}.schema.json`] = {
                    $schema: "https://json-schema.org/draft/2020-12/schema",
                    ...componentSchema,
                };
            }
        }
        return schemas;
    } catch (error) {
        console.error("Error processing OpenAPI file:", error);
        throw error;
    }
}
