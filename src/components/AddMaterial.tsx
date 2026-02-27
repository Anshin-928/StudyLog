// src/components/AddMaterial.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, TextField, Button, List, ListItemButton, 
  ListItemAvatar, Avatar, ListItemText, CircularProgress, IconButton, Divider, Tabs, Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';

import { supabase } from '../lib/supabase';

const  TEMPLATES = [

  // 本のテンプレート
  { id: 'book_blue', url: '/images/templates/book_blue.png', label: '青色の本' },
  { id: 'book_gray', url: '/images/templates/book_gray.png', label: '灰色の本' },
  { id: 'book_green', url: '/images/templates/book_green.png', label: '緑色の本' },
  { id: 'book_lightblue', url: '/images/templates/book_lightblue.png', label: '水色の本' },
  { id: 'book_lightgreen', url: '/images/templates/book_lightgreen.png', label: '黄緑色の本' },
  { id: 'book_purple', url: '/images/templates/book_purple.png', label: '紫色の本' },
  { id: 'book_red', url: '/images/templates/book_red.png', label: '赤色の本' },
  { id: 'book_yellow', url: '/images/templates/book_yellow.png', label: '黄色の本' },

  // プリントのテンプレート
  { id: 'paper_blue', url: '/images/templates/paper_blue.png', label: '青色のプリント' },
  { id: 'paper_gray', url: '/images/templates/paper_gray.png', label: '灰色のプリント' },
  { id: 'paper_green', url: '/images/templates/paper_green.png', label: '緑色のプリント' },
  { id: 'paper_lightblue', url: '/images/templates/paper_lightblue.png', label: '水色のプリント' },
  { id: 'paper_lightgreen', url: '/images/templates/paper_lightgreen.png', label: '黄緑色のプリント' },
  { id: 'paper_purple', url: '/images/templates/paper_purple.png', label: '紫色のプリント' },
  { id: 'paper_red', url: '/images/templates/paper_red.png', label: '赤色のプリント' },
  { id: 'paper_yellow', url: '/images/templates/paper_yellow.png', label: '黄色のプリント' },

  // 音声教材のテンプレート
  { id: 'audio' , url: '/images/templates/audio.png', label: '音声教材'}
]

