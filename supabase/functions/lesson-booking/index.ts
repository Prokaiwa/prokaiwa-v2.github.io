import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const DAVID_TEACHER_ID = '0a199b57-2263-44a1-998b-7c3fda15d31a';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📝 Edge Function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');
    
    console.log('✅ User authenticated:', user.email);
    
    const body = await req.json();
    const { action, bookingData } = body;
    
    console.log('📥 Action:', action);
    console.log('📦 Booking data:', bookingData);
    
    // ============================================
    // ACTION: GET AVAILABLE SLOTS
    // ============================================
    if (action === 'getAvailableSlots') {
      const { date } = bookingData;
      console.log('📅 Fetching slots for:', date);
      
      // Parse date string as YYYY-MM-DD and create in JST timezone
      const [year, month, day] = date.split('-').map(Number);
      
      // Get day of week for the requested date
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      
      console.log('📅 Day of week:', dayOfWeek);
      console.log('📅 Requested date:', `${year}-${month}-${day}`);
      
      const { data: availability, error: availError } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', DAVID_TEACHER_ID)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .single();
      
      if (availError || !availability) {
        console.log('❌ No availability found');
        return new Response(JSON.stringify({ success: true, slots: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log('📊 Availability:', availability);
      
      const startHour = parseInt(availability.start_time.split(':')[0]);
      const endHour = parseInt(availability.end_time.split(':')[0]);
      
      const slots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        // Create time in JST by building the date components explicitly
        // JST is UTC+9, so we subtract 9 hours to get the UTC representation
        const slotTimeUTC = new Date(Date.UTC(year, month - 1, day, hour - 9, 0, 0));
        
        slots.push({
          time: slotTimeUTC.toISOString(), // Store as UTC ISO string (correct for database)
          display: `${String(hour).padStart(2, '0')}:00` // Display in JST
        });
      }
      
      console.log('🕐 Sample slot:', slots[0]?.time, '=', slots[0]?.display, 'JST');
      
      const startOfDay = new Date(Date.UTC(year, month - 1, day, -9, 0, 0)); // Start of day JST in UTC
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 15, 0, 0)); // End of day JST in UTC (midnight next day)
      
      const { data: existingBookings } = await supabase
        .from('lesson_bookings')
        .select('scheduled_at')
        .eq('teacher_id', DAVID_TEACHER_ID)
        .eq('status', 'scheduled')
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString());
      
      console.log('📊 Existing bookings:', existingBookings?.length || 0);
      
      const bookedSlots = new Set(
        (existingBookings || []).map(b => new Date(b.scheduled_at).toISOString())
      );
      
      const availableSlots = slots.filter(slot => !bookedSlots.has(slot.time));
      
      console.log('✅ Generated slots:', availableSlots.length);
      
      return new Response(JSON.stringify({ success: true, slots: availableSlots }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // ============================================
    // ACTION: CREATE BOOKING
    // ============================================
    if (action === 'create') {
      const { studentId, scheduledAt, lessonType, duration } = bookingData;
      
      console.log('📝 Creating booking for student:', studentId);
      console.log('🕐 Scheduled at (UTC):', scheduledAt);
      
      // Check for available credits
      let useCredit = false;
      let creditError = null;
      
      if (lessonType === 'standard') {
        try {
          const { data: creditCheck } = await supabase
            .rpc('check_booking_eligibility', {
              p_student_id: studentId,
              p_lesson_type: 'standard'
            });
          
          console.log('💳 Credit check:', creditCheck);
          
          if (creditCheck && creditCheck.availableCredits > 0) {
            useCredit = true;
          }
        } catch (err) {
          console.error('⚠️ Credit check failed:', err);
          creditError = err;
        }
      }
      
      const isFree = lessonType === 'first_time_free';
      
      console.log('💰 Use credit:', useCredit, '| Is free:', isFree);
      
      // Create booking
      const { data, error } = await supabase
        .from('lesson_bookings')
        .insert({
          student_id: studentId,
          teacher_id: DAVID_TEACHER_ID,
          user_id: user.id,
          scheduled_at: scheduledAt,
          lesson_type: lessonType,
          duration_minutes: duration || 50,
          price: useCredit || isFree ? 0 : 4000,
          payment_status: useCredit || isFree ? 'paid' : 'pending',
          status: 'scheduled'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Booking created:', data.id);
      
      // Deduct credit if used
      if (useCredit) {
        console.log('💳 Deducting credit...');
        try {
          const { error: creditError } = await supabase.rpc('use_lesson_credit', {
            p_student_id: studentId
          });
          
          if (creditError) {
            console.error('⚠️ Credit deduction failed:', creditError);
          } else {
            console.log('✅ Credit deducted');
          }
        } catch (err) {
          console.error('⚠️ Credit deduction error:', err);
        }
      }
      
      // Call Google Calendar function
      console.log('📅 Creating Google Calendar event...');
      
      try {
        const calendarResponse = await fetch(
          `${supabaseUrl}/functions/v1/google-calendar`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              action: 'create',
              booking_id: data.id
            })
          }
        );
        
        const calendarResult = await calendarResponse.json();
        console.log('📅 Calendar result:', calendarResult);
        
        if (calendarResult.success) {
          console.log('✅ Calendar event created:', calendarResult.event_id);
          console.log('🔗 Meet link:', calendarResult.meet_link);
        } else {
          console.error('⚠️ Calendar creation failed:', calendarResult.error);
        }
      } catch (calError) {
        console.error('⚠️ Calendar creation failed:', calError.message);
      }
      
      return new Response(JSON.stringify({ success: true, booking: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // ============================================
    // ACTION: CANCEL BOOKING
    // ============================================
    if (action === 'cancel') {
      const { bookingId, reason } = bookingData;
      
      console.log('❌ Cancelling booking:', bookingId);
      
      const { data: booking, error: fetchError } = await supabase
        .from('lesson_bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError || !booking) {
        throw new Error('Booking not found or unauthorized');
      }
      
      console.log('📋 Booking found:', booking);
      
      const { error: updateError } = await supabase
        .from('lesson_bookings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id
        })
        .eq('id', bookingId);
      
      if (updateError) throw updateError;
      
      console.log('✅ Booking cancelled');
      
      // Refund credit if it was used
      if (booking.payment_status === 'paid' && booking.price === 0 && booking.lesson_type === 'standard') {
        console.log('💳 Refunding credit...');
        try {
          const { error: refundError } = await supabase.rpc('restore_lesson_credit', {
            p_student_id: booking.student_id
          });
          
          if (refundError) {
            console.error('⚠️ Credit refund failed:', refundError);
          } else {
            console.log('✅ Credit refunded');
          }
        } catch (err) {
          console.error('⚠️ Credit refund error:', err);
        }
      }
      
      // Delete from Google Calendar if event exists
      if (booking.google_calendar_event_id) {
        console.log('📅 Deleting Google Calendar event...');
        
        try {
          const calendarResponse = await fetch(
            `${supabaseUrl}/functions/v1/google-calendar`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                action: 'delete',
                event_id: booking.google_calendar_event_id
              })
            }
          );
          
          const calendarResult = await calendarResponse.json();
          console.log('📅 Calendar deletion result:', calendarResult);
        } catch (calError) {
          console.error('⚠️ Calendar deletion failed:', calError.message);
        }
      }
      
      let refundMessage = '';
      if (booking.payment_status === 'paid' && booking.price === 0) {
        refundMessage = ' 1 credit refunded to your account.';
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        refundMessage: refundMessage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // ============================================
    // ACTION: RESCHEDULE BOOKING
    // ============================================
    if (action === 'reschedule') {
      const { bookingId, newScheduledAt } = bookingData;
      
      console.log('📝 Rescheduling booking:', bookingId, 'to:', newScheduledAt);
      
      const { data: booking, error: fetchError } = await supabase
        .from('lesson_bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError || !booking) {
        throw new Error('Booking not found or unauthorized');
      }
      
      const { data: updatedBooking, error: updateError } = await supabase
        .from('lesson_bookings')
        .update({ scheduled_at: newScheduledAt })
        .eq('id', bookingId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      console.log('✅ Booking rescheduled');
      
      if (booking.google_calendar_event_id) {
        console.log('📅 Updating Google Calendar event...');
        
        try {
          const calendarResponse = await fetch(
            `${supabaseUrl}/functions/v1/google-calendar`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                action: 'update',
                event_id: booking.google_calendar_event_id,
                new_scheduled_at: newScheduledAt,
                duration: booking.duration_minutes
              })
            }
          );
          
          const calendarResult = await calendarResponse.json();
          console.log('📅 Calendar update result:', calendarResult);
        } catch (calError) {
          console.error('⚠️ Calendar update failed:', calError.message);
        }
      }
      
      return new Response(JSON.stringify({ success: true, booking: updatedBooking }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    throw new Error(`Unknown action: ${action}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});