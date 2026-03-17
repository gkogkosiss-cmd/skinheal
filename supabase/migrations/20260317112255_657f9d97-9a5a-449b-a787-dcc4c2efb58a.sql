-- Drop the foreign key constraint that prevents writing subscriptions for users from the external auth project
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;