export default function AddMaterial() {
  const navigate = useNavigate();

  // タブの切り替え状態を管理するState（0: 検索，1: オリジナル）
  const [tabIndex, setTabIndex] = useState(0);
  
  // 検索機能用のState
  const RAKUTEN_APP_ID = "dc241411-9570-4d4b-9f14-6cb97250ca0e";
  const RAKUTEN_ACCESS_KEY = "pk_9AWuHPDhzA1a7XmQ2zayuGdsHfDWF3stLcahdm5DIz8";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // オリジナル教材のState
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalCategory, setOriginalCategory] = useState("");
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 選択中のテンプレートURLを管理するState（初期値: book_blue.png）
  const [selectedTemplate, setSelectedTemplate] = useState('/images/templates/book_blue.png');

  const [isAdding, setIsAdding] = useState(false); // DB保存中かどうかのState

  const searchBooks = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/rakuten/services/api/BooksBook/Search/20170404?format=json&title=${encodeURIComponent(searchQuery)}&applicationId=${RAKUTEN_APP_ID}&accessKey=${RAKUTEN_ACCESS_KEY}&hits=20&sort=sales&outOfStockFlag=1`);
      const data = await res.json();
      if (data.Items) {
        setSearchResults(data.Items); 
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("検索エラー:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (book: any) => {
    const inputCategory = window.prompt(`「${book.title}」をどのカテゴリに追加しますか？\n（空白のままOKを押すと「カテゴリなし」になります）`, "");
    
    // キャンセルを押した場合は処理を中断
    if (inputCategory === null) return; 

    // 空白の場合は「カテゴリなし」にする
    const finalCategory = inputCategory.trim() === "" ? "カテゴリなし" : inputCategory.trim();

    let imageUrl = book.largeImageUrl || book.mediumImageUrl;
    if (imageUrl && imageUrl.includes('?')) {
      imageUrl = imageUrl.split('?')[0];
    }

    setIsAdding(true);

    try {
      let { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', finalCategory)
        .single();

      let categoryId;

      if (!existingCategory) {
        const insertData: any = { name: finalCategory };
        if (finalCategory === "カテゴリなし") {
          insertData.color_code = "#9E9E9E"; 
        }

        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert([insertData])
          .select()
          .single();

        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
      } else {
        categoryId = existingCategory.id;
      }

      const { error: materialError } = await supabase
        .from('materials')
        .insert([{
          category_id: categoryId,
          title: book.title,
          image_url: imageUrl || '/images/templates/book_gray.png'
        }]);

      if (materialError) throw materialError;

      alert(`「${book.title}」を登録しました！`);
      navigate('/materials');

    } catch (error) {
      console.error("DB登録エラー:", error);
      alert("登録に失敗しました。");
    } finally {
      setIsAdding(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalImage(file);
      setPreviewUrl(URL.createObjectURL(file)); 
    }
  };

  const handleAddOriginal = async () => {
    // タイトルだけ必須に変更（カテゴリは空でもOK）
    if (!originalTitle.trim()) {
      alert("教材のタイトルは必須です！");
      return;
    }

    // 空白の場合は「カテゴリなし」にする
    const finalCategory = originalCategory.trim() === "" ? "カテゴリなし" : originalCategory.trim();

    setIsAdding(true);
    try {
      let finalImageUrl = selectedTemplate;

      // 自前画像がアップロードされている場合は、ストレージに保存してURLを上書き
      if (originalImage) {
        const fileExt = originalImage.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('material-images')
          .upload(filePath, originalImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('material-images')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      let { data: existingCategory } = await supabase.from('categories').select('id').eq('name', finalCategory).single();
      let categoryId;
      
      if (!existingCategory) {
        // 「カテゴリなし」の場合はグレー（#9E9E9E）を設定する
        const insertData: any = { name: finalCategory };
        if (finalCategory === "カテゴリなし") {
          insertData.color_code = "#9E9E9E"; 
        }

        const { data: newCategory, error: categoryError } = await supabase.from('categories').insert([insertData]).select().single();
        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
      } else { 
        categoryId = existingCategory.id; 
      }

      const { error: materialError } = await supabase.from('materials').insert([{
        category_id: categoryId,
        title: originalTitle,
        image_url: finalImageUrl
      }]);

      if (materialError) throw materialError;

      alert(`オリジナル教材「${originalTitle}」を登録しました！`);
      navigate('/materials');

    } catch (error) {
      console.error("オリジナル教材の登録エラー:", error);
      alert("登録に失敗しました。");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      
      {/* ヘッダー部分 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate('/materials')} sx={{ mr: 2, backgroundColor: '#f5f5f5' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          新しい教材を登録
        </Typography>
      </Box>

      {/* タブ切り替えメニュー */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} centered>
          <Tab icon={<SearchIcon />} iconPosition="start" label="市販の教材を検索" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<LibraryAddOutlinedIcon />} iconPosition="start" label="オリジナル教材を登録" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {/* タブ0（検索画面） */}
      {tabIndex === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
            <TextField fullWidth variant="outlined" placeholder="書籍検索（タイトル・著者・出版社）" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') searchBooks(); }} sx={{ backgroundColor: '#fff', borderRadius: '8px' }} disabled={isAdding} />
            <Button variant="contained" onClick={searchBooks} disableElevation disabled={isAdding} sx={{ borderRadius: '8px', px: 4, fontWeight: 'bold' }}>検索</Button>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #eee', p: 2 }}>
            {!isSearching && searchResults.length === 0 && !searchQuery && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, color: '#aaa' }}>
                <SearchIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>キーワードを入力して教材を検索してください</Typography>
              </Box>
            )}
            {(isSearching || isAdding) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}><CircularProgress />{isAdding && <Typography sx={{ mt: 2, color: 'text.secondary' }}>データベースに保存中...</Typography>}</Box>
            )}
            {!isSearching && !isAdding && searchResults.length > 0 && (
              <List>
                {searchResults.map((item, index) => {
                  const book = item.Item;
                  return (
                    <React.Fragment key={index}>
                      <ListItemButton onClick={() => handleAddFromSearch(book)} sx={{ borderRadius: '12px', mb: 1, py: 2, transition: '0.2s', '&:hover': { backgroundColor: '#f8fafd' } }}>
                        <ListItemAvatar sx={{ mr: 3 }}>
                          {/* <Avatar src={book.mediumImageUrl} variant="rounded" sx={{ width: 64, height: 88, bgcolor: '#f5f5f5', border: '1px solid #ddd' }} /> */}
                          <img 
                            src={book.mediumImageUrl} 
                            alt="表紙" 
                            style={{ height: '88px', width: 'auto', objectFit: 'contain', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }} 
                          />
                        </ListItemAvatar>
                        <ListItemText primary={<Typography sx={{ fontWeight: 'bold', fontSize: '16px', mb: 0.5 }}>{book.title}</Typography>} secondary={<Typography variant="body2" color="text.secondary">{book.author} / {book.publisherName}</Typography>} />
                        <Button size="small" variant="outlined" sx={{ borderRadius: '20px', minWidth: '80px', fontWeight: 'bold' }}>追加</Button>
                      </ListItemButton>
                      {index < searchResults.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <Typography align="center" color="text.secondary" sx={{ py: 8 }}>見つかりませんでした。別のキーワードで試してみてください。</Typography>
            )}
          </Box>
        </>
      )}

      {/* タブ1（オリジナル登録画面） */}
      {tabIndex === 1 && (
        <Box sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          // minHeight: 0,
          backgroundColor: '#fff', 
          borderRadius: '16px', 
          border: '1px solid #eee', 
          p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>オリジナル教材の詳細を入力</Typography>
          
          <TextField 
            fullWidth label="教材名 (必須)" placeholder="" 
            value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} 
            sx={{ mb: 3 }} disabled={isAdding}
          />

          <TextField 
            fullWidth label="カテゴリ名" placeholder="空欄の場合は「カテゴリなし」に分類されます" 
            value={originalCategory} onChange={(e) => setOriginalCategory(e.target.value)} 
            sx={{ mb: 4 }} disabled={isAdding}
          />

          {/* テンプレート選択エリア */}
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#666' }}>表紙画像を選択</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', p: 2, backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
            {TEMPLATES.map((tmpl) => (
              <Box
                key={tmpl.id}
                onClick={() => {
                  setSelectedTemplate(tmpl.url);
                  setOriginalImage(null);
                  setPreviewUrl(null);
                }}
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
          
          {/* 画像アップロードのエリア */}
          <input
            type="file"
            accept="image/*"
            id="image-upload-input"
            style={{ display: 'none' }}
            onChange={handleImageChange}
            disabled={isAdding}
          />
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

          <Button variant="contained" size="large" fullWidth disableElevation onClick={handleAddOriginal} disabled={isAdding} sx={{ borderRadius: '8px', fontWeight: 'bold', py: 1.5 }}>
            この教材を登録する
          </Button>
        </Box>
      )}

    </Box>
  );
}