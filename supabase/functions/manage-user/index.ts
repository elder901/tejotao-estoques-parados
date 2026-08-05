import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
    if (!caller) {
      return new Response(JSON.stringify({
        error: 'Sessão expirada. Saia e entre novamente para continuar.',
        detail: callerError?.message ?? 'token inválido'
      }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerenciar usuários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, user_id, name, password, is_admin } = await req.json()

    if (!user_id || !action) {
      return new Response(JSON.stringify({ error: 'action e user_id são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent admin from deleting themselves
    if (action === 'delete' && user_id === caller.id) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir sua própria conta' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_role') {
      if (typeof is_admin !== 'boolean') {
        return new Response(JSON.stringify({ error: 'Perfil inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (user_id === caller.id && is_admin === false) {
        return new Response(JSON.stringify({ error: 'Você não pode remover seu próprio acesso de administrador' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin })
        .eq('id', user_id)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_name') {
      if (!name?.trim()) {
        return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      // Update profile name
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user_id)
      if (error) throw error

      // Also update user metadata
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        user_metadata: { name: name.trim() }
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_password') {
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password })
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
