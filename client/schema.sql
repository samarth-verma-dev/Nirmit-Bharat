-- Employee Support Dashboard - Support Tickets Schema

CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE ticket_issue_type AS ENUM ('Refund', 'Complaint', 'Delay', 'General');
CREATE TYPE ticket_status AS ENUM ('Open', 'Resolved');

CREATE TABLE support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    message TEXT NOT NULL,
    sentiment_score NUMERIC,
    is_urgent BOOLEAN DEFAULT false,
    priority ticket_priority DEFAULT 'Low',
    issue_type ticket_issue_type DEFAULT 'General',
    status ticket_status DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES auth.users(id) -- Assuming Supabase Auth
);

-- Index for fast sorting/filtering
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_created_at ON support_tickets(created_at);
