# Video Annotation Images - Setup & Troubleshooting

## Overview
Video annotations now capture the annotated frame as a PNG image and attach it to comments automatically.

## Implementation Summary

### Changes Made:
1. **AnnotationCanvas** - Added `exportAnnotatedFrame()` method to export canvas with video frame + annotations as PNG
2. **VideoPlayer** - Added `crossOrigin="anonymous"` to support canvas export without CORS taint
3. **VideoReviewModal** - Captures annotation images and uploads them as attachments
4. **CommentThread** - Displays annotation images in comments with signed URLs
5. **Server Actions** - Added `uploadCommentAttachment()` for attaching images to existing comments

### How It Works:
1. User draws annotations on video frame
2. On save:
   - Annotations saved to `annotations` table
   - Comment created in `notes` table
   - Annotated frame exported as PNG blob
   - Blob converted to base64 for transmission
   - Image uploaded to `note-attachments` storage bucket
   - Attachment record created linking image to comment
3. Comments display with annotation images below text

## CORS Configuration

### Issue: "Tainted canvases may not be exported"
This error occurs when the video element loads from a different origin without proper CORS headers.

### Solution 1: Supabase Storage CORS (Recommended)
Configure CORS on the `post-media` storage bucket to allow cross-origin access:

```sql
-- Check current bucket settings
SELECT name, public, allowed_mime_types
FROM storage.buckets
WHERE name = 'post-media';

-- Option A: If using Supabase Dashboard
-- Go to Storage → post-media bucket → Configuration → CORS
-- Add allowed origin: * or your domain

-- Option B: Via SQL (if supported by your Supabase version)
-- Note: CORS is typically configured via Kong gateway in self-hosted setups
```

### Solution 2: Kong Gateway CORS
For self-hosted Supabase, CORS is handled by Kong API Gateway. Check `/supabase/supabase-kubernetes/charts/supabase/values.yaml`:

```yaml
# Ensure CORS plugin is enabled
KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
```

Kong should automatically add CORS headers for storage requests. If not working:

1. Check Kong logs: `kubectl logs -n supabase <kong-pod-name>`
2. Verify storage service has CORS configured
3. Ensure signed URLs include proper headers

### Solution 3: Proxy Through Next.js (Fallback)
If CORS cannot be configured on storage, create an API route to proxy video requests:

```typescript
// app/api/proxy-video/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const signedUrl = searchParams.get('url')

  const response = await fetch(signedUrl!)
  const blob = await response.blob()

  return new Response(blob, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
```

Then modify `VideoReviewModal` to use proxy URL instead of signed URL directly.

## Testing Checklist

### 1. Test Annotation Capture
- [ ] Open video review modal
- [ ] Pause video on any frame
- [ ] Draw annotation (rectangle/arrow/freehand)
- [ ] Add annotation text
- [ ] Click Save
- [ ] Verify console logs: "Captured annotation image: X bytes"
- [ ] Check for CORS errors in console

### 2. Test Comment Creation
- [ ] After saving annotation, check comment thread
- [ ] Verify new comment appears with frame number
- [ ] Verify comment has annotation text
- [ ] Check database: `SELECT * FROM notes WHERE entity_type='post' ORDER BY created_at DESC LIMIT 1`

### 3. Test Image Upload
- [ ] Verify console logs: "✅ Attachment uploaded successfully"
- [ ] Check database: `SELECT * FROM attachments ORDER BY created_at DESC LIMIT 1`
- [ ] Verify `storage_path` matches pattern: `{note_id}/{timestamp}_frame-{frameNumber}.png`
- [ ] Check storage bucket has file: `SELECT * FROM storage.objects WHERE bucket_id='note-attachments' ORDER BY created_at DESC LIMIT 1`

### 4. Test Image Display
- [ ] Refresh page after creating annotation comment
- [ ] Expand comment thread
- [ ] Verify annotation image displays below comment text
- [ ] Click image to open in new tab
- [ ] Verify signed URL works (image loads)

### 5. Test Edge Cases
- [ ] Annotation without text → Should create comment with default text "[Frame X] Annotation"
- [ ] Multiple annotations on same frame → Each creates separate comment with own image
- [ ] Failed image capture → Comment still created (text-only)
- [ ] Failed upload → Comment created, warning logged, no crash

## Database Verification Queries

```sql
-- Recent annotation comments
SELECT n.id, n.content, n.created_at,
       (SELECT COUNT(*) FROM attachments WHERE note_id = n.id) as attachment_count
FROM notes n
WHERE n.entity_type = 'post'
ORDER BY n.created_at DESC
LIMIT 10;

-- Attachments with storage paths
SELECT a.id, a.note_id, a.file_name, a.file_size, a.storage_path, a.created_at
FROM attachments a
ORDER BY a.created_at DESC
LIMIT 10;

-- Storage objects in note-attachments bucket
SELECT name, bucket_id, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'note-attachments'
ORDER BY created_at DESC
LIMIT 10;

-- Full comment with attachment data
SELECT
  n.id as note_id,
  n.content,
  n.created_at,
  a.id as attachment_id,
  a.file_name,
  a.storage_path
FROM notes n
LEFT JOIN attachments a ON a.note_id = n.id
WHERE n.entity_type = 'post'
ORDER BY n.created_at DESC
LIMIT 10;
```

## Troubleshooting

### Error: "Tainted canvases may not be exported"
**Cause:** CORS headers missing from storage bucket
**Fix:** Configure CORS on `post-media` bucket (see CORS Configuration above)

### Error: "new row violates row-level security policy for table 'notes'"
**Cause:** RLS policy blocking insert (should be fixed by using existing `createPostComment` action)
**Fix:** Verify user is authenticated and has permission to comment on posts

### Error: Failed to upload attachment
**Cause:** Storage bucket permissions or quota
**Fix:**
- Check `note-attachments` bucket exists
- Verify bucket allows uploads from authenticated users
- Check storage quota (10MB limit per file)

### Images not displaying
**Cause:** Signed URL not fetched or expired
**Fix:**
- Check console for signed URL errors
- Verify `attachments` table has correct `storage_path`
- Refresh page (signed URLs expire after 1 hour)

### Large image file sizes
**Typical size:** 500KB - 1MB per annotation at 1920x1080
**Fix if too large:**
- Reduce PNG quality in `exportAnnotatedFrame()` (currently 0.9)
- Resize canvas before export
- Use JPEG instead of PNG (requires code change)

## Performance Notes

- Images are exported at native canvas resolution (1920x1080)
- PNG format with 90% quality (~500KB-1MB per image)
- Signed URLs cached for 1 hour
- Base64 encoding adds ~33% overhead during transmission (removed on server)
- Storage bucket has 10MB per-file limit (annotation images well within this)

## Future Enhancements

- [ ] Image compression on client before upload
- [ ] Thumbnail generation for comment thread
- [ ] Lightbox/zoom for full-size image viewing
- [ ] Batch annotation export (multiple frames at once)
- [ ] Drawing replay animation in comments
- [ ] Annotation layers (background/foreground)
