
/**
 * Get the current URL of the application.
 * Priority order:
 * 1. Vercel URL
 * 2. Next.js public URL
 * 3. Default local URL
 * 
 * @returns The current URL of the application.
 */
export const getCurrentUrl =():string=>{
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl && vercelUrl.trim() !== '') {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  if(process.env.NEXT_PUBLIC_APP_URL){
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return 'http://localhost:3000';
}