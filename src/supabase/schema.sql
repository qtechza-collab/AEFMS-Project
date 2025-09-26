-- Logan Freights Logistics CC - Complete Database Schema
-- Comprehensive expense management system with role-based authentication

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK (role IN ('employee', 'manager', 'hr', 'administrator')) NOT NULL DEFAULT 'employee',
    manager_id UUID REFERENCES public.users(id),
    status TEXT CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'active',
    profile_photo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense_claims table
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    vendor TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    expense_date DATE NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')) DEFAULT 'pending',
    receipt_files JSONB DEFAULT '[]'::jsonb,
    tax_amount DECIMAL(12,2),
    notes TEXT,
    manager_id UUID REFERENCES public.users(id),
    manager_comments TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    fraud_score INTEGER DEFAULT 0,
    fraud_flags TEXT[] DEFAULT '{}',
    is_flagged BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    related_claim_id UUID REFERENCES public.expense_claims(id),
    amount DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recent_activities table
CREATE TABLE IF NOT EXISTS public.recent_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    employee_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL,
    amount DECIMAL(12,2),
    claim_id UUID REFERENCES public.expense_claims(id),
    department TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create company_financials table for uploaded financial data
CREATE TABLE IF NOT EXISTS public.company_financials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year INTEGER NOT NULL,
    period TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'
    revenue DECIMAL(15,2),
    expenses DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    gross_profit DECIMAL(15,2),
    operating_expenses DECIMAL(15,2),
    tax_expense DECIMAL(15,2),
    cost_of_sales DECIMAL(15,2),
    administrative_expenses DECIMAL(15,2),
    other_income DECIMAL(15,2),
    finance_costs DECIMAL(15,2),
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    file_name TEXT,
    file_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fiscal_year, period)
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    related_claim_id UUID REFERENCES public.expense_claims(id),
    upload_type TEXT CHECK (upload_type IN ('receipt', 'profile', 'financial_document', 'other')) DEFAULT 'other',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.users(id),
    sender_id UUID REFERENCES public.users(id),
    email_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    related_claim_id UUID REFERENCES public.expense_claims(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table for tracking all system changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee_id ON public.expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON public.expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_submitted_at ON public.expense_claims(submitted_at);
CREATE INDEX IF NOT EXISTS idx_expense_claims_manager_id ON public.expense_claims(manager_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON public.recent_activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON public.recent_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);
CREATE INDEX IF NOT EXISTS idx_company_financials_year_period ON public.company_financials(fiscal_year, period);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_claims_updated_at 
    BEFORE UPDATE ON public.expense_claims 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_financials_updated_at 
    BEFORE UPDATE ON public.company_financials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$;

-- Create audit triggers
CREATE TRIGGER audit_expense_claims
    AFTER INSERT OR UPDATE OR DELETE ON public.expense_claims
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_company_financials
    AFTER INSERT OR UPDATE OR DELETE ON public.company_financials
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, icon, color) VALUES
('Travel', 'Business travel expenses including flights, accommodation, and meals', 'Plane', '#3B82F6'),
('Fuel', 'Vehicle fuel and transportation costs', 'Fuel', '#EF4444'),
('Office Supplies', 'Stationery, equipment, and office materials', 'Package', '#10B981'),
('Meals & Entertainment', 'Business meals and client entertainment', 'Utensils', '#F59E0B'),
('Communication', 'Phone, internet, and communication expenses', 'Phone', '#8B5CF6'),
('Training', 'Professional development and training costs', 'GraduationCap', '#06B6D4'),
('Maintenance', 'Vehicle and equipment maintenance', 'Wrench', '#84CC16'),
('Insurance', 'Business insurance premiums', 'Shield', '#6366F1'),
('Legal & Professional', 'Legal fees and professional services', 'Scale', '#EC4899'),
('Marketing', 'Advertising and marketing expenses', 'Megaphone', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- Insert dummy users for testing
INSERT INTO public.users (id, email, name, employee_id, department, position, role, phone) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'employee.dummy@loganfreights.co.za', 'John Driver', 'EMP001', 'Logistics', 'Senior Driver', 'employee', '+27 82 123 4567'),
('550e8400-e29b-41d4-a716-446655440002', 'manager.dummy@loganfreights.co.za', 'Sarah Manager', 'MGR001', 'Management', 'Operations Manager', 'manager', '+27 82 234 5678'),
('550e8400-e29b-41d4-a716-446655440003', 'hr.dummy@loganfreights.co.za', 'Jane HR', 'HR001', 'Human Resources', 'HR Manager', 'hr', '+27 82 345 6789'),
('550e8400-e29b-41d4-a716-446655440004', 'admin@loganfreights.co.za', 'System Administrator', 'ADMIN001', 'IT', 'System Administrator', 'administrator', '+27 82 456 7890'),
('550e8400-e29b-41d4-a716-446655440005', 'mike.transport@loganfreights.co.za', 'Mike Transport', 'EMP002', 'Logistics', 'Transport Coordinator', 'employee', '+27 82 567 8901'),
('550e8400-e29b-41d4-a716-446655440006', 'lisa.clerk@loganfreights.co.za', 'Lisa Clerk', 'EMP003', 'Administration', 'Administrative Clerk', 'employee', '+27 82 678 9012')
ON CONFLICT (id) DO NOTHING;

