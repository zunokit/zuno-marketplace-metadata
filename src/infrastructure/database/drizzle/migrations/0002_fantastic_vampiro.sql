/*
    Migration to fix audit_logs.resource_id type from uuid to text
    to support Better Auth IDs which are strings, not UUIDs
*/

ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" SET DATA TYPE text;