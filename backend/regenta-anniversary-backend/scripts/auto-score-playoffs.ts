import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});
const API_BASE =
  process.env.API_BASE_URL || "http://localhost:8080";

const EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD || process.env.PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Admin email/password not found in backend .env");
  process.exit(1);
}

async function request(path: string, options: any = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot connect to ${API_BASE}. Start your backend server first.`
    );
  }

  const text = await response.text();
  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      `${response.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

function getRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.fixtures)) return data.fixtures;
  return [];
}

async function main() {
  console.log("\n==================================");
  console.log(" REGENTA FC SUPER LEAGUE AUTO TEST");
  console.log("==================================\n");

  console.log("Logging in...");

  const login: any = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  const token = login.token;

  if (!token) {
    throw new Error("Login failed. No authentication token returned.");
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  console.log("Login successful.\n");

  // Fetch Super League fixtures
  const data = await request("/api/fixtures?stage=super_league");
  const fixtures = getRows(data);

  const superFixtures = fixtures.filter(
    (f: any) => f.stage === "super_league"
  );

  if (!superFixtures.length) {
    console.log("No Super League fixtures found.");
    console.log("Generate Super League fixtures from Admin first.");
    return;
  }

  console.log(`Found ${superFixtures.length} Super League fixtures.`);

  const playersResponse: any = await request("/api/players");
  const players = Array.isArray(playersResponse)
    ? playersResponse
    : playersResponse.players || [];

  function name(id: any) {
    const p = players.find(
      (x: any) => Number(x.id) === Number(id)
    );
    return p?.displayName || p?.name || `Player ${id}`;
  }

  // Scores cycle through wins, losses and draws.
  const sampleScores = [
    [2, 1],
    [1, 1],
    [3, 0],
    [0, 2],
    [2, 2],
    [1, 0],
    [0, 0],
    [3, 2],
    [1, 2],
    [2, 0],
  ];

  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < superFixtures.length; i++) {
    const fixture = superFixtures[i];

    if (
      String(fixture.status).toLowerCase() === "completed"
    ) {
      skipped++;
      continue;
    }

    if (!fixture.playerAId || !fixture.playerBId) {
      console.log(`Skipping fixture ${fixture.id}: missing players.`);
      skipped++;
      continue;
    }

    const [goalsA, goalsB] =
      sampleScores[i % sampleScores.length];

    try {
      await request(`/api/fixtures/${fixture.id}/score`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          goalsA,
          goalsB,
        }),
      });

      completed++;

      const result =
        goalsA > goalsB ? "WIN" :
        goalsA < goalsB ? "LOSS" : "DRAW";

      console.log(
        `✓ ${name(fixture.playerAId)} ${goalsA}-${goalsB} ` +
        `${name(fixture.playerBId)} | ${result}`
      );
    } catch (error: any) {
      failed++;
      console.error(
        `✗ Fixture ${fixture.id}: ${error.message}`
      );
    }
  }

  console.log("\n========== SCORE SUMMARY ==========");
  console.log(`New scores entered: ${completed}`);
  console.log(`Already completed / skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Refresh all fixtures and check completion.
  const refreshed: any = await request("/api/fixtures");
  const allFixtures = getRows(refreshed);

  const latestSuper = allFixtures.filter(
    (f: any) => f.stage === "super_league"
  );

  const allComplete =
    latestSuper.length > 0 &&
    latestSuper.every(
      (f: any) => String(f.status).toLowerCase() === "completed"
    );

  if (!allComplete) {
    console.log("\nSuper League is not fully completed.");
    console.log("Check failed or pending matches before generating playoffs.");
    return;
  }

  console.log("\n✓ ALL SUPER LEAGUE MATCHES COMPLETED");

  // Display updated standings.
  console.log("\nFetching Super League standings...");

  const standings: any = await request(
    "/api/standings?stage=super_league"
  );

  const table = Array.isArray(standings)
    ? standings
    : standings.standings || [];

  console.log("\n========== SUPER LEAGUE TOP 8 ==========");

  table.slice(0, 8).forEach((p: any, i: number) => {
    console.log(
      `${String(i + 1).padStart(2, "0")}. ` +
      `${p.playerName || name(p.playerId)} | ` +
      `MP ${p.played ?? 0} | W ${p.wins ?? 0} | ` +
      `D ${p.draws ?? 0} | L ${p.losses ?? 0} | ` +
      `PTS ${p.points ?? 0} | GD ${p.goalDifference ?? 0}`
    );
  });

  // Generate quarter-finals from the top 8.
  console.log("\nGenerating playoff quarter-finals...");

  try {
    const result: any = await request("/api/playoffs/generate", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });

    console.log("✓ Playoffs generated successfully.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log("Could not generate playoffs automatically:");
    console.log(error.message);
    console.log("If playoffs already exist, check Admin → Fixtures.");
  }

  console.log("\n==================================");
  console.log(" SUPER LEAGUE TEST FINISHED");
  console.log("==================================");
}

main().catch(error => {
  console.error("\nScript failed:", error.message);
  process.exit(1);
});
