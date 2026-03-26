-- ============================================================
-- Notification Channels: WhatsApp (Exotel) + Email (Resend)
-- Triggers notifications on every task lifecycle stage
-- Uses pg_net to call the send-notification Edge Function
-- ============================================================

-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ===================== TASK STATUS CHANGE NOTIFICATIONS =====================
CREATE OR REPLACE FUNCTION notify_on_task_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the assignee
    INSERT INTO notifications (user_id, notification_type, title, message, task_id, org_id)
    VALUES (
      NEW.assigned_to,
      'status_change',
      NEW.task_name || ' — status updated',
      'Status changed from ' || REPLACE(OLD.status, '_', ' ') || ' to ' || REPLACE(NEW.status, '_', ' '),
      NEW.id,
      NEW.org_id
    );

    -- Notify the assigner (if different from assignee)
    IF NEW.assigned_by IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO notifications (user_id, notification_type, title, message, task_id, org_id)
      VALUES (
        NEW.assigned_by,
        'status_change',
        NEW.task_name || ' — status updated',
        COALESCE((SELECT full_name FROM profiles WHERE id = NEW.assigned_to), 'A team member')
          || ' changed status from ' || REPLACE(OLD.status, '_', ' ') || ' to ' || REPLACE(NEW.status, '_', ' '),
        NEW.id,
        NEW.org_id
      );
    END IF;
  END IF;

  -- Priority escalated to urgent or high
  IF OLD.priority IS DISTINCT FROM NEW.priority
     AND NEW.priority IN ('urgent', 'high')
     AND (OLD.priority IS NULL OR OLD.priority NOT IN ('urgent', 'high'))
  THEN
    INSERT INTO notifications (user_id, notification_type, title, message, task_id, org_id)
    VALUES (
      NEW.assigned_to,
      'priority_change',
      NEW.task_name || ' — priority escalated',
      'Priority changed from ' || COALESCE(OLD.priority, 'none') || ' to ' || NEW.priority || '. Immediate attention required.',
      NEW.id,
      NEW.org_id
    );
  END IF;

  -- Reassigned to a different user
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO notifications (user_id, notification_type, title, message, task_id, org_id)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'New task assigned: ' || NEW.task_name,
      'You have been assigned this ' || NEW.priority || ' priority task. Due: ' || TO_CHAR(NEW.due_date::timestamp, 'DD Mon YYYY'),
      NEW.id,
      NEW.org_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_task_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_update();


-- ===================== COMMENT NOTIFICATIONS =====================
CREATE OR REPLACE FUNCTION notify_on_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_task RECORD;
  v_commenter_name TEXT;
BEGIN
  -- Only for user comments, not system-generated
  IF NEW.comment_type = 'comment' THEN
    SELECT task_name, assigned_to, assigned_by, org_id
      INTO v_task
      FROM tasks WHERE id = NEW.task_id;

    SELECT full_name INTO v_commenter_name
      FROM profiles WHERE id = NEW.user_id;

    -- Notify assignee (if not the commenter)
    IF v_task.assigned_to IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO notifications (user_id, notification_type, title, message, task_id, org_id)
      VALUES (
        v_task.assigned_to,
        'comment',
        COALESCE(v_commenter_name, 'Someone') || ' commented on ' || v_task.task_name,
        LEFT(NEW.comment, 200),
        NEW.task_id,
        NEW.org_id
      );
    END IF;

    -- Notify assigner (if different from both commenter and assignee)
    IF v_task.assigned_by IS DISTINCT FROM NEW.user_id
       AND v_task.assigned_by IS DISTINCT FROM v_task.assigned_to
    THEN
      INSERT INTO notifications (user_id, notification_type, title, message, task_id, org_id)
      VALUES (
        v_task.assigned_by,
        'comment',
        COALESCE(v_commenter_name, 'Someone') || ' commented on ' || v_task.task_name,
        LEFT(NEW.comment, 200),
        NEW.task_id,
        NEW.org_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_new_comment
  AFTER INSERT ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_comment();


-- ===================== EXTERNAL NOTIFICATION DISPATCH =====================
-- Fires on every INSERT to notifications → calls Edge Function via pg_net
-- The Edge Function sends WhatsApp (Exotel) + Email (Resend)

CREATE OR REPLACE FUNCTION dispatch_external_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://seijjmcncrbekngurxxj.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaWpqbWNuY3JiZWtuZ3VyeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDAxODIsImV4cCI6MjA5MDAxNjE4Mn0.N9CPT713v2OUIiES5DIiL6WlDFh-tD3dGo1wZb0ecX4'
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id::text,
        'user_id', NEW.user_id::text,
        'notification_type', NEW.notification_type,
        'title', NEW.title,
        'message', NEW.message,
        'task_id', NEW.task_id::text
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dispatch_external_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION dispatch_external_notification();
