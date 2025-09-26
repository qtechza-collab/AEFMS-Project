import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'

const app = new Hono()

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}))
app.use('*', logger(console.log))

// Constants
const SA_TAX_RATE = 0.15; // 15% VAT
const COMPANY_INFO = {
  name: 'Logan Freights Logistics CC',
  country: 'South Africa',
  currency: 'ZAR',
  tax_rate: SA_TAX_RATE,
  registration_number: '2015/123456/23',
  vat_number: '4567891234'
};

// Helper functions
const generateId = () => crypto.randomUUID();

const authenticateUser = async (request: Request) => {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return null;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return null;
  }
  
  // Get user details from our users table
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return userData;
};

const sendEmailNotification = async (recipientId: string, emailType: string, subject: string, body: string, claimId?: string) => {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert({
        recipient_id: recipientId,
        email_type: emailType,
        subject,
        body,
        related_claim_id: claimId,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging email:', error);
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};

const createNotification = async (userId: string, type: string, title: string, message: string, priority: string = 'medium', claimId?: string, amount?: number) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        priority,
        related_claim_id: claimId,
        amount
      });
    
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const createActivity = async (type: string, employeeId: string, action: string, amount?: number, claimId?: string, metadata?: any) => {
  try {
    const { data: employee } = await supabase
      .from('users')
      .select('name, department')
      .eq('id', employeeId)
      .single();
    
    const { error } = await supabase
      .from('recent_activities')
      .insert({
        type,
        employee_id: employeeId,
        action,
        amount,
        claim_id: claimId,
        department: employee?.department || 'Unknown',
        metadata: metadata || {}
      });
    
    if (error) {
      console.error('Error creating activity:', error);
    }
  } catch (error) {
    console.error('Error creating activity:', error);
  }
};

// Initialize storage buckets
const initializeStorage = async () => {
  try {
    const buckets = ['logan-receipts-6223d981', 'logan-profiles-6223d981', 'logan-financials-6223d981'];
    
    for (const bucketName of buckets) {
      const { data: existingBuckets } = await supabase.storage.listBuckets();
      const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (error) {
          console.error(`Error creating bucket ${bucketName}:`, error);
        } else {
          console.log(`Created bucket: ${bucketName}`);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

// Initialize on startup
initializeStorage();

// Routes

// Health check
app.get('/make-server-6223d981/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Logan Freights API' })
})

// Authentication routes
app.post('/make-server-6223d981/auth/signup', async (c) => {
  try {
    const { email, password, name, employee_id, department, position, role = 'employee', phone } = await c.req.json();
    
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since we don't have email server configured
      user_metadata: { name, employee_id }
    });
    
    if (authError) {
      return c.json({ success: false, error: authError.message }, 400);
    }
    
    // Create user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        name,
        employee_id,
        department,
        position,
        role,
        phone
      })
      .select()
      .single();
    
    if (userError) {
      return c.json({ success: false, error: userError.message }, 400);
    }
    
    return c.json({ success: true, data: { user, auth_user: authUser.user } });
  } catch (error) {
    console.error('Error during signup:', error);
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }
});

app.post('/make-server-6223d981/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    
    // Get user profile
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return c.json({ 
      success: true, 
      data: { 
        user, 
        session: data.session,
        access_token: data.session.access_token 
      } 
    });
  } catch (error) {
    console.error('Error during signin:', error);
    return c.json({ success: false, error: 'Failed to sign in' }, 500);
  }
});

