#!/bin/bash
# Apply post-media storage RLS policies

echo "Finding Supabase postgres pod..."
POD=$(kubectl get pods -n default | grep postgres | grep -v Terminating | awk '{print $1}' | head -1)

if [ -z "$POD" ]; then
    echo "❌ Could not find postgres pod"
    echo "Please apply the SQL manually via Supabase Studio"
    exit 1
fi

echo "Found pod: $POD"
echo "Applying storage RLS policies..."

kubectl exec -i $POD -n default -- psql -U postgres -d postgres < echo/migrations\&fixes/generated/setup-post-media-storage-rls.sql

echo "✅ Done! Policies applied."
echo ""
echo "To verify, run:"
echo "kubectl exec -it $POD -n default -- psql -U postgres -d postgres -c \"SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%post%media%';\""
