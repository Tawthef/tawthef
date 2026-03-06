-- =====================================================
-- RECRUITER <-> CANDIDATE MESSAGING SYSTEM
-- =====================================================
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_messages_non_empty CHECK (LENGTH(BTRIM(message)) > 0),
  CONSTRAINT chk_messages_no_self_message CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at
  ON public.messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_unread
  ON public.messages(receiver_id, sender_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
  ON public.messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_created_at
  ON public.messages(receiver_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own conversations" ON public.messages;
CREATE POLICY "Users read own conversations"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users send own messages" ON public.messages;
CREATE POLICY "Users send own messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receivers mark own messages as read" ON public.messages;
CREATE POLICY "Receivers mark own messages as read"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT UPDATE (is_read) ON public.messages TO authenticated;

DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.send_message(
  p_receiver_id UUID,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_role TEXT;
  v_receiver_role TEXT;
  v_sender_name TEXT;
  v_message_id UUID;
BEGIN
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF p_receiver_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_RECEIVER: Receiver is required';
  END IF;

  IF p_receiver_id = v_sender_id THEN
    RAISE EXCEPTION 'INVALID_RECEIVER: Cannot message yourself';
  END IF;

  IF COALESCE(BTRIM(p_message), '') = '' THEN
    RAISE EXCEPTION 'INVALID_MESSAGE: Message cannot be empty';
  END IF;

  SELECT p.role, p.full_name
    INTO v_sender_role, v_sender_name
  FROM public.profiles p
  WHERE p.id = v_sender_id;

  SELECT p.role
    INTO v_receiver_role
  FROM public.profiles p
  WHERE p.id = p_receiver_id;

  IF v_sender_role IS NULL OR v_receiver_role IS NULL THEN
    RAISE EXCEPTION 'INVALID_USERS: Sender or receiver profile not found';
  END IF;

  IF NOT (
    (v_sender_role IN ('employer', 'agency', 'admin') AND v_receiver_role = 'candidate')
    OR
    (v_sender_role = 'candidate' AND v_receiver_role IN ('employer', 'agency', 'admin'))
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Messaging is only allowed between recruiters and candidates';
  END IF;

  INSERT INTO public.messages (sender_id, receiver_id, message)
  VALUES (v_sender_id, p_receiver_id, BTRIM(p_message))
  RETURNING id INTO v_message_id;

  PERFORM public.create_notification(
    p_receiver_id,
    'New Message',
    FORMAT('%s sent you a new message.', COALESCE(NULLIF(v_sender_name, ''), 'Someone')),
    'messages'
  );

  RETURN v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_message(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_message(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  EXCEPTION
    WHEN undefined_object THEN
      NULL;
  END;
END $$;
