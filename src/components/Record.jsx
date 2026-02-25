// src/components/Record.jsx

import { useState } from 'react';
import { Box, Typography, Grid, TextField, MenuItem, Button } from '@mui/material';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';

export default function Record() {
  // // 入力された値を保存するための「記憶（State）」を準備
  // const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // 今日の日付を初期値に
  // const [category, setCategory] = useState('');
  // const [hours, setHours] = useState('');
  // const [minutes, setMinutes] = useState('');
  // const [memo, setMemo] = useState('');

  // // プルダウンの選択肢
  // const categories = [
  //   'TOEIC',
  //   '応用情報技術者試験',
  //   'プログラミング',
  //   '大学の課題・復習',
  //   'その他'
  // ];

  // // 「記録する」ボタンを押したときの処理
  // const handleSubmit = (e) => {
  //   e.preventDefault(); // 画面がリロードされるのを防ぐ
  //   console.log("保存されるデータ:", { date, category, hours, minutes, memo });
  //   alert('学習記録を保存しました！（※現在は画面上のテストです）');
    
  //   // 実際のアプリではここでデータベース（DB）にデータを送信します！
  // };

  // return (
  //   <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
  //     {/* 見出し */}
  //     <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
  //       <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
  //         <ModeEditOutlineOutlinedIcon />
  //       </Box>
  //       <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
  //         記録する
  //       </Typography>
  //     </Box>

  //     {/* 入力フォームのカード */}
  //     <Box 
  //       component="form" 
  //       onSubmit={handleSubmit}
  //       sx={{ 
  //         backgroundColor: '#F8FAFD', 
  //         borderRadius: '16px', 
  //         p: 4, 
  //         maxWidth: '600px', // 横に広がりすぎないように制限
  //         boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  //       }}
  //     >
  //       <Grid container spacing={3}>
          
  //         {/* 日付選択 */}
  //         <Grid item xs={12}>
  //           <TextField
  //             label="日付"
  //             type="date"
  //             fullWidth
  //             value={date}
  //             onChange={(e) => setDate(e.target.value)}
  //             InputLabelProps={{ shrink: true }} // ラベルが文字と被らないようにするおまじない
  //           />
  //         </Grid>

  //         {/* 学習カテゴリ（プルダウン） */}
  //         <Grid item xs={12}>
  //           <TextField
  //             select
  //             label="学習カテゴリ"
  //             fullWidth
  //             value={category}
  //             onChange={(e) => setCategory(e.target.value)}
  //           >
  //             {categories.map((option) => (
  //               <MenuItem key={option} value={option}>
  //                 {option}
  //               </MenuItem>
  //             ))}
  //           </TextField>
  //         </Grid>

  //         {/* 学習時間（時間と分を横並び） */}
  //         <Grid item xs={6}>
  //           <TextField
  //             label="時間"
  //             type="number"
  //             fullWidth
  //             value={hours}
  //             onChange={(e) => setHours(e.target.value)}
  //             InputProps={{ inputProps: { min: 0 } }} // マイナスを入力できないようにする
  //           />
  //         </Grid>
  //         <Grid item xs={6}>
  //           <TextField
  //             label="分"
  //             type="number"
  //             fullWidth
  //             value={minutes}
  //             onChange={(e) => setMinutes(e.target.value)}
  //             InputProps={{ inputProps: { min: 0, max: 59 } }} // 0〜59分までに制限
  //           />
  //         </Grid>

  //         {/* メモ欄 */}
  //         <Grid item xs={12}>
  //           <TextField
  //             label="ひとことメモ・振り返り"
  //             multiline
  //             rows={4} // 4行分の高さにする
  //             fullWidth
  //             value={memo}
  //             onChange={(e) => setMemo(e.target.value)}
  //             placeholder="今日は〇〇の文法を重点的にやった！"
  //           />
  //         </Grid>

  //         {/* 記録ボタン */}
  //         <Grid item xs={12} sx={{ mt: 2 }}>
  //           <Button 
  //             type="submit" 
  //             variant="contained" 
  //             fullWidth 
  //             size="large"
  //             sx={{ 
  //               borderRadius: '24px', 
  //               fontWeight: 'bold', 
  //               fontSize: '16px',
  //               py: 1.5,
  //               boxShadow: 'none',
  //               '&:hover': { boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)' }
  //             }}
  //           >
  //             この内容で記録する
  //           </Button>
  //         </Grid>

  //       </Grid>
  //     </Box>

//     </Box>
//   );
}