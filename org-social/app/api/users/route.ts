// app/api/users/route.ts

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of users
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   name:
 *                     type: string
 */
export async function GET() {
  return new Response(
    JSON.stringify([
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Doe" },
    ]),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
