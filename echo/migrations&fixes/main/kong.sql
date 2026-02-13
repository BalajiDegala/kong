--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime_messages_publication;
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP POLICY IF EXISTS "Users can view note attachments in their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload note attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update note attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete note attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files" ON storage.objects;
DROP POLICY IF EXISTS "allow read own allowlist record" ON public.allowed_users;
DROP POLICY IF EXISTS "Users can view versions in their projects" ON public.versions;
DROP POLICY IF EXISTS "Users can view time logs in their projects" ON public.time_logs;
DROP POLICY IF EXISTS "Users can view tickets in their projects" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can view shots in their projects" ON public.shots;
DROP POLICY IF EXISTS "Users can view sequences in their projects" ON public.sequences;
DROP POLICY IF EXISTS "Users can view published files in their projects" ON public.published_files;
DROP POLICY IF EXISTS "Users can view project members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can view playlists in their projects" ON public.playlists;
DROP POLICY IF EXISTS "Users can view phases in their projects" ON public.phases;
DROP POLICY IF EXISTS "Users can view notes in their projects" ON public.notes;
DROP POLICY IF EXISTS "Users can view milestones in their projects" ON public.milestones;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view deliveries in their projects" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view co-members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view attachments in their projects" ON public.attachments;
DROP POLICY IF EXISTS "Users can view assets in their projects" ON public.assets;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view activity in their projects" ON public.activity_events;
DROP POLICY IF EXISTS "Users can update versions in their projects" ON public.versions;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete versions in their projects" ON public.versions;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can create versions in their projects" ON public.versions;
DROP POLICY IF EXISTS "Users can create notes in their projects" ON public.notes;
DROP POLICY IF EXISTS "Users can create attachments in their projects" ON public.attachments;
DROP POLICY IF EXISTS "Leads can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Leads and alphas can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Conversation creators can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Alphas and leads can create projects" ON public.projects;
DROP POLICY IF EXISTS "Allow users to update their projects" ON public.projects;
DROP POLICY IF EXISTS "Allow users to delete their projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to view shots" ON public.shots;
DROP POLICY IF EXISTS "Allow authenticated users to view sequences" ON public.sequences;
DROP POLICY IF EXISTS "Allow authenticated users to view projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to view project members" ON public.project_members;
DROP POLICY IF EXISTS "Allow authenticated users to view assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to update shots" ON public.shots;
DROP POLICY IF EXISTS "Allow authenticated users to update sequences" ON public.sequences;
DROP POLICY IF EXISTS "Allow authenticated users to update assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert shots" ON public.shots;
DROP POLICY IF EXISTS "Allow authenticated users to insert sequences" ON public.sequences;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users to delete shots" ON public.shots;
DROP POLICY IF EXISTS "Allow authenticated users to delete sequences" ON public.sequences;
DROP POLICY IF EXISTS "Allow authenticated users to delete assets" ON public.assets;
DROP POLICY IF EXISTS "All authenticated users can view steps" ON public.steps;
DROP POLICY IF EXISTS "All authenticated users can view statuses" ON public.statuses;
DROP POLICY IF EXISTS "All authenticated users can view groups" ON public.groups;
DROP POLICY IF EXISTS "All authenticated users can view departments" ON public.departments;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.prefixes DROP CONSTRAINT IF EXISTS "prefixes_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY storage.iceberg_tables DROP CONSTRAINT IF EXISTS iceberg_tables_namespace_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.iceberg_tables DROP CONSTRAINT IF EXISTS iceberg_tables_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.iceberg_namespaces DROP CONSTRAINT IF EXISTS iceberg_namespaces_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_artist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.time_logs DROP CONSTRAINT IF EXISTS time_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.time_logs DROP CONSTRAINT IF EXISTS time_logs_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS tickets_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS tickets_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_step_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_milestone_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE IF EXISTS ONLY public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_depends_on_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.steps DROP CONSTRAINT IF EXISTS steps_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shots DROP CONSTRAINT IF EXISTS shots_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.shots DROP CONSTRAINT IF EXISTS shots_sequence_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shots DROP CONSTRAINT IF EXISTS shots_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shots DROP CONSTRAINT IF EXISTS shots_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.sequences DROP CONSTRAINT IF EXISTS sequences_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.sequences DROP CONSTRAINT IF EXISTS sequences_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sequences DROP CONSTRAINT IF EXISTS sequences_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.published_files DROP CONSTRAINT IF EXISTS published_files_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.published_files DROP CONSTRAINT IF EXISTS published_files_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.published_files DROP CONSTRAINT IF EXISTS published_files_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.published_files DROP CONSTRAINT IF EXISTS published_files_published_by_fkey;
ALTER TABLE IF EXISTS ONLY public.published_files DROP CONSTRAINT IF EXISTS published_files_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.published_file_dependencies DROP CONSTRAINT IF EXISTS published_file_dependencies_published_file_id_fkey;
ALTER TABLE IF EXISTS ONLY public.published_file_dependencies DROP CONSTRAINT IF EXISTS published_file_dependencies_depends_on_published_file_id_fkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.project_members DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.playlists DROP CONSTRAINT IF EXISTS playlists_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.playlists DROP CONSTRAINT IF EXISTS playlists_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.playlist_shares DROP CONSTRAINT IF EXISTS playlist_shares_playlist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.playlist_shares DROP CONSTRAINT IF EXISTS playlist_shares_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_playlist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.phases DROP CONSTRAINT IF EXISTS phases_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_parent_note_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.note_mentions DROP CONSTRAINT IF EXISTS note_mentions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.note_mentions DROP CONSTRAINT IF EXISTS note_mentions_note_id_fkey;
ALTER TABLE IF EXISTS ONLY public.milestones DROP CONSTRAINT IF EXISTS milestones_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.milestones DROP CONSTRAINT IF EXISTS milestones_phase_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.delivery_items DROP CONSTRAINT IF EXISTS delivery_items_delivery_id_fkey;
ALTER TABLE IF EXISTS ONLY public.deliveries DROP CONSTRAINT IF EXISTS deliveries_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.deliveries DROP CONSTRAINT IF EXISTS deliveries_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.conversations DROP CONSTRAINT IF EXISTS conversations_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.conversations DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_conversation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attachments DROP CONSTRAINT IF EXISTS attachments_note_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attachments DROP CONSTRAINT IF EXISTS attachments_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_shot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_sequence_id_fkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_events DROP CONSTRAINT IF EXISTS activity_events_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_events DROP CONSTRAINT IF EXISTS activity_events_actor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
ALTER TABLE IF EXISTS ONLY _realtime.extensions DROP CONSTRAINT IF EXISTS extensions_tenant_external_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS prefixes_delete_hierarchy ON storage.prefixes;
DROP TRIGGER IF EXISTS prefixes_create_hierarchy ON storage.prefixes;
DROP TRIGGER IF EXISTS objects_update_create_prefix ON storage.objects;
DROP TRIGGER IF EXISTS objects_insert_create_prefix ON storage.objects;
DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects;
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP TRIGGER IF EXISTS version_activity_logger ON public.versions;
DROP TRIGGER IF EXISTS update_versions_updated_at ON public.versions;
DROP TRIGGER IF EXISTS update_time_logs_updated_at ON public.time_logs;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_shots_updated_at ON public.shots;
DROP TRIGGER IF EXISTS update_sequences_updated_at ON public.sequences;
DROP TRIGGER IF EXISTS update_published_files_updated_at ON public.published_files;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON public.deliveries;
DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
DROP TRIGGER IF EXISTS task_activity_logger ON public.tasks;
DROP TRIGGER IF EXISTS published_file_activity_logger ON public.published_files;
DROP TRIGGER IF EXISTS note_activity_logger ON public.notes;
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
DROP INDEX IF EXISTS supabase_functions.supabase_functions_hooks_request_id_idx;
DROP INDEX IF EXISTS supabase_functions.supabase_functions_hooks_h_table_id_h_name_idx;
DROP INDEX IF EXISTS storage.vector_indexes_name_bucket_id_idx;
DROP INDEX IF EXISTS storage.objects_bucket_id_level_idx;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_prefixes_lower_name;
DROP INDEX IF EXISTS storage.idx_objects_lower_name;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_name_bucket_level_unique;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.idx_iceberg_tables_namespace_id;
DROP INDEX IF EXISTS storage.idx_iceberg_namespaces_bucket_id;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_key;
DROP INDEX IF EXISTS realtime.messages_2026_02_13_inserted_at_topic_idx;
DROP INDEX IF EXISTS realtime.messages_2026_02_12_inserted_at_topic_idx;
DROP INDEX IF EXISTS realtime.messages_2026_02_11_inserted_at_topic_idx;
DROP INDEX IF EXISTS realtime.messages_2026_02_10_inserted_at_topic_idx;
DROP INDEX IF EXISTS realtime.messages_2026_02_09_inserted_at_topic_idx;
DROP INDEX IF EXISTS realtime.messages_2026_02_08_inserted_at_topic_idx;
DROP INDEX IF EXISTS realtime.messages_inserted_at_topic_index;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.idx_versions_task;
DROP INDEX IF EXISTS public.idx_versions_status;
DROP INDEX IF EXISTS public.idx_versions_project;
DROP INDEX IF EXISTS public.idx_versions_file_path;
DROP INDEX IF EXISTS public.idx_versions_entity;
DROP INDEX IF EXISTS public.idx_versions_created_by;
DROP INDEX IF EXISTS public.idx_time_logs_user;
DROP INDEX IF EXISTS public.idx_time_logs_project;
DROP INDEX IF EXISTS public.idx_time_logs_entity;
DROP INDEX IF EXISTS public.idx_time_logs_date;
DROP INDEX IF EXISTS public.idx_tickets_status;
DROP INDEX IF EXISTS public.idx_tickets_project;
DROP INDEX IF EXISTS public.idx_tickets_assigned;
DROP INDEX IF EXISTS public.idx_tasks_step;
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_tasks_project;
DROP INDEX IF EXISTS public.idx_tasks_milestone;
DROP INDEX IF EXISTS public.idx_tasks_entity;
DROP INDEX IF EXISTS public.idx_tasks_due_date;
DROP INDEX IF EXISTS public.idx_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_task_assignments_user;
DROP INDEX IF EXISTS public.idx_shots_status;
DROP INDEX IF EXISTS public.idx_shots_sequence;
DROP INDEX IF EXISTS public.idx_shots_project;
DROP INDEX IF EXISTS public.idx_published_files_version;
DROP INDEX IF EXISTS public.idx_published_files_task;
DROP INDEX IF EXISTS public.idx_published_files_project;
DROP INDEX IF EXISTS public.idx_published_files_entity;
DROP INDEX IF EXISTS public.idx_projects_status;
DROP INDEX IF EXISTS public.idx_projects_archived;
DROP INDEX IF EXISTS public.idx_project_members_user_id;
DROP INDEX IF EXISTS public.idx_project_members_role;
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_profiles_department;
DROP INDEX IF EXISTS public.idx_phases_project;
DROP INDEX IF EXISTS public.idx_notes_task_id;
DROP INDEX IF EXISTS public.idx_notes_status;
DROP INDEX IF EXISTS public.idx_notes_project;
DROP INDEX IF EXISTS public.idx_notes_entity;
DROP INDEX IF EXISTS public.idx_notes_created_by;
DROP INDEX IF EXISTS public.idx_notes_created;
DROP INDEX IF EXISTS public.idx_notes_author;
DROP INDEX IF EXISTS public.idx_note_mentions_user;
DROP INDEX IF EXISTS public.idx_note_mentions_unread;
DROP INDEX IF EXISTS public.idx_milestones_project;
DROP INDEX IF EXISTS public.idx_milestones_phase;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_messages_author_id;
DROP INDEX IF EXISTS public.idx_deliveries_status;
DROP INDEX IF EXISTS public.idx_deliveries_project;
DROP INDEX IF EXISTS public.idx_conversations_type;
DROP INDEX IF EXISTS public.idx_conversations_project_id;
DROP INDEX IF EXISTS public.idx_conversation_members_user_id;
DROP INDEX IF EXISTS public.idx_conversation_members_conversation_id;
DROP INDEX IF EXISTS public.idx_assets_type;
DROP INDEX IF EXISTS public.idx_assets_status;
DROP INDEX IF EXISTS public.idx_assets_shot;
DROP INDEX IF EXISTS public.idx_assets_sequence;
DROP INDEX IF EXISTS public.idx_assets_project;
DROP INDEX IF EXISTS public.idx_activity_project_time;
DROP INDEX IF EXISTS public.idx_activity_entity;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_pattern_idx;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.oauth_consents_user_order_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_user_client_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_client_idx;
DROP INDEX IF EXISTS auth.oauth_clients_deleted_at_idx;
DROP INDEX IF EXISTS auth.oauth_auth_pending_exp_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
DROP INDEX IF EXISTS _realtime.tenants_external_id_index;
DROP INDEX IF EXISTS _realtime.extensions_tenant_external_id_type_index;
DROP INDEX IF EXISTS _realtime.extensions_tenant_external_id_index;
ALTER TABLE IF EXISTS ONLY supabase_functions.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY supabase_functions.hooks DROP CONSTRAINT IF EXISTS hooks_pkey;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.prefixes DROP CONSTRAINT IF EXISTS prefixes_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.iceberg_tables DROP CONSTRAINT IF EXISTS iceberg_tables_pkey;
ALTER TABLE IF EXISTS ONLY storage.iceberg_namespaces DROP CONSTRAINT IF EXISTS iceberg_namespaces_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_vectors DROP CONSTRAINT IF EXISTS buckets_vectors_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_analytics DROP CONSTRAINT IF EXISTS buckets_analytics_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_02_13 DROP CONSTRAINT IF EXISTS messages_2026_02_13_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_02_12 DROP CONSTRAINT IF EXISTS messages_2026_02_12_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_02_11 DROP CONSTRAINT IF EXISTS messages_2026_02_11_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_02_10 DROP CONSTRAINT IF EXISTS messages_2026_02_10_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_02_09 DROP CONSTRAINT IF EXISTS messages_2026_02_09_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_02_08 DROP CONSTRAINT IF EXISTS messages_2026_02_08_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_project_id_entity_type_entity_id_version_number_key;
ALTER TABLE IF EXISTS ONLY public.versions DROP CONSTRAINT IF EXISTS versions_pkey;
ALTER TABLE IF EXISTS public.versions DROP CONSTRAINT IF EXISTS versions_entity_type_check;
ALTER TABLE IF EXISTS ONLY public.time_logs DROP CONSTRAINT IF EXISTS time_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS tickets_pkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_entity_type_check;
ALTER TABLE IF EXISTS ONLY public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_pkey;
ALTER TABLE IF EXISTS ONLY public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.steps DROP CONSTRAINT IF EXISTS steps_pkey;
ALTER TABLE IF EXISTS ONLY public.steps DROP CONSTRAINT IF EXISTS steps_code_key;
ALTER TABLE IF EXISTS ONLY public.statuses DROP CONSTRAINT IF EXISTS statuses_pkey;
ALTER TABLE IF EXISTS ONLY public.statuses DROP CONSTRAINT IF EXISTS statuses_code_entity_type_key;
ALTER TABLE IF EXISTS ONLY public.shots DROP CONSTRAINT IF EXISTS shots_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.shots DROP CONSTRAINT IF EXISTS shots_pkey;
ALTER TABLE IF EXISTS ONLY public.sequences DROP CONSTRAINT IF EXISTS sequences_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.sequences DROP CONSTRAINT IF EXISTS sequences_pkey;
ALTER TABLE IF EXISTS ONLY public.published_files DROP CONSTRAINT IF EXISTS published_files_pkey;
ALTER TABLE IF EXISTS public.published_files DROP CONSTRAINT IF EXISTS published_files_entity_type_check;
ALTER TABLE IF EXISTS ONLY public.published_file_dependencies DROP CONSTRAINT IF EXISTS published_file_dependencies_pkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_code_key;
ALTER TABLE IF EXISTS ONLY public.project_members DROP CONSTRAINT IF EXISTS project_members_pkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE IF EXISTS ONLY public.playlists DROP CONSTRAINT IF EXISTS playlists_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.playlists DROP CONSTRAINT IF EXISTS playlists_pkey;
ALTER TABLE IF EXISTS ONLY public.playlist_shares DROP CONSTRAINT IF EXISTS playlist_shares_pkey;
ALTER TABLE IF EXISTS ONLY public.playlist_shares DROP CONSTRAINT IF EXISTS playlist_shares_access_key_key;
ALTER TABLE IF EXISTS ONLY public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_pkey;
ALTER TABLE IF EXISTS ONLY public.phases DROP CONSTRAINT IF EXISTS phases_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.phases DROP CONSTRAINT IF EXISTS phases_pkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_pkey;
ALTER TABLE IF EXISTS public.notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE IF EXISTS ONLY public.note_mentions DROP CONSTRAINT IF EXISTS note_mentions_pkey;
ALTER TABLE IF EXISTS ONLY public.milestones DROP CONSTRAINT IF EXISTS milestones_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.milestones DROP CONSTRAINT IF EXISTS milestones_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.groups DROP CONSTRAINT IF EXISTS groups_pkey;
ALTER TABLE IF EXISTS ONLY public.groups DROP CONSTRAINT IF EXISTS groups_code_key;
ALTER TABLE IF EXISTS ONLY public.group_members DROP CONSTRAINT IF EXISTS group_members_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_code_key;
ALTER TABLE IF EXISTS ONLY public.delivery_items DROP CONSTRAINT IF EXISTS delivery_items_pkey;
ALTER TABLE IF EXISTS ONLY public.deliveries DROP CONSTRAINT IF EXISTS deliveries_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.deliveries DROP CONSTRAINT IF EXISTS deliveries_pkey;
ALTER TABLE IF EXISTS ONLY public.conversations DROP CONSTRAINT IF EXISTS conversations_pkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_pkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_conversation_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.attachments DROP CONSTRAINT IF EXISTS attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_project_id_code_key;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_pkey;
ALTER TABLE IF EXISTS ONLY public.allowed_users DROP CONSTRAINT IF EXISTS allowed_users_pkey;
ALTER TABLE IF EXISTS ONLY public.activity_events DROP CONSTRAINT IF EXISTS activity_events_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_client_unique;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_clients DROP CONSTRAINT IF EXISTS oauth_clients_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_id_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_code_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS ONLY _realtime.tenants DROP CONSTRAINT IF EXISTS tenants_pkey;
ALTER TABLE IF EXISTS ONLY _realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY _realtime.extensions DROP CONSTRAINT IF EXISTS extensions_pkey;
ALTER TABLE IF EXISTS supabase_functions.hooks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.versions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.time_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.tickets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.steps ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.statuses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sequences ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.published_files ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.projects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.playlists ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.playlist_shares ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.phases ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.milestones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.deliveries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attachments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.assets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.activity_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS supabase_functions.migrations;
DROP SEQUENCE IF EXISTS supabase_functions.hooks_id_seq;
DROP TABLE IF EXISTS supabase_functions.hooks;
DROP TABLE IF EXISTS storage.vector_indexes;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.prefixes;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.iceberg_tables;
DROP TABLE IF EXISTS storage.iceberg_namespaces;
DROP TABLE IF EXISTS storage.buckets_vectors;
DROP TABLE IF EXISTS storage.buckets_analytics;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages_2026_02_13;
DROP TABLE IF EXISTS realtime.messages_2026_02_12;
DROP TABLE IF EXISTS realtime.messages_2026_02_11;
DROP TABLE IF EXISTS realtime.messages_2026_02_10;
DROP TABLE IF EXISTS realtime.messages_2026_02_09;
DROP TABLE IF EXISTS realtime.messages_2026_02_08;
DROP TABLE IF EXISTS realtime.messages;
DROP SEQUENCE IF EXISTS public.versions_id_seq;
DROP TABLE IF EXISTS public.versions;
DROP SEQUENCE IF EXISTS public.time_logs_id_seq;
DROP TABLE IF EXISTS public.time_logs;
DROP SEQUENCE IF EXISTS public.tickets_id_seq;
DROP TABLE IF EXISTS public.tickets;
DROP SEQUENCE IF EXISTS public.tasks_id_seq;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.task_dependencies;
DROP TABLE IF EXISTS public.task_assignments;
DROP SEQUENCE IF EXISTS public.steps_id_seq;
DROP TABLE IF EXISTS public.steps;
DROP SEQUENCE IF EXISTS public.statuses_id_seq;
DROP TABLE IF EXISTS public.statuses;
DROP SEQUENCE IF EXISTS public.shots_id_seq;
DROP TABLE IF EXISTS public.shots;
DROP SEQUENCE IF EXISTS public.sequences_id_seq;
DROP TABLE IF EXISTS public.sequences;
DROP SEQUENCE IF EXISTS public.published_files_id_seq;
DROP TABLE IF EXISTS public.published_files;
DROP TABLE IF EXISTS public.published_file_dependencies;
DROP SEQUENCE IF EXISTS public.projects_id_seq;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.project_members;
DROP TABLE IF EXISTS public.profiles;
DROP SEQUENCE IF EXISTS public.playlists_id_seq;
DROP TABLE IF EXISTS public.playlists;
DROP SEQUENCE IF EXISTS public.playlist_shares_id_seq;
DROP TABLE IF EXISTS public.playlist_shares;
DROP TABLE IF EXISTS public.playlist_items;
DROP SEQUENCE IF EXISTS public.phases_id_seq;
DROP TABLE IF EXISTS public.phases;
DROP SEQUENCE IF EXISTS public.notes_id_seq;
DROP TABLE IF EXISTS public.notes;
DROP TABLE IF EXISTS public.note_mentions;
DROP SEQUENCE IF EXISTS public.milestones_id_seq;
DROP TABLE IF EXISTS public.milestones;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.groups_id_seq;
DROP TABLE IF EXISTS public.groups;
DROP TABLE IF EXISTS public.group_members;
DROP SEQUENCE IF EXISTS public.departments_id_seq;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.delivery_items;
DROP SEQUENCE IF EXISTS public.deliveries_id_seq;
DROP TABLE IF EXISTS public.deliveries;
DROP TABLE IF EXISTS public.conversations;
DROP TABLE IF EXISTS public.conversation_members;
DROP SEQUENCE IF EXISTS public.attachments_id_seq;
DROP TABLE IF EXISTS public.attachments;
DROP SEQUENCE IF EXISTS public.assets_id_seq;
DROP TABLE IF EXISTS public.assets;
DROP TABLE IF EXISTS public.allowed_users;
DROP SEQUENCE IF EXISTS public.activity_events_id_seq;
DROP TABLE IF EXISTS public.activity_events;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.oauth_consents;
DROP TABLE IF EXISTS auth.oauth_clients;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP TABLE IF EXISTS _realtime.tenants;
DROP TABLE IF EXISTS _realtime.schema_migrations;
DROP TABLE IF EXISTS _realtime.extensions;
DROP FUNCTION IF EXISTS supabase_functions.http_request();
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text);
DROP FUNCTION IF EXISTS storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.prefixes_insert_trigger();
DROP FUNCTION IF EXISTS storage.prefixes_delete_cleanup();
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.objects_update_prefix_trigger();
DROP FUNCTION IF EXISTS storage.objects_update_level_trigger();
DROP FUNCTION IF EXISTS storage.objects_update_cleanup();
DROP FUNCTION IF EXISTS storage.objects_insert_prefix_trigger();
DROP FUNCTION IF EXISTS storage.objects_delete_cleanup();
DROP FUNCTION IF EXISTS storage.lock_top_prefixes(bucket_ids text[], names text[]);
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.get_prefixes(name text);
DROP FUNCTION IF EXISTS storage.get_prefix(name text);
DROP FUNCTION IF EXISTS storage.get_level(name text);
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.enforce_bucket_name_length();
DROP FUNCTION IF EXISTS storage.delete_prefix_hierarchy_trigger();
DROP FUNCTION IF EXISTS storage.delete_prefix(_bucket_id text, _name text);
DROP FUNCTION IF EXISTS storage.delete_leaf_prefixes(bucket_ids text[], names text[]);
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS storage.add_prefixes(_bucket_id text, _name text);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.set_current_user(user_id integer);
DROP FUNCTION IF EXISTS public.log_version_created();
DROP FUNCTION IF EXISTS public.log_task_status_change();
DROP FUNCTION IF EXISTS public.log_published_file_created();
DROP FUNCTION IF EXISTS public.log_note_created();
DROP FUNCTION IF EXISTS public.log_activity_event(p_project_id integer, p_event_type text, p_entity_type text, p_entity_id integer, p_metadata jsonb);
DROP FUNCTION IF EXISTS public.is_conversation_member(conv_id bigint);
DROP FUNCTION IF EXISTS public.get_task_progress(p_entity_type text, p_entity_id integer);
DROP FUNCTION IF EXISTS public.get_next_version_number(p_project_id integer, p_entity_type text, p_entity_id integer);
DROP FUNCTION IF EXISTS public.echo_handle_updated_at();
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS storage.buckettype;
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.oauth_response_type;
DROP TYPE IF EXISTS auth.oauth_registration_type;
DROP TYPE IF EXISTS auth.oauth_client_type;
DROP TYPE IF EXISTS auth.oauth_authorization_status;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgjwt;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP EXTENSION IF EXISTS pg_graphql;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS supabase_functions;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS shotgrid;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP EXTENSION IF EXISTS pg_net;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
DROP SCHEMA IF EXISTS _realtime;
--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA _realtime;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: shotgrid; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA shotgrid;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_functions;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgjwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;


