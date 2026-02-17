'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * All notification creators are fire-and-forget.
 * They never throw or block the calling server action.
 */

export async function notifyTaskAssigned(
  taskId: number | string,
  assignedUserId: string,
  actorId: string,
  projectId: number | string,
  taskName: string
) {
  try {
    if (assignedUserId === actorId) return // Don't notify yourself
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      user_id: assignedUserId,
      project_id: Number(projectId),
      type: 'task_assigned',
      title: `You were assigned to task "${taskName}"`,
      entity_type: 'task',
      entity_id: Number(taskId),
      actor_id: actorId,
      metadata: { task_name: taskName },
    })
  } catch {
    // Fire-and-forget
  }
}

export async function notifyMention(
  noteId: number | string,
  mentionedUserId: string,
  actorId: string,
  projectId: number | string,
  notePreview: string
) {
  try {
    if (mentionedUserId === actorId) return
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      user_id: mentionedUserId,
      project_id: Number(projectId),
      type: 'mention',
      title: `You were mentioned in a note`,
      body: notePreview.slice(0, 200),
      entity_type: 'note',
      entity_id: Number(noteId),
      actor_id: actorId,
      metadata: { note_preview: notePreview.slice(0, 200) },
    })
  } catch {
    // Fire-and-forget
  }
}

export async function notifyNoteReply(
  parentNoteId: number | string,
  replyNoteId: number | string,
  replyAuthorId: string,
  projectId: number | string,
  notePreview: string
) {
  try {
    const supabase = await createClient()
    // Get the parent note's author
    const { data: parentNote } = await supabase
      .from('notes')
      .select('author_id')
      .eq('id', parentNoteId)
      .maybeSingle()

    if (!parentNote?.author_id) return
    if (parentNote.author_id === replyAuthorId) return // Don't notify yourself

    await supabase.from('notifications').insert({
      user_id: parentNote.author_id,
      project_id: Number(projectId),
      type: 'note_reply',
      title: `Someone replied to your note`,
      body: notePreview.slice(0, 200),
      entity_type: 'note',
      entity_id: Number(replyNoteId),
      actor_id: replyAuthorId,
      metadata: { parent_note_id: Number(parentNoteId), note_preview: notePreview.slice(0, 200) },
    })
  } catch {
    // Fire-and-forget
  }
}

export async function notifyStatusChanged(
  entityType: string,
  entityId: number | string,
  projectId: number | string,
  actorId: string,
  oldStatus: string,
  newStatus: string
) {
  try {
    const supabase = await createClient()
    // Find all users assigned to this task (or tasks on this entity)
    let assignees: string[] = []

    if (entityType === 'task') {
      const { data } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', Number(entityId))
      assignees = (data || []).map((r) => r.user_id)
    }

    // Also check the assigned_to field on the task
    if (entityType === 'task') {
      const { data: task } = await supabase
        .from('tasks')
        .select('assigned_to, name')
        .eq('id', Number(entityId))
        .maybeSingle()
      if (task?.assigned_to && !assignees.includes(task.assigned_to)) {
        assignees.push(task.assigned_to)
      }
      const taskName = task?.name || entityId

      const rows = assignees
        .filter((uid) => uid !== actorId)
        .map((uid) => ({
          user_id: uid,
          project_id: Number(projectId),
          type: 'status_changed' as const,
          title: `Task "${taskName}" status changed from "${oldStatus}" to "${newStatus}"`,
          entity_type: entityType,
          entity_id: Number(entityId),
          actor_id: actorId,
          metadata: { old_status: oldStatus, new_status: newStatus, task_name: taskName },
        }))

      if (rows.length > 0) {
        await supabase.from('notifications').insert(rows)
      }
    }
  } catch {
    // Fire-and-forget
  }
}

export async function notifyVersionUploaded(
  versionId: number | string,
  taskId: number | string | null,
  projectId: number | string,
  actorId: string,
  versionName: string
) {
  try {
    if (!taskId) return
    const supabase = await createClient()

    // Find assignees for this task
    const assignees: string[] = []
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', Number(taskId))
    if (assignments) {
      assignees.push(...assignments.map((r) => r.user_id))
    }
    const { data: task } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', Number(taskId))
      .maybeSingle()
    if (task?.assigned_to && !assignees.includes(task.assigned_to)) {
      assignees.push(task.assigned_to)
    }

    const rows = assignees
      .filter((uid) => uid !== actorId)
      .map((uid) => ({
        user_id: uid,
        project_id: Number(projectId),
        type: 'version_uploaded' as const,
        title: `New version "${versionName}" uploaded`,
        entity_type: 'version',
        entity_id: Number(versionId),
        actor_id: actorId,
        metadata: { version_name: versionName, task_id: Number(taskId) },
      }))

    if (rows.length > 0) {
      await supabase.from('notifications').insert(rows)
    }
  } catch {
    // Fire-and-forget
  }
}
