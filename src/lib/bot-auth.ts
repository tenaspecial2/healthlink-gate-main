import { createServerFn } from '@tanstack/react-start';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

/** Generate a login token and store it in Supabase */
export const generateLoginToken = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { role: string } }) => {
    const { role } = ctx.data;
    const token = crypto.randomBytes(16).toString('hex');
    const supabase = adminClient();

    const { error } = await supabase.from('login_tokens').insert({
      token,
      role,
    });
    if (error) throw error;

    return { token };
  }
);

/** Poll — returns telegram_id when bot has verified the token */
export const pollLoginToken = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { token: string } }) => {
    const { token } = ctx.data;
    const supabase = adminClient();

    const { data, error } = await supabase
      .from('login_tokens')
      .select('telegram_id, telegram_name, telegram_username, role, used, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Token not found');
    if (data.used) throw new Error('Token already used');
    if (new Date(data.expires_at) < new Date()) throw new Error('Token expired');

    return {
      verified: !!data.telegram_id,
      telegram_id: data.telegram_id,
      telegram_name: data.telegram_name,
      role: data.role,
    };
  }
);

/** Create Supabase session from verified token */
export const createSessionFromToken = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { token: string } }) => {
    const { token } = ctx.data;
    const supabase = adminClient();

    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('login_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .maybeSingle();

    if (tokenError || !tokenData?.telegram_id) throw new Error('Invalid token');

    const email = `telegram_${tokenData.telegram_id}@tenaspecial.app`;

    // Find or create user
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', tokenData.telegram_id)
      .maybeSingle();

    if (!existingProfile) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomBytes(32).toString('hex'),
        email_confirm: true,
        user_metadata: {
          full_name: tokenData.telegram_name ?? 'Telegram User',
          telegram_id: tokenData.telegram_id,
          telegram_username: tokenData.telegram_username,
          account_type: tokenData.role,
        },
      });
      if (createError) throw createError;

      await supabase
        .from('profiles')
        .update({
          telegram_id: tokenData.telegram_id,
          telegram_username: tokenData.telegram_username,
        })
        .eq('id', newUser.user.id);
    }

    // Mark token as used
    await supabase.from('login_tokens').update({ used: true }).eq('token', token);

    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkError) throw linkError;

    return { hashed_token: linkData?.properties?.hashed_token };
  }
);
