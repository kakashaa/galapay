import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ========== IN-MEMORY CACHE للسرعة ==========
interface CacheEntry {
  data: unknown
  timestamp: number
  ttl: number // milliseconds
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = {
  stats: 30000,        // 30 ثانية للإحصائيات
  countries: 300000,   // 5 دقائق للدول
  banks: 300000,       // 5 دقائق للبنوك
  recent: 10000,       // 10 ثواني للطلبات الأخيرة
  hosts: 300000,       // 5 دقائق للمضيفات
  supporters: 300000,  // 5 دقائق للداعمين
}

function getFromCache(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl })
}

// ========== INTERFACES ==========
interface AdminCommand {
  action_type: 'admin_command'
  command: string
  tracking_code?: string
  admin_id: string
  parameters?: {
    rejection_reason?: string
    reservation_reason?: string
    admin_notes?: string
    final_receipt_url?: string
    image_url?: string
    reported_user_id?: string
    reporter_gala_id?: string
    ban_type?: 'promotion' | 'insult' | 'defamation'
    evidence_url?: string
    description?: string
    reward_amount?: number
    gala_user_id?: string
    gala_username?: string
    special_id_value?: string
    user_level?: number
    digit_length?: number
    pattern_code?: string
    gift_type?: 'vip' | 'special_id'
    // بيانات البحث
    search_query?: string
    status_filter?: string
    country_filter?: string
    limit?: number
    // تعديل المبلغ
    new_amount?: number
  }
}

// ========== HELPERS ==========
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
    console.error('Telegram error:', error)
  }
}

