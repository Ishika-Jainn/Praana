CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"location" text,
	"risk_level" text NOT NULL,
	"action" text NOT NULL,
	"animal_id" text,
	"case_id" text,
	"audience" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"read_by" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text NOT NULL,
	"sex" text NOT NULL,
	"age_months" integer NOT NULL,
	"weight_kg" real NOT NULL,
	"farm_id" text NOT NULL,
	"status" text NOT NULL,
	"risk_level" text NOT NULL,
	"suspected_condition" text,
	"confirmed_condition" text,
	"affected_regions" jsonb NOT NULL,
	"last_exam_at" timestamp,
	"last_vaccination_at" timestamp,
	"milk_yield_l" real,
	"pregnant" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"district_id" text NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" text PRIMARY KEY NOT NULL,
	"case_code" text NOT NULL,
	"animal_id" text NOT NULL,
	"status" text NOT NULL,
	"risk_level" text NOT NULL,
	"suspected" text,
	"assigned_vet_id" text,
	"assigned_vet_name" text,
	"summary" text,
	"opened_at" timestamp NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"disease" text NOT NULL,
	"disease_id" text NOT NULL,
	"risk_level" text NOT NULL,
	"radius_km" real NOT NULL,
	"center_lat" real NOT NULL,
	"center_lng" real NOT NULL,
	"animal_ids" jsonb NOT NULL,
	"farm_ids" jsonb NOT NULL,
	"summary" text NOT NULL,
	"detected_at" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disease_trends" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"district_id" text NOT NULL,
	"disease" text NOT NULL,
	"cases" integer NOT NULL,
	"deaths" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"district_id" text,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" text PRIMARY KEY NOT NULL,
	"village_id" text NOT NULL,
	"name" text NOT NULL,
	"owner_name" text NOT NULL,
	"owner_phone" text,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"herd_size" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_samples" (
	"id" text PRIMARY KEY NOT NULL,
	"sample_code" text NOT NULL,
	"animal_id" text NOT NULL,
	"case_id" text,
	"sample_type" text NOT NULL,
	"collected_at" timestamp NOT NULL,
	"collector" text NOT NULL,
	"lab_name" text NOT NULL,
	"test_name" text NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"result_note" text,
	"result_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"report_id" text,
	"kind" text NOT NULL,
	"region" text,
	"caption" text,
	"url" text NOT NULL,
	"captured_at" timestamp NOT NULL,
	"lat" real,
	"lng" real,
	"reporter_name" text
);
--> statement-breakpoint
CREATE TABLE "mortality_events" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"cause" text NOT NULL,
	"notes" text,
	"occurred_at" timestamp NOT NULL,
	"reported_by" text,
	"village_id" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"case_id" text,
	"reporter_id" text,
	"reporter_name" text,
	"symptoms" jsonb NOT NULL,
	"regions" jsonb NOT NULL,
	"severity" text NOT NULL,
	"duration" text,
	"notes" text,
	"voice_transcript" text,
	"language" text,
	"triage" jsonb,
	"lat" real,
	"lng" real,
	"created_at" timestamp NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"case_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"actor" text,
	"occurred_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"case_id" text,
	"condition" text NOT NULL,
	"medicine" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"vet_name" text NOT NULL,
	"response" text,
	"follow_up" timestamp,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"email" text,
	"title" text,
	"language" text DEFAULT 'en' NOT NULL,
	"password_hash" text,
	"farm_id" text,
	"village_id" text,
	"block_id" text,
	"district_id" text
);
--> statement-breakpoint
CREATE TABLE "vaccinations" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"vaccine" text NOT NULL,
	"dose" text NOT NULL,
	"batch" text NOT NULL,
	"given_at" timestamp NOT NULL,
	"next_due" timestamp,
	"vet_name" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vet_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"case_id" text,
	"vet_id" text,
	"vet_name" text NOT NULL,
	"findings" text NOT NULL,
	"suspected_dx" text,
	"recommendations" text,
	"examined_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "villages" (
	"id" text PRIMARY KEY NOT NULL,
	"block_id" text NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"households" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"village_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"temp_c" real NOT NULL,
	"humidity" integer NOT NULL,
	"rainfall_mm" real NOT NULL,
	"note" text
);
