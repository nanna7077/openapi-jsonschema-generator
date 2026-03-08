# OpenAPI to JSON Schema Generator

This tool converts an OpenAPI specification file into standalone JSON Schema files, suitable for use with language servers like VSCode JSON LS and YAML LS.

## Features

*   **OpenAPI Version Support**: Works with both OpenAPI 3.0 and 3.1 specifications.
*   **Schema Extraction**: Extracts request and response schemas for every operation defined in the OpenAPI spec.
*   **Standalone Schemas**: Generates fully standalone JSON Schema files, resolving all internal `$ref` pointers.
*   **Customizable Output**: Allows specifying an output directory for the generated schemas.
*   **Error Handling**: Gracefully handles missing request bodies, non-JSON responses, and missing tags or operation IDs.
*   **Dereferencing**: Utilizes `@apidevtools/swagger-parser` to dereference the OpenAPI specification.

## Installation

Install the package from npm:

```bash
npm install -g openapi-langserver-schemas
```

## Usage

The script can be executed from the command line.

**Basic Usage**:

This command will generate schemas in a `schemas/` directory by default.

```bash
openapi-langserver-schemas <path/to/your/openapi.json>
```

**Specifying Output Directory**:

You can provide a custom output directory as the second argument.

```bash
openapi-langserver-schemas <path/to/your/openapi.json> <path/to/your/output/directory>
```

**Example**:

```bash
openapi-langserver-schemas openapi.json schemas
```

This will process `openapi.json` and place the generated schema files into the `schemas/` directory.

### Server-Side Integration

The core logic for generating schemas is modularized and exported as an `async function generateOpenApiSchemas(spec)` from this package. This allows you to integrate the schema generation directly into your server-side Node.js applications, especially if you're looking to expose language server-compatible JSON schema endpoints dynamically.

You can import and use the `generateOpenApiSchemas` function like this:

```javascript
import { generateOpenApiSchemas } from 'openapi-langserver-schemas';
import express from 'express';
import swaggerUi from 'swagger-ui-express'; // Example: if serving Swagger UI

// Assuming you have your OpenAPI spec loaded
const openApiSpec = { /* Your OpenAPI Specification Object */ };

const app = express();

// Serve your OpenAPI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Expose a custom endpoint for schemas
app.get('/schemas/:schemaName?', async (req, res) => {
  try {
    const allSchemas = await generateOpenApiSchemas(openApiSpec);
    const schemaName = req.params.schemaName;

    if (schemaName) {
      if (allSchemas[schemaName]) {
        res.json(allSchemas[schemaName]);
      } else {
        res.status(404).json({ error: 'Schema not found' });
      }
    } else {
      res.json(allSchemas); // Return all schemas if no specific one is requested
    }
  } catch (error) {
    console.error('Error generating schemas:', error);
    res.status(500).json({ error: 'Failed to generate schemas' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
  console.log(`Schemas available at http://localhost:${PORT}/schemas`);
});
```

This setup allows any client (including IDEs or language servers) to fetch a specific schema (e.g., `/schemas/UserRequest.schema.json`) or all schemas (e.g., `/schemas`) directly from your running application.

## Generated File Naming Convention

Each generated schema file follows the format:

`{tag}.{operationId}.request.schema.json`
`{tag}.{operationId}.response.schema.json`

*   **Tag**: The first tag listed in the operation's `tags` array. If no tags are present, it defaults to `"default"`.
*   **OperationId**: The `operationId` specified in the operation. If missing, it's generated based on the HTTP method and path (e.g., `POST /users/{id}` becomes `postUsersById`).

## Example Output

Given an OpenAPI operation like this:

```yaml
paths:
  /users:
    post:
      tags:
        - user
      summary: Create a new user
      operationId: createUser
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserRequest'
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
```

The script will generate:

*   `schemas/user.createUser.request.schema.json`
*   `schemas/user.createUser.response.schema.json`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

## Automation (CI/CD & Pre-commit Hooks)

To ensure your OpenAPI schema definitions are always up-to-date, you can integrate this script into your build process or pre-commit hooks. This automates the generation of JSON schemas whenever your OpenAPI definition changes.

### Using with Pre-commit Hooks

1.  **Install `pre-commit`**: If you don't have it installed, follow the instructions on the [pre-commit website](https://pre-commit.com/).
2.  **Configure `.pre-commit-config.yaml`**: Add the following to your `.pre-commit-config.yaml` file in the root of your repository:

    ```yaml
    repos:
      - repo: https://github.com/nanna7077/openapi-jsonschema-generator
        rev: main
        hooks:
          - id: generate-openapi-schemas
            name: Generate OpenAPI JSON Schemas
            description: Generates standalone JSON schemas from OpenAPI specifications.
            entry: node generate-schemas.js ./openapi.json ./schemas
            language: node
            pass_filenames: false
            always_run: true
    ```
3. Install the hook
```bash
pre-commit install
```

### Using in Build Runs (e.g., GitHub Actions, GitLab CI)

You can add a step in your CI/CD pipeline to run the script. This is useful for ensuring schemas are generated and potentially deployed as static assets or checked for consistency.

**Example (GitHub Actions workflow)**:

```yaml
name: Generate OpenAPI Schemas

on:
  push:
    paths:
      - openapi.json
      - openapi.yaml

jobs:
  generate-schemas:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout project
        uses: actions/checkout@v3

      - name: Checkout generator
        uses: actions/checkout@v3
        with:
          repository: nanna7077/openapi-jsonschema-generator
          path: openapi-jsonschema-generator

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install generator dependencies
        run: npm install
        working-directory: openapi-jsonschema-generator

      - name: Generate JSON Schemas
        run: |
          node openapi-jsonschema-generator/generate-schemas.js ./openapi.json ./schemas

      - name: Upload generated schemas
        uses: actions/upload-artifact@v3
        with:
          name: generated-schemas
          path: ./schemas
```

Adjust the paths and commands based on your project structure and CI/CD platform.

By automating schema generation, you reduce the risk of manual errors and ensure that your documentation and tooling always reflect the latest API definitions.

## License

This project is licensed under the MIT License.