function getRequestType(trackingCode: string): { table: string, type: string } | null {
  const prefix = trackingCode.substring(0, 4).toUpperCase()
  switch (prefix) {
    case 'PAY-': return { table: 'payout_requests', type: 'payout' }
    case 'INS-': return { table: 'instant_payout_requests', type: 'instant' }
    case 'BAN-': return { table: 'ban_reports', type: 'ban' }
    case 'SID-': return { table: 'special_id_requests', type: 'special_id' }
    case 'CON-': return { table: 'coins_payout_requests', type: 'coins' }
    default: return null
  }
}

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

    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return new Response(
        JSON.stringify({ success: false, error: 'يجب إرسال JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawBody = await req.text()
    if (!rawBody?.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'الطلب فارغ',
          commands: {
            status: ['approve', 'reject', 'reserve', 'review', 'pending', 'paid'],
            ban: ['create_ban', 'verify_ban', 'reject_ban', 'reward'],
            gift: ['gift_vip', 'gift_special_id'],
            utility: ['note', 'upload_receipt', 'update_amount'],
            data: ['get_all', 'get_stats', 'get_pending', 'search', 'clear_cache']
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
        JSON.stringify({ success: false, error: 'JSON غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { command, tracking_code, admin_id, parameters } = body

    // ⛔ منع الحذف نهائياً
    const blockedCommands = ['delete', 'حذف', 'remove', 'إزالة', 'مسح', 'drop']
    if (blockedCommands.some(blocked => command.toLowerCase().includes(blocked))) {
      await sendTelegramNotification(`⛔ *محاولة حذف مرفوضة*\nالأمر: ${command}\n_الحذف غير مسموح_`)
      return new Response(
        JSON.stringify({ success: false, error: '⛔ الحذف غير مسموح نهائياً' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== أوامر البيانات السريعة (مع Cache) ==========
    
    // 🧹 مسح الكاش
    if (command === 'clear_cache') {
      cache.clear()
      return new Response(
        JSON.stringify({ success: true, message: '🧹 تم مسح الذاكرة المؤقتة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 📊 إحصائيات سريعة (cached)
    if (command === 'get_stats') {
      const cachedStats = getFromCache('stats')
      if (cachedStats) {
        return new Response(
          JSON.stringify({ success: true, cached: true, ...cachedStats as object }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const [payoutRes, instantRes, banRes, specialRes, coinsRes] = await Promise.all([
        supabaseAdmin.from('payout_requests').select('status, amount', { count: 'exact' }).is('deleted_at', null),
        supabaseAdmin.from('instant_payout_requests').select('status, supporter_amount_usd', { count: 'exact' }).is('deleted_at', null),
        supabaseAdmin.from('ban_reports').select('is_verified, ban_type', { count: 'exact' }).is('deleted_at', null),
        supabaseAdmin.from('special_id_requests').select('status', { count: 'exact' }).is('deleted_at', null),
        supabaseAdmin.from('coins_payout_requests').select('status, coins_amount', { count: 'exact' }),
      ])

      const stats = {
        payout: {
          total: payoutRes.data?.length || 0,
          pending: payoutRes.data?.filter(r => r.status === 'pending').length || 0,
          review: payoutRes.data?.filter(r => r.status === 'review').length || 0,
          paid: payoutRes.data?.filter(r => r.status === 'paid').length || 0,
          rejected: payoutRes.data?.filter(r => r.status === 'rejected').length || 0,
          reserved: payoutRes.data?.filter(r => r.status === 'reserved').length || 0,
          total_usd: payoutRes.data?.reduce((s, r) => s + Number(r.amount), 0) || 0,
        },
        instant: {
          total: instantRes.data?.length || 0,
          pending: instantRes.data?.filter(r => r.status === 'pending').length || 0,
          completed: instantRes.data?.filter(r => r.status === 'completed').length || 0,
          rejected: instantRes.data?.filter(r => r.status === 'rejected').length || 0,
          total_usd: instantRes.data?.reduce((s, r) => s + Number(r.supporter_amount_usd), 0) || 0,
        },
        ban: {
          total: banRes.data?.length || 0,
          verified: banRes.data?.filter(r => r.is_verified).length || 0,
          pending: banRes.data?.filter(r => !r.is_verified).length || 0,
        },
        special_id: {
          total: specialRes.data?.length || 0,
          pending: specialRes.data?.filter(r => r.status === 'pending').length || 0,
          approved: specialRes.data?.filter(r => r.status === 'approved').length || 0,
        },
        coins: {
          total: coinsRes.data?.length || 0,
          pending: coinsRes.data?.filter(r => r.status === 'pending').length || 0,
          total_coins: coinsRes.data?.reduce((s, r) => s + Number(r.coins_amount), 0) || 0,
        }
      }

      setCache('stats', stats, CACHE_TTL.stats)
      return new Response(
        JSON.stringify({ success: true, cached: false, stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 📋 جلب الطلبات المعلقة (أهم شي)
    if (command === 'get_pending') {
      const limit = parameters?.limit || 20
      
      const [payoutPending, instantPending, banPending, specialPending] = await Promise.all([
        supabaseAdmin.from('payout_requests')
          .select('tracking_code, zalal_life_account_id, zalal_life_username, amount, country, payout_method, agency_code, created_at')
          .eq('status', 'pending').is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(limit),
        supabaseAdmin.from('instant_payout_requests')
          .select('tracking_code, supporter_name, supporter_account_id, host_name, host_account_id, supporter_amount_usd, created_at')
          .eq('status', 'pending').is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(limit),
        supabaseAdmin.from('ban_reports')
          .select('id, reporter_gala_id, reported_user_id, ban_type, description, created_at')
          .eq('is_verified', false).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(limit),
        supabaseAdmin.from('special_id_requests')
          .select('id, gala_user_id, gala_username, user_level, digit_length, pattern_code, created_at')
          .eq('status', 'pending').is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(limit),
      ])

      return new Response(
        JSON.stringify({
          success: true,
          pending: {
            payout: payoutPending.data || [],
            instant: instantPending.data || [],
            ban: banPending.data || [],
            special_id: specialPending.data || [],
          },
          counts: {
            payout: payoutPending.data?.length || 0,
            instant: instantPending.data?.length || 0,
            ban: banPending.data?.length || 0,
            special_id: specialPending.data?.length || 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔍 بحث سريع
    if (command === 'search') {
      const { search_query, status_filter, country_filter, limit: searchLimit } = parameters || {}
      if (!search_query) {
        return new Response(
          JSON.stringify({ success: false, error: 'يجب تحديد search_query' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const safeLimit = Math.min(searchLimit || 20, 50)
      let query = supabaseAdmin.from('payout_requests')
        .select('*')
        .is('deleted_at', null)
        .or(`zalal_life_account_id.ilike.%${search_query}%,zalal_life_username.ilike.%${search_query}%,tracking_code.ilike.%${search_query}%`)
        .order('created_at', { ascending: false })
        .limit(safeLimit)

      if (status_filter) query = query.eq('status', status_filter)
      if (country_filter) query = query.eq('country', country_filter)

      const { data } = await query
      return new Response(
        JSON.stringify({ success: true, results: data || [], count: data?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 📦 جلب كل البيانات الأساسية مرة واحدة (للـ cache الخارجي)
    if (command === 'get_all') {
      const cachedAll = getFromCache('all_data')
      if (cachedAll) {
        return new Response(
          JSON.stringify({ success: true, cached: true, ...cachedAll as object }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const [countries, banks, hosts, supporters] = await Promise.all([
        supabaseAdmin.from('countries_methods').select('*').eq('is_active', true),
        supabaseAdmin.from('available_banks').select('*').eq('is_active', true),
        supabaseAdmin.from('hosts').select('*').eq('is_active', true).order('sort_order'),
        supabaseAdmin.from('supporters').select('*').eq('is_active', true).order('sort_order'),
      ])

      const allData = {
        countries: countries.data || [],
        banks: banks.data || [],
        hosts: hosts.data || [],
        supporters: supporters.data || [],
      }

      setCache('all_data', allData, CACHE_TTL.countries)
      return new Response(
        JSON.stringify({ success: true, cached: false, ...allData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== أوامر إنشاء البلاغات والإهداءات ==========

    // 🚨 بلاغ جديد
    if (command === 'create_ban') {
      const { reported_user_id, reporter_gala_id, ban_type, evidence_url, description } = parameters || {}
      if (!reported_user_id || !reporter_gala_id || !ban_type || !evidence_url) {
        return new Response(
          JSON.stringify({ success: false, error: 'بيانات ناقصة', required: ['reported_user_id', 'reporter_gala_id', 'ban_type', 'evidence_url'] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabaseAdmin.from('ban_reports').insert({
        reported_user_id, reporter_gala_id, ban_type, evidence_url,
        evidence_type: evidence_url.includes('.mp4') ? 'video' : 'image',
        description: description || 'بلاغ من البوت',
        is_verified: true
      }).select().single()

      if (error) throw error
      await sendTelegramNotification(`🚨 *بلاغ جديد*\n👤 \`${reported_user_id}\`\n📝 ${ban_type}\n✅ تم التحقق`)
      return new Response(JSON.stringify({ success: true, message: '🚨 تم البلاغ', ban_id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 🎁 إهداء VIP
    if (command === 'gift_vip') {
      const { gala_user_id, gala_username, admin_notes } = parameters || {}
      if (!gala_user_id) {
        return new Response(JSON.stringify({ success: false, error: 'يجب تحديد gala_user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data, error } = await supabaseAdmin.from('special_id_requests').insert({
        gala_user_id, gala_username, user_level: 999, digit_length: 0, pattern_code: 'VIP_GIFT',
        profile_screenshot_url: 'https://gift.local/vip', status: 'approved',
        processed_at: new Date().toISOString(), admin_notes: admin_notes || `إهداء VIP - ${admin_id}`
      }).select().single()

      if (error) throw error
      await sendTelegramNotification(`🎁 *إهداء VIP*\n👤 \`${gala_user_id}\`\n👑 ${admin_id}`)
      return new Response(JSON.stringify({ success: true, message: '🎁 تم إهداء VIP', request_id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 🎁 إهداء ايدي مميز
    if (command === 'gift_special_id') {
      const { gala_user_id, gala_username, special_id_value, admin_notes, digit_length, pattern_code } = parameters || {}
      if (!gala_user_id) {
        return new Response(JSON.stringify({ success: false, error: 'يجب تحديد gala_user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data, error } = await supabaseAdmin.from('special_id_requests').insert({
        gala_user_id, gala_username, user_level: 50, digit_length: digit_length || 6,
        pattern_code: pattern_code || 'GIFT', preferred_exact_id: special_id_value,
        profile_screenshot_url: 'https://gift.local/special-id', status: 'approved',
        processed_at: new Date().toISOString(), admin_notes: admin_notes || `إهداء ايدي - ${admin_id}${special_id_value ? ` - ${special_id_value}` : ''}`
      }).select().single()

      if (error) throw error
      await sendTelegramNotification(`🎁 *إهداء ايدي*\n👤 \`${gala_user_id}\`${special_id_value ? `\n🔢 \`${special_id_value}\`` : ''}\n👑 ${admin_id}`)
      return new Response(JSON.stringify({ success: true, message: '🎁 تم إهداء الايدي', request_id: data.id, special_id: special_id_value }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 📷 رفع إيصال
    if (command === 'upload_receipt') {
      const { image_url, final_receipt_url } = parameters || {}
      const imageToUpload = image_url || final_receipt_url
      
      if (!tracking_code || !imageToUpload) {
        return new Response(JSON.stringify({ success: false, error: 'يجب تحديد tracking_code و image_url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const requestInfo = getRequestType(tracking_code)
      if (!requestInfo) {
        return new Response(JSON.stringify({ success: false, error: 'كود غير صحيح' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { table, type } = requestInfo
      const updateField = type === 'payout' ? 'admin_final_receipt_image_url' : type === 'instant' ? 'admin_final_receipt_url' : null
      if (!updateField) {
        return new Response(JSON.stringify({ success: false, error: 'رفع الإيصال لطلبات السحب فقط' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { error } = await supabaseAdmin.from(table).update({ [updateField]: imageToUpload }).eq('tracking_code', tracking_code)
      if (error) throw error

      await sendTelegramNotification(`📷 *إيصال*\n📋 \`${tracking_code}\`\n👑 ${admin_id}`)
      return new Response(JSON.stringify({ success: true, message: '📷 تم رفع الإيصال' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 💰 تعديل المبلغ
    if (command === 'update_amount') {
      const { new_amount } = parameters || {}
      if (!tracking_code || !new_amount) {
        return new Response(JSON.stringify({ success: false, error: 'يجب تحديد tracking_code و new_amount' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const requestInfo = getRequestType(tracking_code)
      if (!requestInfo || requestInfo.type !== 'payout') {
        return new Response(JSON.stringify({ success: false, error: 'تعديل المبلغ لطلبات السحب الشهري فقط' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data, error } = await supabaseAdmin.from('payout_requests')
        .update({ amount: new_amount, admin_notes: parameters?.admin_notes || `تم تعديل المبلغ إلى ${new_amount}` })
        .eq('tracking_code', tracking_code).select().single()

      if (error) throw error
      await sendTelegramNotification(`💰 *تعديل مبلغ*\n📋 \`${tracking_code}\`\n💵 ${new_amount}\n👑 ${admin_id}`)
      return new Response(JSON.stringify({ success: true, message: `💰 تم تعديل المبلغ إلى ${new_amount}`, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ========== أوامر الحالة (تحتاج tracking_code) ==========
    if (!tracking_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'يجب تحديد tracking_code', commands_without_tracking: ['create_ban', 'gift_vip', 'gift_special_id', 'get_stats', 'get_pending', 'get_all', 'search', 'clear_cache'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestInfo = getRequestType(tracking_code)
    if (!requestInfo) {
      return new Response(JSON.stringify({ success: false, error: 'كود غير صحيح' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { table, type } = requestInfo
    let updateData: Record<string, unknown> = {}
    let statusMessage = ''

    switch (command.toLowerCase()) {
      // ✅ موافقة
      case 'approve': case 'paid': case 'complete': case 'تم': case 'موافق':
        if (type === 'payout') {
          updateData = { status: 'paid', processed_at: new Date().toISOString(), rejection_reason: null, admin_notes: parameters?.admin_notes, admin_final_receipt_image_url: parameters?.image_url }
          statusMessage = '✅ تم اعتماد طلب السحب'
        } else if (type === 'instant') {
          updateData = { status: 'completed', processed_at: new Date().toISOString(), rejection_reason: null, admin_notes: parameters?.admin_notes, admin_final_receipt_url: parameters?.image_url }
          statusMessage = '✅ تم اعتماد السحب الفوري'
        } else if (type === 'coins') {
          updateData = { status: 'completed', processed_at: new Date().toISOString(), admin_notes: parameters?.admin_notes }
          statusMessage = '✅ تم اعتماد الكوينزات'
        } else if (type === 'ban') {
          updateData = { is_verified: true, processed_at: new Date().toISOString(), admin_notes: parameters?.admin_notes }
          statusMessage = '✅ تم التحقق من البلاغ'
        } else if (type === 'special_id') {
          updateData = { status: 'approved', processed_at: new Date().toISOString(), admin_notes: parameters?.admin_notes || parameters?.special_id_value }
          statusMessage = '✅ تم اعتماد الايدي المميز'
        }
        break

      // ❌ رفض
      case 'reject': case 'رفض': case 'مرفوض':
        const reason = parameters?.rejection_reason || 'رفض من المسؤول'
        if (type === 'payout') {
          updateData = { status: 'rejected', processed_at: new Date().toISOString(), rejection_reason: reason }
          statusMessage = '❌ تم رفض الطلب'
        } else if (type === 'instant') {
          updateData = { status: 'rejected', processed_at: new Date().toISOString(), rejection_reason: reason }
          statusMessage = '❌ تم رفض السحب الفوري'
        } else if (type === 'coins') {
          updateData = { status: 'rejected', processed_at: new Date().toISOString(), admin_notes: reason }
          statusMessage = '❌ تم رفض الكوينزات'
        } else if (type === 'ban') {
          updateData = { is_verified: false, processed_at: new Date().toISOString(), admin_notes: reason }
          statusMessage = '❌ تم رفض البلاغ'
        } else if (type === 'special_id') {
          updateData = { status: 'rejected', processed_at: new Date().toISOString(), rejection_reason: reason }
          statusMessage = '❌ تم رفض الايدي'
        }
        break

      // ⏸️ حجز
      case 'reserve': case 'حجز': case 'محجوز':
        if (type === 'payout') {
          updateData = { status: 'reserved', reservation_reason: parameters?.reservation_reason || 'محجوز', admin_notes: parameters?.admin_notes }
          statusMessage = '⏸️ تم حجز الطلب'
        } else {
          return new Response(JSON.stringify({ success: false, error: 'الحجز لطلبات السحب فقط' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        break

      // 🔍 مراجعة
      case 'review': case 'مراجعة':
        if (type === 'payout') {
          updateData = { status: 'review', admin_notes: parameters?.admin_notes }
          statusMessage = '🔍 تم نقل للمراجعة'
        } else if (type === 'instant') {
          updateData = { status: 'processing', admin_notes: parameters?.admin_notes }
          statusMessage = '🔍 قيد المعالجة'
        } else {
          return new Response(JSON.stringify({ success: false, error: 'المراجعة غير متاحة' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        break

      // ↩️ إرجاع للانتظار
      case 'pending': case 'انتظار':
        updateData = { status: 'pending', rejection_reason: null, reservation_reason: null, processed_at: null }
        statusMessage = '↩️ تم الإرجاع للانتظار'
        break

      // 🎁 مكافأة
      case 'reward': case 'مكافأة':
        if (type === 'ban') {
          updateData = { reward_paid: true, reward_amount: parameters?.reward_amount || 0, admin_notes: `مكافأة: ${parameters?.reward_amount || 0}` }
          statusMessage = `🎁 تم صرف ${parameters?.reward_amount || 0}`
        } else {
          return new Response(JSON.stringify({ success: false, error: 'المكافأة للبلاغات فقط' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        break

      // 📝 ملاحظة
      case 'note': case 'ملاحظة':
        updateData = { admin_notes: parameters?.admin_notes || '' }
        statusMessage = '📝 تم إضافة ملاحظة'
        break

      // ✅ تحقق بلاغ
      case 'verify_ban':
        if (type === 'ban') {
          updateData = { is_verified: true, processed_at: new Date().toISOString(), admin_notes: parameters?.admin_notes }
          statusMessage = '✅ تم التحقق'
        } else {
          return new Response(JSON.stringify({ success: false, error: 'للبلاغات فقط' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        break

      // ❌ رفض بلاغ
      case 'reject_ban':
        if (type === 'ban') {
          updateData = { is_verified: false, processed_at: new Date().toISOString(), admin_notes: parameters?.rejection_reason }
          statusMessage = '❌ تم رفض البلاغ'
        } else {
          return new Response(JSON.stringify({ success: false, error: 'للبلاغات فقط' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: `الأمر "${command}" غير معروف`, commands: { status: ['approve', 'reject', 'reserve', 'review', 'pending'], ban: ['verify_ban', 'reject_ban', 'reward'], utility: ['note', 'update_amount'] } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // تنفيذ التحديث
    let query
    if (type === 'ban') {
      const banId = tracking_code.replace('BAN-', '')
      query = supabaseAdmin.from(table).update(updateData).eq('id', banId).select().single()
    } else {
      query = supabaseAdmin.from(table).update(updateData).eq('tracking_code', tracking_code).select().single()
    }

    const { data, error } = await query
    if (error) throw error
    if (!data) {
      return new Response(JSON.stringify({ success: false, error: 'الطلب غير موجود' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // إشعار تيليجرام
    await sendTelegramNotification(
      `${statusMessage}\n📋 \`${tracking_code}\`\n👑 ${admin_id}` +
      (parameters?.rejection_reason ? `\n📝 ${parameters.rejection_reason}` : '') +
      (parameters?.reservation_reason ? `\n📝 ${parameters.reservation_reason}` : '') +
      (parameters?.admin_notes ? `\n💬 ${parameters.admin_notes}` : '')
    )

    // مسح cache الإحصائيات بعد أي تعديل
    cache.delete('stats')

    return new Response(
      JSON.stringify({ success: true, message: statusMessage, tracking_code, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'خطأ' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
