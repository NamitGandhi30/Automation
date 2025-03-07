import axios from 'axios'
import { NextResponse, NextRequest } from 'next/server'
import url from 'url'

export async function GET(req: NextRequest) {
  try {
    // Enhanced logging for debugging
    console.log("Full request URL:", req.url);
    console.log("All search params:", Object.fromEntries(req.nextUrl.searchParams.entries()));
    
    const code = req.nextUrl.searchParams.get('code')
    const error = req.nextUrl.searchParams.get('error')
    const error_description = req.nextUrl.searchParams.get('error_description')
    
    console.log("Auth code:", code);
    console.log("Error if any:", error, error_description);
    
    if (!code) {
      // Enhanced error logging with more context
      console.error('No code received from Discord', { 
        error, 
        error_description,
        url: req.url 
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/connections?error=no_code&reason=${encodeURIComponent(error_description || 'Unknown')}`)
    }
    
    const data = new url.URLSearchParams()
    data.append('client_id', process.env.DISCORD_CLIENT_ID!)
    data.append('client_secret', process.env.DISCORD_CLIENT_SECRET!)
    data.append('grant_type', 'authorization_code')
    data.append(
      'redirect_uri',
      `${process.env.NEXT_PUBLIC_URL}/api/auth/callback/discord`
    )
    data.append('code', code.toString())
    data.append('scope', 'identify guilds webhook.incoming') // Explicitly specify scopes

    console.log('Sending token request to Discord with params:', {
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_URL}/api/auth/callback/discord`,
      code: code.substring(0, 5) + '...',
      scope: 'identify guilds webhook.incoming'
    })

    const output = await axios.post(
      'https://discord.com/api/oauth2/token',
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    console.log('Discord token response type:', typeof output.data);
    console.log('Discord token response keys:', Object.keys(output.data));

    if (output.data) {
      const access = output.data.access_token
      
      // Get user guilds (servers)
      const userGuilds = await axios.get(
        `https://discord.com/api/users/@me/guilds`,
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      )

      console.log('User guilds count:', userGuilds.data.length);
      if (userGuilds.data.length > 0) {
        console.log('First guild example:', {
          id: userGuilds.data[0].id,
          name: userGuilds.data[0].name
        });
      }
      
      // Check if we have webhook data - this part may be problematic
      if (output.data.webhook) {
        console.log('Webhook data received:', {
          id: output.data.webhook.id,
          guild_id: output.data.webhook.guild_id,
          channel_id: output.data.webhook.channel_id
        });
        
        const userGuild = userGuilds.data.filter(
          (guild: any) => guild.id == output.data.webhook.guild_id
        )
        
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_URL}/connections?webhook_id=${output.data.webhook.id}&webhook_url=${encodeURIComponent(output.data.webhook.url)}&webhook_name=${encodeURIComponent(output.data.webhook.name)}&guild_id=${output.data.webhook.guild_id}&guild_name=${encodeURIComponent(userGuild[0]?.name || 'Unknown')}&channel_id=${output.data.webhook.channel_id}`
        )
      } else {
        console.log('No webhook data in response, redirecting with token only');
        // If there's no webhook data, just redirect with the access token
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_URL}/connections?discord_token=${access}&guild_count=${userGuilds.data.length}`
        )
      }
    }

    // Default fallback response
    console.log('No data received from Discord, redirecting to connections');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/connections`)
  } catch (error: any) {
    console.error('Discord OAuth error:', error.response?.data || error.message);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    }
    
    // Always return a response even when an error occurs
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/connections?error=${encodeURIComponent(error.message)}`
    )
  }
}