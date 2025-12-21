import swaggerJSDoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";
import path from "path";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My Next.js API",
      version: "1.0.0",
      description: "API documentation for my Next.js app",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],

    //  Token required to perform other operations
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },

  // 🔍 VERY IMPORTANT: scan route.ts files explicitly
  apis: [path.join(process.cwd(), "app/api/**/route.ts")],
};

export const swaggerSpec = swaggerJSDoc(options);
