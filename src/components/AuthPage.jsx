// src/components/AuthPage.jsx

import { useState } from 'react';
import {
  Box, Typography, TextField, Button,
  Tab, Tabs, Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import studyLogLogo from '../assets/studyLogLogo.svg';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [tabIndex, setTabIndex] = useState(0); // 0: ログイン, 1: 新規登録
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLogin = tabIndex === 0;

  const handleTabChange = (_, newValue) => {
    setTabIndex(newValue);
    setErrorMessage('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください。');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください。');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // ログイン成功 → App.jsx の onAuthStateChange が検知して自動リダイレクト
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMessage('アカウントを作成しました！ログインしています...');
        // Confirm email をオフにしているので、サインアップ直後にセッションが張られ
        // onAuthStateChange が検知して自動リダイレクトされます
      }
    } catch (error) {
      // Supabase のエラーメッセージを日本語に変換
      const msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
      } else if (msg.includes('User already registered')) {
        setErrorMessage('このメールアドレスはすでに登録されています。ログインしてください。');
      } else if (msg.includes('Password should be at least')) {
        setErrorMessage('パスワードは6文字以上で入力してください。');
      } else {
        setErrorMessage('エラーが発生しました。時間をおいて再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F0F4F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* ロゴ・アプリ名 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1.5 }}>
          <img src={studyLogLogo} alt="StudyLog" style={{ height: '36px' }} />
          <Typography variant="h5" sx={{ fontWeight: '900', fontSize: '28px', letterSpacing: '-0.5px', color: '#1A1A1A' }}>
            StudyLog
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ textAlign: 'center', color: '#999', mb: 4, fontSize: '13px' }}>
          学習記録を、もっと楽しく。
        </Typography>

        {/* タブ（ログイン / 新規登録） */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab label="ログイン" sx={{ fontWeight: 'bold' }} />
            <Tab label="新規登録" sx={{ fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        {/* エラー / 成功メッセージ */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {errorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>
            {successMessage}
          </Alert>
        )}

        {/* メールアドレス */}
        <TextField
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          size="medium"
          disabled={isLoading}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' },
          }}
        />

        {/* パスワード */}
        <TextField
          label="パスワード"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          size="medium"
          disabled={isLoading}
          helperText={!isLogin ? '6文字以上で設定してください' : ''}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    {showPassword
                      ? <VisibilityOffOutlinedIcon fontSize="small" />
                      : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' },
          }}
        />

        {/* 送信ボタン */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={isLoading}
          disableElevation
          sx={{
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '16px',
            py: 1.5,
            boxShadow: 'none',
          }}
        >
          {isLoading
            ? <CircularProgress size={24} color="inherit" />
            : isLogin ? 'ログイン' : 'アカウントを作成'}
        </Button>
      </Box>
    </Box>
  );
}