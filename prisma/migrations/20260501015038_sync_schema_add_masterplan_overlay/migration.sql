-- Sync DB schema with schema.prisma
-- Add missing columns and table for role change requests

-- 1. Add masterplanOverlay column to proyecto_imagenes (CRITICAL for Image Gallery)
ALTER TABLE proyecto_imagenes 
ADD COLUMN IF NOT EXISTS "masterplanOverlay" JSONB;

-- 2. Add isPublished column to tours_360 (CRITICAL for tour publishing)
ALTER TABLE tours_360 
ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- 3. Create role_change_requests table (Required by active role change functionality)
CREATE TABLE IF NOT EXISTS "role_change_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentRole" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_change_requests_pkey" PRIMARY KEY ("id")
);

-- 4. Create index for role_change_requests
CREATE INDEX IF NOT EXISTS "role_change_requests_userId_status_idx" 
ON "role_change_requests"("userId", "status");

-- 5. Add foreign key constraint for role_change_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'role_change_requests_userId_fkey'
    ) THEN
        ALTER TABLE "role_change_requests" 
        ADD CONSTRAINT "role_change_requests_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
