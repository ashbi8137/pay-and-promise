# SQL Migration Files — Execution Order

Run these in Supabase SQL Editor in numbered order for a fresh setup.
For an existing database, only run files you haven't applied yet.

## 📦 Schema & Tables (01–13)
| # | File | Purpose |
|---|------|---------|
| 01 | `schema_promises` | Core `promises` table + RLS |
| 02 | `schema_profiles` | `profiles` table + signup trigger |
| 03 | `auth_signup_trigger` | Hardened signup trigger with error handling |
| 04 | `fix_profiles_schema` | Add missing columns to profiles |
| 05 | `backfill_profiles` | Backfill existing users into profiles |
| 06 | `multiplayer_schema` | `promise_participants`, `ledger` tables, invite codes |
| 07 | `daily_checkins` | `daily_checkins` table |
| 08 | `fix_checkins` | Fix checkins unique constraint (per-user) |
| 09 | `fix_checkins_rls` | Fix RLS policies for checkins |
| 10 | `penalties` | `penalties` table + RLS |
| 11 | `add_ledger_description` | Add `description` column to ledger |
| 12 | `photo_proof_schema` | Storage bucket for proofs + `proof_url` column |
| 13 | `storage_delete_policy` | DELETE policy for proof storage |

## ⚙️ Verification Engine (14–20)
| # | File | Purpose |
|---|------|---------|
| 14 | `peer_verification` | `promise_submissions`, `submission_verifications`, `daily_settlements` tables |
| 15 | `strict_verification` | Strict verification + initial `check_and_settle_day` |
| 16 | `fix_verification_logic` | **ACTIVE** — Core `check_and_finalize_verification` with forgiveness |
| 17 | `fix_immediate_status_update` | **ACTIVE** — `handle_verification_trigger` (instant reject/verify) |
| 18 | `fix_rejection_logic` | Data cleanup for incorrect statuses |
| 19 | `day_by_day_forgiveness` | Reference: original forgiveness logic (now merged into 16) |
| 20 | `auto_fail_cron` | `auto_fail_missing_submissions()` — daily cron for timeouts |

## 🔒 Security & RPC (21–26)
| # | File | Purpose |
|---|------|---------|
| 21 | `secure_ledger` | Revoke direct INSERT on ledger, only via RPC |
| 22 | `fetch_names_rpc` | RPC to fetch participant names |
| 23 | `create_stats_rpc` | `get_journey_stats()` RPC for journey screen |
| 24 | `fix_rls_policies` | General RLS policy fixes |
| 25 | `fix_permissions` | Grant/revoke permission fixes |
| 26 | `emergency_fix_rls` | Emergency RLS re-enable script |

## 🔧 One-Time Repairs (27–29)
| # | File | Purpose |
|---|------|---------|
| 27 | `repair_stakes` | Fix `stake_per_day` calculation |
| 28 | `repair_stuck_promises` | Mark completed promises stuck in 'active' |
| 29 | `schema_dump` | Reference schema dump |

> **Note:** Files 16 and 17 are the **active** verification engine. File 19 is kept as reference only (its logic was merged into 16).
