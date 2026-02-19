-- =====================================================
-- SQL Script: Verify Promise Points Redistribution
-- Run this in Supabase SQL Editor to test logic
-- =====================================================

DO $$
DECLARE
    v_promise_id uuid;
    v_user_1 uuid := '00000000-0000-0000-0000-000000000001';
    v_user_2 uuid := '00000000-0000-0000-0000-000000000002';
    v_user_3 uuid := '00000000-0000-0000-0000-000000000003';
    v_today date := CURRENT_DATE;
BEGIN
    -- 1. Setup Mock Users (if not exist)
    INSERT INTO auth.users (id, email) VALUES (v_user_1, 'u1@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO auth.users (id, email) VALUES (v_user_2, 'u2@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO auth.users (id, email) VALUES (v_user_3, 'u3@test.com') ON CONFLICT DO NOTHING;
    
    INSERT INTO public.profiles (id, full_name, promise_points) VALUES (v_user_1, 'User One', 100) ON CONFLICT (id) DO UPDATE SET promise_points = 100;
    INSERT INTO public.profiles (id, full_name, promise_points) VALUES (v_user_2, 'User Two', 100) ON CONFLICT (id) DO UPDATE SET promise_points = 100;
    INSERT INTO public.profiles (id, full_name, promise_points) VALUES (v_user_3, 'User Three', 100) ON CONFLICT (id) DO UPDATE SET promise_points = 100;

    -- 2. Create Promise (Stake 20, 5 Days => Daily Stake = 4)
    INSERT INTO public.promises (created_by, title, status, duration_days, locked_points, number_of_people)
    VALUES (v_user_1, 'Test Promise', 'active', 5, 20, 3)
    RETURNING id INTO v_promise_id;

    -- 3. Add Participants
    INSERT INTO public.promise_participants (promise_id, user_id) VALUES (v_promise_id, v_user_1);
    INSERT INTO public.promise_participants (promise_id, user_id) VALUES (v_promise_id, v_user_2);
    INSERT INTO public.promise_participants (promise_id, user_id) VALUES (v_promise_id, v_user_3);

    -- 4. Simulate Scenario: 2 Success, 1 Fail (TC-07 / TC-12 derivative with 3 users)
    -- Daily Stake = 4.
    -- Failures = 1. Pool = 4.
    -- Winners = 2. Share = 4 / 2 = 2.
    -- Expected: Winners +6 (4 ref + 2 share). Loser 0.

    -- User 1: Success
    INSERT INTO public.promise_submissions (promise_id, user_id, date, image_url, status)
    VALUES (v_promise_id, v_user_1, v_today, 'http://img1.jpg', 'verified');
    
    -- User 2: Success
    INSERT INTO public.promise_submissions (promise_id, user_id, date, image_url, status)
    VALUES (v_promise_id, v_user_2, v_today, 'http://img2.jpg', 'verified');
    
    -- User 3: Fail (Missed / Rejected)
    INSERT INTO public.promise_submissions (promise_id, user_id, date, image_url, status)
    VALUES (v_promise_id, v_user_3, v_today, 'manual_fail', 'rejected');

    -- 5. Add Verifications (Mock 2 confirms for success)
    INSERT INTO public.submission_verifications (submission_id, verifier_user_id, decision)
    SELECT id, v_user_2, 'confirm' FROM public.promise_submissions WHERE user_id = v_user_1
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.submission_verifications (submission_id, verifier_user_id, decision)
    SELECT id, v_user_1, 'confirm' FROM public.promise_submissions WHERE user_id = v_user_2
    ON CONFLICT DO NOTHING;

    -- 6. Execute Logic
    PERFORM check_and_finalize_verification(v_promise_id, v_today);
    
    -- 7. Output Results (You would run SELECT * FROM promise_point_ledger WHERE promise_id = ... manually after)
    -- This block creates data.
END $$;

-- Verify with:
-- SELECT user_id, amount, reason, description FROM promise_point_ledger 
-- WHERE created_at::date = CURRENT_DATE 
-- ORDER BY created_at DESC;
