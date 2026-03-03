// src/components/AddMaterial.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, List, ListItemButton,
  ListItemAvatar, ListItemText, CircularProgress, IconButton, Divider, Tabs, Tab,
  Snackbar, Alert, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions,
  useMediaQuery, useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';

import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';
import { MATERIAL_UNITS, MaterialUnit, DEFAULT_UNIT } from '../constants/materialUnits';
import UnitSelector from './UnitSelector';

const TEMPLATES = [
  { id: 'book_blue',        url: '/images/templates/book_blue.png',         label: '青色の本' },
  { id: 'book_gray',        url: '/images/templates/book_gray.png',         label: '灰色の本' },
  { id: 'book_green',       url: '/images/templates/book_green.png',        label: '緑色の本' },
  { id: 'book_lightblue',   url: '/images/templates/book_lightblue.png',    label: '水色の本' },
  { id: 'book_lightgreen',  url: '/images/templates/book_lightgreen.png',   label: '黄緑色の本' },
  { id: 'book_purple',      url: '/images/templates/book_purple.png',       label: '紫色の本' },
  { id: 'book_red',         url: '/images/templates/book_red.png',          label: '赤色の本' },
  { id: 'book_yellow',      url: '/images/templates/book_yellow.png',       label: '黄色の本' },
  { id: 'paper_blue',       url: '/images/templates/paper_blue.png',        label: '青色のプリント' },
  { id: 'paper_gray',       url: '/images/templates/paper_gray.png',        label: '灰色のプリント' },
  { id: 'paper_green',      url: '/images/templates/paper_green.png',       label: '緑色のプリント' },
  { id: 'paper_lightblue',  url: '/images/templates/paper_lightblue.png',   label: '水色のプリント' },
  { id: 'paper_lightgreen', url: '/images/templates/paper_lightgreen.png',  label: '黄緑色のプリント' },
  { id: 'paper_purple',     url: '/images/templates/paper_purple.png',      label: '紫色のプリント' },
  { id: 'paper_red',        url: '/images/templates/paper_red.png',         label: '赤色のプリント' },
  { id: 'paper_yellow',     url: '/images/templates/paper_yellow.png',      label: '黄色のプリント' },
  { id: 'audio',            url: '/images/templates/audio.png',             label: '音声教材' },
];

// カテゴリ選択 Autocomplete で使う option 型
interface CategoryOption {
  id: string;
  name: string;
  isNew?: boolean;
}

const NEW_CATEGORY_PREFIX = '__new__';

