import { createServerFn } from '@tanstack/react-start';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export const verifyTelegramAuth = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { telegramUser: TelegramUser; role: string } }) => {
    const { telegramUser, role } = ctx.data;
    const botToken = process.env.BOT_TOKEN;

    if (!botToken) throw new Error('Bot token not configured');

    // 1. Verify Telegram hash
    const { hash, ...userData } = telegramUser;
    const dataCheckString = Object.keys(userData)
      .sort()
      .map((k) => `${k}=${userData[k as keyof typeof userData]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) throw new Error('Invalid Telegram auth');

    // 2. Check auth_date (must be within 1 day)
    if (Date.now() / 1000 - telegramUser.auth_date > 86400) {
      throw new Error('Telegram auth expired');
    }

    // 3. Supabase admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const email = `telegram_${telegramUser.id}@tenaspecial.app`;
    const fullName =
      `${telegramUser.first_name} ${telegramUser.last_name ?? ''}`.trim();

    // 4. Find existing user by telegram_id in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', String(telegramUser.id))
      .maybeSingle();

    let userEmail = email;

    if (!existingProfile) {
      // Create new auth user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: crypto.randomBytes(32).toString('hex'),
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            telegram_id: telegramUser.id,
            telegram_username: telegramUser.username ?? null,
            account_type: role,
          },
        });
      if (createError) throw createError;

      // Update profile with telegram_id
      await supabaseAdmin
        .from('profiles')
        .update({
          telegram_id: String(telegramUser.id),
          telegram_username: telegramUser.username ?? null,
        })
        .eq('id', newUser.user.id);
    } else {
      // Get existing user email
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
        existingProfile.id
      );
      if (authUser?.user?.email) userEmail = authUser.user.email;
    }

    // 5. Generate magic link token
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      });
    if (linkError) throw linkError;

    return {
      token: linkData?.properties?.hashed_token,
      email: userEmail,
    };
  }
);
