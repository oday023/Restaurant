import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing credentials' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: employeeData, error: employeeError } = await adminClient
      .from('employees')
      .select('id, email, username, tenant_id, role, auth_user_id')
      .or(`username.eq.${username},email.eq.${username}`)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (employeeError || !employeeData) {
      return new Response(JSON.stringify({ ok: false, error: 'Employee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: verifiedData, error: verifyError } = await adminClient.rpc('verify_employee_login', {
      p_username: username,
      p_password: password,
    });

    if (verifyError || !verifiedData || (Array.isArray(verifiedData) ? verifiedData.length === 0 : !verifiedData)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let authUserId = employeeData.auth_user_id;
    if (!authUserId) {
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email: employeeData.email,
        password,
        email_confirm: true,
        user_metadata: { employee_id: employeeData.id, tenant_id: employeeData.tenant_id, role: employeeData.role },
      });

      if (createUserError || !createdUser.user?.id) {
        return new Response(JSON.stringify({ ok: false, error: createUserError?.message || 'Unable to create Supabase Auth user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      authUserId = createdUser.user.id;
      await adminClient.from('employees').update({ auth_user_id: authUserId }).eq('id', employeeData.id);
    }

    return new Response(JSON.stringify({ ok: true, email: employeeData.email, authUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
