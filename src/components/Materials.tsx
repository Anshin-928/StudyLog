// src/components/Materials.tsx

import React, { useState } from 'react';
import { 
  Box, Typography, Grid, Button, Dialog, DialogTitle, DialogContent, 
  TextField, List, ListItemButton, ListItemAvatar, Avatar, ListItemText, CircularProgress 
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import MaterialCard from './MaterialCard';

interface Material {
  id: number;
  group: string;
  name: string;
  image: string;
}

export default function Materials() {
  // ==================
  //  API設定とState管理
  // ==================
  const RAKUTEN_APP_ID = "dc241411-9570-4d4b-9f14-6cb97250ca0e";
  const RAKUTEN_ACCESS_KEY = "pk_9AWuHPDhzA1a7XmQ2zayuGdsHfDWF3stLcahdm5DIz8";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const dummyImages = { app: 'https://via.placeholder.com/150x220/1A73E8/FFFFFF?text=App' };
  const createMaterial = (id: number, group: string, name: string, image?: string): Material => {
    return { id, group, name, image: image || dummyImages.app };
  };

  const [materials, setMaterials] = useState<Material[]>([
    createMaterial(1, 'TOEIC L&R テスト', '出る単特急 金のフレーズ', 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/5482/9784023315482.jpg'),
    createMaterial(4, '応用情報技術者試験', 'キタミ式イラストIT塾', 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/4009/9784297134009.jpg'),
  ]);

  const groupedMaterials = materials.reduce((acc: Record<string, Material[]>, material) => {
    if (!acc[material.group]) acc[material.group] = [];
    acc[material.group].push(material);
    return acc;
  }, {});

  //  子（カード）から呼ばれる処理
  const handleDelete = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleEdit = (id: number) => {
    alert(`編集機能は準備中です！（対象ID: ${id}）`);
  };

  //  検索と追加の処理
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

  const handleAddFromSearch = (book: any) => {
    const inputGroup = window.prompt(`「${book.title}」をどのグループに追加しますか？\n（例: プログラミング, TOEIC L&R テスト）`, "新しいグループ");
    if (!inputGroup) return;

    let imageUrl = book.largeImageUrl || book.mediumImageUrl;
    if (imageUrl && imageUrl.includes('?')) {
      imageUrl = imageUrl.split('?')[0];
    }

    const newId = Date.now();
    const newInstance = createMaterial(newId, inputGroup, book.title, imageUrl);

    setMaterials([...materials, newInstance]);
    setIsDialogOpen(false); 
    setSearchQuery("");     
    setSearchResults([]);   
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* ヘッダー部分 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
            <MenuBookOutlinedIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            教材管理
          </Typography>
        </Box>

        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setIsDialogOpen(true)}
          sx={{ borderRadius: '5px', boxShadow: 'none', fontWeight: 'bold', px: 3 }}
        >
          教材を追加
        </Button>
      </Box>

      {/* 教材一覧の表示部分 */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, px: 1.5, pb: 3, pt: 1 }}>
        <Grid container spacing={4} direction="column">
          {Object.entries(groupedMaterials).map(([groupName, items]) => (
            <Grid size={12} key={groupName} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333', mb: 2, pl: 1, borderLeft: '4px solid #1A73E8' }}>
                {groupName}
              </Typography>
              <Grid container spacing={2}>
                {items.map(item => (
                  <Grid size={{ xs: 4, sm: 3, md: 2, lg: 2 }} key={item.id}>

                    <MaterialCard 
                      material={item} 
                      onDelete={handleDelete} 
                      onEdit={handleEdit} 
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/*  検索＆追加ポップアップ */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>📚 新しい教材を検索</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}>
            <TextField fullWidth size="small" placeholder="本のタイトルやキーワード（例: TOEIC）" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') searchBooks(); }} />
            <Button variant="contained" onClick={searchBooks} disableElevation sx={{ borderRadius: '8px' }}><SearchIcon /></Button>
          </Box>

          {isSearching && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

          {!isSearching && searchResults.length > 0 && (
            <List sx={{ maxHeight: '400px', overflowY: 'auto', bgcolor: '#f8fafd', borderRadius: '8px' }}>
              {searchResults.map((item, index) => {
                const book = item.Item;
                return (
                  <ListItemButton key={index} onClick={() => handleAddFromSearch(book)} sx={{ borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}>
                    <ListItemAvatar sx={{ mr: 2 }}>
                      <Avatar src={book.mediumImageUrl} variant="rounded" sx={{ width: 48, height: 64, bgcolor: '#eee' }} />
                    </ListItemAvatar>
                    <ListItemText primary={<Typography sx={{ fontWeight: 'bold', fontSize: '14px' }}>{book.title}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{book.author}</Typography>} />
                    <Button size="small" variant="outlined" sx={{ borderRadius: '20px', minWidth: '60px' }}>追加</Button>
                  </ListItemButton>
                );
              })}
            </List>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <Typography align="center" color="text.secondary" sx={{ py: 4 }}>見つかりませんでした。別のキーワードで試してみてください。</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}