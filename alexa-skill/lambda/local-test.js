const { _test } = require("./index");

async function main() {
  const action = process.argv[2] || "lock";
  if (!Object.values(_test.intentToAction).includes(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const result = await _test.sendCommand(action);
  console.log(JSON.stringify({
    ok: result.ok,
    message: result.message,
    action: result.command?.action,
    status: result.command?.status,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
