# Pay & Promise: The Integrity Protocol — Project Documentation

**Tagline:** Promises Kept. Trust Earned.
**Version:** 1.0.3 (Release)
**Stack:** React Native (Expo SDK 52), TypeScript, Supabase, PostgreSQL

---

## 1. Project Overview & Core Idea

**Pay & Promise** has evolved from a financial stakes app into a **Social Accountability Protocol** centered on **Integrity**. The core currency is no longer money, but **Promise Points (PP)**.

### The Mission
To gamify discipline and build personal integrity through social verification. Users stake their reputation (PP) on their goals. Success earns trust and levels; failure costs points and status.

### The Economy (Promise Points)
*   **Starting Balance:** Every user starts with **100 PP** (Welcome Bonus).
*   **Daily Login:** Earn small amounts for consistency.
*   **Staking:** To make a Promise, you must stake PP (e.g., 50 PP).
*   **The Wager:**
    *   **Success:** You get your Stake back + Bonus PP + Integrity Score increase.
    *   **Failure:** You lose your Stake. Integrity Score drops.
*   **Levels:** Accumulating PP unlocks new Levels (e.g., Novice, Keeper, Guardian).

---

## 2. Technical Architecture

### Frontend (Mobile App)
*   **Framework:** React Native with **Expo Router** (File-based routing).
*   **Language:** TypeScript (Strict typing for robustness).
*   **Design System:**
    *   **"Luxury Glassmorphism":** Deep purple gradients (`#3B0E8A` to `#7C3AED`), glass-like cards with translucent borders, and white text.
    *   **Animations:** Powered by `react-native-reanimated` (FadeIn, Layout Transitions, Pulse effects).
    *   **Fonts:** "Outfit" (Google Font) for a modern, clean look.
*   **State Management:** React Context (`AlertContext`) + Local State + Supabase Real-time subscriptions.

### Backend (Supabase)
*   **Database:** PostgreSQL.
*   **Auth:** Google OAuth (managed by Supabase Auth).
*   **Logic:**
    *   **PostgreSQL Functions (RPC):** Complex logic like "Calculate PP", "Distribute Rewards", and "Reset Data" lives in SQL functions for security and atomicity.
    *   **Row Level Security (RLS):** Ensures users can only see their own data or promises they are part of.
    *   **Real-time:** The app subscribes to database changes (e.g., new checks, status updates) to update the UI instantly.

---

## 3. Project Structure

The project follows a standard Expo Router structure, organized for scalability.

*   **`app/`**: The core application logic.
    *   `_layout.tsx`: Root layout (Providers, Theme, Auth check).
    *   `(tabs)/`: Main navigation tabs.
        *   `index.tsx`: **Home Dashboard** (Stats, Active Promises, Daily Overview).
        *   `create.tsx`: **Create Promise** implementation.
        *   `activity.tsx`: **Feed/History** (Social updates).
        *   `ledger.tsx`: **Wallet** (PP History).
        *   `profile.tsx`: **User Profile** (Level, Stats).
    *   `screens/`: specific feature screens (Landing, Auth, PromiseDetails, Report, etc.).
*   **`components/`**: Reusable UI blocks.
    *   `LuxuryVisuals.tsx`: Gradients, Backgrounds, Glass Cards.
    *   `WalkthroughOverlay.tsx`: The "Teaching Mode" tutorial.
    *   `WelcomeBonusModal.tsx`: The celebration modal for new users.
*   **`sql/`**: **Critical Backend Logic.** Contains migration scripts (numbered `00_` to `36_`) defining tables, RPCs, and RLS policies.
*   **`assets/`**: Images, Icons, Fonts.
*   **`utils/`**: Helper functions (Layout scaling, Date formatting).

---

## 4. Key Workflows (The "Flow")

### 4.1. Onboarding & "Teaching Mode"
1.  **Landing:** User sees 3 simple slides: "Make a Promise", "Friends Verify", "Build Trust".
2.  **Auth:** User signs in with Google.
3.  **Tutorial:** `WalkthroughOverlay` highlights key UI elements (Create, Ledger, Profile).
4.  **Welcome Bonus:** Upon finishing the tutorial, `WelcomeBonusModal` appears, awarding **100 PP**.

### 4.2. Creating a Promise (The "Contract")
1.  **Define:** User sets a Title (e.g., "Gym at 6AM"), Duration (7 Days), and invites friends.
2.  **Stake:** User must pledge **Promise Points** to activate the contract.
3.  **Invite:** A unique code is generated to share with friends.

### 4.3. Daily Action & Verification
1.  **Check-in:** Every day, the user must "Check In".
2.  **Proof:** User uploads a photo (e.g., Gym selfie).
3.  **Social Validation:** Friends (Validators) receive a notification/feed item. They verify the proof.
    *   **Valid:** Streak continues.
    *   **Invalid:** Streak breaks (potential penalty).

### 4.4. Scoring & Leveling
*   **Integrity Score:** A calculated metric (0-100%) based on consistency.
*   **Leaderboard:** Users are ranked globally or mostly among friends based on PP and Integrity.

---

## 5. Major Features

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Glass UI** | Premium, dark-themed UI with blur effects and gradients. | ✅ Implemented |
| **Promise Points** | Virtual currency replacing money. Earned by integrity. | ✅ Implemented |
| **Social Feed** | Real-time updates of friends' progress. | ✅ Implemented |
| **Teaching Mode** | Interactive overlay tutorial for new users. | ✅ Implemented |
| **Charts/Stats** | Visual graphs of PP growth and consistency. | ✅ Implemented |
| **Notifications** | Alerts for check-ins and validations. | 🚧 In Progress |

---

## 6. How to Run & Build

### Development
1.  `npm install` - Install dependencies.
2.  `npx expo start` - Run local server.
3.  **Supabase:** Ensure local/remote Supabase instance is linked and SQL migrations (`sql/`) are applied.

### Release Build (Android)
1.  Update version in `app.json`.
2.  Run: `cd android && ./gradlew assembleRelease`
3.  APK Location: `android/app/build/outputs/apk/release/app-release.apk`
