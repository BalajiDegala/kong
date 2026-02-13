-- Storage RLS Policies for post-media bucket
-- Allows users to upload/view/delete media for posts they have access to

-- ============================================================================
-- STORAGE POLICIES FOR post-media BUCKET
-- ============================================================================

-- Policy: Users can view post media for visible posts
-- Allows viewing media from global posts or project posts they're members of
DROP POLICY IF EXISTS "Users can view post media for visible posts" ON storage.objects;
CREATE POLICY "Users can view post media for visible posts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'post-media'
        AND (
            -- Allow if the post is global (visible to all)
            EXISTS (
                SELECT 1 FROM public.post_media
                JOIN public.posts ON posts.id = post_media.post_id
                WHERE post_media.storage_path = storage.objects.name
                AND (posts.visibility = 'global' OR posts.project_id IS NULL)
            )
            OR
            -- Allow if the post is project-specific and user is a member
            EXISTS (
                SELECT 1 FROM public.post_media
                JOIN public.posts ON posts.id = post_media.post_id
                JOIN public.project_members ON project_members.project_id = posts.project_id
                WHERE post_media.storage_path = storage.objects.name
                AND project_members.user_id = auth.uid()
            )
        )
    );

-- Policy: Users can upload post media for their own posts
DROP POLICY IF EXISTS "Users can upload post media for own posts" ON storage.objects;
CREATE POLICY "Users can upload post media for own posts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'post-media'
        AND (
            -- Extract post_id from path (format: {post_id}/filename)
            -- Path format: "123/1234567890-0.jpg"
            SPLIT_PART(name, '/', 1)::integer IN (
                SELECT id FROM public.posts WHERE author_id = auth.uid()
            )
        )
    );

-- Policy: Users can update post media for their own posts
DROP POLICY IF EXISTS "Users can update post media for own posts" ON storage.objects;
CREATE POLICY "Users can update post media for own posts"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'post-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.post_media
                JOIN public.posts ON posts.id = post_media.post_id
                WHERE post_media.storage_path = storage.objects.name
                AND posts.author_id = auth.uid()
            )
        )
    );

-- Policy: Users can delete post media for their own posts
DROP POLICY IF EXISTS "Users can delete post media for own posts" ON storage.objects;
CREATE POLICY "Users can delete post media for own posts"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'post-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.post_media
                JOIN public.posts ON posts.id = post_media.post_id
                WHERE post_media.storage_path = storage.objects.name
                AND posts.author_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all storage policies for post-media bucket
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%post%media%';