-- Set manager relationships
UPDATE public.users SET manager_id = '550e8400-e29b-41d4-a716-446655440002' 
WHERE id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006');

-- Insert sample company financials data
INSERT INTO public.company_financials (
    fiscal_year, period, revenue, expenses, net_profit, gross_profit, 
    operating_expenses, tax_expense, cost_of_sales, administrative_expenses,
    other_income, finance_costs, uploaded_by, notes
) VALUES
(2024, 'Annual', 2200000, 1876000, 324000, 1100000, 650000, 48600, 1100000, 425000, 15000, 23400, '550e8400-e29b-41d4-a716-446655440002', 'Annual financial results for 2024'),
(2023, 'Annual', 2050000, 1755000, 295000, 1025000, 600000, 44250, 1025000, 400000, 12000, 21750, '550e8400-e29b-41d4-a716-446655440002', 'Annual financial results for 2023'),
(2022, 'Annual', 1900000, 1634000, 266000, 950000, 550000, 39900, 950000, 375000, 10000, 20100, '550e8400-e29b-41d4-a716-446655440002', 'Annual financial results for 2022')
ON CONFLICT (fiscal_year, period) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text OR 
                     EXISTS(SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('hr', 'administrator')));

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Expense claims policies
CREATE POLICY "Users can view their own claims" ON public.expense_claims
    FOR SELECT USING (
        employee_id::text = auth.uid()::text OR 
        manager_id::text = auth.uid()::text OR
        EXISTS(SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('hr', 'administrator'))
    );

CREATE POLICY "Users can insert their own claims" ON public.expense_claims
    FOR INSERT WITH CHECK (employee_id::text = auth.uid()::text);

CREATE POLICY "Managers can update team claims" ON public.expense_claims
    FOR UPDATE USING (
        manager_id::text = auth.uid()::text OR
        EXISTS(SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('hr', 'administrator'))
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Company financials policies (Manager, HR, Admin only)
CREATE POLICY "Managers and above can view financials" ON public.company_financials
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('manager', 'hr', 'administrator'))
    );

CREATE POLICY "Managers and above can insert financials" ON public.company_financials
    FOR INSERT WITH CHECK (
        EXISTS(SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('manager', 'hr', 'administrator'))
    );

-- File uploads policies
CREATE POLICY "Users can view their own uploads" ON public.file_uploads
    FOR SELECT USING (
        uploaded_by::text = auth.uid()::text OR
        EXISTS(SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('manager', 'hr', 'administrator'))
    );

-- Create storage bucket policies
INSERT INTO storage.buckets (id, name, public) VALUES 
('logan-receipts', 'logan-receipts', false),
('logan-profiles', 'logan-profiles', false),
('logan-financials', 'logan-financials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (with conflict handling)
DO $
BEGIN
    -- Create upload policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logan_upload_policy' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "logan_upload_policy" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') AND auth.role() = 'authenticated');
    END IF;
    
    -- Create view policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logan_view_policy' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "logan_view_policy" ON storage.objects
            FOR SELECT USING (bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') AND auth.role() = 'authenticated');
    END IF;
    
    -- Create update policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logan_update_policy' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "logan_update_policy" ON storage.objects
            FOR UPDATE USING (bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') AND auth.role() = 'authenticated');
    END IF;
    
    -- Create delete policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logan_delete_policy' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "logan_delete_policy" ON storage.objects
            FOR DELETE USING (bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') AND auth.role() = 'authenticated');
    END IF;
END $;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create helpful functions
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = user_id;
    RETURN COALESCE(user_role, 'employee');
END;
$;

CREATE OR REPLACE FUNCTION calculate_expense_totals()
RETURNS TABLE(
    total_pending NUMERIC,
    total_approved NUMERIC,
    total_rejected NUMERIC,
    count_pending BIGINT,
    count_approved BIGINT,
    count_rejected BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) as total_rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as count_pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as count_approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as count_rejected
    FROM public.expense_claims
    WHERE NOT archived;
END;
$;

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM public.notifications 
    WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete activities older than 90 days
    DELETE FROM public.recent_activities 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Archive old completed claims
    UPDATE public.expense_claims 
    SET archived = TRUE 
    WHERE submitted_at < NOW() - INTERVAL '365 days' 
    AND status IN ('approved', 'rejected');
    
    RETURN 'Cleanup completed successfully';
END;
$;