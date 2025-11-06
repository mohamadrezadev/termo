/*
  # Create Templates Table

  1. New Tables
    - `templates`
      - `id` (uuid, primary key) - Unique identifier for each template
      - `name` (text) - Name of the template (e.g., "Industrial Inspection", "Building Survey")
      - `description` (text, nullable) - Optional description of the template
      - `user_id` (uuid, nullable) - User who created the template (for future auth integration)
      - `is_public` (boolean) - Whether template is shared publicly or private
      - `template_data` (jsonb) - Complete template configuration including:
        - globalParameters (emissivity, ambientTemp, reflectedTemp, humidity, distance)
        - displaySettings (currentPalette, customMinTemp, customMaxTemp, zoom)
        - windowLayout (window positions and sizes)
      - `created_at` (timestamptz) - When template was created
      - `updated_at` (timestamptz) - When template was last updated
      - `usage_count` (integer) - Track how many times template has been used

  2. Security
    - Enable RLS on `templates` table
    - Add policy for anyone to read public templates
    - Add policy for users to read their own templates (future auth)
    - Add policy for users to create/update/delete their own templates (future auth)

  3. Indexes
    - Index on user_id for fast filtering
    - Index on is_public for fast public template queries
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  user_id uuid,
  is_public boolean DEFAULT false,
  template_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 0,
  CONSTRAINT name_not_empty CHECK (char_length(name) > 0)
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public templates are viewable by everyone"
  ON templates
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own templates"
  ON templates
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON templates
  FOR DELETE
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates(usage_count DESC);