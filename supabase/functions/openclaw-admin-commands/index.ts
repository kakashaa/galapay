import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminCommand {
  action_type: 'admin_command'
  command: string
  tracking_code?: string
  admin_id: string
  parameters?: {
    // Common
    rejection_reason?: string
    reservation_reason?: string
    admin_notes?: string
    // Image upload (URL or base64)
    final_receipt_url?: string
    image_url?: string
    // Ban reports
    reported_user_id?: string
    reporter_gala_id?: string
    ban_type?: 'promotion' | 'insult' | 'defamation'
    evidence_url?: string
    description?: string
    reward_amount?: number
    // Special ID / VIP gift
    gala_user_id?: string
    gala_username?: string
    special_id_value?: string
    user_level?: number
    digit_length?: number
    pattern_code?: string
    gift_type?: 'vip' | 'special_id'
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

// Generate random tracking code
function generateTrackingCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${result}`
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

    // Validate content type
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'يجب إرسال البيانات بصيغة JSON' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawBody = await req.text()
    if (!rawBody || rawBody.trim() === '') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'الطلب فارغ',
          available_commands: {
            status_commands: ['approve', 'reject', 'reserve', 'review', 'pending', 'paid', 'complete'],
            ban_commands: ['create_ban', 'verify_ban', 'reject_ban', 'reward_ban'],
            gift_commands: ['gift_vip', 'gift_special_id'],
            utility_commands: ['note', 'upload_receipt']
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body: AdminCommand
    try {
      body = JSON.parse(rawBody)
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'بيانات JSON غير صحيحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Received admin command:', JSON.stringify(body))
    
    if (body.action_type !== 'admin_command') {
      return new Response(
        JSON.stringify({ success: false, error: 'نوع الطلب غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { command, tracking_code, admin_id, parameters } = body

    // ❌ Block ALL delete commands
    const blockedCommands = ['delete', 'حذف', 'remove', 'إزالة', 'مسح']
    if (blockedCommands.some(blocked => command.toLowerCase().includes(blocked))) {
      await sendTelegramNotification(`⛔ *محاولة حذف مرفوضة*\n\nالأمر: ${command}\nالكود: ${tracking_code}\n\n_الحذف غير مسموح للبوت_`)
      return new Response(
        JSON.stringify({ success: false, error: '⛔ الحذف غير مسموح' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== NEW: CREATE BAN REPORT ==========
    if (command.toLowerCase() === 'create_ban' || command === 'بلاغ_جديد') {
      const { reported_user_id, reporter_gala_id, ban_type, evidence_url, description } = parameters || {}
      
      if (!reported_user_id || !reporter_gala_id || !ban_type || !evidence_url) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'بيانات ناقصة للبلاغ',
            required: ['reported_user_id', 'reporter_gala_id', 'ban_type', 'evidence_url']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('ban_reports')
        .insert({
          reported_user_id,
          reporter_gala_id,
          ban_type,
          evidence_url,
          evidence_type: evidence_url.includes('.mp4') || evidence_url.includes('.mov') ? 'video' : 'image',
          description: description || 'تم الإبلاغ عبر البوت',
          is_verified: true // Admin reports are auto-verified
        })
        .select()
        .single()

      if (error) throw error

      await sendTelegramNotification(
        `🚨 *بلاغ جديد من البوت*\n\n` +
        `👤 المُبلَّغ عنه: \`${reported_user_id}\`\n` +
        `📝 النوع: ${ban_type}\n` +
        `✅ تم التحقق تلقائياً`
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '🚨 تم إنشاء البلاغ وتأكيده',
          ban_id: data.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== NEW: GIFT VIP ==========
    if (command.toLowerCase() === 'gift_vip' || command === 'إهداء_vip') {
      const { gala_user_id, gala_username, admin_notes } = parameters || {}
      
      if (!gala_user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'يجب تحديد ايدي المستخدم' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create approved special ID request as VIP gift
      const trackingCode = generateTrackingCode('SID')
      const { data, error } = await supabaseAdmin
        .from('special_id_requests')
        .insert({
          gala_user_id,
          gala_username: gala_username || null,
          user_level: 999, // VIP level
          digit_length: 0,
          pattern_code: 'VIP_GIFT',
          profile_screenshot_url: 'https://gift-from-admin.local/vip',
          status: 'approved',
          processed_at: new Date().toISOString(),
          admin_notes: admin_notes || `إهداء VIP من المسؤول ${admin_id}`
        })
        .select()
        .single()

      if (error) throw error

      await sendTelegramNotification(
        `🎁 *إهداء VIP*\n\n` +
        `👤 الايدي: \`${gala_user_id}\`\n` +
        `${gala_username ? `📛 الاسم: ${gala_username}\n` : ''}` +
        `👑 المسؤول: ${admin_id}`
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '🎁 تم إهداء VIP بنجاح',
          gala_user_id,
          request_id: data.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== NEW: GIFT SPECIAL ID ==========
    if (command.toLowerCase() === 'gift_special_id' || command === 'إهداء_ايدي') {
      const { gala_user_id, gala_username, special_id_value, admin_notes, digit_length, pattern_code } = parameters || {}
      
      if (!gala_user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'يجب تحديد ايدي المستخدم' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const trackingCode = generateTrackingCode('SID')
      const { data, error } = await supabaseAdmin
        .from('special_id_requests')
        .insert({
          gala_user_id,
          gala_username: gala_username || null,
          user_level: 50, // Default level for gift
          digit_length: digit_length || 6,
          pattern_code: pattern_code || 'GIFT',
          preferred_exact_id: special_id_value || null,
          profile_screenshot_url: 'https://gift-from-admin.local/special-id',
          status: 'approved',
          processed_at: new Date().toISOString(),
          admin_notes: admin_notes || `إهداء ايدي مميز من المسؤول ${admin_id}${special_id_value ? ` - الايدي: ${special_id_value}` : ''}`
        })
        .select()
        .single()

      if (error) throw error

      await sendTelegramNotification(
        `🎁 *إهداء ايدي مميز*\n\n` +
        `👤 الايدي: \`${gala_user_id}\`\n` +
        `${special_id_value ? `🔢 الايدي المميز: \`${special_id_value}\`\n` : ''}` +
        `👑 المسؤول: ${admin_id}`
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '🎁 تم إهداء الايدي المميز بنجاح',
          gala_user_id,
          special_id: special_id_value,
          request_id: data.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== NEW: UPLOAD RECEIPT IMAGE ==========
    if (command.toLowerCase() === 'upload_receipt' || command === 'رفع_إيصال') {
      const { image_url, final_receipt_url } = parameters || {}
      const imageToUpload = image_url || final_receipt_url
      
      if (!tracking_code || !imageToUpload) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'يجب تحديد كود التتبع ورابط الصورة',
            required: ['tracking_code', 'image_url']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const requestInfo = getRequestType(tracking_code)
      if (!requestInfo) {
        return new Response(
          JSON.stringify({ success: false, error: 'كود التتبع غير صحيح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { table, type } = requestInfo
      let updateData: Record<string, unknown> = {}

      if (type === 'payout') {
        updateData = { admin_final_receipt_image_url: imageToUpload }
      } else if (type === 'instant') {
        updateData = { admin_final_receipt_url: imageToUpload }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'رفع الإيصال متاح فقط لطلبات السحب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabaseAdmin
        .from(table)
        .update(updateData)
        .eq('tracking_code', tracking_code)
        .select()
        .single()

      if (error) throw error

      await sendTelegramNotification(
        `📷 *تم رفع إيصال*\n\n` +
        `📋 الكود: \`${tracking_code}\`\n` +
        `👑 المسؤول: ${admin_id}`
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '📷 تم رفع الإيصال بنجاح',
          tracking_code
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== EXISTING COMMANDS REQUIRE TRACKING CODE ==========
    if (!tracking_code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'يجب تحديد كود التتبع',
          commands_without_tracking: ['create_ban', 'gift_vip', 'gift_special_id']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
            admin_final_receipt_image_url: parameters?.final_receipt_url || parameters?.image_url || null
          }
          statusMessage = '✅ تم اعتماد طلب السحب الشهري'
        } else if (type === 'instant') {
          updateData = {
            status: 'completed',
            processed_at: new Date().toISOString(),
            rejection_reason: null,
            admin_notes: parameters?.admin_notes || null,
            admin_final_receipt_url: parameters?.final_receipt_url || parameters?.image_url || null
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

      // ⏸️ RESERVE
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

      // 🎁 REWARD (ban reports)
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

      // ↩️ PENDING
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

      // ✅ VERIFY BAN
      case 'verify_ban':
      case 'تحقق_بلاغ':
        if (type === 'ban') {
          updateData = {
            is_verified: true,
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.admin_notes || 'تم التحقق من البلاغ'
          }
          statusMessage = '✅ تم التحقق من البلاغ'
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'هذا الأمر للبلاغات فقط' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      // ❌ REJECT BAN
      case 'reject_ban':
      case 'رفض_بلاغ':
        if (type === 'ban') {
          updateData = {
            is_verified: false,
            processed_at: new Date().toISOString(),
            admin_notes: parameters?.rejection_reason || 'البلاغ غير صحيح'
          }
          statusMessage = '❌ تم رفض البلاغ'
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'هذا الأمر للبلاغات فقط' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `الأمر "${command}" غير معروف`,
            available_commands: {
              status: 'approve, reject, reserve, review, pending',
              ban: 'create_ban, verify_ban, reject_ban, reward',
              gift: 'gift_vip, gift_special_id',
              utility: 'note, upload_receipt'
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Execute update
    let query;
    if (type === 'ban') {
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

    // Send confirmation
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