// File upload endpoint
app.post('/make-server-6223d981/upload', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('type') as string || 'other';
    const claimId = formData.get('claim_id') as string;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }
    
    // Determine bucket based on upload type
    let bucketName = 'logan-receipts-6223d981';
    if (uploadType === 'profile') {
      bucketName = 'logan-profiles-6223d981';
    } else if (uploadType === 'financial_document') {
      bucketName = 'logan-financials-6223d981';
    }
    
    const fileId = generateId();
    const fileName = `${fileId}-${file.name}`;
    const filePath = `${user.id}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ success: false, error: uploadError.message }, 500);
    }
    
    // Create signed URL
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600 * 24 * 365); // 1 year expiry
    
    // Save file metadata
    const { data: fileRecord, error: fileError } = await supabase
      .from('file_uploads')
      .insert({
        filename: fileName,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: urlData?.signedUrl || '',
        bucket_name: bucketName,
        uploaded_by: user.id,
        related_claim_id: claimId,
        upload_type: uploadType
      })
      .select()
      .single();
    
    if (fileError) {
      console.error('File record error:', fileError);
      return c.json({ success: false, error: fileError.message }, 500);
    }
    
    return c.json({
      success: true,
      data: {
        id: fileRecord.id,
        url: urlData?.signedUrl,
        filename: file.name,
        type: file.type,
        size: file.size,
        upload_type: uploadType
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return c.json({ success: false, error: 'Failed to upload file' }, 500);
  }
});

// Financial data upload endpoint
app.post('/make-server-6223d981/financials/upload', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user || !['manager', 'hr', 'administrator'].includes(user.role)) {
      return c.json({ success: false, error: 'Unauthorized - Manager, HR, or Admin access required' }, 401);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const fiscalYear = parseInt(formData.get('fiscal_year') as string);
    const period = formData.get('period') as string;
    const notes = formData.get('notes') as string;
    
    if (!file || !fiscalYear || !period) {
      return c.json({ success: false, error: 'File, fiscal year, and period are required' }, 400);
    }
    
    // Upload file first
    const fileId = generateId();
    const fileName = `financials-${fiscalYear}-${period}-${fileId}.${file.name.split('.').pop()}`;
    const filePath = `financials/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logan-financials-6223d981')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      return c.json({ success: false, error: uploadError.message }, 500);
    }
    
    // Create signed URL
    const { data: urlData } = await supabase.storage
      .from('logan-financials-6223d981')
      .createSignedUrl(filePath, 3600 * 24 * 365);
    
    // Parse financial data from form (you would typically parse the Excel file here)
    const financialData = JSON.parse(formData.get('data') as string || '{}');
    
    // Insert/update financial record
    const { data: financial, error: financialError } = await supabase
      .from('company_financials')
      .upsert({
        fiscal_year: fiscalYear,
        period,
        revenue: financialData.revenue || 0,
        expenses: financialData.expenses || 0,
        net_profit: financialData.net_profit || 0,
        gross_profit: financialData.gross_profit || 0,
        operating_expenses: financialData.operating_expenses || 0,
        tax_expense: financialData.tax_expense || 0,
        cost_of_sales: financialData.cost_of_sales || 0,
        administrative_expenses: financialData.administrative_expenses || 0,
        other_income: financialData.other_income || 0,
        finance_costs: financialData.finance_costs || 0,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData?.signedUrl,
        notes
      })
      .select()
      .single();
    
    if (financialError) {
      return c.json({ success: false, error: financialError.message }, 500);
    }
    
    // Create activity log
    await createActivity('financial_upload', user.id, `Uploaded financial data for ${fiscalYear} ${period}`, null, null, {
      fiscal_year: fiscalYear,
      period,
      file_name: file.name
    });
    
    return c.json({ success: true, data: financial });
  } catch (error) {
    console.error('Error uploading financial data:', error);
    return c.json({ success: false, error: 'Failed to upload financial data' }, 500);
  }
});

// Get financial data
app.get('/make-server-6223d981/financials', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user || !['manager', 'hr', 'administrator'].includes(user.role)) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const { data: financials, error } = await supabase
      .from('company_financials')
      .select(`
        *,
        uploaded_by_user:users!company_financials_uploaded_by_fkey(name, employee_id)
      `)
      .order('fiscal_year', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: financials });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return c.json({ success: false, error: 'Failed to fetch financial data' }, 500);
  }
});

// Claims management
app.get('/make-server-6223d981/claims', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const status = c.req.query('status');
    let query = supabase
      .from('expense_claims')
      .select(`
        *,
        employee:users!expense_claims_employee_id_fkey(name, employee_id, department, email),
        manager:users!expense_claims_manager_id_fkey(name, employee_id),
        receipt_files:file_uploads(id, filename, file_url, file_type, file_size)
      `);
    
    // Apply role-based filtering
    if (user.role === 'employee') {
      query = query.eq('employee_id', user.id);
    } else if (user.role === 'manager') {
      query = query.or(`employee_id.eq.${user.id},manager_id.eq.${user.id}`);
    }
    // hr and administrator can see all claims
    
    if (status) {
      query = query.eq('status', status);
    }
    
    query = query.order('submitted_at', { ascending: false });
    
    const { data: claims, error } = await query;
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // Calculate tax amounts
    const enrichedClaims = claims.map(claim => ({
      ...claim,
      tax_amount: claim.amount * SA_TAX_RATE,
      total_with_tax: claim.amount * (1 + SA_TAX_RATE)
    }));
    
    return c.json({ success: true, data: enrichedClaims });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return c.json({ success: false, error: 'Failed to fetch claims' }, 500);
  }
});

