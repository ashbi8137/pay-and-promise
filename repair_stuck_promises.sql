-- One-time repair script to close promises that finished their duration
-- but got stuck in 'active' status.

DO $$
DECLARE
    r RECORD;
    v_settled_days INT;
BEGIN
    FOR r IN 
        SELECT id, title, duration_days 
        FROM public.promises 
        WHERE status = 'active'
    LOOP
        -- Count how many days have been settled for this promise
        SELECT count(*) INTO v_settled_days 
        FROM public.daily_settlements 
        WHERE promise_id = r.id;

        -- If settled days >= duration, mark as completed
        IF v_settled_days >= r.duration_days THEN
            UPDATE public.promises 
            SET status = 'completed' 
            WHERE id = r.id;
            
            RAISE NOTICE 'Fixed Promise: % (ID: %) - Marked as Completed', r.title, r.id;
        END IF;
    END LOOP;
END $$;
