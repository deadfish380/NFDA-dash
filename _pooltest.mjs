import postgres from "postgres";
process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
async function run(max, rounds=6) {
  const sql = postgres(url, { prepare: false, ssl: "require", max });
  let ok=0, fail=0, lastErr="";
  for (let i=0;i<rounds;i++){
    try {
      await Promise.all([
        sql`SELECT * FROM organizations ORDER BY created_at`,
        sql`SELECT * FROM websites ORDER BY created_at`,
      ]);
      ok++;
    } catch(e){ fail++; lastErr = e.message; }
  }
  await sql.end();
  console.log(`max=${max}: ok=${ok} fail=${fail}${lastErr?"  lastErr="+lastErr.slice(0,80):""}`);
}
await run(1);
await run(5);
