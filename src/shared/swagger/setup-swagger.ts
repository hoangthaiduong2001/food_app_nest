import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const BEARER_AUTH_NAME = 'access-token';
const API_KEY_AUTH_NAME = 'api-key';

const customJsStr = `
  (function () {
    var SCHEME = '${BEARER_AUTH_NAME}';

    function tryAutoAuth(url, body) {
      try {
        if (!url) return;
        if (url.indexOf('/auth/login') === -1 && url.indexOf('/auth/refresh') === -1) return;
        var parsed = typeof body === 'string' ? JSON.parse(body) : body;
        var token = (parsed && parsed.data && parsed.data.accessToken) || (parsed && parsed.accessToken);
        if (!token) return;
        if (window.ui && typeof window.ui.preauthorizeApiKey === 'function') {
          window.ui.preauthorizeApiKey(SCHEME, token);
        }
      } catch (_) {}
    }

    var originalFetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      var input = args[0];
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      return originalFetch.apply(this, args).then(function (response) {
        try {
          if (response.status >= 200 && response.status < 300) {
            response.clone().text().then(function (text) {
              tryAutoAuth(url, text);
            });
          }
        } catch (_) {}
        return response;
      });
    };
  })();
`;

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NestShop API')
    .setDescription('Mini e-commerce backend — REST API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      BEARER_AUTH_NAME,
    )

    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      API_KEY_AUTH_NAME,
    )
    .addServer('http://localhost:3003', 'Local')
    .addTag('Auth', 'Authentication & authorization')
    .addTag('User', 'User management')
    .addTag('Brand', 'Brand catalog')
    .addTag('Category', 'Category catalog (nested)')
    .addTag(
      'Product',
      'Product catalog (variants, categories, cursor pagination)',
    )
    .addTag('Inventory', 'Stock management with pessimistic lock')
    .addTag('Upload', 'S3 presigned URL for direct file upload')
    .addTag('Health', 'Liveness & readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'NestShop API Docs',
    customJsStr,
  });
}
