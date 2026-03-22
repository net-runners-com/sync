import { PrismaClient } from '@prisma/client';
import { Scraper } from 'agent-twitter-client';

async function test() {
  const prisma = new PrismaClient();
  const account = await prisma.account.findFirst({
    where: { provider: 'twitter' }
  });
  if (!account) {
    console.log('Twitter account not found in DB');
    return;
  }
  
  const authToken = account.access_token;
  const ct0 = account.refresh_token;
  console.log('DB Tokens found. auth_token:', authToken?.substring(0, 5) + '...', 'ct0:', ct0?.substring(0, 5) + '...');

  const scraper = new Scraper();
  
  const cookies = [
    `auth_token=${authToken}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
    `ct0=${ct0}; Domain=.twitter.com; Path=/; Secure; HttpOnly`
  ];
  
  await scraper.setCookies(cookies);
  const scrapedCookies = await scraper.getCookies();
  console.log('Parsed cookies count:', scrapedCookies.length);
  
  try {
    const isLoggedIn = await scraper.isLoggedIn();
    console.log('isLoggedIn:', isLoggedIn);
    
    if (isLoggedIn) {
      const me = await scraper.me();
      console.log('me:', me?.username);
    } else {
      console.log('Not logged in. Cookies might be invalid or network request failed.');
    }
  } catch (e) {
    console.error('Error checking login:', e);
  }
}
test().catch(console.error).finally(() => process.exit(0));
