// src/components/MaterialEditDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, TextField, Typography, CircularProgress,
  Autocomplete, Snackbar, Alert
} from '@mui/material';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import { supabase } from '../lib/supabase';
import { TEMPLATES, isTemplateUrl } from '../constants/materialTemplates';
import {
  CategoryOption,
  buildCategoryOptions,
  resolveCategory,
} from '../lib/categoryUtils';
import { MaterialUnit, DEFAULT_UNIT } from '../constants/materialUnits';
import UnitSelector from './UnitSelector';

interface MaterialEditDialogProps {
  materialId: string | null; // null のときダイアログは閉じる
  onClose: () => void;
  onUpdated: () => void;
}

export default function MaterialEditDialog({ materialId, onClose, onUpdated }: MaterialEditDialogProps) {
  const open = materialId !== null;

  // フォームの State
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [categoryInputValue, setCategoryInputValue] = useState('');
  const [selectedTemplateUrl, setSelectedTemplateUrl] = useState(TEMPLATES[0].url);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [unit, setUnit] = useState<MaterialUnit>(DEFAULT_UNIT);

  // ローディング・保存
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // カテゴリ候補一覧
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' }>({
    open: false, message: '', severity: 'error'
  });
  const showSnackbar = (message: string, severity: 'error' | 'warning' = 'error') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  // ==========================================
  // ダイアログが開いたときにデータを取得
  // ==========================================
  useEffect(() => {
    if (!open || !materialId) return;
    fetchData(materialId);
  }, [open, materialId]);

  const fetchData = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 教材データと自分のカテゴリを並列取得
      const [materialRes, categoriesRes] = await Promise.all([
        supabase
          .from('materials')
          .select('title, image_url, unit, categories(id, name)')
          .eq('id', id)
          .single(),
        supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
      ]);

      if (materialRes.error) throw materialRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const material = materialRes.data as any;
      const cats: CategoryOption[] = (categoriesRes.data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
      }));
      setCategoryOptions(cats);

      // フォーム初期値をセット
      setTitle(material.title ?? '');

      const currentCat = cats.find(c => c.id === material.categories?.id) ?? null;
      setSelectedCategory(currentCat);
      setCategoryInputValue(currentCat?.name ?? '');

      setUnit((material.unit as MaterialUnit) ?? DEFAULT_UNIT);

      // 現在の画像がテンプレートかどうか判定
      const isTemplate = isTemplateUrl(material.image_url);
      if (isTemplate) {
        setSelectedTemplateUrl(material.image_url);
        setPreviewUrl(null);
        setUploadedImage(null);
      } else {
        // テンプレート以外（アップロード画像 or 楽天画像）はプレビューとして表示
        setSelectedTemplateUrl(TEMPLATES[0].url);
        setPreviewUrl(material.image_url);
        setUploadedImage(null);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
      showSnackbar('データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 画像アップロード
  // ==========================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ==========================================
  // Autocomplete の表示用オプション生成（⑥ 共通関数を使用）
  // ==========================================
  const autocompleteOptions = React.useMemo<CategoryOption[]>(
    () => buildCategoryOptions(categoryInputValue, categoryOptions),
    [categoryInputValue, categoryOptions]
  );

  // ==========================================
  // 保存処理
  // ==========================================
  const handleSave = async () => {
    if (!materialId) return;
    if (!title.trim()) {
      showSnackbar('教材名を入力してください。', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // ① カテゴリの解決（既存 or 新規作成 or カテゴリなし）
      let categoryId: string;
      const categoryName = !selectedCategory
        ? 'カテゴリなし'
        : selectedCategory.isNew
          ? selectedCategory.name
          : selectedCategory.name;

      // ユーザー自身のカテゴリから検索
      const { data: existing } = await supabase
        .from('categories').select('id').eq('name', categoryName).eq('user_id', user.id).single();

      if (existing) {
        categoryId = existing.id;
      } else {
        const insertData: any = { name: categoryName, user_id: user.id };
        if (categoryName === 'カテゴリなし') insertData.color_code = '#9E9E9E';
        const { data: created, error: catError } = await supabase
          .from('categories').insert([insertData]).select().single();
        if (catError) throw catError;
        categoryId = created.id;
      }

      // ② 画像 URL の解決
      let finalImageUrl: string;
      if (uploadedImage) {
        // 新しい画像がアップロードされた場合はストレージへ保存
        const fileExt = uploadedImage.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('material-images')
          .upload(filePath, uploadedImage);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('material-images')
          .getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      } else if (previewUrl && !isTemplateUrl(previewUrl)) {
        // アップロード画像のまま変更なし（楽天画像なども含む）
        finalImageUrl = previewUrl;
      } else {
        // テンプレート画像
        finalImageUrl = selectedTemplateUrl;
      }

      // ③ DB 更新
      const { error: updateError } = await supabase
        .from('materials')
        .update({ title: title.trim(), category_id: categoryId, image_url: finalImageUrl, unit })
        .eq('id', materialId);
      if (updateError) throw updateError;

      resetForm();
      onUpdated();
      onClose();
    } catch (error) {
      console.error('保存エラー:', error);
      showSnackbar('保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  // フォーム state を初期値に戻す（handleClose と handleSave 両方から呼ぶ）
  const resetForm = () => {
    setTitle('');
    setSelectedCategory(null);
    setCategoryInputValue('');
    setSelectedTemplateUrl(TEMPLATES[0].url);
    setUploadedImage(null);
    setPreviewUrl(null);
    setUnit(DEFAULT_UNIT);
  };

  // ダイアログが閉じるときに state をリセット
  const handleClose = () => {
    if (isSaving) return;
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(_, reason) => { if (reason === 'backdropClick') return; handleClose(); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>教材を編集</DialogTitle>

        <DialogContent sx={{ pt: 2, overflowY: 'auto' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* 教材名 */}
              <TextField
                fullWidth
                label="教材名 (必須)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                sx={{ mt: 3 }}
              />

              {/* カテゴリ選択 */}
              <Autocomplete
                options={autocompleteOptions}
                getOptionLabel={(option) => option.name}
                value={selectedCategory}
                inputValue={categoryInputValue}
                onInputChange={(_, newInput) => setCategoryInputValue(newInput)}
                onChange={(_, newValue) => setSelectedCategory(newValue)}
                disabled={isSaving}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.isNew ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                          ＋
                        </Typography>
                        <Typography variant="body2">
                          「{option.name}」を新しいカテゴリとして作成
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">{option.name}</Typography>
                    )}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="カテゴリ"
                    placeholder="カテゴリを選択または新規入力"
                    helperText="空欄のまま保存すると「カテゴリなし」になります"
                  />
                )}
                noOptionsText="カテゴリが見つかりません"
              />

              {/* 単位選択 */}
              <UnitSelector value={unit} onChange={setUnit} disabled={isSaving} />

              {/* テンプレート選択 */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#666' }}>
                  表紙テンプレートを選択
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', p: 2, backgroundColor: '#f9f9f9' }}>
                  {TEMPLATES.map((tmpl) => (
                    <Box
                      key={tmpl.id}
                      onClick={() => {
                        if (isSaving) return;
                        setSelectedTemplateUrl(tmpl.url);
                        setUploadedImage(null);
                        setPreviewUrl(null);
                      }}
                      sx={{
                        width: 48, height: 64,
                        cursor: 'pointer', overflow: 'hidden',
                        border: selectedTemplateUrl === tmpl.url && !uploadedImage && !previewUrl
                          ? '3px solid #1A73E8' : '1px solid transparent',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: '0.2s',
                        '&:hover': { opacity: 0.8, transform: 'translateY(-2px)' },
                      }}
                    >
                      <img src={tmpl.url} alt={tmpl.label} title={tmpl.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* 画像アップロード */}
              <Box>
                <input
                  type="file"
                  accept="image/*"
                  id="edit-image-upload-input"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                  disabled={isSaving}
                />
                <label htmlFor="edit-image-upload-input">
                  <Box sx={{
                    border: (uploadedImage || (previewUrl && !isTemplateUrl(previewUrl)))
                      ? '3px solid #1A73E8' : '2px dashed #ddd',
                    p: 3, textAlign: 'center',
                    backgroundColor: uploadedImage ? '#f0f4f9' : '#fafafa',
                    color: '#999', cursor: isSaving ? 'default' : 'pointer', transition: '0.2s',
                    '&:hover': !isSaving ? { borderColor: '#1A73E8', color: '#1A73E8', backgroundColor: '#f0f4f9' } : {},
                  }}>
                    {previewUrl ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img
                          src={previewUrl}
                          alt="Preview"
                          style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        />
                        <Typography variant="caption" sx={{ mt: 1.5, display: 'block' }}>
                          クリックで画像を変更
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <LibraryAddOutlinedIcon sx={{ fontSize: 36, mb: 0.5 }} />
                        <Typography variant="body2">クリックして画像をアップロード</Typography>
                        <Typography variant="caption">（テンプレートを使用する場合は不要）</Typography>
                      </>
                    )}
                  </Box>
                </label>
              </Box>

            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} disabled={isSaving} sx={{ color: '#666', fontWeight: 'bold' }}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading || isSaving}
            disableElevation
            sx={{ borderRadius: '8px', fontWeight: 'bold', px: 4 }}
          >
            {isSaving ? '保存中...' : '変更を保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}