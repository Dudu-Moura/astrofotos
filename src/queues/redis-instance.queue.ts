import { createClient } from "redis";

const client = createClient();

client.on('error', (err) => console.log('An error ocurred on Redis', err));

await client.connect();

export { client };