app.post('/make-server-6223d981/claims', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const claimData = await c.req.json();
    
    // Get manager for this employee
    const managerId = user.manager_id;
    
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .insert({
        employee_id: user.id,
        amount: claimData.amount,
        currency: claimData.currency || 'ZAR',
        category: claimData.category,
        description: claimData.description,
        vendor: claimData.vendor,
        payment_method: claimData.payment_method,
        expense_date: claimData.expense_date,
        notes: claimData.notes,
        manager_id: managerId,
        tax_amount: claimData.amount * SA_TAX_RATE
      })
      .select(`
        *,
        employee:users!expense_claims_employee_id_fkey(name, employee_id, department)
      `)
      .single();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // Create notifications for managers
    if (managerId) {
      await createNotification(
        managerId,
        'expense_submitted',
        'New Expense Claim',
        `${user.name} submitted a new expense claim for R${claimData.amount}`,
        'medium',
        claim.id,
        claimData.amount
      );
      
      await sendEmailNotification(
        managerId,
        'expense_submitted',
        'New Expense Claim Submitted',
        `A new expense claim has been submitted by ${user.name} for approval. Amount: R${claimData.amount}. Please review in the system.`,
        claim.id
      );
    }
    
    // Create activity
    await createActivity('claim_submitted', user.id, `Submitted expense claim for R${claimData.amount}`, claimData.amount, claim.id);
    
    return c.json({ success: true, data: claim });
  } catch (error) {
    console.error('Error creating claim:', error);
    return c.json({ success: false, error: 'Failed to create claim' }, 500);
  }
});

// Claim approval
app.patch('/make-server-6223d981/claims/:id/approve', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user || !['manager', 'hr', 'administrator'].includes(user.role)) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const claimId = c.req.param('id');
    const { comments } = await c.req.json();
    
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .update({
        status: 'approved',
        manager_id: user.id,
        manager_comments: comments,
        approved_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .select(`
        *,
        employee:users!expense_claims_employee_id_fkey(name, employee_id, email)
      `)
      .single();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // Notify employee
    await createNotification(
      claim.employee_id,
      'claim_approved',
      'Expense Claim Approved',
      `Your expense claim for R${claim.amount} has been approved by ${user.name}`,
      'high',
      claimId,
      claim.amount
    );
    
    await sendEmailNotification(
      claim.employee_id,
      'claim_approved', 
      'Expense Claim Approved',
      `Your expense claim for R${claim.amount} has been approved. ${comments ? 'Manager comments: ' + comments : ''}`,
      claimId
    );
    
    // Create activity
    await createActivity('claim_approved', user.id, `Approved expense claim for R${claim.amount}`, claim.amount, claimId);
    
    return c.json({ success: true, data: claim });
  } catch (error) {
    console.error('Error approving claim:', error);
    return c.json({ success: false, error: 'Failed to approve claim' }, 500);
  }
});

app.patch('/make-server-6223d981/claims/:id/reject', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user || !['manager', 'hr', 'administrator'].includes(user.role)) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const claimId = c.req.param('id');
    const { reason } = await c.req.json();
    
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .update({
        status: 'rejected',
        manager_id: user.id,
        manager_comments: reason,
        rejected_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .select(`
        *,
        employee:users!expense_claims_employee_id_fkey(name, employee_id, email)
      `)
      .single();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // Notify employee
    await createNotification(
      claim.employee_id,
      'claim_rejected',
      'Expense Claim Rejected',
      `Your expense claim for R${claim.amount} has been rejected. Reason: ${reason}`,
      'medium',
      claimId,
      claim.amount
    );
    
    await sendEmailNotification(
      claim.employee_id,
      'claim_rejected',
      'Expense Claim Rejected',
      `Your expense claim for R${claim.amount} has been rejected. Reason: ${reason}`,
      claimId
    );
    
    // Create activity
    await createActivity('claim_rejected', user.id, `Rejected expense claim for R${claim.amount}`, claim.amount, claimId);
    
    return c.json({ success: true, data: claim });
  } catch (error) {
    console.error('Error rejecting claim:', error);
    return c.json({ success: false, error: 'Failed to reject claim' }, 500);
  }
});

// Notifications
app.get('/make-server-6223d981/notifications', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const unreadOnly = c.req.query('unread_only') === 'true';
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);
    
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    query = query.order('created_at', { ascending: false }).limit(50);
    
    const { data: notifications, error } = await query;
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ success: false, error: 'Failed to fetch notifications' }, 500);
  }
});