export default function AddMaterial() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [tabIndex, setTabIndex] = useState(0);

  // ==========================================
  // カテゴリ一覧（マウント時に取得）
  // ==========================================
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
      if (data) {
        setCategoryOptions(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    };
    fetchCategories();
  }, []);

  // ==========================================
  // 検索タブ用 State
  // ==========================================
  const RAKUTEN_APP_ID = (import.meta as any).env.VITE_RAKUTEN_APP_ID;
  const RAKUTEN_ACCESS_KEY = (import.meta as any).env.VITE_RAKUTEN_ACCESS_KEY;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 検索タブ: カテゴリ選択ダイアログ
  const [pendingBook, setPendingBook] = useState<any | null>(null); // null のとき閉じる
  const [searchCategory, setSearchCategory] = useState<CategoryOption | null>(null);
  const [searchCategoryInput, setSearchCategoryInput] = useState('');
  const [searchUnit, setSearchUnit] = useState<MaterialUnit>(DEFAULT_UNIT);

  // ==========================================
  // オリジナルタブ用 State
  // ==========================================
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalCategory, setOriginalCategory] = useState<CategoryOption | null>(null);
  const [originalCategoryInput, setOriginalCategoryInput] = useState('');
  const [originalUnit, setOriginalUnit] = useState<MaterialUnit>(DEFAULT_UNIT);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('/images/templates/book_blue.png');

  const [isAdding, setIsAdding] = useState(false);

  // 入力ありのとき離脱ブロック（オリジナルタブ: タイトルor画像あり）
  const isDirty = originalTitle.trim() !== '' || originalImage !== null || pendingBook !== null;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isAdding && currentLocation.pathname !== nextLocation.pathname
  );

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false, message: '', severity: 'error'
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' = 'error') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  // ==========================================
  // ユーティリティ: カテゴリ名 → id（なければ INSERT）
  // ==========================================
  const resolveCategory = async (name: string, userId: string): Promise<string> => {
    const { data: existing } = await supabase
      .from('categories').select('id').eq('name', name).eq('user_id', userId).single();
    if (existing) return existing.id;

    const insertData: any = { name, user_id: userId };
    if (name === 'カテゴリなし') insertData.color_code = '#9E9E9E';

    const { data: created, error } = await supabase
      .from('categories').insert([insertData]).select().single();
    if (error) throw error;
    return created.id;
  };

  // ==========================================
  // Autocomplete の options 生成
  // 入力文字が既存と完全一致しない場合のみ「新規作成」を末尾に追加
  // ==========================================
  const buildOptions = (input: string, base: CategoryOption[]): CategoryOption[] => {
    const trimmed = input.trim();
    const exactMatch = base.some(c => c.name === trimmed);
    if (trimmed && !exactMatch) {
      return [...base, { id: `${NEW_CATEGORY_PREFIX}${trimmed}`, name: trimmed, isNew: true }];
    }
    return base;
  };

  const originalAutocompleteOptions = useMemo(
    () => buildOptions(originalCategoryInput, categoryOptions),
    [originalCategoryInput, categoryOptions]
  );

  const searchAutocompleteOptions = useMemo(
    () => buildOptions(searchCategoryInput, categoryOptions),
    [searchCategoryInput, categoryOptions]
  );

  // ==========================================
  // 検索タブ
  // ==========================================
  const searchBooks = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      // 🌟変更箇所：localhostの場合はViteのプロキシを使い、本番環境では直接楽天APIを叩く
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? '/api/rakuten' : 'https://openapi.rakuten.co.jp';

      const res = await fetch(`/api/rakuten/services/api/BooksBook/Search/20170404?format=json&title=${encodeURIComponent(searchQuery)}&applicationId=${RAKUTEN_APP_ID}&accessKey=${RAKUTEN_ACCESS_KEY}&hits=20&sort=sales&outOfStockFlag=1`);
      const data = await res.json();
      setSearchResults(data.Items || []);
    } catch (error) {
      console.error("検索エラー:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 「追加」ボタン → カテゴリ選択ダイアログを開く
  const handleAddFromSearchClick = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setSearchCategory(null);
    setSearchCategoryInput('');
    setSearchUnit(DEFAULT_UNIT);
    setPendingBook(book);
  };

  // ダイアログの「追加する」→ DB 保存
  const handleConfirmSearchAdd = async () => {
    if (!pendingBook) return;

    const categoryName = searchCategory?.isNew
      ? searchCategory.name
      : (searchCategory?.name ?? 'カテゴリなし');

    let imageUrl = pendingBook.largeImageUrl || pendingBook.mediumImageUrl;
    if (imageUrl?.includes('?')) imageUrl = imageUrl.split('?')[0];

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const categoryId = await resolveCategory(categoryName, user.id);

      const { error } = await supabase.from('materials').insert([{
        category_id: categoryId,
        user_id: user.id,
        title: pendingBook.title,
        image_url: imageUrl || '/images/templates/book_gray.png',
        unit: searchUnit,
      }]);
      if (error) throw error;

      setPendingBook(null);
      showSnackbar("教材を追加しました", "success");
      setTimeout(() => navigate('/materials'), 1500);
    } catch (error) {
      console.error("DB登録エラー:", error);
      showSnackbar("登録に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsAdding(false);
    }
  };

  // ==========================================
  // オリジナルタブ
  // ==========================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setOriginalImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddOriginal = async () => {
    if (!originalTitle.trim()) {
      showSnackbar("教材のタイトルを入力してください。", "warning");
      return;
    }

    const categoryName = originalCategory?.isNew
      ? originalCategory.name
      : (originalCategory?.name ?? 'カテゴリなし');

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let finalImageUrl = selectedTemplate;

      if (originalImage) {
        const fileExt = originalImage.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('material-images').upload(filePath, originalImage);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('material-images').getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const categoryId = await resolveCategory(categoryName, user.id);

      const { error } = await supabase.from('materials').insert([{
        category_id: categoryId,
        user_id: user.id,
        title: originalTitle.trim(),
        image_url: finalImageUrl,
        unit: originalUnit,
      }]);
      if (error) throw error;

      navigate('/materials');
    } catch (error) {
      console.error("オリジナル教材の登録エラー:", error);
      showSnackbar("登録に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsAdding(false);
    }
  };

  // ==========================================
  // Autocomplete の renderOption（共通）
  // ==========================================
  const renderCategoryOption = (props: React.HTMLAttributes<HTMLLIElement>, option: CategoryOption) => (
    <li {...props} key={option.id}>
      {option.isNew ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>＋</Typography>
          <Typography variant="body2">「{option.name}」を新しいカテゴリとして作成</Typography>
        </Box>
      ) : (
        <Typography variant="body2">{option.name}</Typography>
      )}
    </li>
  );

  // ==========================================
  // レンダリング
  // ==========================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <IconButton onClick={() => navigate('/materials')} sx={{ mr: 2, backgroundColor: '#f5f5f5' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          新しい教材を登録
        </Typography>
      </Box>

      {/* タブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, color: '#333' }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="fullWidth">
          <Tab
            icon={isMobile ? undefined : <SearchIcon />}
            iconPosition="start"
            label={isMobile ? '市販教材を検索' : '市販の教材を検索'}
            sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0', minHeight: isMobile ? '40px' : '48px' }}
          />
          <Tab
            icon={isMobile ? undefined : <LibraryAddOutlinedIcon />}
            iconPosition="start"
            label={isMobile ? 'オリジナル登録' : 'オリジナル教材を登録'}
            sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0', minHeight: isMobile ? '40px' : '48px' }}
          />
        </Tabs>
      </Box>

      {/* ========== タブ0: 検索 ========== */}
      {tabIndex === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
            <TextField
              fullWidth variant="outlined"
              placeholder="書籍検索（タイトル・著者・出版社）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchBooks(); }}
              sx={{ backgroundColor: '#fff', borderRadius: '8px' }}
              disabled={isAdding}
            />
            <Button variant="contained" onClick={searchBooks} disableElevation disabled={isAdding}
              sx={{ borderRadius: '8px', px: 4, fontWeight: 'bold' }}>
              検索
            </Button>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #eee', p: 2, pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2 }}>
            {!isSearching && searchResults.length === 0 && !searchQuery && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, color: '#aaa' }}>
                <SearchIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>キーワードを入力して教材を検索してください</Typography>
              </Box>
            )}
            {(isSearching || isAdding) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
                {isAdding && <Typography sx={{ mt: 2, color: 'text.secondary' }}>データベースに保存中...</Typography>}
              </Box>
            )}
            {!isSearching && !isAdding && searchResults.length > 0 && (
              <List>
                {searchResults.map((item, index) => {
                  const book = item.Item;
                  return (
                    <React.Fragment key={index}>
                      <ListItemButton
                        onClick={(e) => handleAddFromSearchClick(e, book)}
                        sx={{ borderRadius: '12px', mb: 1, py: 2, transition: '0.2s', '&:hover': { backgroundColor: '#f8fafd' } }}
                      >
                        <ListItemAvatar sx={{ mr: 3 }}>
                          <img
                            src={book.mediumImageUrl} alt="表紙"
                            style={{ height: '88px', width: 'auto', objectFit: 'contain', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography sx={{ fontWeight: 'bold', fontSize: '16px', mb: 0.5 }}>{book.title}</Typography>}
                          secondary={<Typography variant="body2" color="text.secondary">{book.author} / {book.publisherName}</Typography>}
                        />
                        <Button size="small" variant="outlined" sx={{ borderRadius: '20px', minWidth: '80px', fontWeight: 'bold' }}>追加</Button>
                      </ListItemButton>
                      {index < searchResults.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <Typography align="center" color="text.secondary" sx={{ py: 8 }}>
                見つかりませんでした。別のキーワードで試してみてください。
              </Typography>
            )}
          </Box>

          {/* カテゴリ選択ダイアログ（検索タブ専用） */}
          <Dialog
            open={pendingBook !== null}
            onClose={(_, reason) => { if (reason === 'backdropClick') return; if (!isAdding) setPendingBook(null); }}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
          >
            <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>カテゴリを選択</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {pendingBook && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 1.5, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <img
                    src={pendingBook.mediumImageUrl} alt="表紙"
                    style={{ height: '64px', width: 'auto', objectFit: 'contain', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.4 }}>
                    {pendingBook.title}
                  </Typography>
                </Box>
              )}
              <Autocomplete
                options={searchAutocompleteOptions}
                getOptionLabel={(o) => o.name}
                value={searchCategory}
                inputValue={searchCategoryInput}
                onInputChange={(_, v) => setSearchCategoryInput(v)}
                onChange={(_, v) => setSearchCategory(v)}
                disabled={isAdding}
                renderOption={renderCategoryOption}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="カテゴリ"
                    placeholder="カテゴリを選択または新規入力"
                    helperText="空欄のまま追加すると「カテゴリなし」になります"
                  />
                )}
                noOptionsText="カテゴリが見つかりません"
              />
              <Box sx={{ mt: 3 }}>
                <UnitSelector value={searchUnit} onChange={setSearchUnit} disabled={isAdding} />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setPendingBook(null)} disabled={isAdding} sx={{ color: '#666', fontWeight: 'bold' }}>
                キャンセル
              </Button>
              <Button
                onClick={handleConfirmSearchAdd}
                variant="contained"
                disabled={isAdding}
                disableElevation
                sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}
              >
                {isAdding ? '追加中...' : 'この教材を追加'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* ========== タブ1: オリジナル登録 ========== */}
      {tabIndex === 1 && (
        <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #eee', p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>オリジナル教材の詳細を入力</Typography>

          {/* 教材名 */}
          <TextField
            fullWidth label="教材名 (必須)"
            value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)}
            sx={{ mb: 3 }} disabled={isAdding}
          />

          {/* カテゴリ選択（Autocomplete） */}
          <Autocomplete
            options={originalAutocompleteOptions}
            getOptionLabel={(o) => o.name}
            value={originalCategory}
            inputValue={originalCategoryInput}
            onInputChange={(_, v) => setOriginalCategoryInput(v)}
            onChange={(_, v) => setOriginalCategory(v)}
            disabled={isAdding}
            renderOption={renderCategoryOption}
            renderInput={(params) => (
              <TextField
                {...params}
                label="カテゴリ"
                placeholder="カテゴリを選択または新規入力"
                helperText="空欄のまま登録すると「カテゴリなし」になります"
              />
            )}
            noOptionsText="カテゴリが見つかりません"
            sx={{ mb: 3 }}
          />

          {/* 単位選択 */}
          <Box sx={{ mb: 4 }}>
            <UnitSelector value={originalUnit} onChange={setOriginalUnit} disabled={isAdding} />
          </Box>

          {/* テンプレート選択 */}
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#666' }}>表紙画像を選択</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', p: 2, backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
            {TEMPLATES.map((tmpl) => (
              <Box
                key={tmpl.id}
                onClick={() => { setSelectedTemplate(tmpl.url); setOriginalImage(null); setPreviewUrl(null); }}
                sx={{
                  width: 48, height: 64,
                  cursor: 'pointer', borderRadius: '4px', overflow: 'hidden',
                  border: selectedTemplate === tmpl.url && !originalImage ? '3px solid #1A73E8' : '1px solid transparent',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: '0.2s', '&:hover': { opacity: 0.8, transform: 'translateY(-2px)' }
                }}
              >
                <img src={tmpl.url} alt={tmpl.label} title={tmpl.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>

          {/* 画像アップロード */}
          <input type="file" accept="image/*" id="image-upload-input" style={{ display: 'none' }} onChange={handleImageChange} disabled={isAdding} />
          <label htmlFor="image-upload-input">
            <Box sx={{
              border: originalImage ? '3px solid #1A73E8' : '2px dashed #ddd',
              borderRadius: '12px', p: 4, textAlign: 'center', mb: 4,
              backgroundColor: originalImage ? '#f0f4f9' : '#fafafa',
              color: '#999', cursor: 'pointer', transition: '0.2s',
              '&:hover': { borderColor: '#1A73E8', color: '#1A73E8', backgroundColor: '#f0f4f9' }
            }}>
              {previewUrl ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={previewUrl} alt="Preview" style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                  <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>クリックで画像を変更</Typography>
                </Box>
              ) : (
                <>
                  <LibraryAddOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>クリックして表紙画像をアップロード</Typography>
                  <Typography variant="caption">（※画像なしでも登録できます）</Typography>
                </>
              )}
            </Box>
          </label>

          <Button
            variant="contained" size="large" fullWidth disableElevation
            onClick={handleAddOriginal} disabled={isAdding}
            sx={{ borderRadius: '8px', fontWeight: 'bold', py: 1.5 }}
          >
            {isAdding ? '登録中...' : 'この教材を登録する'}
          </Button>
        </Box>
      )}

      <NavigationBlockerDialog
        open={blocker.state === 'blocked'}
        onProceed={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        message={'入力内容が保存されていません。\nこのページを離れると、入力内容が破棄されます。'}
      />

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

    </Box>
  );
}