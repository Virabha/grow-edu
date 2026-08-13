DO $$ BEGIN
 CREATE TYPE "kyc_status" AS ENUM('NOT_STARTED', 'SUBMITTED', 'VERIFIED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "member_role" AS ENUM('OWNER', 'ADMIN', 'INSTRUCTOR', 'STUDENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "member_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "org_status" AS ENUM('PENDING_KYC', 'ACTIVE', 'GRACE', 'SUSPENDED', 'PENDING_DELETION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "platform_role" AS ENUM('PLATFORM_SUPPORT', 'PLATFORM_OWNER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "video_quality" AS ENUM('STANDARD', 'HIGH', 'ULTRA');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_members" (
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "member_status" DEFAULT 'INVITED' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_pkey" PRIMARY KEY("user_id","organization_id","role")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"organization_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "org_status" DEFAULT 'PENDING_KYC' NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"kyc_status" "kyc_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"kyc_verified_at" timestamp with time zone,
	"payout_account_ref" text,
	"commission_rate_bps" integer DEFAULT 1000 NOT NULL,
	"instructor_revenue_share" boolean DEFAULT false NOT NULL,
	"video_quality" "video_quality" DEFAULT 'STANDARD' NOT NULL,
	"storage_quota_bytes" bigint,
	"bandwidth_quota_bytes" bigint,
	"grace_started_at" timestamp with time zone,
	"billing_customer_ref" text,
	"suspended_at" timestamp with time zone,
	"deletion_scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"platform_role" "platform_role",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_members_org_role_idx" ON "organization_members" ("organization_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_members_user_idx" ON "organization_members" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_status_idx" ON "organizations" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_platform_role_idx" ON "users" ("platform_role");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
