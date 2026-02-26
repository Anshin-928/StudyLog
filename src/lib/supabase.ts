// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://riinmwqiuiywrzlwyhec.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaW5td3FpdWl5d3J6bHd5aGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTEzODMsImV4cCI6MjA4NzU4NzM4M30.ChFP8V7pWdONFccknVc739oH6UGPzPWJCyR64yGDbA8';

// Supabaseとの通信用トランシーバー
export const supabase = createClient(supabaseUrl, supabaseKey);