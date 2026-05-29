// Interactive Swagger UI for the /api/v1 REST API. Swagger UI assets are loaded
// from a pinned CDN build (client-side), so no extra npm dependency or bundle
// weight is added to the app. The page points at /api/v1/openapi.json.
export const dynamic = "force-static";

const SWAGGER_VERSION = "5.17.14";

const html = `<!DOCTYPE html>
<html lang="no">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Tilgangsstyring – API-dokumentasjon</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css"
    />
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script
      src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js"
      crossorigin
    ></script>
    <script
      src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-standalone-preset.js"
      crossorigin
    ></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/api/v1/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          persistAuthorization: true,
        });
      };
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
