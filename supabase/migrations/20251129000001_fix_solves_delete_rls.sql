-- Ensure users can delete their own solves
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own solves" ON solves;
  CREATE POLICY "Users can delete own solves"
  ON solves FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL; END $$;