--
-- Name: EXTENSION pgjwt; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgjwt IS 'JSON Web Token API for Postgresql';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: echo_handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.echo_handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: get_next_version_number(integer, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_version_number(p_project_id integer, p_entity_type text, p_entity_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.versions
  WHERE project_id = p_project_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;

  RETURN next_version;
END;
$$;


--
-- Name: get_task_progress(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_task_progress(p_entity_type text, p_entity_id integer) RETURNS TABLE(total_tasks integer, completed_tasks integer, progress_percentage numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_tasks,
    COUNT(*) FILTER (WHERE status IN ('apr', 'fin'))::integer as completed_tasks,
    ROUND((COUNT(*) FILTER (WHERE status IN ('apr', 'fin'))::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) as progress_percentage
  FROM public.tasks
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
END;
$$;


--
-- Name: is_conversation_member(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_conversation_member(conv_id bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;


--
-- Name: log_activity_event(integer, text, text, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_activity_event(p_project_id integer, p_event_type text, p_entity_type text, p_entity_id integer, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.activity_events (
    project_id,
    event_type,
    entity_type,
    entity_id,
    actor_id,
    metadata
  ) VALUES (
    p_project_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    auth.uid(),
    p_metadata
  );
END;
$$;


--
-- Name: log_note_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_note_created() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    PERFORM log_activity_event(
      NEW.project_id,
      'note_created',
      COALESCE(NEW.entity_type, 'project'),
      COALESCE(NEW.entity_id, NEW.project_id),
      jsonb_build_object(
        'note_type', NEW.note_type,
        'has_subject', NEW.subject IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_published_file_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_published_file_created() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM log_activity_event(
    NEW.project_id,
    'file_published',
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'file_name', NEW.name,
      'file_type', NEW.file_type
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: log_task_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_task_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    PERFORM log_activity_event(
      NEW.project_id,
      'task_status_changed',
      'task',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'task_name', NEW.name
      )
    );
  ELSIF (TG_OP = 'INSERT') THEN
    PERFORM log_activity_event(
      NEW.project_id,
      'task_created',
      'task',
      NEW.id,
      jsonb_build_object(
        'task_name', NEW.name,
        'status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_version_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_version_created() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM log_activity_event(
    NEW.project_id,
    'version_uploaded',
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'version_code', NEW.code,
      'version_number', NEW.version_number
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: set_current_user(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_user(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: -
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
    DECLARE
      request_id bigint;
      payload jsonb;
      url text := TG_ARGV[0]::text;
      method text := TG_ARGV[1]::text;
      headers jsonb DEFAULT '{}'::jsonb;
      params jsonb DEFAULT '{}'::jsonb;
      timeout_ms integer DEFAULT 1000;
    BEGIN
      IF url IS NULL OR url = 'null' THEN
        RAISE EXCEPTION 'url argument is missing';
      END IF;

      IF method IS NULL OR method = 'null' THEN
        RAISE EXCEPTION 'method argument is missing';
      END IF;

      IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
        headers = '{"Content-Type": "application/json"}'::jsonb;
      ELSE
        headers = TG_ARGV[2]::jsonb;
      END IF;

      IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
        params = '{}'::jsonb;
      ELSE
        params = TG_ARGV[3]::jsonb;
      END IF;

      IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
        timeout_ms = 1000;
      ELSE
        timeout_ms = TG_ARGV[4]::integer;
      END IF;

      CASE
        WHEN method = 'GET' THEN
          SELECT http_get INTO request_id FROM net.http_get(
            url,
            params,
            headers,
            timeout_ms
          );
        WHEN method = 'POST' THEN
          payload = jsonb_build_object(
            'old_record', OLD,
            'record', NEW,
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
          );

          SELECT http_post INTO request_id FROM net.http_post(
            url,
            payload,
            params,
            headers,
            timeout_ms
          );
        ELSE
          RAISE EXCEPTION 'method argument % is invalid', method;
      END CASE;

      INSERT INTO supabase_functions.hooks
        (hook_table_id, hook_name, request_id)
      VALUES
        (TG_RELID, TG_NAME, request_id);

      RETURN NEW;
    END
  $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: extensions; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE _realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: tenants; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer DEFAULT 200 NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    max_events_per_second integer DEFAULT 100 NOT NULL,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer DEFAULT 100000 NOT NULL,
    max_channels_per_client integer DEFAULT 100 NOT NULL,
    max_joins_per_second integer DEFAULT 500 NOT NULL,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean DEFAULT false NOT NULL,
    migrations_ran integer DEFAULT 0,
    broadcast_adapter character varying(255) DEFAULT 'gen_rpc'::character varying,
    max_presence_events_per_second integer DEFAULT 1000,
    max_payload_size_in_kb integer DEFAULT 3000
);


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_events (
    id integer NOT NULL,
    project_id integer,
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    actor_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_events_id_seq OWNED BY public.activity_events.id;


--
-- Name: allowed_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowed_users (
    email text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    project_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    asset_type text DEFAULT 'prop'::text,
    status text DEFAULT 'in_progress'::text,
    thumbnail_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    client_name text,
    dd_client_name text,
    keep boolean DEFAULT false,
    outsource boolean DEFAULT false,
    sequence_id integer,
    shot_id integer,
    shots text[] DEFAULT '{}'::text[],
    vendor_groups text[] DEFAULT '{}'::text[],
    sub_assets text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    task_template text,
    parent_assets text[] DEFAULT '{}'::text[],
    sequences text[] DEFAULT '{}'::text[],
    asset_sequence text[] DEFAULT '{}'::text[],
    asset_shot text[] DEFAULT '{}'::text[],
    cached_display_name text,
    cc text[] DEFAULT '{}'::text[],
    creative_brief text,
    episodes text[] DEFAULT '{}'::text[],
    filmstrip_thumbnail_url text,
    image_source_entity text,
    levels text[] DEFAULT '{}'::text[],
    linked_projects text[] DEFAULT '{}'::text[],
    mocap_takes text[] DEFAULT '{}'::text[],
    notes text[] DEFAULT '{}'::text[],
    open_notes text[] DEFAULT '{}'::text[],
    open_notes_count integer DEFAULT 0,
    published_file_links text[] DEFAULT '{}'::text[],
    review_versions_link text[] DEFAULT '{}'::text[],
    sequences_assets text[] DEFAULT '{}'::text[],
    shots_assets text[] DEFAULT '{}'::text[],
    tasks text[] DEFAULT '{}'::text[],
    thumbnail_blur_hash text,
    updated_by uuid,
    version_link text[] DEFAULT '{}'::text[],
    CONSTRAINT assets_asset_type_check CHECK ((asset_type = ANY (ARRAY['character'::text, 'prop'::text, 'environment'::text, 'vehicle'::text, 'fx'::text, 'matte_painting'::text, 'other'::text])))
);


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    note_id integer,
    file_name text NOT NULL,
    file_size bigint,
    file_type text,
    storage_path text NOT NULL,
    thumbnail_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: conversation_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_members (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    last_read_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversation_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text])))
);


--
-- Name: conversation_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.conversation_members ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.conversation_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id bigint NOT NULL,
    type text NOT NULL,
    name text,
    project_id bigint,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversations_type_check CHECK ((type = ANY (ARRAY['channel'::text, 'dm'::text])))
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.conversations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id integer NOT NULL,
    project_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    delivery_type text DEFAULT 'client'::text,
    due_date date,
    delivered_date date,
    status text DEFAULT 'pending'::text,
    client_contact text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deliveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deliveries_id_seq OWNED BY public.deliveries.id;


--
-- Name: delivery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_items (
    delivery_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT delivery_items_entity_type_check CHECK ((entity_type = ANY (ARRAY['version'::text, 'published_file'::text])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    color character varying(7),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    group_id integer NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.messages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id integer NOT NULL,
    project_id integer,
    phase_id integer,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    due_date date,
    completed_date date,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.milestones_id_seq OWNED BY public.milestones.id;


--
-- Name: note_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_mentions (
    note_id integer NOT NULL,
    user_id uuid NOT NULL,
    mention_type text DEFAULT 'to'::text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT note_mentions_mention_type_check CHECK ((mention_type = ANY (ARRAY['to'::text, 'cc'::text])))
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    project_id integer,
    entity_type text,
    entity_id integer,
    parent_note_id integer,
    author_id uuid,
    subject text,
    content text NOT NULL,
    note_type text DEFAULT 'comment'::text,
    read_by_default boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    status text DEFAULT 'open'::text NOT NULL,
    task_id integer,
    attachments text[] DEFAULT '{}'::text[],
    ayon_id text,
    ayon_sync_status text,
    cached_display_name text,
    cc text[] DEFAULT '{}'::text[],
    client_approved boolean DEFAULT false,
    client_note boolean DEFAULT false,
    client_note_id integer,
    composition text,
    filmstrip_thumbnail_url text,
    image_source_entity text,
    links text[] DEFAULT '{}'::text[],
    notes_app_context_entity text,
    otio_playable text,
    playlist text,
    publish_status text,
    read_unread text,
    replies text[] DEFAULT '{}'::text[],
    reply_content text,
    suppress_email_notification boolean DEFAULT false,
    tags text[] DEFAULT '{}'::text[],
    tasks text[] DEFAULT '{}'::text[],
    thumbnail_url text,
    thumbnail_blur_hash text,
    f_to text[] DEFAULT '{}'::text[],
    updated_by uuid,
    CONSTRAINT notes_note_type_check CHECK ((note_type = ANY (ARRAY['comment'::text, 'status_change'::text, 'approval'::text, 'client_note'::text, 'internal'::text]))),
    CONSTRAINT notes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'resolved'::text])))
);


--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phases (
    id integer NOT NULL,
    project_id integer,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    start_date date,
    end_date date,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: phases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.phases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.phases_id_seq OWNED BY public.phases.id;


--
-- Name: playlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist_items (
    playlist_id integer NOT NULL,
    version_id integer NOT NULL,
    sort_order integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: playlist_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist_shares (
    id integer NOT NULL,
    playlist_id integer,
    access_key uuid DEFAULT gen_random_uuid(),
    expires_at timestamp with time zone,
    access_count integer DEFAULT 0,
    password_hash text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: playlist_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playlist_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playlist_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playlist_shares_id_seq OWNED BY public.playlist_shares.id;


--
-- Name: playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlists (
    id integer NOT NULL,
    project_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    locked boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: playlists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playlists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playlists_id_seq OWNED BY public.playlists.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    firstname text,
    lastname text,
    avatar_url text,
    role text DEFAULT 'member'::text,
    department_id integer,
    active boolean DEFAULT true,
    login_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    full_name text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['alpha'::text, 'beta'::text, 'member'::text])))
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    project_id integer NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_members_role_check CHECK ((role = ANY (ARRAY['lead'::text, 'member'::text, 'viewer'::text])))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    color character varying(7),
    start_date date,
    end_date date,
    thumbnail_url text,
    is_template boolean DEFAULT false,
    archived boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_type text,
    updated_by text,
    tags text[] DEFAULT '{}'::text[],
    ayon_id text,
    ayon_project_code text,
    billboard text,
    duration integer,
    favorite boolean DEFAULT false,
    sg_id integer,
    tank_name text,
    task_template text,
    users jsonb DEFAULT '[]'::jsonb
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: published_file_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_file_dependencies (
    published_file_id integer NOT NULL,
    depends_on_published_file_id integer NOT NULL,
    dependency_type text DEFAULT 'reference'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: published_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_files (
    id integer NOT NULL,
    project_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    version_id integer,
    task_id integer,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    version_number integer,
    file_type text,
    file_path text NOT NULL,
    file_size bigint,
    published_by uuid,
    published_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    thumbnail_url text,
    link text,
    downstream_published_files text[] DEFAULT '{}'::text[],
    upstream_published_files text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    client_version text,
    element text,
    output text,
    path_cache text,
    path_cache_storage text,
    path_to_source text,
    submission_notes text,
    snapshot_id text,
    snapshot_type text,
    target_name text,
    ayon_representation_id text,
    cached_display_name text,
    filmstrip_thumbnail_url text,
    image_source_entity text,
    thumbnail_blur_hash text,
    updated_by uuid
);


--
-- Name: published_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_files_id_seq OWNED BY public.published_files.id;


--
-- Name: sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequences (
    id integer NOT NULL,
    project_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    client_name text,
    dd_client_name text,
    cc text,
    task_template text,
    sequence_type text,
    tags text[] DEFAULT '{}'::text[],
    shots text[] DEFAULT '{}'::text[],
    assets text[] DEFAULT '{}'::text[],
    plates text,
    cuts text,
    open_notes_count integer DEFAULT 0,
    published_file_links text[] DEFAULT '{}'::text[],
    created_by uuid,
    ayon_id text,
    ayon_sync_status text,
    cached_display_name text,
    episode text,
    filmstrip_thumbnail_url text,
    image_source_entity text,
    notes text[] DEFAULT '{}'::text[],
    open_notes text[] DEFAULT '{}'::text[],
    scenes text[] DEFAULT '{}'::text[],
    tasks text[] DEFAULT '{}'::text[],
    thumbnail_blur_hash text,
    updated_by uuid,
    vendor_groups text[] DEFAULT '{}'::text[],
    version_link text[] DEFAULT '{}'::text[]
);


--
-- Name: sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sequences_id_seq OWNED BY public.sequences.id;


--
-- Name: shots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shots (
    id integer NOT NULL,
    project_id integer NOT NULL,
    sequence_id integer,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'in_progress'::text,
    cut_in integer,
    cut_out integer,
    cut_duration integer GENERATED ALWAYS AS (((cut_out - cut_in) + 1)) STORED,
    head_in integer,
    tail_out integer,
    working_duration integer,
    frame_start integer,
    frame_end integer,
    thumbnail_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shot_type text,
    client_name text,
    dd_client_name text,
    cc text,
    comp_note text,
    cut_order text,
    cut_summary text,
    duration_summary text,
    dd_location text,
    delivery_date date,
    head_duration integer,
    head_out integer,
    tail_in integer,
    next_review date,
    open_notes text[] DEFAULT '{}'::text[],
    open_notes_count integer DEFAULT 0,
    parent_shots text[] DEFAULT '{}'::text[],
    plates text,
    seq_shot text,
    shot_notes text[] DEFAULT '{}'::text[],
    sub_shots text[] DEFAULT '{}'::text[],
    target_date date,
    task_template text,
    vendor_groups text[] DEFAULT '{}'::text[],
    assets text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    ayon_id text,
    ayon_sync_status text,
    cached_display_name text,
    filmstrip_thumbnail_url text,
    image_source_entity text,
    notes text[] DEFAULT '{}'::text[],
    published_file_links text[] DEFAULT '{}'::text[],
    raw_cut_duration integer,
    raw_cut_in integer,
    raw_cut_out integer,
    raw_head_duration integer,
    raw_head_in integer,
    raw_head_out integer,
    raw_tail_duration integer,
    raw_tail_in integer,
    raw_tail_out integer,
    tail_duration integer,
    tasks text[] DEFAULT '{}'::text[],
    thumbnail_blur_hash text,
    turnover integer,
    updated_by uuid,
    version_link text[] DEFAULT '{}'::text[]
);


--
-- Name: shots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shots_id_seq OWNED BY public.shots.id;


--
-- Name: statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statuses (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    entity_type text NOT NULL,
    color character varying(7),
    icon text,
    sort_order integer,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.statuses_id_seq OWNED BY public.statuses.id;


--
-- Name: steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    short_name text,
    description text,
    department_id integer,
    color character varying(7),
    sort_order integer,
    entity_type text DEFAULT 'both'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT steps_entity_type_check CHECK ((entity_type = ANY (ARRAY['asset'::text, 'shot'::text, 'both'::text])))
);


--
-- Name: steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.steps_id_seq OWNED BY public.steps.id;


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    task_id integer NOT NULL,
    user_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_dependencies (
    task_id integer NOT NULL,
    depends_on_task_id integer NOT NULL,
    dependency_type text DEFAULT 'finish_to_start'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_dependencies_check CHECK ((task_id <> depends_on_task_id))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    step_id integer,
    milestone_id integer,
    name text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text,
    priority text DEFAULT 'medium'::text,
    start_date date,
    due_date date,
    duration integer,
    estimated_hours numeric(6,2),
    actual_hours numeric(6,2),
    task_template_id integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assigned_to uuid,
    reviewer text,
    link text,
    bid numeric,
    bid_breakdown text,
    buffer_days integer,
    buffer_days2 integer,
    casting text,
    cc text,
    ddna_bid text,
    ddna_id text,
    ddna_to text,
    dependency_violation text,
    dept_end_date date,
    downstream_dependency text,
    end_date date,
    gantt_bar_color text,
    inventory_date date,
    milestone text,
    notes text,
    prod_comments text,
    proposed_start_date date,
    publish_version_number text,
    tags text[] DEFAULT '{}'::text[],
    task_complexity text,
    task_template text,
    thumbnail_url text,
    versions text[] DEFAULT '{}'::text[],
    workload text,
    pipeline_step_color text,
    ayon_assignees text,
    ayon_id text,
    ayon_sync_status text,
    cached_display_name text,
    filmstrip_thumbnail_url text,
    image_source_entity text,
    implicit boolean DEFAULT false,
    notes_links text[] DEFAULT '{}'::text[],
    open_notes text[] DEFAULT '{}'::text[],
    open_notes_count integer DEFAULT 0,
    pinned boolean DEFAULT false,
    review_versions_task text[] DEFAULT '{}'::text[],
    schedule_change_comments text,
    sibling_tasks text[] DEFAULT '{}'::text[],
    sort_order integer,
    split_durations jsonb,
    splits jsonb,
    template_task text,
    thumbnail_blur_hash text,
    time_logged numeric,
    time_logged_of_bid numeric,
    time_logged_over_under_bid numeric,
    updated_by uuid,
    upstream_dependency text[] DEFAULT '{}'::text[],
    workload_assignee_count integer,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: COLUMN tasks.assigned_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.assigned_to IS 'User assigned to this task (single assignment)';


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    project_id integer,
    title text NOT NULL,
    description text,
    ticket_type text DEFAULT 'bug'::text,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'open'::text,
    entity_type text,
    entity_id integer,
    assigned_to uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_logs (
    id integer NOT NULL,
    project_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    user_id uuid,
    date date NOT NULL,
    duration numeric(6,2) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT time_logs_entity_type_check CHECK ((entity_type = ANY (ARRAY['task'::text, 'project'::text])))
);


--
-- Name: time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_logs_id_seq OWNED BY public.time_logs.id;


--
-- Name: versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versions (
    id integer NOT NULL,
    project_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    task_id integer,
    code text NOT NULL,
    version_number integer NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    client_approved boolean DEFAULT false,
    movie_url text,
    thumbnail_url text,
    frames_path text,
    first_frame integer,
    last_frame integer,
    frame_count integer,
    frame_range text,
    artist_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    file_path text,
    link text,
    cuts text,
    date_viewed timestamp with time zone,
    department text,
    editorial_qc text,
    flagged boolean DEFAULT false,
    movie_aspect_ratio text,
    movie_has_slate boolean DEFAULT false,
    nuke_script text,
    playlists text[] DEFAULT '{}'::text[],
    published_files text[] DEFAULT '{}'::text[],
    send_exrs boolean DEFAULT false,
    source_clip text,
    tags text[] DEFAULT '{}'::text[],
    task_template text,
    version_type text,
    uploaded_movie text,
    viewed_status text,
    client_approved_at timestamp with time zone,
    client_approved_by text,
    client_version_name text,
    ayon_id text,
    ayon_product_id text,
    ayon_sync_status text,
    ayon_version_id text,
    cached_display_name text,
    deliveries text[] DEFAULT '{}'::text[],
    filmstrip_thumbnail_url text,
    frame_rate double precision,
    frames_aspect_ratio double precision,
    frames_have_slate boolean DEFAULT false,
    image_source_entity text,
    media_center_import_time timestamp with time zone,
    notes text[] DEFAULT '{}'::text[],
    open_notes text[] DEFAULT '{}'::text[],
    open_notes_count integer DEFAULT 0,
    otio_playable text,
    path_to_geometry text,
    tasks text[] DEFAULT '{}'::text[],
    thumbnail_blur_hash text,
    translation_type text,
    updated_by uuid,
    uploaded_movie_audio_offset double precision,
    uploaded_movie_duration double precision,
    uploaded_movie_image text,
    uploaded_movie_mp4 text,
    uploaded_movie_transcoding_status integer,
    uploaded_movie_webm text
);


--
-- Name: versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.versions_id_seq OWNED BY public.versions.id;


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2026_02_08; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_08 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_02_09; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_09 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_02_10; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_10 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_02_11; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_11 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_02_12; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_12 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_02_13; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_13 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iceberg_namespaces; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.iceberg_namespaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iceberg_tables; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.iceberg_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    namespace_id uuid NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    location text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: -
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: -
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: -
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: -
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: -
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_2026_02_08; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_08 FOR VALUES FROM ('2026-02-08 00:00:00') TO ('2026-02-09 00:00:00');


--
-- Name: messages_2026_02_09; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_09 FOR VALUES FROM ('2026-02-09 00:00:00') TO ('2026-02-10 00:00:00');


--
-- Name: messages_2026_02_10; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_10 FOR VALUES FROM ('2026-02-10 00:00:00') TO ('2026-02-11 00:00:00');


--
-- Name: messages_2026_02_11; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_11 FOR VALUES FROM ('2026-02-11 00:00:00') TO ('2026-02-12 00:00:00');


--
-- Name: messages_2026_02_12; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_12 FOR VALUES FROM ('2026-02-12 00:00:00') TO ('2026-02-13 00:00:00');


--
-- Name: messages_2026_02_13; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_13 FOR VALUES FROM ('2026-02-13 00:00:00') TO ('2026-02-14 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: activity_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events ALTER COLUMN id SET DEFAULT nextval('public.activity_events_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: deliveries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries ALTER COLUMN id SET DEFAULT nextval('public.deliveries_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones ALTER COLUMN id SET DEFAULT nextval('public.milestones_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: phases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases ALTER COLUMN id SET DEFAULT nextval('public.phases_id_seq'::regclass);


--
-- Name: playlist_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_shares ALTER COLUMN id SET DEFAULT nextval('public.playlist_shares_id_seq'::regclass);


--
-- Name: playlists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists ALTER COLUMN id SET DEFAULT nextval('public.playlists_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: published_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files ALTER COLUMN id SET DEFAULT nextval('public.published_files_id_seq'::regclass);


--
-- Name: sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences ALTER COLUMN id SET DEFAULT nextval('public.sequences_id_seq'::regclass);


--
-- Name: shots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots ALTER COLUMN id SET DEFAULT nextval('public.shots_id_seq'::regclass);


--
-- Name: statuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses ALTER COLUMN id SET DEFAULT nextval('public.statuses_id_seq'::regclass);


--
-- Name: steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps ALTER COLUMN id SET DEFAULT nextval('public.steps_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: time_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs ALTER COLUMN id SET DEFAULT nextval('public.time_logs_id_seq'::regclass);


--
-- Name: versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions ALTER COLUMN id SET DEFAULT nextval('public.versions_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Data for Name: extensions; Type: TABLE DATA; Schema: _realtime; Owner: -
--

COPY _realtime.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at) FROM stdin;
48559451-32ce-4f30-9c70-7b223a46aaaf	postgres_cdc_rls	{"region": "us-east-1", "db_host": "9ROnoZukNL0Y9sIJLL3rhk82uuGZrojyd3by3+a2jj8=", "db_name": "sWBpZNdjggEPTQVlI52Zfw==", "db_port": "+enMDFi1J/3IrrquHHwUmA==", "db_user": "uxbEq/zz8DXVD53TOI1zmw==", "slot_name": "supabase_realtime_replication_slot", "db_password": "eGxa2ZKVreSn7eWieRQdp74vN25K+qFgdnxmDCKe4p20+C0410WXonzXTEj9CgYx", "publication": "supabase_realtime", "ssl_enforced": false, "poll_interval_ms": 100, "poll_max_changes": 100, "poll_max_record_bytes": 1048576}	demo-supabase-realtime	2026-02-02 09:39:26	2026-02-02 09:39:26
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: _realtime; Owner: -
--

COPY _realtime.schema_migrations (version, inserted_at) FROM stdin;
20210706140551	2026-02-02 09:39:14
20220329161857	2026-02-02 09:39:15
20220410212326	2026-02-02 09:39:15
20220506102948	2026-02-02 09:39:16
20220527210857	2026-02-02 09:39:16
20220815211129	2026-02-02 09:39:16
20220815215024	2026-02-02 09:39:17
20220818141501	2026-02-02 09:39:17
20221018173709	2026-02-02 09:39:17
20221102172703	2026-02-02 09:39:17
20221223010058	2026-02-02 09:39:18
20230110180046	2026-02-02 09:39:18
20230810220907	2026-02-02 09:39:18
20230810220924	2026-02-02 09:39:19
20231024094642	2026-02-02 09:39:19
20240306114423	2026-02-02 09:39:19
20240418082835	2026-02-02 09:39:19
20240625211759	2026-02-02 09:39:20
20240704172020	2026-02-02 09:39:20
20240902173232	2026-02-02 09:39:20
20241106103258	2026-02-02 09:39:21
20250424203323	2026-02-02 09:39:21
20250613072131	2026-02-02 09:39:21
20250711044927	2026-02-02 09:39:21
20250811121559	2026-02-02 09:39:22
20250926223044	2026-02-02 09:39:22
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: _realtime; Owner: -
--

COPY _realtime.tenants (id, name, external_id, jwt_secret, max_concurrent_users, inserted_at, updated_at, max_events_per_second, postgres_cdc_default, max_bytes_per_second, max_channels_per_client, max_joins_per_second, suspend, jwt_jwks, notify_private_alpha, private_only, migrations_ran, broadcast_adapter, max_presence_events_per_second, max_payload_size_in_kb) FROM stdin;
3c79adb3-352c-4545-93ba-7d772484d1f3	demo-supabase-realtime	demo-supabase-realtime	eGxa2ZKVreSn7eWieRQdp60i5H6KJLiST7splFU6MVHylMSAoQ2SjsTrTTQo/+bmYjQcO4hNnGTU+D1wtlXreA==	200	2026-02-02 09:39:26	2026-02-02 09:39:58	100	postgres_cdc_rls	100000	100	100	f	\N	f	f	65	gen_rpc	1000	3000
\.


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
00000000-0000-0000-0000-000000000000	e60aa2e5-878f-4459-bf09-5ceeaa0ae32d	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"balajid@d2.com","user_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","user_phone":""}}	2026-02-03 07:16:17.761603+00	
00000000-0000-0000-0000-000000000000	96253e7c-84ad-49fe-a9d1-9a3fa55e8d08	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"vrmaddala@d2.com","user_id":"e2f80bb7-3fa2-4c8a-88b3-934acc1f8f9a","user_phone":""}}	2026-02-03 07:16:54.360997+00	
00000000-0000-0000-0000-000000000000	4d3af746-7eeb-4266-969e-3b5864517094	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-03 07:23:17.775219+00	
00000000-0000-0000-0000-000000000000	a5e5accd-0ef3-49f3-8aeb-3d9653092b64	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-03 07:25:23.25861+00	
00000000-0000-0000-0000-000000000000	5a0c2e36-629b-4ee4-933b-ab6e85a79501	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-03 07:25:35.527586+00	
00000000-0000-0000-0000-000000000000	e0cf564b-44bb-4d5d-911b-3e65350d4d83	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-03 07:27:07.143553+00	
00000000-0000-0000-0000-000000000000	21a87314-cd48-4a3c-82d1-347e9b670615	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-03 07:27:20.205355+00	
00000000-0000-0000-0000-000000000000	e87181f4-877a-47b4-9b0d-80d0883b7d11	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-03 07:27:20.426145+00	
00000000-0000-0000-0000-000000000000	565ec12f-e346-4a62-8cdf-a6dfd4ce4075	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-03 07:28:08.59739+00	
00000000-0000-0000-0000-000000000000	46403054-1dac-486c-8d6e-96dda47c71ba	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-03 07:28:08.833441+00	
00000000-0000-0000-0000-000000000000	74fd416c-fb63-4a55-b74d-b9a419a9f4c2	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-03 07:31:46.770804+00	
00000000-0000-0000-0000-000000000000	c42387d8-1860-4b69-a6a4-a702b2afd579	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-03 08:30:53.471901+00	
00000000-0000-0000-0000-000000000000	7c577caa-acb5-4abb-a773-d1c3712d872e	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-03 08:30:53.47321+00	
00000000-0000-0000-0000-000000000000	1dcb82bc-6a03-4676-8645-6e8ee7c85367	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-03 09:30:17.342434+00	
00000000-0000-0000-0000-000000000000	e9cb982c-3837-4dab-b96c-031fb5e78332	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-03 09:30:17.343723+00	
00000000-0000-0000-0000-000000000000	eae61c3c-a76a-464f-a442-b0931bc289bc	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-03 10:29:19.440516+00	
00000000-0000-0000-0000-000000000000	2f1fe5e0-48eb-4d40-bf1e-ec5e48c68563	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-03 10:29:19.442081+00	
00000000-0000-0000-0000-000000000000	c278e4b0-5d8b-4cc3-a7ab-ac5883384105	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-05 05:53:06.811844+00	
00000000-0000-0000-0000-000000000000	fab4df54-11d6-45e9-95de-85011b37936e	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-05 05:53:13.254699+00	
00000000-0000-0000-0000-000000000000	753096d7-819a-42b6-bea7-4fac0ef674b1	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-05 05:53:51.911201+00	
00000000-0000-0000-0000-000000000000	6b7a4994-19ec-46ec-8303-3114871f4d9e	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 09:58:35.763038+00	
00000000-0000-0000-0000-000000000000	bb9769ce-12f3-403a-9129-61e0b08baac5	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 09:58:35.764278+00	
00000000-0000-0000-0000-000000000000	cfd2a1df-d550-43c3-afed-7dffadccfdaf	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 09:58:35.852155+00	
00000000-0000-0000-0000-000000000000	410604f3-ee99-4035-abd4-28cd602f2c86	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-05 10:06:17.193481+00	
00000000-0000-0000-0000-000000000000	828262fb-5ed3-4216-9356-0d4bc1056e38	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-05 10:18:34.721758+00	
00000000-0000-0000-0000-000000000000	054032c6-c232-4a67-bf95-509391d0299c	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-05 10:19:22.886116+00	
00000000-0000-0000-0000-000000000000	a8486b0c-c373-481e-b002-2a9182ca5db2	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-05 10:19:38.047253+00	
00000000-0000-0000-0000-000000000000	a6d1c761-cbaf-4a65-a65c-6f3d6824e755	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-05 10:30:25.253172+00	
00000000-0000-0000-0000-000000000000	67a92c6a-009b-438c-9831-2656656e3e9b	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-05 10:36:42.987298+00	
00000000-0000-0000-0000-000000000000	8adf6530-4a0c-490f-aa2a-dd6ee53d3cbc	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 11:43:09.500316+00	
00000000-0000-0000-0000-000000000000	7a5078b5-c94b-4ce9-a0da-9f72c1e36f5c	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 11:43:09.501864+00	
00000000-0000-0000-0000-000000000000	b09c67c8-de0c-4377-b9dc-3692151ce5a2	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 13:09:01.452564+00	
00000000-0000-0000-0000-000000000000	4954ede5-1914-4055-bb43-9f0948bc8656	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 13:09:01.454508+00	
00000000-0000-0000-0000-000000000000	dde77c9f-c534-4132-a6c3-1603b3dbbdb9	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 14:07:36.164827+00	
00000000-0000-0000-0000-000000000000	7a69f832-9756-4bc2-a5a8-d65b8380e4b6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 14:07:36.166271+00	
00000000-0000-0000-0000-000000000000	ce7d2cae-1309-49cb-acbf-200fe0add12f	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-05 14:07:36.523888+00	
00000000-0000-0000-0000-000000000000	212479ac-e09a-46ce-98bf-e92f6d11d42f	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-05 14:10:53.12887+00	
00000000-0000-0000-0000-000000000000	98a53fb3-b83b-40a3-8404-f8ae76695ca0	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-05 14:11:12.03282+00	
00000000-0000-0000-0000-000000000000	4a377170-78d2-4247-bfdf-e555eccf12af	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 05:04:44.32529+00	
00000000-0000-0000-0000-000000000000	faf09cc6-fb03-4b40-91ab-a50ceff7fbc0	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 05:04:44.32668+00	
00000000-0000-0000-0000-000000000000	4cb2410a-2d08-4dcd-a53e-24190b58400b	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 06:03:03.679815+00	
00000000-0000-0000-0000-000000000000	cd7f83fc-f3a0-4964-89be-e4d389abac29	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 06:03:03.681139+00	
00000000-0000-0000-0000-000000000000	263858d1-3e03-4fa0-8865-9c7632511560	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 07:01:16.651439+00	
00000000-0000-0000-0000-000000000000	2d4a7695-14c4-4478-a35e-ddf50fa7dd9a	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 07:01:16.652903+00	
00000000-0000-0000-0000-000000000000	50dda3e5-aa1d-4da6-b7ff-a71993ce8148	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 09:00:39.910055+00	
00000000-0000-0000-0000-000000000000	82d1f896-06ca-4dce-bb4f-032a56bf400e	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 09:00:39.911467+00	
00000000-0000-0000-0000-000000000000	71180095-a76e-4f95-a303-429a2f820e32	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-06 09:01:50.21781+00	
00000000-0000-0000-0000-000000000000	c8888e27-6ac6-4691-a5fa-be7816e27fc0	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-06 09:16:18.367093+00	
00000000-0000-0000-0000-000000000000	d8de4d00-5944-490f-909c-c9141f64993d	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-06 09:16:23.102458+00	
00000000-0000-0000-0000-000000000000	cef3a908-5872-4be4-9714-aee7ffe131f0	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-06 11:20:18.712012+00	
00000000-0000-0000-0000-000000000000	5eaa66b1-78c8-416a-afd2-1c7b83498d49	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 12:18:37.496725+00	
00000000-0000-0000-0000-000000000000	77c80d88-4026-4271-9c62-bfde79c113cc	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 12:18:37.497945+00	
00000000-0000-0000-0000-000000000000	dc94f86c-0788-4b7d-b9a5-40551194750c	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 13:30:42.555066+00	
00000000-0000-0000-0000-000000000000	481c5c4c-2587-4e4a-b4ab-9f69c0d5c09c	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 13:30:42.556223+00	
00000000-0000-0000-0000-000000000000	c369b562-1033-4489-8de9-751cfd61979c	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-06 13:48:28.962036+00	
00000000-0000-0000-0000-000000000000	99d2d865-d03f-4deb-adb7-a5f437454253	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-06 13:48:42.23379+00	
00000000-0000-0000-0000-000000000000	49a25dc6-a888-4825-a630-49db1d1f5d56	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 14:46:45.910683+00	
00000000-0000-0000-0000-000000000000	03130a12-f526-4226-b981-32fb2251f141	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 14:46:45.911784+00	
00000000-0000-0000-0000-000000000000	046b8c49-49e0-4bbe-a62b-62ff73c1802c	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 15:44:45.910728+00	
00000000-0000-0000-0000-000000000000	e29208b5-c875-4441-b922-e47ab89679b4	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 15:44:45.91212+00	
00000000-0000-0000-0000-000000000000	26751a9d-334e-4cc1-8b1a-6f4e52d1ee04	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 16:42:45.911587+00	
00000000-0000-0000-0000-000000000000	e1286675-2722-4447-a7a3-0de4e6711ee4	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 16:42:45.912853+00	
00000000-0000-0000-0000-000000000000	143b6556-7e73-4821-b168-f1272142aae2	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 17:40:45.910838+00	
00000000-0000-0000-0000-000000000000	aace3bf1-bf02-4f1f-8536-42a2b23ae03f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 17:40:45.912372+00	
00000000-0000-0000-0000-000000000000	2a109d51-34cb-4dc8-b801-f5cd92f96f57	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 18:38:45.909452+00	
00000000-0000-0000-0000-000000000000	4a9dbcee-130f-4f53-86cb-1dc5bc260982	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 18:38:45.910871+00	
00000000-0000-0000-0000-000000000000	091f5138-7d53-4203-95ce-2a87e612e1f5	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 19:36:45.911311+00	
00000000-0000-0000-0000-000000000000	0c7e2097-6bba-477f-8bbd-ce7057e100fe	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 19:36:45.912672+00	
00000000-0000-0000-0000-000000000000	2fb43098-4b9f-45f3-ac8d-5590b3488e98	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 20:34:45.908729+00	
00000000-0000-0000-0000-000000000000	54bb02cf-2761-43c8-a001-bd879fd6632c	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 20:34:45.909833+00	
00000000-0000-0000-0000-000000000000	315473a9-56e6-4feb-9361-9bc9968ff8d8	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 21:32:45.914124+00	
00000000-0000-0000-0000-000000000000	e5a3c60d-0df4-4666-bcae-ca22add8ed2e	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 21:32:45.915265+00	
00000000-0000-0000-0000-000000000000	77c7c32a-c669-4b44-88f5-7009cebd0aa9	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 22:30:45.911845+00	
00000000-0000-0000-0000-000000000000	76644e05-8a9f-45bf-ae10-6efec1c67638	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 22:30:45.913172+00	
00000000-0000-0000-0000-000000000000	f94c086c-5aef-4deb-88e3-747cb6b72cba	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 23:28:45.91205+00	
00000000-0000-0000-0000-000000000000	eeb845ee-485f-4793-ab8f-1a1b19f666fd	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-06 23:28:45.913472+00	
00000000-0000-0000-0000-000000000000	f4814bc8-4874-4f5b-b6fa-2c5493d730d9	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 00:26:45.911956+00	
00000000-0000-0000-0000-000000000000	e09c93c8-736b-427b-84e3-48fff1b4d3ec	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 00:26:45.913131+00	
00000000-0000-0000-0000-000000000000	d6f84ea6-7c81-4234-a022-29d09bc1909d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 01:24:45.91078+00	
00000000-0000-0000-0000-000000000000	03c6befa-af78-4bbc-80df-5d18544294ee	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 01:24:45.91216+00	
00000000-0000-0000-0000-000000000000	05229c78-6d54-46c1-a695-504ad29f926b	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 02:22:45.91069+00	
00000000-0000-0000-0000-000000000000	9a703a5d-8f7c-4bce-8122-3582a6961af0	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 02:22:45.911946+00	
00000000-0000-0000-0000-000000000000	faa619e6-3f30-4607-909b-6a2396b61322	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 03:20:45.912648+00	
00000000-0000-0000-0000-000000000000	88ceb5f8-e354-4d0c-bdcb-0d59e2955c09	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 03:20:45.913844+00	
00000000-0000-0000-0000-000000000000	006ee45c-7ada-488d-8356-92ceebd2060f	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 04:18:45.912674+00	
00000000-0000-0000-0000-000000000000	50ec174e-4882-45b3-8274-9109a53ce8c1	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 04:18:45.913832+00	
00000000-0000-0000-0000-000000000000	a09228b9-a570-4248-9339-2667da5a18cb	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 05:16:45.912026+00	
00000000-0000-0000-0000-000000000000	eb3db68b-ac53-48b0-acad-47a14c478d61	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 05:16:45.913498+00	
00000000-0000-0000-0000-000000000000	fe03cf12-8811-4398-a7e8-53b03f075fc9	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 06:14:45.91309+00	
00000000-0000-0000-0000-000000000000	fb6c0f18-8801-412f-873b-829870a8aed4	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 06:14:45.914611+00	
00000000-0000-0000-0000-000000000000	58d82305-da40-43f9-b213-1d00f9a64698	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 07:12:45.914379+00	
00000000-0000-0000-0000-000000000000	c93c95b4-c2c9-4e10-9077-e742dd970db6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 07:12:45.915913+00	
00000000-0000-0000-0000-000000000000	94a0a3d8-7ef2-43ae-a7fa-69da783f2f5d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 08:10:45.912398+00	
00000000-0000-0000-0000-000000000000	1ec5bd3b-eaef-466a-ab7a-1b61eb0f0fb3	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 08:10:45.913919+00	
00000000-0000-0000-0000-000000000000	7c29a936-aaec-4f9d-a1f1-03ed0341a236	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 09:08:45.910679+00	
00000000-0000-0000-0000-000000000000	37e823a8-6222-4074-a44d-ae42476d4228	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 09:08:45.912131+00	
00000000-0000-0000-0000-000000000000	aa6ce5a5-51e5-45da-af72-2a2630786d29	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 10:06:45.91315+00	
00000000-0000-0000-0000-000000000000	a6ccd295-182f-4fb4-b775-365f8f99ebfe	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 10:06:45.914564+00	
00000000-0000-0000-0000-000000000000	2ab43ecd-d619-404e-b6e7-c2690a73adf0	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 11:04:45.91159+00	
00000000-0000-0000-0000-000000000000	ad07273a-8b00-406f-a44b-7b0203ac987e	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 11:04:45.913089+00	
00000000-0000-0000-0000-000000000000	9d56017f-774c-4379-a973-1b9207921827	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 12:02:45.912585+00	
00000000-0000-0000-0000-000000000000	183ad20b-8088-48ec-86f3-ea74bc2ed04c	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 12:02:45.914015+00	
00000000-0000-0000-0000-000000000000	459f35ad-4f0c-4da9-81a8-33873c22d85e	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 13:00:45.913056+00	
00000000-0000-0000-0000-000000000000	56dba5cd-9b53-48d2-95df-04cafc69f45d	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 13:00:45.914246+00	
00000000-0000-0000-0000-000000000000	5c13cb34-acda-426e-a8fd-00884fd468c6	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 13:58:45.91175+00	
00000000-0000-0000-0000-000000000000	19caf6e0-2629-40a2-b04d-ad2b3826af43	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 13:58:45.912794+00	
00000000-0000-0000-0000-000000000000	2ac49d40-8663-4e7d-abe2-7d2cbacb1992	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 14:56:45.91273+00	
00000000-0000-0000-0000-000000000000	dc1e4aab-423a-47f6-a334-8a95ded99431	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 14:56:45.914227+00	
00000000-0000-0000-0000-000000000000	e5ba833c-6072-4ffe-b17e-9af925dc92ff	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 15:54:45.912173+00	
00000000-0000-0000-0000-000000000000	03744c64-d73e-45f8-b4b6-c59b5ee9fc43	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 15:54:45.913612+00	
00000000-0000-0000-0000-000000000000	345a59c4-1e67-47f3-bb73-871871c3e99d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 16:52:45.911833+00	
00000000-0000-0000-0000-000000000000	6accb36e-c14b-4d9d-8832-0548779b256d	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 16:52:45.913349+00	
00000000-0000-0000-0000-000000000000	35a3225c-237c-4acd-9ac6-1456136ff2b3	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 17:50:45.912945+00	
00000000-0000-0000-0000-000000000000	fa08bbb7-131e-482f-8d5c-3da8a6bb283f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 17:50:45.914196+00	
00000000-0000-0000-0000-000000000000	4f188a7e-75f4-4b48-85d7-9b8b75020c72	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 18:48:45.911262+00	
00000000-0000-0000-0000-000000000000	a53a9fb5-c332-4dba-bbf0-3e1f3bb81363	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 18:48:45.912682+00	
00000000-0000-0000-0000-000000000000	b3daf0d2-6f15-49d0-9d18-61b166eaf9a6	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 19:46:45.912821+00	
00000000-0000-0000-0000-000000000000	fc83d864-a4a2-41ee-8119-194993cea2b5	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 19:46:45.914402+00	
00000000-0000-0000-0000-000000000000	bfef8d92-2fbe-48f5-b2a9-895e9f93888c	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 20:44:45.912355+00	
00000000-0000-0000-0000-000000000000	892c3e6f-7969-44f9-bead-8c829d3cd37f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 20:44:45.913818+00	
00000000-0000-0000-0000-000000000000	f08a5102-1367-45f4-90ee-759fbf6ccd5a	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 21:42:45.913423+00	
00000000-0000-0000-0000-000000000000	7cb3c2fa-2db2-4207-b8bb-9683d993a255	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 21:42:45.914793+00	
00000000-0000-0000-0000-000000000000	b7ccbfaf-8037-4ea1-9fc5-4da1b290a542	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 22:40:45.913825+00	
00000000-0000-0000-0000-000000000000	14ed59e9-2de9-4539-a6cb-28d995258b1f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 22:40:45.915404+00	
00000000-0000-0000-0000-000000000000	33f00e40-e3a8-4c4d-99c6-9365005c759b	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 23:38:45.909901+00	
00000000-0000-0000-0000-000000000000	59f663e3-559d-4a26-94db-f20f7a2d4e22	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-07 23:38:45.910909+00	
00000000-0000-0000-0000-000000000000	d9f3d875-7ba3-49db-a066-7377840ff432	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 00:36:45.91214+00	
00000000-0000-0000-0000-000000000000	80f9e9b5-5507-46bc-8d0b-9aa8bd7092a4	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 00:36:45.913342+00	
00000000-0000-0000-0000-000000000000	e4f2c8f1-fc2a-4d32-8815-41259db524ff	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 01:34:45.913546+00	
00000000-0000-0000-0000-000000000000	81bc9c7c-bc8d-461d-986e-81b224715a35	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 01:34:45.914907+00	
00000000-0000-0000-0000-000000000000	4e3b013b-9bdc-414d-b4c1-ac1136b5a94e	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 02:32:45.913619+00	
00000000-0000-0000-0000-000000000000	9aa7ad11-4118-467d-8da3-44bc71553767	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 02:32:45.9151+00	
00000000-0000-0000-0000-000000000000	58ec2952-3601-4eb5-a792-53b52e46519d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 03:30:45.909247+00	
00000000-0000-0000-0000-000000000000	a4b48308-9af8-4480-8490-107e71bef4dc	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 03:30:45.91022+00	
00000000-0000-0000-0000-000000000000	5e85902b-3e75-46c6-a314-7e55f86d458e	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 04:28:45.913306+00	
00000000-0000-0000-0000-000000000000	dcd45e92-31e6-4fd0-b0a0-eeda983fc5b7	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 04:28:45.914844+00	
00000000-0000-0000-0000-000000000000	006587b6-f3a1-4a43-b23e-3ed6a21bb8dc	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 05:26:45.910932+00	
00000000-0000-0000-0000-000000000000	3d966872-c45e-4712-a5c1-682368563367	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 05:26:45.912188+00	
00000000-0000-0000-0000-000000000000	3da557ce-3bcc-4c0c-9657-7733b9d15e6d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 06:24:45.915258+00	
00000000-0000-0000-0000-000000000000	596e4ccc-018d-4d1b-9d6f-293382983390	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 06:24:45.916482+00	
00000000-0000-0000-0000-000000000000	fe8de80b-4be9-440c-9c74-bc0401ccfd67	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 07:22:45.912737+00	
00000000-0000-0000-0000-000000000000	236d8308-4b3a-42d3-93f5-d8565961abb7	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 07:22:45.91431+00	
00000000-0000-0000-0000-000000000000	36148847-c722-4a6b-beca-027042609c52	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 08:20:45.911084+00	
00000000-0000-0000-0000-000000000000	53742267-c15e-4015-a75e-486dc4c6ff34	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 08:20:45.912386+00	
00000000-0000-0000-0000-000000000000	aa0b2ec2-4a49-4171-a30b-8b20ede21268	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 09:18:45.913168+00	
00000000-0000-0000-0000-000000000000	02dfead2-f651-4c57-b2ed-a79a0989f79f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 09:18:45.91447+00	
00000000-0000-0000-0000-000000000000	3fcbc0f2-2c02-4847-89fb-bdd2c652f07a	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 10:16:45.912589+00	
00000000-0000-0000-0000-000000000000	43a7b238-b367-4b72-abb0-4fe7e7d5c4fc	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 10:16:45.913935+00	
00000000-0000-0000-0000-000000000000	4368b355-09c8-447c-8dd0-6d15b613880f	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 11:14:45.91236+00	
00000000-0000-0000-0000-000000000000	8bc949e0-f905-47db-a713-4e9b0fd4ee39	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 11:14:45.91364+00	
00000000-0000-0000-0000-000000000000	7bee7720-09ae-4203-8e57-166e712c3982	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 12:12:45.911842+00	
00000000-0000-0000-0000-000000000000	d1296f1e-49da-427c-853b-50204b0349bf	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 12:12:45.913186+00	
00000000-0000-0000-0000-000000000000	e263ccb3-5d59-4c4a-b08d-2601ea50b546	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 13:10:45.910741+00	
00000000-0000-0000-0000-000000000000	6ea64046-a393-4840-84bd-2722a50d9863	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 13:10:45.911745+00	
00000000-0000-0000-0000-000000000000	3a8e8093-ce26-4033-b19f-58151be6ef73	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 14:08:45.915285+00	
00000000-0000-0000-0000-000000000000	e3600de9-bb5e-4c68-96ab-2725b5152cf6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 14:08:45.91681+00	
00000000-0000-0000-0000-000000000000	5ac0dd75-f6d7-4843-99b0-67ba99f870fc	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 15:06:45.911591+00	
00000000-0000-0000-0000-000000000000	14314feb-ea91-44e0-9352-5fe3bc2e7d2f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 15:06:45.912942+00	
00000000-0000-0000-0000-000000000000	8002569a-c9a0-4c5b-99cb-0f0738ae8bd2	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 16:04:45.91164+00	
00000000-0000-0000-0000-000000000000	e21aae14-7e17-4510-9847-4d07c98c126f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 16:04:45.913059+00	
00000000-0000-0000-0000-000000000000	fff200cf-6b1c-4343-b865-900d6d8679c2	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 17:02:45.911341+00	
00000000-0000-0000-0000-000000000000	b8df6618-c02b-4d29-92c8-df19aadde0d6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 17:02:45.912901+00	
00000000-0000-0000-0000-000000000000	83690644-ee4a-4e58-8bf7-76714fb6cc40	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 18:00:45.911078+00	
00000000-0000-0000-0000-000000000000	f5e22bf7-70dd-420b-9b78-f71f6b1b4a7f	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 18:00:45.912158+00	
00000000-0000-0000-0000-000000000000	81fc41f9-296e-404c-9290-7d628130c673	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 18:58:45.918718+00	
00000000-0000-0000-0000-000000000000	2fb8c593-e4b1-4984-862e-1354050b4c02	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 18:58:45.92011+00	
00000000-0000-0000-0000-000000000000	1f19863e-4a40-4e3a-a5ee-72e416b212db	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 19:56:45.913944+00	
00000000-0000-0000-0000-000000000000	9414c75e-6a2c-403b-867a-0622f2e5ddcb	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 19:56:45.915389+00	
00000000-0000-0000-0000-000000000000	0de1010d-aeb6-4ade-908a-7ac15bee9d55	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 20:54:45.911612+00	
00000000-0000-0000-0000-000000000000	40e44b59-0824-4af1-aff3-ac365afd9251	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 20:54:45.913105+00	
00000000-0000-0000-0000-000000000000	d05d453f-c2c2-43a1-ab0d-5c591198eaa0	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 21:52:45.912495+00	
00000000-0000-0000-0000-000000000000	85bd3e54-b6ac-4b7e-94ef-b05b6b464154	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 21:52:45.914104+00	
00000000-0000-0000-0000-000000000000	c421a19a-5afc-4b50-99f4-59c86301ef85	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 22:50:45.91368+00	
00000000-0000-0000-0000-000000000000	2d717e33-2c53-421e-86a9-3ca36351db3c	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 22:50:45.914877+00	
00000000-0000-0000-0000-000000000000	b4231032-1bad-48cf-af1f-d0573f5bd364	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 23:48:45.911661+00	
00000000-0000-0000-0000-000000000000	bfbd9d2d-8ec1-4895-9488-4f346501834d	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-08 23:48:45.912998+00	
00000000-0000-0000-0000-000000000000	ebdbb532-71c6-44e6-9546-d1b3b9095c4d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 00:46:45.912502+00	
00000000-0000-0000-0000-000000000000	a1dd8ebf-48ec-414f-ab22-5104671ea757	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 00:46:45.91362+00	
00000000-0000-0000-0000-000000000000	95a4df7a-fb09-4dee-b20b-08e4d753dddb	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 01:44:45.913747+00	
00000000-0000-0000-0000-000000000000	6eaddb31-46a5-49f7-a1c4-7f981a2b59b1	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 01:44:45.915075+00	
00000000-0000-0000-0000-000000000000	05689c6f-5353-454a-a993-79ed7bb199e1	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 02:42:45.913499+00	
00000000-0000-0000-0000-000000000000	7d5718b5-fc15-4c21-b1fb-4bd3e2841557	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 02:42:45.915034+00	
00000000-0000-0000-0000-000000000000	87c1a3a6-8ff2-4ebb-b5b6-18930f39b73a	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 03:40:45.910777+00	
00000000-0000-0000-0000-000000000000	c536da21-806d-4838-a7ad-bcc60fea4c79	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 03:40:45.911855+00	
00000000-0000-0000-0000-000000000000	3a772263-dea0-41ec-97d5-a17228bc2972	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 04:38:45.934962+00	
00000000-0000-0000-0000-000000000000	980b0870-3e2b-445c-ab67-8182fb9a2c95	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 04:38:45.936386+00	
00000000-0000-0000-0000-000000000000	fdcd3185-87cf-4b2f-a4d6-3bcca8c69948	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 06:02:22.726829+00	
00000000-0000-0000-0000-000000000000	df260565-27e2-4e97-891f-f4aeab0c1a61	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 06:02:22.728097+00	
00000000-0000-0000-0000-000000000000	d9afa044-312b-4389-8850-331337c4bc15	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 07:04:16.226259+00	
00000000-0000-0000-0000-000000000000	3a5eb0f2-769f-483f-9c5b-5c7670cb3db1	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 07:04:16.227496+00	
00000000-0000-0000-0000-000000000000	067cbfc0-f875-4ee8-b9ae-b0e875ecd63a	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-09 07:49:14.994521+00	
00000000-0000-0000-0000-000000000000	ed69f768-7f91-4a81-b1a9-da400e3ea8b6	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-09 07:49:30.76612+00	
00000000-0000-0000-0000-000000000000	6193c5de-9960-4b2f-9355-6cb257cebc80	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"vrmaddala@d2.com","user_id":"e2f80bb7-3fa2-4c8a-88b3-934acc1f8f9a","user_phone":""}}	2026-02-09 07:53:35.916364+00	
00000000-0000-0000-0000-000000000000	74fb57ac-0830-4fa6-b588-8e090dd0537e	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"vrmaddala@d2.com","user_id":"742821e1-aca7-4abb-8fbf-17dfde4ddb70","user_phone":""}}	2026-02-09 07:53:38.451858+00	
00000000-0000-0000-0000-000000000000	1f23542f-10f6-4328-9974-0880d2451c68	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 08:47:56.794547+00	
00000000-0000-0000-0000-000000000000	cfba23be-3daa-49f1-b6f5-a083394845b0	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 08:47:56.795982+00	
00000000-0000-0000-0000-000000000000	e155cf7a-b49b-47fc-bb83-ff6f61911a69	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 09:46:21.933254+00	
00000000-0000-0000-0000-000000000000	8e0174b5-68b2-4c83-a77a-e6b599c6ff24	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 09:46:21.934658+00	
00000000-0000-0000-0000-000000000000	23cc267d-fb54-47ce-9e85-0666ca8d666f	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 11:04:15.399437+00	
00000000-0000-0000-0000-000000000000	caf96882-f63b-4361-9d8f-fa135c7a2e24	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 11:04:15.400559+00	
00000000-0000-0000-0000-000000000000	6a9e0ea9-425e-4640-8645-c71db04215bf	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"vrmaddala@d2.com","user_id":"742821e1-aca7-4abb-8fbf-17dfde4ddb70","user_phone":""}}	2026-02-09 11:35:11.743042+00	
00000000-0000-0000-0000-000000000000	4f596b5e-6f06-4501-89b3-d46c0edf5a4b	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"vrmaddala@d2.com","user_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","user_phone":""}}	2026-02-09 11:35:13.746814+00	
00000000-0000-0000-0000-000000000000	e351c497-b2a6-47fb-8711-738f1b38400c	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-09 11:42:07.655188+00	
00000000-0000-0000-0000-000000000000	822dab60-6000-44f6-8466-a49e26e05219	{"action":"login","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-09 11:42:18.671849+00	
00000000-0000-0000-0000-000000000000	f5b35925-7b62-4b0c-a8f7-910ae1e7dd78	{"action":"logout","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-09 11:45:41.781738+00	
00000000-0000-0000-0000-000000000000	5a7afabf-c66b-4d8e-8e8f-76e9fe6d1984	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-09 11:45:56.48953+00	
00000000-0000-0000-0000-000000000000	9538876a-67e4-4cb1-ab9b-9f9896dac471	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-09 12:27:51.23321+00	
00000000-0000-0000-0000-000000000000	91bb533e-72d3-48e2-821a-3110ecd150ca	{"action":"login","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-09 12:28:03.991473+00	
00000000-0000-0000-0000-000000000000	c5726a91-ac17-438d-84f2-49098624d11b	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 13:49:43.323656+00	
00000000-0000-0000-0000-000000000000	c49e7a96-6966-4ca3-bfb1-edfd3950783d	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 13:49:43.324953+00	
00000000-0000-0000-0000-000000000000	da18be9e-5c03-43f9-928a-9c064e65c767	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 14:47:43.305925+00	
00000000-0000-0000-0000-000000000000	bc88298c-b4b6-4bec-a865-e85d4db8babc	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 14:47:43.306955+00	
00000000-0000-0000-0000-000000000000	c3a21564-f03f-4908-b680-bc3a323e4858	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 15:45:43.309231+00	
00000000-0000-0000-0000-000000000000	6ab0560f-5193-4a30-abcd-363913167650	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 15:45:43.310489+00	
00000000-0000-0000-0000-000000000000	e35d2a22-1313-461f-81a6-ab9e3e756905	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 16:43:43.307938+00	
00000000-0000-0000-0000-000000000000	88675829-8c38-49b3-bf03-e7b0cd38f89e	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 16:43:43.309446+00	
00000000-0000-0000-0000-000000000000	9d44c6e9-9f6b-4c4d-acbc-8df5181f68e0	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 17:41:43.307559+00	
00000000-0000-0000-0000-000000000000	4d2c4afb-29c5-4a02-8199-35d638a45b85	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 17:41:43.309132+00	
00000000-0000-0000-0000-000000000000	56a0deeb-69da-4c5e-8f01-f4e39e8b8408	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 18:39:43.307799+00	
00000000-0000-0000-0000-000000000000	5f81ba92-b909-425b-8f2c-c26cecd9ad11	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 18:39:43.30902+00	
00000000-0000-0000-0000-000000000000	017e6b84-63fa-453d-8e14-90761e1f7a60	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 19:37:43.306659+00	
00000000-0000-0000-0000-000000000000	be7dcc95-ef8b-43c7-a028-76ef951919cc	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 19:37:43.307726+00	
00000000-0000-0000-0000-000000000000	852dafd4-60a0-4f15-b61b-012420b7e3ea	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 20:35:43.307418+00	
00000000-0000-0000-0000-000000000000	1007694b-2e83-40cb-b6ec-633f1f0aa87f	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 20:35:43.308685+00	
00000000-0000-0000-0000-000000000000	90fbac5b-eb75-423b-b91a-21a8b109fdbf	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 21:33:43.308565+00	
00000000-0000-0000-0000-000000000000	8165a4eb-3b75-4984-903a-4ae80cee680b	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 21:33:43.30984+00	
00000000-0000-0000-0000-000000000000	c1f3018d-1725-4d64-85e8-8ede4b1896db	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 22:31:43.31197+00	
00000000-0000-0000-0000-000000000000	c969db65-c2b6-4ec3-9289-887481e0dbf8	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 22:31:43.313337+00	
00000000-0000-0000-0000-000000000000	e0363161-f42a-4bc8-8167-12cacb019e4d	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 23:29:43.309285+00	
00000000-0000-0000-0000-000000000000	5e2523fc-0ded-4230-b87e-9b2a2d21a2e7	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-09 23:29:43.310659+00	
00000000-0000-0000-0000-000000000000	7f8cf6a0-aa75-4de0-a199-42e792249e63	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 00:27:43.307109+00	
00000000-0000-0000-0000-000000000000	e27f46de-0b78-43ab-894c-e7644c9b6413	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 00:27:43.308484+00	
00000000-0000-0000-0000-000000000000	3e23647f-2ba3-4bfd-997d-d9789d0d1c03	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 01:25:43.308632+00	
00000000-0000-0000-0000-000000000000	89035236-6e63-4f1f-ac8a-a34de9c5d26d	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 01:25:43.310105+00	
00000000-0000-0000-0000-000000000000	3e5b7bfa-ebb0-4fe8-9b10-b622713680c6	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 02:23:43.308533+00	
00000000-0000-0000-0000-000000000000	cb532891-e6da-4b9a-915d-a71959795006	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 02:23:43.309762+00	
00000000-0000-0000-0000-000000000000	e79f4691-272a-44cd-8f2f-b77841ce52cd	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 03:21:43.313464+00	
00000000-0000-0000-0000-000000000000	9ba3c933-99cb-4e81-a422-f0a8f8dce9fa	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 03:21:43.314622+00	
00000000-0000-0000-0000-000000000000	b643290b-8e79-4359-b8cc-b5dbbbee0139	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 04:19:43.309943+00	
00000000-0000-0000-0000-000000000000	55ebc5f6-1659-4935-852f-09abe1841ea8	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 04:19:43.311487+00	
00000000-0000-0000-0000-000000000000	40e62041-5f08-4727-9586-f80a2b51c0da	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 05:17:43.310198+00	
00000000-0000-0000-0000-000000000000	e27ff7c1-0678-489e-ae30-3fac474344fc	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 05:17:43.311589+00	
00000000-0000-0000-0000-000000000000	eba8d3c2-5ed8-4143-8406-959a6f8de383	{"action":"token_refreshed","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 06:15:50.957391+00	
00000000-0000-0000-0000-000000000000	1562e863-72a7-47d0-b84b-d75dab06132c	{"action":"token_revoked","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 06:15:50.958772+00	
00000000-0000-0000-0000-000000000000	6e970ae8-b9f7-45e9-9f87-a06b3c7cadc6	{"action":"logout","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-10 06:46:00.260072+00	
00000000-0000-0000-0000-000000000000	40c1e64a-e28d-4e82-b23a-391f0fafe468	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-10 06:46:26.741735+00	
00000000-0000-0000-0000-000000000000	ed3764b9-4511-4e89-af12-31b3aae0e6b7	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 07:44:27.750297+00	
00000000-0000-0000-0000-000000000000	336211cc-7211-4eab-957a-3d8ead668e64	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 07:44:27.751598+00	
00000000-0000-0000-0000-000000000000	605ab3f2-df25-4de8-a253-e8091b432c56	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 08:42:36.333171+00	
00000000-0000-0000-0000-000000000000	172b7c91-1ad0-4fa8-986b-71314146def9	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 08:42:36.33462+00	
00000000-0000-0000-0000-000000000000	65e94187-cf99-4311-ba8a-d200d353c874	{"action":"logout","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-10 09:19:54.994897+00	
00000000-0000-0000-0000-000000000000	458ac819-884f-46da-a2ce-f9f362a245fd	{"action":"login","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-10 09:20:12.958051+00	
00000000-0000-0000-0000-000000000000	360bdef9-7e20-4da7-82e9-b0d771b6e558	{"action":"logout","actor_id":"9fb05e6d-0103-4517-aeef-12c6d946df67","actor_username":"vrmaddala@d2.com","actor_via_sso":false,"log_type":"account"}	2026-02-10 09:48:27.945646+00	
00000000-0000-0000-0000-000000000000	84abd68d-2a6d-4749-bcf6-b77586b6cd52	{"action":"login","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-02-10 09:48:40.957906+00	
00000000-0000-0000-0000-000000000000	1030ed0c-5534-4799-8b77-d938296ed57d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 10:47:59.239315+00	
00000000-0000-0000-0000-000000000000	53128a01-dce3-46fb-8ea6-b4f4ae72710b	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 10:47:59.240659+00	
00000000-0000-0000-0000-000000000000	3596f2ca-bdc3-4f81-b294-c107acd0869d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 11:46:13.661955+00	
00000000-0000-0000-0000-000000000000	69acd236-4f39-423e-9d72-08df1dc5359a	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 11:46:13.663368+00	
00000000-0000-0000-0000-000000000000	1710497e-9697-4896-9435-36797e2b55c0	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 12:51:31.387323+00	
00000000-0000-0000-0000-000000000000	4d9ab5f5-fa45-4157-bb29-677437af5177	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 12:51:31.388681+00	
00000000-0000-0000-0000-000000000000	24ed2bc3-d5e5-4692-a5d5-cdbd8f0950e4	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 13:49:51.927831+00	
00000000-0000-0000-0000-000000000000	a309466d-c112-4136-9456-17c6de5b8726	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 13:49:51.92909+00	
00000000-0000-0000-0000-000000000000	e6b813a6-d4f4-4cb7-bf0d-82dfd37d45bf	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 14:48:00.824749+00	
00000000-0000-0000-0000-000000000000	0a4e6d27-e939-4581-bdf1-f9ab8699beb8	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 14:48:00.825779+00	
00000000-0000-0000-0000-000000000000	95053d6c-dbc9-4941-9533-28c58c33058f	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 15:46:00.821226+00	
00000000-0000-0000-0000-000000000000	432ec4b1-dc4c-423e-a86d-3a5ae68a8bb6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 15:46:00.82256+00	
00000000-0000-0000-0000-000000000000	1beebe30-ceb1-4c9d-b2c3-5613693be286	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 16:44:00.821795+00	
00000000-0000-0000-0000-000000000000	3c50db68-9374-4a9a-aec9-9d7892a15b2a	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 16:44:00.823388+00	
00000000-0000-0000-0000-000000000000	affd66e3-695f-415f-9ab4-864bf0d602e9	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 17:42:00.822844+00	
00000000-0000-0000-0000-000000000000	5e2e5423-68e3-446a-b535-663a83806017	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 17:42:00.824135+00	
00000000-0000-0000-0000-000000000000	ee7439b6-8281-4f10-81c5-958737d44057	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 18:40:00.820843+00	
00000000-0000-0000-0000-000000000000	4530fb52-8f04-4f58-a142-5efed12854a8	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 18:40:00.821967+00	
00000000-0000-0000-0000-000000000000	60ef6c66-da28-44ec-8e92-50b8d97e79a2	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 19:38:00.822549+00	
00000000-0000-0000-0000-000000000000	a7fc6b52-ccfb-4d64-987d-52364bb60812	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 19:38:00.824122+00	
00000000-0000-0000-0000-000000000000	2df2af12-30d6-4c6b-a1d8-5d3ab1aeb62d	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 20:36:00.826416+00	
00000000-0000-0000-0000-000000000000	531d1f27-5090-492a-a466-dbcec8129905	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 20:36:00.827467+00	
00000000-0000-0000-0000-000000000000	62cf7fd1-6601-4daa-b5ba-a66c54a178df	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 21:34:00.821382+00	
00000000-0000-0000-0000-000000000000	646116bc-3d88-45e8-b987-97ea87319e68	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 21:34:00.822697+00	
00000000-0000-0000-0000-000000000000	bf028632-e1e7-404e-9ef0-00238c57576c	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 22:32:00.821102+00	
00000000-0000-0000-0000-000000000000	c43153dd-9078-4676-b633-9745839683be	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 22:32:00.822529+00	
00000000-0000-0000-0000-000000000000	3775f697-67c8-4265-9d94-41d122b5c3d8	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 23:30:00.820849+00	
00000000-0000-0000-0000-000000000000	8af33c14-1809-47bb-a1a8-a878458b5804	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-10 23:30:00.822048+00	
00000000-0000-0000-0000-000000000000	a39fb499-0632-4b01-a0f3-64bddfb41bf5	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 00:28:00.821949+00	
00000000-0000-0000-0000-000000000000	8add6778-0124-44eb-89fc-321c7d8da5ac	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 00:28:00.823521+00	
00000000-0000-0000-0000-000000000000	9bb26623-80a4-4e43-9178-f98fffa34a9e	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 01:26:00.823344+00	
00000000-0000-0000-0000-000000000000	1e88b90a-ee49-4732-980c-6eea876ed8dd	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 01:26:00.824441+00	
00000000-0000-0000-0000-000000000000	a5b5f808-7123-4d42-a3ed-31a9f2118b2b	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 02:24:00.822622+00	
00000000-0000-0000-0000-000000000000	aa443e0f-9329-468e-a392-12241f2301ce	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 02:24:00.824074+00	
00000000-0000-0000-0000-000000000000	51dab4d9-61c2-4726-abcd-77e1165bd526	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 03:22:00.822804+00	
00000000-0000-0000-0000-000000000000	fca5ce01-c744-4a24-9a44-877a88521ce6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 03:22:00.82391+00	
00000000-0000-0000-0000-000000000000	54c37aef-db9e-4b37-8561-e7bb92bb6af6	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 04:20:00.820722+00	
00000000-0000-0000-0000-000000000000	53d5fda6-0384-46d3-8966-086b2d9f49d4	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 04:20:00.822106+00	
00000000-0000-0000-0000-000000000000	7ca22356-5f73-4108-82b4-4de5fb977e76	{"action":"token_refreshed","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 05:18:04.186094+00	
00000000-0000-0000-0000-000000000000	cd3812b4-bb03-46dd-83fb-15485314e9b6	{"action":"token_revoked","actor_id":"eb0bdb87-6685-4dc3-a0d0-e16765c68242","actor_username":"balajid@d2.com","actor_via_sso":false,"log_type":"token"}	2026-02-11 05:18:04.187504+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
eb0bdb87-6685-4dc3-a0d0-e16765c68242	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"sub": "eb0bdb87-6685-4dc3-a0d0-e16765c68242", "email": "balajid@d2.com", "email_verified": false, "phone_verified": false}	email	2026-02-03 07:16:17.759081+00	2026-02-03 07:16:17.759173+00	2026-02-03 07:16:17.759173+00	053e9672-6dec-400b-949e-bf893ce4d166
9fb05e6d-0103-4517-aeef-12c6d946df67	9fb05e6d-0103-4517-aeef-12c6d946df67	{"sub": "9fb05e6d-0103-4517-aeef-12c6d946df67", "email": "vrmaddala@d2.com", "email_verified": false, "phone_verified": false}	email	2026-02-09 11:35:13.744527+00	2026-02-09 11:35:13.744596+00	2026-02-09 11:35:13.744596+00	76c4c782-efaf-46a3-86e4-9b4f3c4ea949
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
4bdd8562-d581-42bd-b027-d07c38aa4175	2026-02-10 09:48:40.965922+00	2026-02-10 09:48:40.965922+00	password	45a23e7e-0872-471c-b955-e740898c0f70
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	126	56zdzknn3hce	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 11:46:13.665248+00	2026-02-10 12:51:31.389373+00	bodasiihlscg	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	127	arhastyxpf5m	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 12:51:31.390234+00	2026-02-10 13:49:51.929778+00	56zdzknn3hce	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	129	3flrwmuxdeha	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 14:48:00.827105+00	2026-02-10 15:46:00.823448+00	r7hnwywrsgst	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	131	4nuskx2swynd	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 16:44:00.825644+00	2026-02-10 17:42:00.825002+00	k3hcq4q4pivd	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	133	fabzfrus7j6p	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 18:40:00.823355+00	2026-02-10 19:38:00.82517+00	oyqalz4ypak7	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	135	ea3so5dzvodw	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 20:36:00.828882+00	2026-02-10 21:34:00.823714+00	jjhlu5vm6y4d	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	137	ui4gkuwmdqgk	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 22:32:00.824575+00	2026-02-10 23:30:00.822737+00	asmrhxnkl5pl	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	139	xqsao7gwvhtg	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-11 00:28:00.825576+00	2026-02-11 01:26:00.825151+00	uocxg72w5ryh	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	141	y5rfvb6nmdzy	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-11 02:24:00.82624+00	2026-02-11 03:22:00.824508+00	2bkfhsyv2wqm	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	143	x7t3eylooelc	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-11 04:20:00.823632+00	2026-02-11 05:18:04.188475+00	2cttrxattgp4	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	124	6g7enwtpdy3j	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 09:48:40.96301+00	2026-02-10 10:47:59.24155+00	\N	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	128	r7hnwywrsgst	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 13:49:51.930734+00	2026-02-10 14:48:00.826326+00	arhastyxpf5m	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	130	k3hcq4q4pivd	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 15:46:00.824423+00	2026-02-10 16:44:00.824379+00	3flrwmuxdeha	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	132	oyqalz4ypak7	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 17:42:00.825862+00	2026-02-10 18:40:00.822598+00	4nuskx2swynd	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	134	jjhlu5vm6y4d	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 19:38:00.826101+00	2026-02-10 20:36:00.828135+00	fabzfrus7j6p	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	136	asmrhxnkl5pl	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 21:34:00.824964+00	2026-02-10 22:32:00.823566+00	ea3so5dzvodw	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	138	uocxg72w5ryh	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 23:30:00.823559+00	2026-02-11 00:28:00.8245+00	ui4gkuwmdqgk	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	140	2bkfhsyv2wqm	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-11 01:26:00.826146+00	2026-02-11 02:24:00.825158+00	xqsao7gwvhtg	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	142	2cttrxattgp4	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-11 03:22:00.825287+00	2026-02-11 04:20:00.822807+00	y5rfvb6nmdzy	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	144	ifj6wael4ix3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	f	2026-02-11 05:18:04.189544+00	2026-02-11 05:18:04.189544+00	x7t3eylooelc	4bdd8562-d581-42bd-b027-d07c38aa4175
00000000-0000-0000-0000-000000000000	125	bodasiihlscg	eb0bdb87-6685-4dc3-a0d0-e16765c68242	t	2026-02-10 10:47:59.242586+00	2026-02-10 11:46:13.664356+00	6g7enwtpdy3j	4bdd8562-d581-42bd-b027-d07c38aa4175
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter) FROM stdin;
4bdd8562-d581-42bd-b027-d07c38aa4175	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 09:48:40.959857+00	2026-02-11 05:18:04.193049+00	\N	aal1	\N	2026-02-11 05:18:04.192929	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	10.244.0.1	\N	\N	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	eb0bdb87-6685-4dc3-a0d0-e16765c68242	authenticated	authenticated	balajid@d2.com	$2a$10$yDLD2zx9Wyw2cMbxfewPVOhhUjveKvepE8Q.3FG.yoYft5gk8eo.K	2026-02-03 07:16:17.763702+00	\N		\N		\N			\N	2026-02-10 09:48:40.959735+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-02-03 07:16:17.753002+00	2026-02-11 05:18:04.191029+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	9fb05e6d-0103-4517-aeef-12c6d946df67	authenticated	authenticated	vrmaddala@d2.com	$2a$10$.rZpgJyeEuo5CM9W0ka8k.p93u6ncr6Rfk0yjVVNPJtleVOg.evEm	2026-02-09 11:35:13.74915+00	\N		\N		\N			\N	2026-02-10 09:20:12.96003+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-02-09 11:35:13.738782+00	2026-02-10 09:20:12.965334+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: activity_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_events (id, project_id, event_type, entity_type, entity_id, actor_id, metadata, created_at) FROM stdin;
1	1	task_created	task	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"status": "ip", "task_name": "integ_cam"}	2026-02-05 14:23:21.065133+00
2	1	note_created	task	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"note_type": "comment", "has_subject": true}	2026-02-06 05:23:22.8039+00
3	1	note_created	shot	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"note_type": "comment", "has_subject": true}	2026-02-06 06:16:32.596004+00
4	1	version_uploaded	shot	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"version_code": "pixel art GIF", "version_number": 1}	2026-02-06 06:19:55.84808+00
5	1	note_created	shot	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"note_type": "comment", "has_subject": true}	2026-02-06 06:46:13.407251+00
6	1	note_created	shot	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"note_type": "comment", "has_subject": true}	2026-02-10 07:01:57.117471+00
7	1	version_uploaded	shot	3	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{"version_code": "asset", "version_number": 1}	2026-02-10 07:08:29.477243+00
8	7	task_created	task	4	\N	{"status": "ip", "task_name": "TEST: Matchmove"}	2026-02-10 08:26:24.441322+00
9	7	version_uploaded	shot	4	\N	{"version_code": "TEST_2560_v001", "version_number": 1}	2026-02-10 08:26:24.441322+00
10	7	file_published	shot	4	\N	{"file_name": "Test Publish", "file_type": "render"}	2026-02-10 08:26:24.441322+00
\.


--
-- Data for Name: allowed_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowed_users (email, active, created_at) FROM stdin;
balajid@d2.com	t	2026-02-03 07:31:34.522429+00
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, project_id, code, name, description, asset_type, status, thumbnail_url, created_by, created_at, updated_at, client_name, dd_client_name, keep, outsource, sequence_id, shot_id, shots, vendor_groups, sub_assets, tags, task_template, parent_assets, sequences, asset_sequence, asset_shot, cached_display_name, cc, creative_brief, episodes, filmstrip_thumbnail_url, image_source_entity, levels, linked_projects, mocap_takes, notes, open_notes, open_notes_count, published_file_links, review_versions_link, sequences_assets, shots_assets, tasks, thumbnail_blur_hash, updated_by, version_link) FROM stdin;
5	1	tree	tree	test	prop	pending	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-09 08:43:44.496692+00	2026-02-10 08:17:04.405557+00			f	f	\N	\N	{}	{gh}	{}	{}	\N	{}	{}	{}	{}	\N	{}	\N	{}	\N	\N	{}	{}	{}	{}	{}	0	{}	{}	{}	{}	{}	\N	\N	{}
6	7	prop_demo	prop_demo	Test asset	prop	pending	\N	\N	2026-02-10 08:26:24.441322+00	2026-02-10 08:26:24.441322+00	Client A	DD Client A	t	f	5	4	{2560}	{"Vendor Group A"}	{sub_asset_01}	{test,asset}	Default Template	{parent_asset_01}	{RND}	{}	{}	\N	{}	\N	{}	\N	\N	{}	{}	{}	{}	{}	0	{}	{}	{}	{}	{}	\N	\N	{}
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attachments (id, note_id, file_name, file_size, file_type, storage_path, thumbnail_url, created_by, created_at) FROM stdin;
1	10	Pixel Art GIF.gif	361422	image/gif	10/1770360373768_Pixel Art GIF.gif	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 06:46:13.887874+00
2	13	asset_activity.png	70724	image/png	13/1770706917495_asset_activity.png	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 07:01:57.602979+00
\.


--
-- Data for Name: conversation_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversation_members (id, conversation_id, user_id, role, last_read_at, joined_at) FROM stdin;
3	2	eb0bdb87-6685-4dc3-a0d0-e16765c68242	owner	\N	2026-02-10 07:00:29.418498+00
2	1	9fb05e6d-0103-4517-aeef-12c6d946df67	member	2026-02-10 09:47:31.895+00	2026-02-09 11:39:50.39236+00
1	1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	owner	2026-02-10 10:07:05.925+00	2026-02-09 11:39:50.39236+00
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, type, name, project_id, created_by, created_at, updated_at) FROM stdin;
2	channel	test	1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 07:00:29.390746+00	2026-02-10 07:00:29.390746+00
1	dm	\N	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-09 11:39:50.374236+00	2026-02-10 09:13:22.94449+00
\.


--
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deliveries (id, project_id, code, name, description, delivery_type, due_date, delivered_date, status, client_contact, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: delivery_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.delivery_items (delivery_id, entity_type, entity_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, code, name, description, color, created_at) FROM stdin;
1	modeling	Modeling	3D modeling and sculpting	#3B82F6	2026-02-05 10:29:30.062559+00
2	rigging	Rigging	Character and asset rigging	#EC4899	2026-02-05 10:29:30.062559+00
3	animation	Animation	Character animation	#EF4444	2026-02-05 10:29:30.062559+00
4	lighting	Lighting	Lighting and rendering	#F59E0B	2026-02-05 10:29:30.062559+00
5	fx	FX	Visual effects and simulations	#6366F1	2026-02-05 10:29:30.062559+00
6	comp	Compositing	Compositing and finishing	#14B8A6	2026-02-05 10:29:30.062559+00
7	concept	Concept Art	Concept and design	#8B5CF6	2026-02-05 10:29:30.062559+00
8	texture	Texturing	Texture and lookdev	#10B981	2026-02-05 10:29:30.062559+00
9	layout	Layout	Layout and previz	#6B7280	2026-02-05 10:29:30.062559+00
10	editorial	Editorial	Editorial and conform	#F43F5E	2026-02-05 10:29:30.062559+00
11	production	Production	Production management	#6366F1	2026-02-05 10:29:30.062559+00
12	tech	Technical	Technical direction and pipeline	#64748B	2026-02-05 10:29:30.062559+00
25	pipeline	Pipeline	\N	\N	2026-02-09 11:34:57.815672+00
\.


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_members (group_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.groups (id, code, name, description, created_at) FROM stdin;
1	artists	Artists	All production artists	2026-02-05 10:29:30.062559+00
2	supervisors	Supervisors	Department supervisors and leads	2026-02-05 10:29:30.062559+00
3	production	Production Team	Production coordinators and managers	2026-02-05 10:29:30.062559+00
4	clients	Clients	External clients and stakeholders	2026-02-05 10:29:30.062559+00
5	vendors	Vendors	External vendor partners	2026-02-05 10:29:30.062559+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, author_id, content, created_at, updated_at) FROM stdin;
1	1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	hai	2026-02-09 11:40:38.634316+00	2026-02-09 11:40:38.634316+00
3	1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	hai	2026-02-09 11:47:51.92857+00	2026-02-09 11:47:51.92857+00
4	1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	yee	2026-02-09 12:27:36.833238+00	2026-02-09 12:27:36.833238+00
6	2	eb0bdb87-6685-4dc3-a0d0-e16765c68242	hey	2026-02-10 07:00:35.838118+00	2026-02-10 07:00:35.838118+00
7	1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	hai	2026-02-10 09:13:22.921668+00	2026-02-10 09:13:22.921668+00
2	1	9fb05e6d-0103-4517-aeef-12c6d946df67	hai there	2026-02-09 11:42:44.886004+00	2026-02-10 09:42:35.080171+00
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.milestones (id, project_id, phase_id, code, name, description, due_date, completed_date, status, created_at) FROM stdin;
\.


--
-- Data for Name: note_mentions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.note_mentions (note_id, user_id, mention_type, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notes (id, project_id, entity_type, entity_id, parent_note_id, author_id, subject, content, note_type, read_by_default, created_at, updated_at, created_by, status, task_id, attachments, ayon_id, ayon_sync_status, cached_display_name, cc, client_approved, client_note, client_note_id, composition, filmstrip_thumbnail_url, image_source_entity, links, notes_app_context_entity, otio_playable, playlist, publish_status, read_unread, replies, reply_content, suppress_email_notification, tags, tasks, thumbnail_url, thumbnail_blur_hash, f_to, updated_by) FROM stdin;
9	1	shot	3	\N	\N	test	testing	comment	t	2026-02-06 06:16:32.596004+00	2026-02-06 06:16:32.596004+00	eb0bdb87-6685-4dc3-a0d0-e16765c68242	open	3	{}	\N	\N	\N	{}	f	f	\N	\N	\N	\N	{}	\N	\N	\N	\N	\N	{}	\N	f	{}	{}	\N	\N	{}	\N
10	1	shot	3	\N	\N	test	testing	comment	t	2026-02-06 06:46:13.407251+00	2026-02-06 06:46:13.407251+00	eb0bdb87-6685-4dc3-a0d0-e16765c68242	open	3	{}	\N	\N	\N	{}	f	f	\N	\N	\N	\N	{}	\N	\N	\N	\N	\N	{}	\N	f	{}	{}	\N	\N	{}	\N
13	1	shot	3	\N	\N	test	tesing	comment	t	2026-02-10 07:01:57.117471+00	2026-02-10 07:01:57.117471+00	eb0bdb87-6685-4dc3-a0d0-e16765c68242	open	3	{}	\N	\N	\N	{}	f	f	\N	\N	\N	\N	{}	\N	\N	\N	\N	\N	{}	\N	f	{}	{}	\N	\N	{}	\N
\.


--
-- Data for Name: phases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.phases (id, project_id, code, name, description, start_date, end_date, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: playlist_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.playlist_items (playlist_id, version_id, sort_order, notes, created_at) FROM stdin;
\.


--
-- Data for Name: playlist_shares; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.playlist_shares (id, playlist_id, access_key, expires_at, access_count, password_hash, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.playlists (id, project_id, code, name, description, locked, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, display_name, firstname, lastname, avatar_url, role, department_id, active, login_enabled, created_at, updated_at, full_name) FROM stdin;
eb0bdb87-6685-4dc3-a0d0-e16765c68242	balajid@d2.com	Balaji D	\N	\N	\N	alpha	\N	t	t	2026-02-05 10:37:31.609092+00	2026-02-05 10:37:31.609092+00	\N
9fb05e6d-0103-4517-aeef-12c6d946df67	vrmaddala@d2.com	vrmaddala	venkateswar rao	Maddala	\N	alpha	25	t	t	2026-02-09 11:35:13.775738+00	2026-02-09 11:35:13.775738+00	\N
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_members (project_id, user_id, role, created_at) FROM stdin;
1	eb0bdb87-6685-4dc3-a0d0-e16765c68242	lead	2026-02-06 05:23:18.789398+00
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, code, name, description, status, color, start_date, end_date, thumbnail_url, is_template, archived, created_by, created_at, updated_at, project_type, updated_by, tags, ayon_id, ayon_project_code, billboard, duration, favorite, sg_id, tank_name, task_template, users) FROM stdin;
1	JIA	JIA	kong first test project	active	\N	\N	\N	\N	f	f	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-05 10:45:40.806335+00	2026-02-05 10:45:40.806335+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
2	APES	APES	test	active	\N	\N	\N	\N	f	f	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 12:12:05.24852+00	2026-02-06 12:12:05.24852+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
3	PRO1	PRO1	\N	active	\N	\N	\N	\N	f	f	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 12:14:05.764448+00	2026-02-06 12:14:05.764448+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
4	PRO2	PRO2	\N	active	\N	\N	\N	\N	f	f	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 12:14:15.46625+00	2026-02-06 12:14:15.46625+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
5	PRO3	PRO3	\N	active	\N	\N	\N	\N	f	f	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 12:14:23.605916+00	2026-02-06 12:14:23.605916+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
6	PRO6	PRO6	\N	active	\N	\N	\N	\N	f	f	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 12:14:34.053769+00	2026-02-06 12:14:34.053769+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
7	JIA_TEST	JIA Test	Seed data for UI checks	active	\N	\N	\N	\N	f	f	\N	2026-02-10 08:26:24.441322+00	2026-02-10 08:26:24.441322+00	\N	\N	{}	\N	\N	\N	\N	f	\N	\N	\N	[]
\.


--
-- Data for Name: published_file_dependencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_file_dependencies (published_file_id, depends_on_published_file_id, dependency_type, created_at) FROM stdin;
\.


--
-- Data for Name: published_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_files (id, project_id, entity_type, entity_id, version_id, task_id, code, name, description, version_number, file_type, file_path, file_size, published_by, published_at, status, created_at, updated_at, thumbnail_url, link, downstream_published_files, upstream_published_files, tags, client_version, element, output, path_cache, path_cache_storage, path_to_source, submission_notes, snapshot_id, snapshot_type, target_name, ayon_representation_id, cached_display_name, filmstrip_thumbnail_url, image_source_entity, thumbnail_blur_hash, updated_by) FROM stdin;
\.


--
-- Data for Name: sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sequences (id, project_id, code, name, description, status, thumbnail_url, created_at, updated_at, client_name, dd_client_name, cc, task_template, sequence_type, tags, shots, assets, plates, cuts, open_notes_count, published_file_links, created_by, ayon_id, ayon_sync_status, cached_display_name, episode, filmstrip_thumbnail_url, image_source_entity, notes, open_notes, scenes, tasks, thumbnail_blur_hash, updated_by, vendor_groups, version_link) FROM stdin;
4	1	RND	RND	test	active	\N	2026-02-05 14:18:15.132963+00	2026-02-10 06:14:30.220224+00	\N	\N	\N	\N	\N	{}	{}	{}	\N	\N	0	{}	\N	\N	\N	\N	\N	\N	\N	{}	{}	{}	{}	\N	\N	{}	{}
5	7	RND	RND	Test sequence	active	\N	2026-02-10 08:26:24.441322+00	2026-02-10 08:26:24.441322+00	Client A	DD Client A	\N	\N	\N	{}	{2560}	{prop_demo}	Plates 01	CUTS-01	0	{}	\N	\N	\N	\N	\N	\N	\N	{}	{}	{}	{}	\N	\N	{}	{}
\.


--
-- Data for Name: shots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shots (id, project_id, sequence_id, code, name, description, status, cut_in, cut_out, head_in, tail_out, working_duration, frame_start, frame_end, thumbnail_url, created_by, created_at, updated_at, shot_type, client_name, dd_client_name, cc, comp_note, cut_order, cut_summary, duration_summary, dd_location, delivery_date, head_duration, head_out, tail_in, next_review, open_notes, open_notes_count, parent_shots, plates, seq_shot, shot_notes, sub_shots, target_date, task_template, vendor_groups, assets, tags, ayon_id, ayon_sync_status, cached_display_name, filmstrip_thumbnail_url, image_source_entity, notes, published_file_links, raw_cut_duration, raw_cut_in, raw_cut_out, raw_head_duration, raw_head_in, raw_head_out, raw_tail_duration, raw_tail_in, raw_tail_out, tail_duration, tasks, thumbnail_blur_hash, turnover, updated_by, version_link) FROM stdin;
3	1	4	2560	2560	test shot\n	pending	\N	\N	\N	\N	\N	\N	\N	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-05 14:18:31.960992+00	2026-02-10 05:55:38.404736+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	{}	\N	\N	{}	{}	\N	\N	{}	{}	{}	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	\N	{}
4	7	5	2560	2560	Test shot	pending	1001	1050	1001	1050	\N	\N	\N	\N	\N	2026-02-10 08:26:24.441322+00	2026-02-10 08:26:24.441322+00	VFX	Client A	DD Client A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	{}	Plate A	\N	{}	{}	\N	Default Template	{"Vendor Group A"}	{prop_demo}	{test,shot}	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	\N	{}
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.statuses (id, code, name, entity_type, color, icon, sort_order, is_default, created_at) FROM stdin;
1	wtg	Waiting to Start	task	#6B7280	\N	10	t	2026-02-05 10:29:30.062559+00
2	rdy	Ready to Start	task	#3B82F6	\N	20	f	2026-02-05 10:29:30.062559+00
3	ip	In Progress	task	#F59E0B	\N	30	f	2026-02-05 10:29:30.062559+00
4	rev	Pending Review	task	#8B5CF6	\N	40	f	2026-02-05 10:29:30.062559+00
5	rtk	Retake	task	#EF4444	\N	45	f	2026-02-05 10:29:30.062559+00
6	apr	Approved	task	#10B981	\N	50	f	2026-02-05 10:29:30.062559+00
7	omt	Omitted	task	#94A3B8	\N	60	f	2026-02-05 10:29:30.062559+00
8	fin	Final	task	#22C55E	\N	70	f	2026-02-05 10:29:30.062559+00
9	wtg	Waiting to Start	asset	#6B7280	\N	10	t	2026-02-05 10:29:30.062559+00
10	ip	In Progress	asset	#F59E0B	\N	20	f	2026-02-05 10:29:30.062559+00
11	rev	Pending Review	asset	#8B5CF6	\N	30	f	2026-02-05 10:29:30.062559+00
12	apr	Approved	asset	#10B981	\N	40	f	2026-02-05 10:29:30.062559+00
13	fin	Final	asset	#22C55E	\N	50	f	2026-02-05 10:29:30.062559+00
14	omt	Omitted	asset	#94A3B8	\N	60	f	2026-02-05 10:29:30.062559+00
15	wtg	Waiting to Start	shot	#6B7280	\N	10	t	2026-02-05 10:29:30.062559+00
16	ip	In Progress	shot	#F59E0B	\N	20	f	2026-02-05 10:29:30.062559+00
17	rev	Pending Review	shot	#8B5CF6	\N	30	f	2026-02-05 10:29:30.062559+00
18	apr	Approved	shot	#10B981	\N	40	f	2026-02-05 10:29:30.062559+00
19	fin	Final	shot	#22C55E	\N	50	f	2026-02-05 10:29:30.062559+00
20	omt	Omitted	shot	#94A3B8	\N	60	f	2026-02-05 10:29:30.062559+00
21	hld	On Hold	shot	#F97316	\N	70	f	2026-02-05 10:29:30.062559+00
22	pen	Pending Review	version	#6B7280	\N	10	t	2026-02-05 10:29:30.062559+00
23	rev	In Review	version	#F59E0B	\N	20	f	2026-02-05 10:29:30.062559+00
24	apr	Approved	version	#10B981	\N	30	f	2026-02-05 10:29:30.062559+00
25	rej	Rejected	version	#EF4444	\N	40	f	2026-02-05 10:29:30.062559+00
26	cbr	Client Review	version	#8B5CF6	\N	50	f	2026-02-05 10:29:30.062559+00
27	cap	Client Approved	version	#22C55E	\N	60	f	2026-02-05 10:29:30.062559+00
62	pending	Pending	asset	#6B7280	\N	10	t	2026-02-05 10:37:06.692008+00
67	pending	Pending	shot	#6B7280	\N	10	t	2026-02-05 10:37:06.692008+00
70	cbr	Client Review	shot	#06B6D4	\N	35	f	2026-02-05 10:37:06.692008+00
74	pending	Pending Review	version	#6B7280	\N	10	t	2026-02-05 10:37:06.692008+00
76	rtk	Retake	version	#EF4444	\N	30	f	2026-02-05 10:37:06.692008+00
77	fin	Final	version	#22C55E	\N	40	f	2026-02-05 10:37:06.692008+00
\.


--
-- Data for Name: steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.steps (id, code, name, short_name, description, department_id, color, sort_order, entity_type, created_at) FROM stdin;
1	model	Modeling	Mdl	Create 3D geometry and topology	1	#3B82F6	10	asset	2026-02-05 10:29:30.062559+00
2	texture	Texturing	Tex	Create surface materials and textures	8	#8B5CF6	20	asset	2026-02-05 10:29:30.062559+00
3	rig	Rigging	Rig	Create character/prop rigs for animation	2	#EC4899	30	asset	2026-02-05 10:29:30.062559+00
4	groom	Grooming	Grm	Create hair, fur, and other grooming elements	5	#F59E0B	40	asset	2026-02-05 10:29:30.062559+00
5	lookdev	Lookdev	Lkd	Asset look development and shading	8	#10B981	45	asset	2026-02-05 10:29:30.062559+00
6	layout	Layout	Lay	Camera placement and blocking	9	#10B981	50	shot	2026-02-05 10:29:30.062559+00
7	anim	Animation	Ani	Character and object animation	3	#EF4444	60	shot	2026-02-05 10:29:30.062559+00
8	fx	FX	Fx	Visual effects and simulations	5	#6366F1	70	shot	2026-02-05 10:29:30.062559+00
9	light	Lighting	Lgt	Scene lighting and rendering setup	4	#F59E0B	80	shot	2026-02-05 10:29:30.062559+00
10	comp	Compositing	Cmp	Final image compositing and color grading	6	#14B8A6	90	shot	2026-02-05 10:29:30.062559+00
11	previz	Previz	Prv	Pre-visualization	9	#6B7280	5	both	2026-02-05 10:29:30.062559+00
12	render	Rendering	Rnd	Final render output	4	#8B5CF6	85	both	2026-02-05 10:29:30.062559+00
13	roto	Rotoscoping	Rto	Rotoscoping and masking	6	#EC4899	95	both	2026-02-05 10:29:30.062559+00
14	matchmove	Matchmove	Mm	Camera tracking and matchmoving	9	#3B82F6	55	both	2026-02-05 10:29:30.062559+00
15	matte	Matte Painting	Mtp	Digital matte painting	7	#8B5CF6	75	both	2026-02-05 10:29:30.062559+00
23	lighting	Lighting	Light	\N	\N	#F59E0B	40	shot	2026-02-05 10:37:22.749393+00
26	concept	Concept Art	Concept	\N	\N	#8B5CF6	5	asset	2026-02-05 10:37:22.749393+00
28	MM	Matchmove	\N	\N	\N	\N	\N	shot	2026-02-10 08:26:24.441322+00
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_assignments (task_id, user_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: task_dependencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_dependencies (task_id, depends_on_task_id, dependency_type, created_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, project_id, entity_type, entity_id, step_id, milestone_id, name, description, status, priority, start_date, due_date, duration, estimated_hours, actual_hours, task_template_id, created_by, created_at, updated_at, assigned_to, reviewer, link, bid, bid_breakdown, buffer_days, buffer_days2, casting, cc, ddna_bid, ddna_id, ddna_to, dependency_violation, dept_end_date, downstream_dependency, end_date, gantt_bar_color, inventory_date, milestone, notes, prod_comments, proposed_start_date, publish_version_number, tags, task_complexity, task_template, thumbnail_url, versions, workload, pipeline_step_color, ayon_assignees, ayon_id, ayon_sync_status, cached_display_name, filmstrip_thumbnail_url, image_source_entity, implicit, notes_links, open_notes, open_notes_count, pinned, review_versions_task, schedule_change_comments, sibling_tasks, sort_order, split_durations, splits, template_task, thumbnail_blur_hash, time_logged, time_logged_of_bid, time_logged_over_under_bid, updated_by, upstream_dependency, workload_assignee_count) FROM stdin;
3	1	shot	3	14	\N	integ_cam	test task 	ip	high	\N	2026-02-12	\N	\N	\N	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-05 14:23:21.065133+00	2026-02-05 14:23:21.065133+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	f	{}	{}	0	f	{}	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N
4	7	shot	4	28	\N	TEST: Matchmove	Test task linked to shot	ip	high	2026-02-10	2026-02-20	5	\N	\N	\N	\N	2026-02-10 08:26:24.441322+00	2026-02-10 08:26:24.441322+00	\N	Lead	https://example.com/task	2	2d Matchmove	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{test,task}	\N	Default Template	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	f	{}	{}	0	f	{}	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tickets (id, project_id, title, description, ticket_type, priority, status, entity_type, entity_id, assigned_to, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: time_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_logs (id, project_id, entity_type, entity_id, user_id, date, duration, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.versions (id, project_id, entity_type, entity_id, task_id, code, version_number, description, status, client_approved, movie_url, thumbnail_url, frames_path, first_frame, last_frame, frame_count, frame_range, artist_id, created_by, created_at, updated_at, file_path, link, cuts, date_viewed, department, editorial_qc, flagged, movie_aspect_ratio, movie_has_slate, nuke_script, playlists, published_files, send_exrs, source_clip, tags, task_template, version_type, uploaded_movie, viewed_status, client_approved_at, client_approved_by, client_version_name, ayon_id, ayon_product_id, ayon_sync_status, ayon_version_id, cached_display_name, deliveries, filmstrip_thumbnail_url, frame_rate, frames_aspect_ratio, frames_have_slate, image_source_entity, media_center_import_time, notes, open_notes, open_notes_count, otio_playable, path_to_geometry, tasks, thumbnail_blur_hash, translation_type, updated_by, uploaded_movie_audio_offset, uploaded_movie_duration, uploaded_movie_image, uploaded_movie_mp4, uploaded_movie_transcoding_status, uploaded_movie_webm) FROM stdin;
5	7	shot	4	4	TEST_2560_v001	1	Test version	review	f	/path/to/movie.mov	\N	/path/to/frames	1001	1050	\N	\N	\N	\N	2026-02-10 08:26:24.441322+00	2026-02-10 08:26:24.441322+00	\N	https://example.com/version	v1	\N	comp	\N	f	\N	f	\N	{}	{}	f	\N	{test,version}	Default Template	comp	movie.mov	unviewed	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	\N	f	\N	\N	{}	{}	0	\N	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	1	shot	3	3	asset	1	\N	pending	f	http://10.100.222.197:8000/storage/v1/object/public/versions/1/1770707309118_asset.png	\N	\N	\N	\N	\N	\N	\N	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 07:08:29.477243+00	2026-02-10 13:19:24.259468+00	1/1770707309118_asset.png	\N	\N	\N		\N	f	\N	f	\N	{}	{}	f	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	\N	f	\N	\N	{}	{}	0	\N	\N	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: messages_2026_02_08; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_02_08 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_09; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_02_09 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_10; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_02_10 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_11; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_02_11 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_12; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_02_12 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_13; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_02_13 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-02-02 09:39:29
20211116045059	2026-02-02 09:39:30
20211116050929	2026-02-02 09:39:30
20211116051442	2026-02-02 09:39:31
20211116212300	2026-02-02 09:39:32
20211116213355	2026-02-02 09:39:32
20211116213934	2026-02-02 09:39:32
20211116214523	2026-02-02 09:39:33
20211122062447	2026-02-02 09:39:33
20211124070109	2026-02-02 09:39:33
20211202204204	2026-02-02 09:39:34
20211202204605	2026-02-02 09:39:34
20211210212804	2026-02-02 09:39:37
20211228014915	2026-02-02 09:39:39
20220107221237	2026-02-02 09:39:39
20220228202821	2026-02-02 09:39:39
20220312004840	2026-02-02 09:39:39
20220603231003	2026-02-02 09:39:40
20220603232444	2026-02-02 09:39:40
20220615214548	2026-02-02 09:39:40
20220712093339	2026-02-02 09:39:41
20220908172859	2026-02-02 09:39:41
20220916233421	2026-02-02 09:39:41
20230119133233	2026-02-02 09:39:41
20230128025114	2026-02-02 09:39:41
20230128025212	2026-02-02 09:39:42
20230227211149	2026-02-02 09:39:42
20230228184745	2026-02-02 09:39:42
20230308225145	2026-02-02 09:39:42
20230328144023	2026-02-02 09:39:43
20231018144023	2026-02-02 09:39:43
20231204144023	2026-02-02 09:39:44
20231204144024	2026-02-02 09:39:45
20231204144025	2026-02-02 09:39:46
20240108234812	2026-02-02 09:39:46
20240109165339	2026-02-02 09:39:46
20240227174441	2026-02-02 09:39:47
20240311171622	2026-02-02 09:39:47
20240321100241	2026-02-02 09:39:48
20240401105812	2026-02-02 09:39:48
20240418121054	2026-02-02 09:39:49
20240523004032	2026-02-02 09:39:50
20240618124746	2026-02-02 09:39:50
20240801235015	2026-02-02 09:39:51
20240805133720	2026-02-02 09:39:51
20240827160934	2026-02-02 09:39:51
20240919163303	2026-02-02 09:39:52
20240919163305	2026-02-02 09:39:52
20241019105805	2026-02-02 09:39:52
20241030150047	2026-02-02 09:39:53
20241108114728	2026-02-02 09:39:53
20241121104152	2026-02-02 09:39:54
20241130184212	2026-02-02 09:39:55
20241220035512	2026-02-02 09:39:55
20241220123912	2026-02-02 09:39:56
20241224161212	2026-02-02 09:39:56
20250107150512	2026-02-02 09:39:56
20250110162412	2026-02-02 09:39:56
20250123174212	2026-02-02 09:39:56
20250128220012	2026-02-02 09:39:56
20250506224012	2026-02-02 09:39:57
20250523164012	2026-02-02 09:39:57
20250714121412	2026-02-02 09:39:57
20250905041441	2026-02-02 09:39:57
20251103001201	2026-02-02 09:39:57
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
versions	versions	\N	2026-02-06 05:58:03.093723+00	2026-02-06 05:58:03.093723+00	f	f	52428800	{image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,application/pdf,application/zip}	\N	STANDARD
note-attachments	note-attachments	\N	2026-02-06 06:28:35.840473+00	2026-02-06 06:28:35.840473+00	f	f	10485760	{image/jpeg,image/png,image/gif,image/webp,application/pdf}	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (id, type, format, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.iceberg_namespaces (id, bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.iceberg_tables (id, namespace_id, bucket_id, name, location, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-02-02 09:37:08.167638
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-02-02 09:37:08.301623
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2026-02-02 09:37:08.477648
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-02-02 09:37:08.680208
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-02-02 09:37:09.616929
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-02-02 09:37:09.733194
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2026-02-02 09:37:09.879643
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-02-02 09:37:10.034897
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-02-02 09:37:10.141171
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2026-02-02 09:37:10.181428
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2026-02-02 09:37:10.241616
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-02-02 09:37:10.375334
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-02-02 09:37:10.534646
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-02-02 09:37:10.651143
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-02-02 09:37:10.75246
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-02-02 09:37:11.537041
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-02-02 09:37:11.656006
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-02-02 09:37:11.780095
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-02-02 09:37:11.95813
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-02-02 09:37:12.145386
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-02-02 09:37:12.337409
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-02-02 09:37:12.712736
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-02-02 09:37:13.935875
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-02-02 09:37:15.097592
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-02-02 09:37:15.328266
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-02-02 09:37:15.511662
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2026-02-02 09:37:15.654822
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2026-02-02 09:37:16.279076
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2026-02-02 09:37:17.204097
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2026-02-02 09:37:17.394017
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2026-02-02 09:37:17.583795
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2026-02-02 09:37:18.362328
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2026-02-02 09:37:19.169725
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2026-02-02 09:37:20.334852
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2026-02-02 09:37:20.565777
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2026-02-02 09:37:20.722248
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2026-02-02 09:37:20.967192
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-02-02 09:37:21.354758
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2026-02-02 09:37:21.562649
39	add-search-v2-sort-support	39cf7d1e6bf515f4b02e41237aba845a7b492853	2026-02-02 09:37:23.455859
40	fix-prefix-race-conditions-optimized	fd02297e1c67df25a9fc110bf8c8a9af7fb06d1f	2026-02-02 09:37:23.694242
41	add-object-level-update-trigger	44c22478bf01744b2129efc480cd2edc9a7d60e9	2026-02-02 09:37:24.144181
42	rollback-prefix-triggers	f2ab4f526ab7f979541082992593938c05ee4b47	2026-02-02 09:37:24.339995
43	fix-object-level	ab837ad8f1c7d00cc0b7310e989a23388ff29fc6	2026-02-02 09:37:24.682346
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-02-02 09:37:25.078282
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-02-02 09:37:25.285584
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
7d29e1c8-6f0b-4f83-b586-b7336fdcd753	versions	1/1770357849798_art pixel GIF.gif	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 06:04:09.935187+00	2026-02-06 06:04:09.935187+00	2026-02-06 06:04:09.935187+00	{"eTag": "\\"ef591a04ddab960c75c5854d93c52506\\"", "size": 252357, "mimetype": "image/gif", "cacheControl": "max-age=3600", "lastModified": "2026-02-06T06:04:09.915Z", "contentLength": 252357, "httpStatusCode": 200}	4737e2d1-e207-458a-9047-e63a2e656bea	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
68f0c579-57da-4823-8abd-1be85dac1937	versions	1/1770358010469_pixel art GIF.gif	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 06:06:50.526645+00	2026-02-06 06:06:50.526645+00	2026-02-06 06:06:50.526645+00	{"eTag": "\\"4a21f4a8fb33db4fb4ca48df2a7fe333\\"", "size": 137235, "mimetype": "image/gif", "cacheControl": "max-age=3600", "lastModified": "2026-02-06T06:06:50.519Z", "contentLength": 137235, "httpStatusCode": 200}	7fe988e7-0ee0-4c2e-bc84-1f3885dc14d9	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
7b27bf5d-c0a6-4d87-a796-5bb8fc8bd793	versions	1/1770358795493_pixel art GIF.gif	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 06:19:55.564357+00	2026-02-06 06:19:55.564357+00	2026-02-06 06:19:55.564357+00	{"eTag": "\\"4a21f4a8fb33db4fb4ca48df2a7fe333\\"", "size": 137235, "mimetype": "image/gif", "cacheControl": "max-age=3600", "lastModified": "2026-02-06T06:19:55.558Z", "contentLength": 137235, "httpStatusCode": 200}	0608c7c4-eaa5-4b79-8b12-2a66e67899cb	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
61ef7151-cb66-44e0-bc2c-e42875e86892	note-attachments	10/1770360373768_Pixel Art GIF.gif	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-06 06:46:13.860239+00	2026-02-06 06:46:13.860239+00	2026-02-06 06:46:13.860239+00	{"eTag": "\\"105298656e3e5897474f7a589c9c05ee\\"", "size": 361422, "mimetype": "image/gif", "cacheControl": "max-age=3600", "lastModified": "2026-02-06T06:46:13.852Z", "contentLength": 361422, "httpStatusCode": 200}	778f4cde-b3c8-4ba0-891c-9c9467c2c6d8	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
b0c1892e-69e9-4f56-b62c-56529a2b35e6	note-attachments	13/1770706917495_asset_activity.png	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 07:01:57.555967+00	2026-02-10 07:01:57.555967+00	2026-02-10 07:01:57.555967+00	{"eTag": "\\"ccdb9f11719f32aac92cc92f23625c36\\"", "size": 70724, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-02-10T07:01:57.550Z", "contentLength": 70724, "httpStatusCode": 200}	3f483646-6671-411c-b937-eda2e8ee9580	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
dbe8e1fa-1376-449f-8abc-d27efd19a1fc	versions	1/1770706955870_asset.png	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 07:02:35.957412+00	2026-02-10 07:02:35.957412+00	2026-02-10 07:02:35.957412+00	{"eTag": "\\"0fd2c156aac79fe6637d8c63bcc94e5e\\"", "size": 76959, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-02-10T07:02:35.953Z", "contentLength": 76959, "httpStatusCode": 200}	0cc95673-e658-451c-8aba-be4764e656a4	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
62e577a9-8c11-4228-9bbd-35f2e92a3db2	versions	1/1770707309118_asset.png	eb0bdb87-6685-4dc3-a0d0-e16765c68242	2026-02-10 07:08:29.167572+00	2026-02-10 07:08:29.167572+00	2026-02-10 07:08:29.167572+00	{"eTag": "\\"0fd2c156aac79fe6637d8c63bcc94e5e\\"", "size": 76959, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-02-10T07:08:29.163Z", "contentLength": 76959, "httpStatusCode": 200}	b4e7c79b-e1b2-4a0c-930e-9728b981ec13	eb0bdb87-6685-4dc3-a0d0-e16765c68242	{}	2
\.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
versions	1	2026-02-06 06:04:09.935187+00	2026-02-06 06:04:09.935187+00
note-attachments	10	2026-02-06 06:46:13.860239+00	2026-02-06 06:46:13.860239+00
note-attachments	13	2026-02-10 07:01:57.555967+00	2026-02-10 07:01:57.555967+00
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: -
--

COPY supabase_functions.hooks (id, hook_table_id, hook_name, created_at, request_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: supabase_functions; Owner: -
--

COPY supabase_functions.migrations (version, inserted_at) FROM stdin;
initial	2026-02-02 09:35:57.656182+00
20210809183423_update_grants	2026-02-02 09:35:57.656182+00
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 144, true);


--
-- Name: activity_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_events_id_seq', 10, true);


--
-- Name: assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assets_id_seq', 6, true);


--
-- Name: attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attachments_id_seq', 2, true);


--
-- Name: conversation_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversation_members_id_seq', 3, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 2, true);


--
-- Name: deliveries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.deliveries_id_seq', 1, false);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 25, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.groups_id_seq', 5, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 7, true);


--
-- Name: milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.milestones_id_seq', 1, false);


--
-- Name: notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notes_id_seq', 14, true);


--
-- Name: phases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.phases_id_seq', 1, false);


--
-- Name: playlist_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.playlist_shares_id_seq', 1, false);


--
-- Name: playlists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.playlists_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 7, true);


--
-- Name: published_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_files_id_seq', 1, true);


--
-- Name: sequences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sequences_id_seq', 5, true);


--
-- Name: shots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shots_id_seq', 4, true);


--
-- Name: statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.statuses_id_seq', 77, true);


--
-- Name: steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.steps_id_seq', 28, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 4, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tickets_id_seq', 1, false);


--
-- Name: time_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.time_logs_id_seq', 1, false);


--
-- Name: versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.versions_id_seq', 5, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 66, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: -
--

SELECT pg_catalog.setval('supabase_functions.hooks_id_seq', 1, false);


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);


--
-- Name: allowed_users allowed_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_pkey PRIMARY KEY (email);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: assets assets_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_project_id_code_key UNIQUE (project_id, code);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: conversation_members conversation_members_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_members conversation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_project_id_code_key UNIQUE (project_id, code);


--
-- Name: delivery_items delivery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_pkey PRIMARY KEY (delivery_id, entity_type, entity_id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: groups groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_key UNIQUE (code);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_code_key UNIQUE (project_id, code);


--
-- Name: note_mentions note_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_pkey PRIMARY KEY (note_id, user_id);


--
-- Name: notes notes_entity_type_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.notes
    ADD CONSTRAINT notes_entity_type_check CHECK ((entity_type = ANY (ARRAY['task'::text, 'asset'::text, 'shot'::text, 'sequence'::text, 'version'::text, 'project'::text, 'published_file'::text]))) NOT VALID;


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: phases phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases
    ADD CONSTRAINT phases_pkey PRIMARY KEY (id);


--
-- Name: phases phases_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases
    ADD CONSTRAINT phases_project_id_code_key UNIQUE (project_id, code);


--
-- Name: playlist_items playlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_items
    ADD CONSTRAINT playlist_items_pkey PRIMARY KEY (playlist_id, version_id);


--
-- Name: playlist_shares playlist_shares_access_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_shares
    ADD CONSTRAINT playlist_shares_access_key_key UNIQUE (access_key);


--
-- Name: playlist_shares playlist_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_shares
    ADD CONSTRAINT playlist_shares_pkey PRIMARY KEY (id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: playlists playlists_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_project_id_code_key UNIQUE (project_id, code);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: published_file_dependencies published_file_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_file_dependencies
    ADD CONSTRAINT published_file_dependencies_pkey PRIMARY KEY (published_file_id, depends_on_published_file_id);


--
-- Name: published_files published_files_entity_type_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.published_files
    ADD CONSTRAINT published_files_entity_type_check CHECK ((entity_type = ANY (ARRAY['asset'::text, 'shot'::text, 'sequence'::text, 'task'::text, 'version'::text, 'note'::text, 'project'::text]))) NOT VALID;


--
-- Name: published_files published_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files
    ADD CONSTRAINT published_files_pkey PRIMARY KEY (id);


--
-- Name: sequences sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_pkey PRIMARY KEY (id);


--
-- Name: sequences sequences_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_project_id_code_key UNIQUE (project_id, code);


--
-- Name: shots shots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots
    ADD CONSTRAINT shots_pkey PRIMARY KEY (id);


--
-- Name: shots shots_project_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots
    ADD CONSTRAINT shots_project_id_code_key UNIQUE (project_id, code);


--
-- Name: statuses statuses_code_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_code_entity_type_key UNIQUE (code, entity_type);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: steps steps_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_code_key UNIQUE (code);


--
-- Name: steps steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (task_id, user_id);


--
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (task_id, depends_on_task_id);


--
-- Name: tasks tasks_entity_type_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_entity_type_check CHECK ((entity_type = ANY (ARRAY['asset'::text, 'shot'::text, 'sequence'::text, 'project'::text]))) NOT VALID;


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: time_logs time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_pkey PRIMARY KEY (id);


--
-- Name: versions versions_entity_type_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.versions
    ADD CONSTRAINT versions_entity_type_check CHECK ((entity_type = ANY (ARRAY['asset'::text, 'shot'::text, 'sequence'::text]))) NOT VALID;


--
-- Name: versions versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_pkey PRIMARY KEY (id);


--
-- Name: versions versions_project_id_entity_type_entity_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_project_id_entity_type_entity_id_version_number_key UNIQUE (project_id, entity_type, entity_id, version_number);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_08 messages_2026_02_08_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_08
    ADD CONSTRAINT messages_2026_02_08_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_09 messages_2026_02_09_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_09
    ADD CONSTRAINT messages_2026_02_09_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_10 messages_2026_02_10_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_10
    ADD CONSTRAINT messages_2026_02_10_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_11 messages_2026_02_11_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_11
    ADD CONSTRAINT messages_2026_02_11_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_12 messages_2026_02_12_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_12
    ADD CONSTRAINT messages_2026_02_12_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_13 messages_2026_02_13_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_13
    ADD CONSTRAINT messages_2026_02_13_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: iceberg_namespaces iceberg_namespaces_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id);


--
-- Name: iceberg_tables iceberg_tables_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: extensions_tenant_external_id_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id);


--
-- Name: extensions_tenant_external_id_type_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type);


--
-- Name: tenants_external_id_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_activity_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_entity ON public.activity_events USING btree (entity_type, entity_id);


--
-- Name: idx_activity_project_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_project_time ON public.activity_events USING btree (project_id, created_at DESC);


--
-- Name: idx_assets_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_project ON public.assets USING btree (project_id);


--
-- Name: idx_assets_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_sequence ON public.assets USING btree (sequence_id);


--
-- Name: idx_assets_shot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_shot ON public.assets USING btree (shot_id);


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_status ON public.assets USING btree (status);


--
-- Name: idx_assets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_type ON public.assets USING btree (asset_type);


--
-- Name: idx_conversation_members_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_members_conversation_id ON public.conversation_members USING btree (conversation_id);


--
-- Name: idx_conversation_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_members_user_id ON public.conversation_members USING btree (user_id);


--
-- Name: idx_conversations_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_project_id ON public.conversations USING btree (project_id);


--
-- Name: idx_conversations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_type ON public.conversations USING btree (type);


--
-- Name: idx_deliveries_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_project ON public.deliveries USING btree (project_id);


--
-- Name: idx_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_status ON public.deliveries USING btree (status);


--
-- Name: idx_messages_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_author_id ON public.messages USING btree (author_id);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (conversation_id, created_at);


--
-- Name: idx_milestones_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_phase ON public.milestones USING btree (phase_id);


--
-- Name: idx_milestones_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_project ON public.milestones USING btree (project_id);


--
-- Name: idx_note_mentions_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_mentions_unread ON public.note_mentions USING btree (user_id, read_at) WHERE (read_at IS NULL);


--
-- Name: idx_note_mentions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_mentions_user ON public.note_mentions USING btree (user_id);


--
-- Name: idx_notes_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_author ON public.notes USING btree (author_id);


--
-- Name: idx_notes_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_created ON public.notes USING btree (created_at DESC);


--
-- Name: idx_notes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_created_by ON public.notes USING btree (created_by);


--
-- Name: idx_notes_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_entity ON public.notes USING btree (entity_type, entity_id);


--
-- Name: idx_notes_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_project ON public.notes USING btree (project_id);


--
-- Name: idx_notes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_status ON public.notes USING btree (status);


--
-- Name: idx_notes_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_task_id ON public.notes USING btree (task_id);


--
-- Name: idx_phases_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phases_project ON public.phases USING btree (project_id);


--
-- Name: idx_profiles_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_department ON public.profiles USING btree (department_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_project_members_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_role ON public.project_members USING btree (role);


--
-- Name: idx_project_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_user_id ON public.project_members USING btree (user_id);


--
-- Name: idx_projects_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_archived ON public.projects USING btree (archived);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_published_files_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_published_files_entity ON public.published_files USING btree (entity_type, entity_id);


--
-- Name: idx_published_files_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_published_files_project ON public.published_files USING btree (project_id);


--
-- Name: idx_published_files_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_published_files_task ON public.published_files USING btree (task_id);


--
-- Name: idx_published_files_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_published_files_version ON public.published_files USING btree (version_id);


--
-- Name: idx_shots_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shots_project ON public.shots USING btree (project_id);


--
-- Name: idx_shots_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shots_sequence ON public.shots USING btree (sequence_id);


--
-- Name: idx_shots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shots_status ON public.shots USING btree (status);


--
-- Name: idx_task_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_assignments_user ON public.task_assignments USING btree (user_id);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_entity ON public.tasks USING btree (entity_type, entity_id);


--
-- Name: idx_tasks_milestone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_milestone ON public.tasks USING btree (milestone_id);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_tasks_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_step ON public.tasks USING btree (step_id);


--
-- Name: idx_tickets_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assigned ON public.tickets USING btree (assigned_to);


--
-- Name: idx_tickets_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_project ON public.tickets USING btree (project_id);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_time_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_date ON public.time_logs USING btree (date);


--
-- Name: idx_time_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_entity ON public.time_logs USING btree (entity_type, entity_id);


--
-- Name: idx_time_logs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_project ON public.time_logs USING btree (project_id);


--
-- Name: idx_time_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_user ON public.time_logs USING btree (user_id);


--
-- Name: idx_versions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versions_created_by ON public.versions USING btree (created_by);


--
-- Name: idx_versions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versions_entity ON public.versions USING btree (entity_type, entity_id);


--
-- Name: idx_versions_file_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versions_file_path ON public.versions USING btree (file_path);


--
-- Name: idx_versions_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versions_project ON public.versions USING btree (project_id);


--
-- Name: idx_versions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versions_status ON public.versions USING btree (status);


--
-- Name: idx_versions_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versions_task ON public.versions USING btree (task_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_08_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_08_inserted_at_topic_idx ON realtime.messages_2026_02_08 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_09_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_09_inserted_at_topic_idx ON realtime.messages_2026_02_09 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_10_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_10_inserted_at_topic_idx ON realtime.messages_2026_02_10 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_11_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_11_inserted_at_topic_idx ON realtime.messages_2026_02_11 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_12_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_12_inserted_at_topic_idx ON realtime.messages_2026_02_12 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_13_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_13_inserted_at_topic_idx ON realtime.messages_2026_02_13 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_iceberg_namespaces_bucket_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (bucket_id, name);


--
-- Name: idx_iceberg_tables_namespace_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (namespace_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: -
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: -
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: messages_2026_02_08_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_08_inserted_at_topic_idx;


--
-- Name: messages_2026_02_08_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_08_pkey;


--
-- Name: messages_2026_02_09_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_09_inserted_at_topic_idx;


--
-- Name: messages_2026_02_09_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_09_pkey;


--
-- Name: messages_2026_02_10_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_10_inserted_at_topic_idx;


--
-- Name: messages_2026_02_10_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_10_pkey;


--
-- Name: messages_2026_02_11_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_11_inserted_at_topic_idx;


--
-- Name: messages_2026_02_11_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_11_pkey;


--
-- Name: messages_2026_02_12_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_12_inserted_at_topic_idx;


--
-- Name: messages_2026_02_12_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_12_pkey;


--
-- Name: messages_2026_02_13_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_13_inserted_at_topic_idx;


--
-- Name: messages_2026_02_13_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_13_pkey;


--
-- Name: conversations conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.echo_handle_updated_at();


--
-- Name: messages messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.echo_handle_updated_at();


--
-- Name: notes note_activity_logger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER note_activity_logger AFTER INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.log_note_created();


--
-- Name: published_files published_file_activity_logger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER published_file_activity_logger AFTER INSERT ON public.published_files FOR EACH ROW EXECUTE FUNCTION public.log_published_file_created();


--
-- Name: tasks task_activity_logger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_activity_logger AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_task_status_change();


--
-- Name: assets update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: deliveries update_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: playlists update_playlists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: published_files update_published_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_published_files_updated_at BEFORE UPDATE ON public.published_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: sequences update_sequences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON public.sequences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: shots update_shots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shots_updated_at BEFORE UPDATE ON public.shots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: time_logs update_time_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_time_logs_updated_at BEFORE UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: versions update_versions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_versions_updated_at BEFORE UPDATE ON public.versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: versions version_activity_logger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER version_activity_logger AFTER INSERT ON public.versions FOR EACH ROW EXECUTE FUNCTION public.log_version_created();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: extensions extensions_tenant_external_id_fkey; Type: FK CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_tenant_external_id_fkey FOREIGN KEY (tenant_external_id) REFERENCES _realtime.tenants(external_id) ON DELETE CASCADE;


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: activity_events activity_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: activity_events activity_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: assets assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: assets assets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: assets assets_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.sequences(id) ON DELETE SET NULL;


--
-- Name: assets assets_shot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_shot_id_fkey FOREIGN KEY (shot_id) REFERENCES public.shots(id) ON DELETE SET NULL;


--
-- Name: assets assets_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: attachments attachments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: attachments attachments_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: conversations conversations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: deliveries deliveries_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: delivery_items delivery_items_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.phases(id) ON DELETE SET NULL;


--
-- Name: milestones milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: note_mentions note_mentions_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: note_mentions note_mentions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notes notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notes notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notes notes_parent_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_parent_note_id_fkey FOREIGN KEY (parent_note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: notes notes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notes notes_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: notes notes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: phases phases_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phases
    ADD CONSTRAINT phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: playlist_items playlist_items_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_items
    ADD CONSTRAINT playlist_items_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlist_items playlist_items_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_items
    ADD CONSTRAINT playlist_items_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.versions(id) ON DELETE CASCADE;


--
-- Name: playlist_shares playlist_shares_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_shares
    ADD CONSTRAINT playlist_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: playlist_shares playlist_shares_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_shares
    ADD CONSTRAINT playlist_shares_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlists playlists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: playlists playlists_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: published_file_dependencies published_file_dependencies_depends_on_published_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_file_dependencies
    ADD CONSTRAINT published_file_dependencies_depends_on_published_file_id_fkey FOREIGN KEY (depends_on_published_file_id) REFERENCES public.published_files(id) ON DELETE CASCADE;


--
-- Name: published_file_dependencies published_file_dependencies_published_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_file_dependencies
    ADD CONSTRAINT published_file_dependencies_published_file_id_fkey FOREIGN KEY (published_file_id) REFERENCES public.published_files(id) ON DELETE CASCADE;


--
-- Name: published_files published_files_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files
    ADD CONSTRAINT published_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: published_files published_files_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files
    ADD CONSTRAINT published_files_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id);


--
-- Name: published_files published_files_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files
    ADD CONSTRAINT published_files_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: published_files published_files_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files
    ADD CONSTRAINT published_files_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: published_files published_files_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files
    ADD CONSTRAINT published_files_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.versions(id) ON DELETE SET NULL;


--
-- Name: sequences sequences_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: sequences sequences_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sequences sequences_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: shots shots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots
    ADD CONSTRAINT shots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: shots shots_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots
    ADD CONSTRAINT shots_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: shots shots_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots
    ADD CONSTRAINT shots_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.sequences(id) ON DELETE SET NULL;


--
-- Name: shots shots_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shots
    ADD CONSTRAINT shots_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: steps steps_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_depends_on_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: tasks tasks_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.steps(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: tickets tickets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: tickets tickets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: versions versions_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.profiles(id);


--
-- Name: versions versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: versions versions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: versions versions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: versions versions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: iceberg_namespaces iceberg_namespaces_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_namespace_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES storage.iceberg_namespaces(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: departments All authenticated users can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: groups All authenticated users can view groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view groups" ON public.groups FOR SELECT TO authenticated USING (true);


--
-- Name: statuses All authenticated users can view statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view statuses" ON public.statuses FOR SELECT TO authenticated USING (true);


--
-- Name: steps All authenticated users can view steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view steps" ON public.steps FOR SELECT TO authenticated USING (true);


--
-- Name: assets Allow authenticated users to delete assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to delete assets" ON public.assets FOR DELETE TO authenticated USING (true);


--
-- Name: sequences Allow authenticated users to delete sequences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to delete sequences" ON public.sequences FOR DELETE TO authenticated USING (true);


--
-- Name: shots Allow authenticated users to delete shots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to delete shots" ON public.shots FOR DELETE TO authenticated USING (true);


--
-- Name: assets Allow authenticated users to insert assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: projects Allow authenticated users to insert projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: sequences Allow authenticated users to insert sequences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert sequences" ON public.sequences FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: shots Allow authenticated users to insert shots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert shots" ON public.shots FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: tasks Allow authenticated users to insert tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: assets Allow authenticated users to update assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update assets" ON public.assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: sequences Allow authenticated users to update sequences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update sequences" ON public.sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: shots Allow authenticated users to update shots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update shots" ON public.shots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: assets Allow authenticated users to view assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view assets" ON public.assets FOR SELECT TO authenticated USING (true);


--
-- Name: project_members Allow authenticated users to view project members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view project members" ON public.project_members FOR SELECT TO authenticated USING (true);


--
-- Name: projects Allow authenticated users to view projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view projects" ON public.projects FOR SELECT TO authenticated USING (true);


--
-- Name: sequences Allow authenticated users to view sequences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view sequences" ON public.sequences FOR SELECT TO authenticated USING (true);


--
-- Name: shots Allow authenticated users to view shots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view shots" ON public.shots FOR SELECT TO authenticated USING (true);


--
-- Name: tasks Allow authenticated users to view tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);


--
-- Name: projects Allow users to delete their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to delete their projects" ON public.projects FOR DELETE TO authenticated USING (true);


--
-- Name: projects Allow users to update their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update their projects" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: projects Alphas and leads can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alphas and leads can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['alpha'::text, 'beta'::text]))))));


--
-- Name: conversations Authenticated users can create conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: conversation_members Conversation creators can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation creators can add members" ON public.conversation_members FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = conversation_members.conversation_id) AND (conversations.created_by = auth.uid())))) OR (user_id = auth.uid())));


--
-- Name: projects Leads and alphas can update their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leads and alphas can update their projects" ON public.projects FOR UPDATE TO authenticated USING (((id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE ((project_members.user_id = auth.uid()) AND (project_members.role = ANY (ARRAY['lead'::text, 'alpha'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'alpha'::text))))));


--
-- Name: project_members Leads can manage project members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leads can manage project members" ON public.project_members TO authenticated USING (((project_id IN ( SELECT project_members_1.project_id
   FROM public.project_members project_members_1
  WHERE ((project_members_1.user_id = auth.uid()) AND (project_members_1.role = ANY (ARRAY['lead'::text, 'alpha'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'alpha'::text))))));


--
-- Name: attachments Users can create attachments in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create attachments in their projects" ON public.attachments FOR INSERT TO authenticated WITH CHECK (((note_id IN ( SELECT n.id
   FROM public.notes n
  WHERE (n.project_id IN ( SELECT project_members.project_id
           FROM public.project_members
          WHERE (project_members.user_id = auth.uid()))))) AND (created_by = auth.uid())));


--
-- Name: notes Users can create notes in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create notes in their projects" ON public.notes FOR INSERT TO authenticated WITH CHECK (((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))) AND (created_by = auth.uid())));


--
-- Name: versions Users can create versions in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create versions in their projects" ON public.versions FOR INSERT TO authenticated WITH CHECK ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: attachments Users can delete their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own attachments" ON public.attachments FOR DELETE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: messages Users can delete their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING ((auth.uid() = author_id));


--
-- Name: notes Users can delete their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: versions Users can delete versions in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete versions in their projects" ON public.versions FOR DELETE TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: messages Users can edit their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can edit their own messages" ON public.messages FOR UPDATE USING ((auth.uid() = author_id)) WITH CHECK ((auth.uid() = author_id));


--
-- Name: messages Users can send messages to their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages to their conversations" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = author_id) AND public.is_conversation_member(conversation_id)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: attachments Users can update their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own attachments" ON public.attachments FOR UPDATE TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: notes Users can update their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: versions Users can update versions in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update versions in their projects" ON public.versions FOR UPDATE TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid())))) WITH CHECK ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: activity_events Users can view activity in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activity in their projects" ON public.activity_events FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: assets Users can view assets in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view assets in their projects" ON public.assets FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: attachments Users can view attachments in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view attachments in their projects" ON public.attachments FOR SELECT TO authenticated USING ((note_id IN ( SELECT n.id
   FROM public.notes n
  WHERE (n.project_id IN ( SELECT project_members.project_id
           FROM public.project_members
          WHERE (project_members.user_id = auth.uid()))))));


--
-- Name: conversation_members Users can view co-members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view co-members" ON public.conversation_members FOR SELECT USING (public.is_conversation_member(conversation_id));


--
-- Name: deliveries Users can view deliveries in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view deliveries in their projects" ON public.deliveries FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (public.is_conversation_member(conversation_id));


--
-- Name: milestones Users can view milestones in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view milestones in their projects" ON public.milestones FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: notes Users can view notes in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notes in their projects" ON public.notes FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: phases Users can view phases in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view phases in their projects" ON public.phases FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: playlists Users can view playlists in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view playlists in their projects" ON public.playlists FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: project_members Users can view project members of their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project members of their projects" ON public.project_members FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members_1.project_id
   FROM public.project_members project_members_1
  WHERE (project_members_1.user_id = auth.uid()))));


--
-- Name: published_files Users can view published files in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view published files in their projects" ON public.published_files FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: sequences Users can view sequences in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sequences in their projects" ON public.sequences FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: shots Users can view shots in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shots in their projects" ON public.shots FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: tasks Users can view tasks in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks in their projects" ON public.tasks FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: conversations Users can view their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (public.is_conversation_member(id));


--
-- Name: conversation_members Users can view their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memberships" ON public.conversation_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: tickets Users can view tickets in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tickets in their projects" ON public.tickets FOR SELECT TO authenticated USING (((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))) OR (project_id IS NULL)));


--
-- Name: time_logs Users can view time logs in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view time logs in their projects" ON public.time_logs FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: versions Users can view versions in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view versions in their projects" ON public.versions FOR SELECT TO authenticated USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));


--
-- Name: activity_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

--
-- Name: allowed_users allow read own allowlist record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow read own allowlist record" ON public.allowed_users FOR SELECT TO authenticated USING (((email = (auth.jwt() ->> 'email'::text)) AND active));


--
-- Name: allowed_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: note_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: phases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

--
-- Name: playlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: playlist_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlist_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: playlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: published_file_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.published_file_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: published_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.published_files ENABLE ROW LEVEL SECURITY;

--
-- Name: sequences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

--
-- Name: shots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

--
-- Name: statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

--
-- Name: task_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: time_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Users can delete files; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can delete files" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'versions'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can delete note attachments; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can delete note attachments" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'note-attachments'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can update files; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can update files" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'versions'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can update note attachments; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can update note attachments" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'note-attachments'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can upload files; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'versions'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can upload note attachments; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can upload note attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'note-attachments'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can view files in their projects; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can view files in their projects" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'versions'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Users can view note attachments in their projects; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can view note attachments in their projects" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'note-attachments'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_namespaces; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.iceberg_namespaces ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_tables; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.iceberg_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime messages; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.messages;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

