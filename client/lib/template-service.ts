import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ThermalMetadata } from './thermal-utils';
import { WindowState } from './store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface TemplateData {
  globalParameters: ThermalMetadata;
  displaySettings: {
    currentPalette: string;
    customMinTemp: number | null;
    customMaxTemp: number | null;
    thermalView: {
      zoom: number;
      panX: number;
      panY: number;
    };
    realView: {
      zoom: number;
      panX: number;
      panY: number;
    };
    showGrid: boolean;
    showMarkers: boolean;
    showRegions: boolean;
    showTemperatureScale: boolean;
  };
  windowLayout: {
    windows: WindowState[];
    gridCols: number;
    gridRows: number;
  };
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  user_id: string | null;
  is_public: boolean;
  template_data: TemplateData;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export async function saveTemplate(
  name: string,
  description: string,
  templateData: TemplateData,
  isPublic: boolean = false
): Promise<{ success: boolean; template?: Template; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Please provide API credentials.' };
  }
  
  try {
    const { data, error } = await supabase
      .from('templates')
      .insert({
        name,
        description: description || null,
        is_public: isPublic,
        template_data: templateData,
        user_id: null
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error saving template:', error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data as Template };
  } catch (error) {
    console.error('Error saving template:', error);
    return { success: false, error: String(error) };
  }
}

export async function loadTemplates(
  includePublic: boolean = true
): Promise<{ success: boolean; templates?: Template[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Please provide API credentials.' };
  }
  
  try {
    let query = supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includePublic) {
      query = query.eq('is_public', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading templates:', error);
      return { success: false, error: error.message };
    }

    return { success: true, templates: data as Template[] };
  } catch (error) {
    console.error('Error loading templates:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Please provide API credentials.' };
  }
  
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<Template, 'id' | 'created_at' | 'user_id'>>
): Promise<{ success: boolean; template?: Template; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Please provide API credentials.' };
  }
  
  try {
    const { data, error } = await supabase
      .from('templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating template:', error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data as Template };
  } catch (error) {
    console.error('Error updating template:', error);
    return { success: false, error: String(error) };
  }
}

export async function incrementUsageCount(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Please provide API credentials.' };
  }
  
  try {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId
    });

    if (error) {
      const { data: template } = await supabase
        .from('templates')
        .select('usage_count')
        .eq('id', templateId)
        .maybeSingle();

      if (template) {
        await supabase
          .from('templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error incrementing usage count:', error);
    return { success: false, error: String(error) };
  }
}
