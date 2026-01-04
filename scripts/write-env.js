import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), "env.js");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openAiKey =
  process.env.OPENAI_API_KEY ??
  process.env.NEXT_PUBLIC_OPENAI_API_KEY ??
  process.env.AI_API_KEY;

const hasKeys = Boolean(supabaseUrl && supabaseAnonKey);
const shouldSkip = !hasKeys && fs.existsSync(envPath);

if (shouldSkip) {
  console.log("env.js vorhanden, Supabase-Keys wurden nicht überschrieben.");
  process.exit(0);
}

const content = `// Automatisch generiert von scripts/write-env.js
// Supabase Public Config (anon key + URL)
window.ENV = window.ENV || {};
window.ENV.NEXT_PUBLIC_SUPABASE_URL = ${JSON.stringify(supabaseUrl ?? "")};
window.ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey ?? "")};
window.ENV.OPENAI_API_KEY = ${JSON.stringify(openAiKey ?? "")};
`;

fs.writeFileSync(envPath, content, "utf8");
console.log(
  `env.js ${hasKeys ? "mit" : "ohne"} Supabase-Keys geschrieben. GPT-Key ${
    openAiKey ? "gesetzt" : "fehlt"
  }.`
);
