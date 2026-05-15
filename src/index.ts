import { Context, Hono } from "hono";
import z from "zod";
import { deepLXTranslator } from "./deeplx";

type Env = { Bindings: Cloudflare.Env };

const app = new Hono<Env>().basePath("/hi");

const translateSchema = z.object({
  text: z.string().min(1),
  source_lang: z.string().optional(),
  target_lang: z.string().optional(),
  sourceLang: z.string().optional(),
  targetLang: z.string().optional(),
});

app.post("/translate", async (c) => {
  // token auth: query param or Authorization header
  const token = c.env.TOKEN;
  if (token) {
    const queryToken = c.req.query("token");
    const authHeader = c.req.header("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (queryToken !== token && bearerToken !== token) {
      return c.json({ code: 401, message: "Unauthorized" }, 401);
    }
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ code: 400, message: "Invalid JSON" }, 400);
  }

  const parsed = translateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error }, 400);
  }

  const { text } = parsed.data;
  const sourceLang = parsed.data.source_lang ?? parsed.data.sourceLang ?? "auto";
  const targetLang = parsed.data.target_lang ?? parsed.data.targetLang ?? "ZH";

  const res = await deepLXTranslator.translate({ sourceLang, targetLang, text });
  return c.json(res, { status: res.code });
});

export default app;
