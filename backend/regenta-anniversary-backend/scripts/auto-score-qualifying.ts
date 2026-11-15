import "dotenv/config";

const API_BASE = process.env.API_BASE_URL || "http://localhost:8080";

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD first.");
  process.exit(1);
}


async function request(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}: ${JSON.stringify(data)}`
    );
  }

  return data;
}


function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// Deterministic sample scores: repeatable for testing.
function sampleScore(index) {
  const scores = [
    [2, 1],
    [1, 1],
    [3, 0],
    [0, 2],
    [2, 2],
    [1, 0],
    [4, 1],
    [0, 0],
    [1, 3],
    [2, 0],
  ];

  return scores[index % scores.length];
}

async function main() {
  console.log("Logging in...");

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  const token = login.token;

  if (!token) {
    throw new Error("Login succeeded but no token was returned.");
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  console.log("Fetching qualifying fixtures...");

  const fixtureResponse = await request("/api/fixtures?stage=qualifying", {
    headers: authHeaders,
  });

  const fixtures = getArray(fixtureResponse, "fixtures");

  if (!fixtures.length) {
    console.log("No qualifying fixtures found.");
    return;
  }

  const pending = fixtures.filter(
    (fixture) => fixture.status !== "completed"
  );

  console.log(`Total qualifying fixtures: ${fixtures.length}`);
  console.log(`Already completed: ${fixtures.length - pending.length}`);
  console.log(`Pending to score: ${pending.length}`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const fixture = pending[i];
    const [goalsA, goalsB] = sampleScore(i);

    try {
      await request(`/api/fixtures/${fixture.id}/score`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ goalsA, goalsB }),
      });

      success++;

      console.log(
        `✓ ${fixture.playerA?.displayName || fixture.playerAId} ${goalsA}-${goalsB} ${
          fixture.playerB?.displayName || fixture.playerBId
        }`
      );
    } catch (error) {
      failed++;
      console.error(`✗ Fixture ${fixture.id}: ${error.message}`);
    }
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Successfully scored: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Already completed: ${fixtures.length - pending.length}`);
  console.log("=============================");

  console.log(
    "\nNext: Open Admin → Fixtures → Generate Super League."
  );
}

main().catch((error) => {
  console.error("\nScript failed:", error.message);
  process.exit(1);
});
