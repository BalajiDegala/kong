-- Fix post-media storage RLS policies
-- Simplified version that actually works

-- Drop the overly complex policies
DROP POLICY IF EXISTS "Users can upload post media for own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view post media for visible posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update post media for own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete post media for own posts" ON storage.objects;

-- ============================================================================
-- SIMPLIFIED POLICIES (will refine later)
-- ============================================================================

-- Policy: Authenticated users can view all post-media
-- (We'll make this more restrictive later based on post visibility)
CREATE POLICY "Authenticated users can view post-media"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'post-media'
        AND auth.role() = 'authenticated'
    );

-- Policy: Authenticated users can upload to post-media
-- (The post_media table RLS will control who can link media to which posts)
CREATE POLICY "Authenticated users can upload post-media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'post-media'
        AND auth.role() = 'authenticated'
    );

-- Policy: Users can update their uploaded files
-- (Match by checking if a post_media record exists with their author_id)
CREATE POLICY "Users can update own post-media"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'post-media'
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.post_media
            JOIN public.posts ON posts.id = post_media.post_id
            WHERE post_media.storage_path = storage.objects.name
            AND posts.author_id = auth.uid()
        )
    );

-- Policy: Users can delete their uploaded files
CREATE POLICY "Users can delete own post-media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'post-media'
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.post_media
            JOIN public.posts ON posts.id = post_media.post_id
            WHERE post_media.storage_path = storage.objects.name
            AND posts.author_id = auth.uid()
        )
    );

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Check policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%post-media%'
ORDER BY policyname;
