import swaggerJSDoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My Next.js API",
      version: "1.0.0",
      description: "API documentation for my Next.js app",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./app/api/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
