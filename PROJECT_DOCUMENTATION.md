# Pay & Promise - Project Documentation

**Tagline:** Where Discipline Begins  
**Version:** 1.0.0  
**Stack:** React Native (Expo), TypeScript, Supabase

---

## 1. Project Overview

**Pay & Promise** is a high-stakes accountability application designed to help users build habits through financial incentives and social pressure. The core concept is simple: users make a "Promise" (a goal), stake money on it, and invite peers to join. If a user fails to complete their daily tasks, they forfeit their stake to the peers who succeeded.

The app features a "Luxury" design aesthetic, emphasizing discipline and premium user experience with smooth animations, gradients, and haptic feedback.

---

## 2. Technical Architecture

### Frontend
*   **Framework:** React Native with **Expo SDK 52**.
*   **Language:** TypeScript.
*   **Navigation:** `expo-router` for file-based routing.
*   **Styling:** Custom "Luxury" design system using `StyleSheet`, `expo-linear-gradient`, and `react-native-reanimated` for complex animations.
*   **Fonts:** Google Fonts "Outfit" (Light, Regular, Bold, ExtraBold).
*   **State Management:** React Context (AlertContext) and local state with extensive usage of Supabase real-time data fetching.

### Backend (Supabase)
*   **Database:** PostgreSQL.
*   **Authentication:** Google OAuth via Supabase Auth.
*   **Storage:** Supabase Storage buckets (e.g., `proofs`) for user-uploaded verification images.
*   **Logic:** Heavily relies on PostgreSQL Row Level Security (RLS) and custom RPC (Remote Procedure Calls) for complex logic like stats calculation and settlement distribution.

---

## 3. Core Features & User Flow

### 3.1. Onboarding & Authentication
*   **Landing Experience:** A cinematically animated landing screen introduces the "Protocol" and "Discipline" concepts.
*   **Google Sign-In:** The app uses a strictly Google-only authentication flow for simplicity and security.
*   **Profile Creation:** User profiles (Name, Email) are automatically synchronized from Google metadata upon first login.

### 3.2. Promise Ecosystem
The central feature of the app.
*   **Create Promise:** Users define a Title (Goal), Duration (in days), and Stake Amount (₹).
*   **Lobby/Join:** Creating a promise opens a lobby. Other users can join via invite codes or deep links.
*   **The Stake:** Money is logically "staked" at the beginning (tracked in a ledger).

### 3.3. Verification System
*   **Daily Action:** Participants must verify their adherence to the promise daily.
*   **Proof Upload:** Users upload photo evidence of their habit completion.
*   **Peer Verification:** Other participants in the promise group review and verify these proofs.
*   **Strict Verification:** The system enforces cut-off times (e.g., midnight).

### 3.4. The Financial Engine (Ledger & Settlements)
*   **Internal Ledger:** A database table (`ledger`) records all potential winnings (credits) and penalties (debits) throughout the promise duration.
*   **Settlement Algorithm:**
    *   At the end of a promise cycle, the app calculates the "Net Result" for each user.
    *   **Winners** (Positive Net) and **Losers** (Negative Net) are matched.
    *   **Settlement Generation:** The system generates specific "Pay To" instructions (e.g., "User A needs to pay ₹500 to User B").
*   **The Wash Rule:** Ideally, if *everyone* in a group fails, the house doesn't take the money. Instead, the "Wash Rule" triggers, refunding penalties so that no one profits from collective failure.

### 3.5. Payments & Wallet
*   **Manual UPI Settlement:** Currently, the app facilitates Peer-to-Peer (P2P) payments via UPI (Unified Payments Interface).
    *   The app displays the recipient's UPI ID.
    *   The payer copies the ID, pays via their preferred app (GPay, PhonePe), and clicks "Mark as Paid".
    *   The receiver gets a notification/prompt to "Confirm" receipt.
*   **Transaction History:** A dedicated screen tracks all past settlements, payments made, and earnings received.

### 3.6. Gamification
*   **Journey:** A visual timeline showing the user's streak and history of promises.
*   **Scoreboard:** A leaderboard ranking users based on their reliability score (integrity) and total earnings.
*   **Badges/Status:** Visual indicators (Success/Failure tags) on promises.

---

## 4. Folder Structure Map

*   **`app/`**: Main application code (Expo Router structure).
    *   `_layout.tsx`: Root provider setup (Auth checks, Theme).
    *   **(tabs)/`: Bottom tab navigator logic.
        *   `index.tsx`: Home Dashboard.
        *   `create.tsx`: Create Promise flow.
        *   `activity.tsx`: Journey/History.
        *   `ledger.tsx`: Financial history.
        *   `profile.tsx`: User settings.
    *   `screens/`: Individual feature screens (Auth, PromiseDetails, Report, etc.).
*   **`components/`**: Reusable UI components (`LuxuryVisuals`, `GridOverlay`, etc.).
*   **`lib/`**: External services configuration (`supabase.ts`).
*   **`hooks/`**: Custom React hooks.
*   **`assets/`**: Images, icons, and fonts.
*   **`app.json`**: Expo configuration.

---

## 5. Implementation History (Key Milestones)

1.  **Foundation:** Setup of Expo + Supabase + TypeScript.
2.  **Auth Integration:** Implemented Google OAuth and secured RLS policies.
3.  **Promise Logic:** Built the database schema for promises, participants, and submissions.
4.  **Verification Flow:** Created the image upload and peer verification UI.
5.  **Financial Logic:** Developed the `ledger` system and `settlement` algorithm (including the "Wash Rule" logic).
6.  **Refinement:** "Luxury" UI overhaul, adding animations, gradients, and ensuring responsiveness.
7.  **Release Prep:** configuration for APK builds, splash screen customization, and icon generation.

---

## 6. Future Roadmap (implied from code)
*   Direct constraints for "Strict Verification".
*   Enhanced "Multiplayer" features.
*   In-app payment gateway integration (replacing manual UPI).
