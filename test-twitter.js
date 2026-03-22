const { PrismaClient } = require('@prisma/client');
const { Headers } = require('node-fetch');

async function test() {
  const prisma = new PrismaClient();
  const account = await prisma.account.findFirst({
    where: { provider: 'twitter', scope: 'cookie-auth' }
  });
  if (!account) return console.log('No cookie account');
  
  const headers = new Headers({
    "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "Cookie": `auth_token=${account.access_token}; ct0=${account.refresh_token}`,
    "x-csrf-token": account.refresh_token,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "Content-Type": "application/json",
  });

  const res = await fetch("https://api.twitter.com/1.1/account/settings.json", { headers });
  console.log("settings.json status:", res.status);
  const data = await res.json();
  console.log("screen_name:", data.screen_name);
}
test().catch(console.error).finally(() => process.exit(0));
