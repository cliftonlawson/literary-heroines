const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });

const validResultIds = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);

const todayKey = (date) => date.toISOString().slice(0, 10);

async function countKeys(namespace, prefix) {
  let cursor;
  let count = 0;

  do {
    const page = await namespace.list({ prefix, cursor });
    count += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return count;
}

export async function onRequestPost({ request, env }) {
  if (!env.QUIZ_STATS) {
    return json({ ok: true, counted: false });
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    return json({ ok: true, counted: false });
  }

  const winnerId = Number(payload.winnerId);
  if (!validResultIds.has(winnerId)) {
    return json({ ok: true, counted: false });
  }

  const completedAt = new Date();
  const id = crypto.randomUUID();
  const resultName = String(payload.resultName || "").slice(0, 80);
  const topResults = Array.isArray(payload.topResults)
    ? payload.topResults.slice(0, 3).map((result) => ({
        id: Number(result.id),
        name: String(result.name || "").slice(0, 80),
        percent: Math.round(Number(result.percent) || 0),
      }))
    : [];

  await env.QUIZ_STATS.put(
    `completion:${todayKey(completedAt)}:${id}`,
    JSON.stringify({
      completedAt: completedAt.toISOString(),
      winnerId,
      resultName,
      topResults,
    }),
    {
      metadata: {
        date: todayKey(completedAt),
        winnerId,
        resultName,
      },
    }
  );

  return json({ ok: true, counted: true });
}

export async function onRequestGet({ request, env }) {
  if (!env.QUIZ_STATS) {
    return json({ error: "Quiz stats storage is not configured." }, 501);
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!env.QUIZ_STATS_ADMIN_TOKEN || token !== env.QUIZ_STATS_ADMIN_TOKEN) {
    return json({ error: "Not found." }, 404);
  }

  const today = todayKey(new Date());
  const total = await countKeys(env.QUIZ_STATS, "completion:");
  const todayTotal = await countKeys(env.QUIZ_STATS, `completion:${today}:`);

  const resultCounts = {};
  let cursor;

  do {
    const page = await env.QUIZ_STATS.list({ prefix: "completion:", cursor });
    page.keys.forEach((key) => {
      const id = key.metadata?.winnerId;
      if (Number.isInteger(id)) {
        resultCounts[id] = (resultCounts[id] || 0) + 1;
      }
    });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return json({
    ok: true,
    total,
    today,
    todayTotal,
    resultCounts,
  });
}