app.patch('/make-server-6223d981/notifications/:id/read', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const notificationId = c.req.param('id');
    
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ success: false, error: 'Failed to mark notification as read' }, 500);
  }
});

// Analytics
app.get('/make-server-6223d981/analytics/summary', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    // Use the database function for calculations
    const { data: totals, error } = await supabase.rpc('calculate_expense_totals');
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    const summary = totals[0];
    
    return c.json({
      success: true,
      data: {
        pendingClaims: summary.count_pending,
        approvedClaims: summary.count_approved,
        rejectedClaims: summary.count_rejected,
        totalClaims: summary.count_pending + summary.count_approved + summary.count_rejected,
        pendingAmount: parseFloat(summary.total_pending),
        approvedAmount: parseFloat(summary.total_approved),
        rejectedAmount: parseFloat(summary.total_rejected),
        totalAmount: parseFloat(summary.total_pending) + parseFloat(summary.total_approved) + parseFloat(summary.total_rejected),
        tax_amount: parseFloat(summary.total_approved) * SA_TAX_RATE,
        approval_rate: summary.count_approved > 0 ? Math.round((summary.count_approved / (summary.count_pending + summary.count_approved + summary.count_rejected)) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return c.json({ success: false, error: 'Failed to fetch analytics summary' }, 500);
  }
});

// Recent activities
app.get('/make-server-6223d981/activities', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    let query = supabase
      .from('recent_activities')
      .select(`
        *,
        employee:users!recent_activities_employee_id_fkey(name, employee_id, department)
      `);
    
    // Apply role-based filtering
    if (user.role === 'employee') {
      query = query.eq('employee_id', user.id);
    }
    // Managers, HR, and admin can see all activities
    
    query = query.order('timestamp', { ascending: false }).limit(100);
    
    const { data: activities, error } = await query;
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return c.json({ success: false, error: 'Failed to fetch activities' }, 500);
  }
});

// Expense categories
app.get('/make-server-6223d981/categories', async (c) => {
  try {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500);
  }
});

// User management
app.get('/make-server-6223d981/users', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user || !['hr', 'administrator'].includes(user.role)) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        manager:users!users_manager_id_fkey(name, employee_id)
      `)
      .order('name');
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ success: false, error: 'Failed to fetch users' }, 500);
  }
});

// Current user profile
app.get('/make-server-6223d981/profile', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

// Update user profile
app.patch('/make-server-6223d981/profile', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const updates = await c.req.json();
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// Export data endpoint
app.get('/make-server-6223d981/export/:type', async (c) => {
  try {
    const user = await authenticateUser(c.req.raw);
    if (!user || !['hr', 'administrator'].includes(user.role)) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const exportType = c.req.param('type');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    
    let data = [];
    let error = null;
    
    switch (exportType) {
      case 'claims':
        const claimsQuery = supabase
          .from('expense_claims')
          .select(`
            *,
            employee:users!expense_claims_employee_id_fkey(name, employee_id, department),
            manager:users!expense_claims_manager_id_fkey(name, employee_id)
          `);
        
        if (startDate && endDate) {
          claimsQuery.gte('submitted_at', startDate).lte('submitted_at', endDate);
        }
        
        const { data: claims, error: claimsError } = await claimsQuery.order('submitted_at', { ascending: false });
        data = claims;
        error = claimsError;
        break;
        
      case 'users':
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('name');
        data = users;
        error = usersError;
        break;
        
      case 'activities':
        const activitiesQuery = supabase
          .from('recent_activities')
          .select(`
            *,
            employee:users!recent_activities_employee_id_fkey(name, employee_id, department)
          `);
        
        if (startDate && endDate) {
          activitiesQuery.gte('timestamp', startDate).lte('timestamp', endDate);
        }
        
        const { data: activities, error: activitiesError } = await activitiesQuery.order('timestamp', { ascending: false });
        data = activities;
        error = activitiesError;
        break;
        
      default:
        return c.json({ success: false, error: 'Invalid export type' }, 400);
    }
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error exporting data:', error);
    return c.json({ success: false, error: 'Failed to export data' }, 500);
  }
});

// Default catch-all for unhandled routes
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((error, c) => {
  console.error('Server error:', error);
  return c.json({ error: 'Internal Server Error', details: error.message }, 500);
});

// Start the server
Deno.serve(app.fetch);