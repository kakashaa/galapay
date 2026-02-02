import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed admin Telegram IDs (add your admin IDs here)
const ALLOWED_ADMIN_IDS = ['YOUR_TELEGRAM_ADMIN_ID'] // Will be validated by bot

interface AdminCommand {
  action_type: 'admin_command'
  command: string // approve, reject, reserve, review, ban, reward, paid, complete, etc.
  tracking_code: string
  admin_id: string
  parameters?: {
    rejection_reason?: string
    reservation_reason?: string
    admin_notes?: string
    reward_amount?: number
    special_id_value?: string
    final_receipt_url?: string
  }
}

// Send Telegram notification
async function sendTelegramNotification(message: string): Promise<void> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  
  if (!botToken || !chatId) return
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })
  } catch (error) {
    console.error('Telegram notification error:', error)
  }
}

// Determine request type from tracking code prefix
function getRequestType(trackingCode: string): { table: string, type: string } | null {
  const prefix = trackingCode.substring(0, 4).toUpperCase()
  
  switch (prefix) {
    case 'PAY-':
      return { table: 'payout_requests', type: 'payout' }
    case 'INS-':
      return { table: 'instant_payout_requests', type: 'instant' }
    case 'BAN-':
      return { table: 'ban_reports', type: 'ban' }
    case 'SID-':
      return { table: 'special_id_requests', type: 'special_id' }
    case 'CON-':
      return { table: 'coins_payout_requests', type: 'coins' }
    default:
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body: AdminCommand = await req.json()
    
    // Validate action type
    if (body.action_type !== 'admin_command') {
      return new Response(
        JSON.stringify({ success: false, error: 'نوع الطلب غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { command, tracking_code, admin_id, parameters } = body

    // ❌ CRITICAL: Block ALL delete commands
    const blockedCommands = ['delete', 'حذف', 'remove', 'إزالة', 'مسح']
    if (blockedCommands.some(blocked => command.toLowerCase().includes(blocked))) {
      await sendTelegramNotification(`⛔ *محاولة حذف مرفوضة*\n\nالأمر: ${command}\nالكود: ${tracking_code}\n\n_الحذف غير مسموح للبوت_`)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '⛔ عفواً، الحذف غير مسموح. يمكنك فقط تحديث الحالات (قبول، رفض، حجز، إلخ)' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request type from tracking code
    const requestInfo = getRequestType(tracking_code)
    if (!requestInfo) {
      return new Response(
        JSON.stringify({ success: false, error: 'كود التتبع غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { table, type } = requestInfo
    let updateData: Record<string, unknown> = {}
    let statusMessage = ''

    // Handle commands based on type
    switch (command.toLowerCase()) {
      // ✅ APPROVE / PAID / COMPLETE
      case 'approve':
      case 'paid':
      case 'complete':
      case 'تم':
      case 'موافق':
      case 'مكتمل':
        if (type === 'payout') {
          updateData = {
            status: 'paid',
            processed_at: new Date().toISOString(),
            rejection_reason: null,
            admin_notes: parameters?.admin_notes || null,
            admin_final_receipt_image_url: parameters?.final_receipt_url || null
          }
          statusMessage = '✅ تم اعتماد طلب السحب الشهري'
        } else if (type === 'instant') {
          updateData = {
            status: 'completed',
            processed_at: new Date().toISOString(),
            rejection_reason: null,
            admin_notes: parameters?.admin_notes || null,
            admin_final_receipt_url: parameters?.final_receipt_url || null
          }
          statusMessage = '✅ تم اعتماد طلب السحب الفوري'
        } else if (type === 'coins') {
          updateData = {
            status: 'completed',
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.admin_notes || null
          }
          statusMessage = '✅ تم اعتماد طلب الكوينزات'
        } else if (type === 'ban') {
          updateData = {
            is_verified: true,
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.admin_notes || null
          }
          statusMessage = '✅ تم التحقق من البلاغ'
        } else if (type === 'special_id') {
          updateData = {
            status: 'approved',
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.admin_notes || (parameters?.special_id_value ? `الايدي المخصص: ${parameters.special_id_value}` : null)
          }
          statusMessage = '✅ تم اعتماد طلب الايدي المميز'
        }
        break

      // ❌ REJECT
      case 'reject':
      case 'رفض':
      case 'مرفوض':
        if (type === 'payout') {
          updateData = {
            status: 'rejected',
            processed_at: new Date().toISOString(),
            rejection_reason: parameters?.rejection_reason || 'تم الرفض من قبل المسؤول',
            admin_final_receipt_image_url: null
          }
          statusMessage = '❌ تم رفض طلب السحب الشهري'
        } else if (type === 'instant') {
          updateData = {
            status: 'rejected',
            processed_at: new Date().toISOString(),
            rejection_reason: parameters?.rejection_reason || 'تم الرفض من قبل المسؤول',
            admin_final_receipt_url: null
          }
          statusMessage = '❌ تم رفض طلب السحب الفوري'
        } else if (type === 'coins') {
          updateData = {
            status: 'rejected',
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.rejection_reason || 'تم الرفض من قبل المسؤول'
          }
          statusMessage = '❌ تم رفض طلب الكوينزات'
        } else if (type === 'ban') {
          updateData = {
            is_verified: false,
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.rejection_reason || 'البلاغ غير صحيح'
          }
          statusMessage = '❌ تم رفض البلاغ'
        } else if (type === 'special_id') {
          updateData = {
            status: 'rejected',
            processed_at: new Date().toISOString(),
            rejection_reason: parameters?.rejection_reason || 'تم الرفض من قبل المسؤول'
          }
          statusMessage = '❌ تم رفض طلب الايدي المميز'
        }
        break

      // ⏸️ RESERVE (payout only)
      case 'reserve':
      case 'حجز':
      case 'محجوز':
        if (type === 'payout') {
          updateData = {
            status: 'reserved',
            reservation_reason: parameters?.reservation_reason || 'محجوز للمراجعة',
            admin_notes: parameters?.admin_notes || null
          }
          statusMessage = '⏸️ تم حجز الطلب للمراجعة'
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'الحجز متاح فقط لطلبات السحب الشهري' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      // 🔍 REVIEW
      case 'review':
      case 'مراجعة':
        if (type === 'payout') {
          updateData = {
            status: 'review',
            admin_notes: parameters?.admin_notes || null
          }
          statusMessage = '🔍 تم نقل الطلب للمراجعة'
        } else if (type === 'instant') {
          updateData = {
            status: 'processing',
            admin_notes: parameters?.admin_notes || null
          }
          statusMessage = '🔍 الطلب قيد المعالجة'
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'المراجعة غير متاحة لهذا النوع' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      // 🎁 REWARD (ban reports only)
      case 'reward':
      case 'مكافأة':
        if (type === 'ban') {
          updateData = {
            reward_paid: true,
            reward_amount: parameters?.reward_amount || 0,
            admin_notes: parameters?.admin_notes || `تم صرف مكافأة: ${parameters?.reward_amount || 0}`
          }
          statusMessage = `🎁 تم صرف المكافأة: ${parameters?.reward_amount || 0}`
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'المكافأة متاحة فقط للبلاغات' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      // 📝 ADD NOTE
      case 'note':
      case 'ملاحظة':
        updateData = {
          admin_notes: parameters?.admin_notes || ''
        }
        statusMessage = '📝 تم إضافة ملاحظة'
        break

      // ↩️ PENDING (reset to pending)
      case 'pending':
      case 'انتظار':
        if (type === 'payout') {
          updateData = {
            status: 'pending',
            rejection_reason: null,
            reservation_reason: null,
            processed_at: null
          }
        } else if (type === 'instant') {
          updateData = {
            status: 'pending',
            rejection_reason: null,
            processed_at: null
          }
        } else if (type === 'special_id' || type === 'coins') {
          updateData = {
            status: 'pending',
            rejection_reason: null,
            processed_at: null
          }
        }
        statusMessage = '↩️ تم إرجاع الطلب للانتظار'
        break

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `الأمر "${command}" غير معروف. الأوامر المتاحة: approve/paid, reject, reserve, review, reward, note, pending` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Execute update (using tracking_code for lookup)
    let query;
    if (type === 'ban') {
      // Ban reports use 'id' not 'tracking_code'
      const trackingId = tracking_code.replace('BAN-', '')
      query = supabaseAdmin
        .from(table)
        .update(updateData)
        .eq('id', trackingId)
        .select()
        .single()
    } else {
      query = supabaseAdmin
        .from(table)
        .update(updateData)
        .eq('tracking_code', tracking_code)
        .select()
        .single()
    }

    const { data, error } = await query

    if (error) {
      console.error('Update error:', error)
      return new Response(
        JSON.stringify({ success: false, error: `فشل التحديث: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: 'الطلب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send confirmation to Telegram
    await sendTelegramNotification(
      `${statusMessage}\n\n` +
      `📋 *الكود:* \`${tracking_code}\`\n` +
      `👤 *المسؤول:* ${admin_id}\n` +
      (parameters?.rejection_reason ? `📝 *السبب:* ${parameters.rejection_reason}\n` : '') +
      (parameters?.admin_notes ? `💬 *ملاحظة:* ${parameters.admin_notes}\n` : '')
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: statusMessage,
        tracking_code,
        updated_data: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'خطأ غير معروف'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
