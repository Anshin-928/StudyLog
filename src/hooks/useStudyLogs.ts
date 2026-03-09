// src/hooks/useStudyLogs.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LogEntry } from '../lib/reportUtils';

interface UseStudyLogsReturn {
  allLogs: LogEntry[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useStudyLogs(): UseStudyLogsReturn {
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_logs')
        .select(`id, material_id, study_datetime, duration_minutes, materials ( title, image_url, categories ( name, color_code ) )`)
        .eq('user_id', user.id)
        .order('study_datetime', { ascending: true });
      if (error) throw error;

      setAllLogs((data ?? []).map((row: any) => ({
        id: row.id,
        materialId: row.material_id ?? null,
        materialName: row.materials?.title ?? null,
        materialImage: row.materials?.image_url ?? null,
        colorCode: row.materials?.categories?.color_code ?? null,
        studyDatetime: row.study_datetime,
        durationMinutes: row.duration_minutes ?? null,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { allLogs, isLoading, refetch };
}
