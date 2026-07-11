wwE2ww                                                                               
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Supabase Database Schema — Better Finance (New App)                                                    
                                                                                                            
 Context

 Diskusi dimulai dari topik "vibe coding ke kehidupan & keuangan". User memutuskan untuk membangun aplikasi
 finance baru yang terpisah dari proyek Next.js yang ada (prj-better-finance), dengan:
 - Database: Supabase (bukan Google Sheets)
 - Multi-user: bisa dipakai orang lain, bisa dikomersilkan
 - Fitur awal: feature parity dengan app saat ini (akun, transaksi, budget, goals, aset)
 - Rencana: AI integration di masa depan

 Fokus plan ini: desain schema Supabase berdasarkan data aktual dari Google Sheets Finance 2026 yang sudah
 di-fetch.

 ---
 Data Source Analysis (Finance 2026 Google Sheet)

 Data di-fetch langsung dari sheet aktual. Struktur yang ditemukan:

 ┌─────────┬──────────────────────────────────────────────────────────────────────────────────────────────┐
 │  Sheet  │                                         Kolom kunci                                          │
 ├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Summary │ Name, Value, Balancing, Last Updated                                                         │
 ├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Jan–Dec │ Date, Transaction, Account, Category or Account, Note, Wallet, ATM, Platform, Investment,    │
 │         │ Saving, AR, AP, NP, OI, RE, NET                                                              │
 ├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Assets  │ name, value, type                                                                            │
 ├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Goals   │ Saving, Account, Category, Time, Type, Target, Monthly, Deadline, Progress, %, Retained,     │
 │         │ Collected                                                                                    │
 └─────────┴──────────────────────────────────────────────────────────────────────────────────────────────┘

 Masalah utama yang dipecahkan: Sheet transaksi punya 10+ kolom amount (Wallet, ATM, Platform, dll) yang
 mutually exclusive — hanya satu kolom yang punya nilai per baris. Ini adalah artifact spreadsheet, bukan
 data yang perlu di-replikasi ke SQL.

 ---
 Schema Design

 Tables Overview

 ┌───────────────────────────┬──────────────────────────────────────┬────────────────────────────────────┐
 │           Table           │                Tujuan                │            Menggantikan            │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ user_profiles             │ Auth + subscription tier             │ (baru)                             │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ account_types             │ Grouping: wallet/atm/platform/other  │ accountCategories di constants.js  │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ accounts                  │ Semua akun keuangan + aset           │ Summary sheet + Assets sheet       │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ wallet_denominations      │ Cash denomination counts             │ Wallet sheet                       │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ categories                │ Kategori spending/earning,           │ categories + earning di            │
 │                           │ extensible                           │ constants.js                       │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ transactions              │ Semua transaksi keuangan             │ Sheet Jan–Dec                      │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ budgets                   │ Alokasi budget per bulan per         │ Spending/Earning budget sheets     │
 │                           │ kategori                             │                                    │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ savings_goals             │ Goals dengan progress tracking       │ Goals sheet                        │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ account_balance_snapshots │ Histori saldo untuk chart trend      │ (baru)                             │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ wishlists                 │ Rencana pembelian + affordability    │ Planned wishlist feature           │
 ├───────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
 │ ai_insights               │ Rekomendasi AI (siap untuk future)   │ (baru)                             │
 └───────────────────────────┴──────────────────────────────────────┴────────────────────────────────────┘

 Key Design Decisions

 1. Transaction amount columns → single amount column
 Sheet punya kolom Wallet/ATM/Platform/dll yang mutually exclusive. Di SQL: simpan satu amount (selalu
 positif, Math.abs dari kolom yang relevan), arah uang diimplied dari transaction_type. Logic ini sama persis
  dengan getCashValue() di utils/helper.js.

 2. Accounts + Assets = satu tabel accounts
 Sheet Assets sebenarnya aggregasi dari akun yang sama. Cukup tambah field asset_category dan
 include_in_net_worth di tabel accounts.

 3. Categories sebagai tabel, bukan hard-coded
 constants.js di app lama hard-code semua kategori. Di DB baru, kategori jadi rows di tabel categories — user
  bisa tambah custom kategori, dan AI bisa suggest kategori baru nanti.

 4. Subscription model dari awal
 user_profiles punya plan_tier (free/pro/family) dan stripe_customer_id. RLS policies enforce limit free tier
  (5 akun, 50 transaksi/bulan).

 ---
 Complete SQL

 CREATE TABLES

 CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

 -- User profiles (extends auth.users)
 CREATE TABLE public.user_profiles (
     id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     display_name         TEXT,
     email                TEXT NOT NULL,
     avatar_url           TEXT,
     plan_tier            TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'family')),
     plan_expires_at      TIMESTAMPTZ,
     stripe_customer_id   TEXT UNIQUE,
     currency_code        TEXT NOT NULL DEFAULT 'IDR',
     locale               TEXT NOT NULL DEFAULT 'id-ID',
     timezone             TEXT NOT NULL DEFAULT 'Asia/Jakarta',
     onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
     created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 -- Account types (wallet, atm, platform, other)
 CREATE TABLE public.account_types (
     id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     name       TEXT NOT NULL,
     slug       TEXT NOT NULL,
     color_hex  TEXT,
     icon_name  TEXT,
     sort_order INTEGER NOT NULL DEFAULT 0,
     is_system  BOOLEAN NOT NULL DEFAULT FALSE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, slug)
 );

 -- All accounts (bank, e-wallet, investment, AR/AP)
 CREATE TABLE public.accounts (
     id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id                UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     account_type_id        UUID NOT NULL REFERENCES public.account_types(id),
     name                   TEXT NOT NULL,
     slug                   TEXT NOT NULL,
     description            TEXT,
     current_balance        NUMERIC(18, 2) NOT NULL DEFAULT 0,
     last_reality_check     NUMERIC(18, 2),
     last_reality_check_at  TIMESTAMPTZ,
     asset_category         TEXT NOT NULL DEFAULT 'liquid'
                                CHECK (asset_category IN ('liquid', 'investment', 'property', 'other')),
     icon_name              TEXT,
     color_hex              TEXT,
     is_active              BOOLEAN NOT NULL DEFAULT TRUE,
     include_in_net_worth   BOOLEAN NOT NULL DEFAULT TRUE,
     is_wallet              BOOLEAN NOT NULL DEFAULT FALSE,
     sort_order             INTEGER NOT NULL DEFAULT 0,
     created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, slug)
 );

 -- Cash denomination tracking (for Wallet accounts)
 CREATE TABLE public.wallet_denominations (
     id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     account_id   UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
     user_id      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     denomination INTEGER NOT NULL,
     note_type    TEXT NOT NULL DEFAULT 'paper' CHECK (note_type IN ('paper', 'coin')),
     count        INTEGER NOT NULL DEFAULT 0,
     updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (account_id, denomination, note_type)
 );

 -- Categories (spending + earning), user-extensible
 CREATE TABLE public.categories (
     id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     name        TEXT NOT NULL,
     slug        TEXT NOT NULL,
     group_name  TEXT NOT NULL, -- eating | living | saving | investing | giving | earning
     icon_name   TEXT,
     color_hex   TEXT,
     sort_order  INTEGER NOT NULL DEFAULT 0,
     is_system   BOOLEAN NOT NULL DEFAULT FALSE,
     is_active   BOOLEAN NOT NULL DEFAULT TRUE,
     ai_keywords TEXT[],
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, slug, group_name)
 );

 -- All transactions (replaces Jan-Dec sheets)
 CREATE TABLE public.transactions (
     id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id          UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     transaction_date DATE NOT NULL,
     transaction_type TEXT NOT NULL CHECK (transaction_type IN ('spending', 'earning', 'transfer')),
     account_id       UUID NOT NULL REFERENCES public.accounts(id),
     category_id      UUID REFERENCES public.categories(id),   -- NULL for transfers
     to_account_id    UUID REFERENCES public.accounts(id),     -- NULL for non-transfers
     note             TEXT,
     amount           NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
     source_month     TEXT,           -- "Jan", "Feb" — asal sheet saat migrasi
     is_imported      BOOLEAN NOT NULL DEFAULT FALSE,
     import_row_hash  TEXT,           -- SHA256 untuk dedup saat migrasi
     deleted_at       TIMESTAMPTZ,    -- soft delete
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE INDEX idx_transactions_user_date     ON public.transactions (user_id, transaction_date DESC);
 CREATE INDEX idx_transactions_user_type     ON public.transactions (user_id, transaction_type);
 CREATE INDEX idx_transactions_user_account  ON public.transactions (user_id, account_id);
 CREATE INDEX idx_transactions_user_category ON public.transactions (user_id, category_id) WHERE category_id
 IS NOT NULL;
 CREATE INDEX idx_transactions_deleted       ON public.transactions (user_id, deleted_at) WHERE deleted_at IS
  NULL;

 -- Monthly budgets per category
 CREATE TABLE public.budgets (
     id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     budget_year     SMALLINT NOT NULL,
     budget_month    SMALLINT NOT NULL CHECK (budget_month BETWEEN 1 AND 12),
     category_id     UUID NOT NULL REFERENCES public.categories(id),
     budgeted_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
     note            TEXT,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, budget_year, budget_month, category_id)
 );

 CREATE INDEX idx_budgets_user_period ON public.budgets (user_id, budget_year, budget_month);

 -- Financial goals
 CREATE TABLE public.savings_goals (
     id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id              UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     name                 TEXT NOT NULL,
     description          TEXT,
     icon_name            TEXT,
     goal_type            TEXT NOT NULL CHECK (goal_type IN ('sinking', 'wishlist', 'emergency',
 'investment', 'business')),
     linked_account_id    UUID REFERENCES public.accounts(id),
     target_amount        NUMERIC(18, 2) NOT NULL,
     monthly_contribution NUMERIC(18, 2),
     deadline_date        DATE,
     duration_label       TEXT,
     collected_amount     NUMERIC(18, 2) NOT NULL DEFAULT 0,
     retained_amount      NUMERIC(18, 2) NOT NULL DEFAULT 0,
     is_completed         BOOLEAN NOT NULL DEFAULT FALSE,
     is_active            BOOLEAN NOT NULL DEFAULT TRUE,
     completed_at         TIMESTAMPTZ,
     created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 -- Balance history (untuk chart trend + reality check history)
 CREATE TABLE public.account_balance_snapshots (
     id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
     snapshot_type TEXT NOT NULL DEFAULT 'computed'
                       CHECK (snapshot_type IN ('computed', 'reality_check', 'import')),
     balance       NUMERIC(18, 2) NOT NULL,
     note          TEXT,
     snapped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE INDEX idx_balance_snapshots_account_time ON public.account_balance_snapshots (account_id, snapped_at
 DESC);

 -- Wishlist (planned purchases)
 CREATE TABLE public.wishlists (
     id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     name            TEXT NOT NULL,
     description     TEXT,
     url             TEXT,
     image_url       TEXT,
     estimated_price NUMERIC(18, 2) NOT NULL,
     priority        SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
     status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'purchased', 'cancelled',
 'deferred')),
     linked_goal_id  UUID REFERENCES public.savings_goals(id),
     target_date     DATE,
     purchased_at    TIMESTAMPTZ,
     purchased_price NUMERIC(18, 2),
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 -- AI insights (siap untuk future integration)
 CREATE TABLE public.ai_insights (
     id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id                 UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
     insight_type            TEXT NOT NULL, -- "budget_alert", "saving_tip", "anomaly", "forecast"
     title                   TEXT NOT NULL,
     body                    TEXT NOT NULL,
     related_category_id     UUID REFERENCES public.categories(id),
     related_account_id      UUID REFERENCES public.accounts(id),
     related_goal_id         UUID REFERENCES public.savings_goals(id),
     is_read                 BOOLEAN NOT NULL DEFAULT FALSE,
     is_dismissed            BOOLEAN NOT NULL DEFAULT FALSE,
     expires_at              TIMESTAMPTZ,
     model_version           TEXT,
     confidence              NUMERIC(4, 3),
     generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 RLS Policies

 -- Enable RLS on all tables
 ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.account_types          ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.accounts               ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.wallet_denominations   ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.categories             ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.transactions           ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.budgets                ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.savings_goals          ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.account_balance_snapshots ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.wishlists              ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.ai_insights            ENABLE ROW LEVEL SECURITY;

 -- Helper: cek limit akun untuk free tier
 CREATE OR REPLACE FUNCTION public.check_account_limit() RETURNS BOOLEAN
 LANGUAGE plpgsql SECURITY DEFINER AS $$
 DECLARE v_plan TEXT; v_count INTEGER;
 BEGIN
     SELECT plan_tier INTO v_plan FROM public.user_profiles WHERE id = auth.uid();
     IF v_plan IN ('pro', 'family') THEN RETURN TRUE; END IF;
     SELECT COUNT(*) INTO v_count FROM public.accounts WHERE user_id = auth.uid() AND is_active = TRUE;
     RETURN v_count < 5;
 END; $$;

 -- Helper: cek limit transaksi per bulan untuk free tier
 CREATE OR REPLACE FUNCTION public.check_transaction_limit_this_month() RETURNS BOOLEAN
 LANGUAGE plpgsql SECURITY DEFINER AS $$
 DECLARE v_plan TEXT; v_count INTEGER;
 BEGIN
     SELECT plan_tier INTO v_plan FROM public.user_profiles WHERE id = auth.uid();
     IF v_plan IN ('pro', 'family') THEN RETURN TRUE; END IF;
     SELECT COUNT(*) INTO v_count FROM public.transactions
     WHERE user_id = auth.uid() AND transaction_date >= DATE_TRUNC('month', NOW()) AND deleted_at IS NULL;
     RETURN v_count < 50;
 END; $$;

 -- user_profiles: only own row
 CREATE POLICY "user_profiles: own row only" ON public.user_profiles
     FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

 -- account_types: own rows, system rows not deletable/updatable
 CREATE POLICY "account_types: select own" ON public.account_types FOR SELECT USING (user_id = auth.uid());
 CREATE POLICY "account_types: insert own" ON public.account_types FOR INSERT WITH CHECK (user_id =
 auth.uid());
 CREATE POLICY "account_types: update own non-system" ON public.account_types FOR UPDATE
     USING (user_id = auth.uid() AND is_system = FALSE) WITH CHECK (user_id = auth.uid());
 CREATE POLICY "account_types: delete own non-system" ON public.account_types FOR DELETE
     USING (user_id = auth.uid() AND is_system = FALSE);

 -- accounts: select/update own; insert with free-tier limit
 CREATE POLICY "accounts: select own" ON public.accounts FOR SELECT USING (user_id = auth.uid());
 CREATE POLICY "accounts: insert own" ON public.accounts FOR INSERT
     WITH CHECK (user_id = auth.uid() AND public.check_account_limit());
 CREATE POLICY "accounts: update own" ON public.accounts FOR UPDATE
     USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

 -- transactions: insert with monthly limit
 CREATE POLICY "transactions: select own" ON public.transactions FOR SELECT USING (user_id = auth.uid());
 CREATE POLICY "transactions: insert own" ON public.transactions FOR INSERT
     WITH CHECK (user_id = auth.uid() AND public.check_transaction_limit_this_month());
 CREATE POLICY "transactions: update own" ON public.transactions FOR UPDATE
     USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

 -- semua tabel lainnya: own only (simple)
 CREATE POLICY "wallet_denominations: own" ON public.wallet_denominations FOR ALL
     USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
 CREATE POLICY "categories: select own" ON public.categories FOR SELECT USING (user_id = auth.uid());
 CREATE POLICY "categories: insert own" ON public.categories FOR INSERT WITH CHECK (user_id = auth.uid());
 CREATE POLICY "categories: update non-system" ON public.categories FOR UPDATE
     USING (user_id = auth.uid() AND is_system = FALSE) WITH CHECK (user_id = auth.uid());
 CREATE POLICY "categories: delete non-system" ON public.categories FOR DELETE
     USING (user_id = auth.uid() AND is_system = FALSE);
 CREATE POLICY "budgets: own" ON public.budgets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id =
 auth.uid());
 CREATE POLICY "savings_goals: own" ON public.savings_goals FOR ALL USING (user_id = auth.uid()) WITH CHECK
 (user_id = auth.uid());
 CREATE POLICY "balance_snapshots: own" ON public.account_balance_snapshots FOR ALL USING (user_id =
 auth.uid()) WITH CHECK (user_id = auth.uid());
 CREATE POLICY "wishlists: own" ON public.wishlists FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id
 = auth.uid());
 CREATE POLICY "ai_insights: own" ON public.ai_insights FOR ALL USING (user_id = auth.uid()) WITH CHECK
 (user_id = auth.uid());

 Triggers

 -- Auto-create user_profile saat signup
 CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 BEGIN
     INSERT INTO public.user_profiles (id, email, display_name)
     VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@',
 1)));
     RETURN NEW;
 END; $$;
 CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION
 public.handle_new_user();

 -- Auto-seed default account_types dan categories saat user_profile dibuat
 CREATE OR REPLACE FUNCTION public.seed_defaults_for_new_user() RETURNS TRIGGER
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 BEGIN
     INSERT INTO public.account_types (user_id, name, slug, sort_order, is_system) VALUES
         (NEW.id, 'Wallet', 'wallet', 1, TRUE), (NEW.id, 'Bank/ATM', 'atm', 2, TRUE),
         (NEW.id, 'Platform', 'platform', 3, TRUE), (NEW.id, 'Other', 'other', 4, TRUE);

     INSERT INTO public.categories (user_id, name, slug, group_name, sort_order, is_system) VALUES
         -- eating
         (NEW.id,'Dining Out','dining-out','eating',1,TRUE),(NEW.id,'Food','food','eating',2,TRUE),
         (NEW.id,'Fruits','fruits','eating',3,TRUE),(NEW.id,'Groceries','groceries','eating',4,TRUE),
         (NEW.id,'Grab Credit','grab-credit','eating',5,TRUE),
         -- living
         (NEW.id,'Charge','charge','living',1,TRUE),(NEW.id,'Credit','credit','living',2,TRUE),

 (NEW.id,'Children','children','living',3,TRUE),(NEW.id,'Entertainment','entertainment','living',4,TRUE),
         (NEW.id,'Health','health','living',5,TRUE),(NEW.id,'House','house','living',6,TRUE),
         (NEW.id,'Knowledge','knowledge','living',7,TRUE),(NEW.id,'Spouse','spouse','living',8,TRUE),
         (NEW.id,'Tools','tools','living',9,TRUE),(NEW.id,'Transport','transport','living',10,TRUE),
         (NEW.id,'Other Spend','other-spend','living',11,TRUE),
         -- saving
         (NEW.id,'AP','ap','saving',1,TRUE),(NEW.id,'AR','ar','saving',2,TRUE),
         (NEW.id,'Retained','retained','saving',3,TRUE),(NEW.id,'Sinking','sinking','saving',4,TRUE),
         (NEW.id,'Wishlist','wishlist','saving',5,TRUE),
         -- investing

 (NEW.id,'Business','business','investing',1,TRUE),(NEW.id,'Emergency','emergency','investing',2,TRUE),
         (NEW.id,'Investment','investment','investing',3,TRUE),
         -- giving
         (NEW.id,'Infaq Rezeki','infaq-rezeki','giving',1,TRUE),(NEW.id,'Tax
 Salary','tax-salary','giving',2,TRUE),
         (NEW.id,'Shodaqoh','shodaqoh','giving',3,TRUE),
         -- earning
         (NEW.id,'Net Salary','net-salary','earning',1,TRUE),(NEW.id,'Salary','salary','earning',2,TRUE),
         (NEW.id,'Allowance','allowance','earning',3,TRUE),(NEW.id,'Interest','interest','earning',4,TRUE),
         (NEW.id,'Other Earn','other-earn','earning',5,TRUE);
     RETURN NEW;
 END; $$;
 CREATE TRIGGER on_user_profile_created AFTER INSERT ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION
 public.seed_defaults_for_new_user();

 -- Auto-update updated_at
 CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
 BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

 CREATE TRIGGER set_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE
 FUNCTION public.set_updated_at();
 CREATE TRIGGER set_updated_at_accounts BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION
 public.set_updated_at();
 CREATE TRIGGER set_updated_at_transactions BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE
 FUNCTION public.set_updated_at();
 CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION
 public.set_updated_at();
 CREATE TRIGGER set_updated_at_savings_goals BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE
 FUNCTION public.set_updated_at();
 CREATE TRIGGER set_updated_at_wishlists BEFORE UPDATE ON public.wishlists FOR EACH ROW EXECUTE FUNCTION
 public.set_updated_at();

 Views

 -- Account balances dengan type info (untuk halaman Accounts)
 CREATE VIEW public.v_account_balances AS
 SELECT a.*, at.name AS account_type_name, at.slug AS account_type_slug, at.sort_order AS type_sort_order
 FROM public.accounts a JOIN public.account_types at ON at.id = a.account_type_id WHERE a.is_active = TRUE;

 -- Actual spending per kategori per bulan (untuk halaman Budgets)
 CREATE VIEW public.v_monthly_spending_by_category AS
 SELECT t.user_id,
     EXTRACT(YEAR FROM t.transaction_date)::SMALLINT AS budget_year,
     EXTRACT(MONTH FROM t.transaction_date)::SMALLINT AS budget_month,
     t.category_id, c.name AS category_name, c.group_name AS category_group,
     SUM(t.amount) AS actual_spent, COUNT(*) AS transaction_count
 FROM public.transactions t JOIN public.categories c ON c.id = t.category_id
 WHERE t.transaction_type = 'spending' AND t.deleted_at IS NULL
 GROUP BY t.user_id, EXTRACT(YEAR FROM t.transaction_date), EXTRACT(MONTH FROM t.transaction_date),
     t.category_id, c.name, c.group_name;

 -- Goal progress dengan persentase
 CREATE VIEW public.v_goal_progress AS
 SELECT g.*, a.name AS linked_account_name, a.current_balance AS linked_account_balance,
     CASE WHEN g.target_amount > 0 THEN ROUND((g.collected_amount / g.target_amount) * 100, 2) ELSE 0 END AS
 progress_percent
 FROM public.savings_goals g LEFT JOIN public.accounts a ON a.id = g.linked_account_id WHERE g.is_active =
 TRUE;

 ---
 Google Sheets → Supabase Mapping

 ┌──────────┬──────────────────────┬─────────────────────────────────────────────────────────────────────┐
 │  Sheet   │        Target        │                           Catatan migrasi                           │
 ├──────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────┤
 │ Summary  │ accounts             │ Value→current_balance, Balancing→last_reality_check, Last           │
 │          │                      │ Updated→last_reality_check_at                                       │
 ├──────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────┤
 │          │                      │ Account→account_id (lookup by slug), Category or                    │
 │ Jan–Dec  │ transactions         │ Account→category_id atau to_account_id, amount dari kolom yang      │
 │          │                      │ relevan via logika getCashValue()                                   │
 ├──────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────┤
 │ Assets   │ accounts (update)    │ Update asset_category pada akun yang sudah ada; insert baru untuk   │
 │          │                      │ aset investment-only                                                │
 ├──────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────┤
 │ Goals    │ savings_goals        │ Type→goal_type, Account→linked_account_id (FK lookup)               │
 ├──────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────┤
 │ Wallet   │ wallet_denominations │ Linked ke account dengan is_wallet=TRUE                             │
 ├──────────┼──────────────────────┼─────────────────────────────────────────────────────────────────────┤
 │ Budget   │ budgets              │ Satu row per kategori per bulan                                     │
 │ sheets   │                      │                                                                     │
 └──────────┴──────────────────────┴─────────────────────────────────────────────────────────────────────┘

 └──────────┴──────────────────────┴─────────────────────────────────────────────────────────────────────┘

 └──────────┴──────────────────────┴─────────────────────────────────────────────────────────────────────┘

 └───────────┴──────────────────────┴───────────────────────────────────────────────────────────────────────────────┘

 Contoh mapping transaksi

 Sheet: 28/4/2026 | Spending | Mandiri | Health | BPJS Kesehatan | ATM: -115815
 INSERT INTO transactions (transaction_date, transaction_type, account_id, category_id, note, amount)
 VALUES ('2026-04-28', 'spending', '<mandiri_uuid>', '<health_uuid>', 'BPJS Kesehatan', 115815);

 Sheet: 28/4/2026 | Transfer | Mandiri | Investment | JAMSOSTEK | ATM: -231630 | Investment: +231630
 INSERT INTO transactions (transaction_date, transaction_type, account_id, to_account_id, note, amount)
 VALUES ('2026-04-28', 'transfer', '<mandiri_uuid>', '<jamsostek_uuid>', 'JAMSOSTEK', 231630);

 ---
 Referensi File (App Lama — untuk referensi migrasi)

 - utils/helper.js — getCashValue(): logika pick kolom amount yang tepat
 - utils/constants.js — daftar kategori default + account types
 - app/api/accounts/route.js — cara parse Summary sheet
 - app/api/transactions/route.js — cara parse monthly sheets
 - app/api/goals/route.js — cara parse Goals sheet

 ---
 Verification

 Setelah schema dieksekusi di Supabase:
 1. Sign up user baru → pastikan user_profiles, account_types, dan categories ter-seed otomatis
 2. Insert akun baru → pastikan RLS block akun milik user lain
 3. Insert transaksi spending → pastikan amount selalu positif, category_id terisi
 4. Insert transfer → pastikan to_account_id terisi, category_id NULL
 5. Query v_monthly_spending_by_category → pastikan aggregasi benar per bulan
 6. Query v_goal_progress → pastikan progress_percent dihitung dengan benar
 7. Free tier: coba insert akun ke-6 → harus gagal (check_account_limit)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Claude has written up a plan and is ready to execute. Would you like to proceed?

 ❯ 1. Yes, auto-accept edits
   2. Yes, manually approve edits
   3. No, refine with Ultraplan on Claude Code on the web
   4. Tell Claude what to change
      shift+tab to approve with this feedback

 ctrl-g to edit in VS Code · ~/.claude/plans/topik-vibe-coding-distributed-lollipop.md
ujn