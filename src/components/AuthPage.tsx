// src/components/AuthPage.tsx

import { useState } from 'react';
import {
  Box, Typography, TextField, Button,
  Tab, Tabs, Alert, CircularProgress, InputAdornment, IconButton, useTheme,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import studyLogLogo from '../assets/studyLogLogo.svg';
import studyLogLogoDark from '../assets/studyLogLogo_dark.svg';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();
  const isLogin = tabIndex === 0;

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: 'background.subtle',
      '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.subtle} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: theme.palette.text.primary,
        borderRadius: 'inherit',
      },
    },
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
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
    if (password.length < 12) {
      setErrorMessage('パスワードは12文字以上で入力してください。');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/home', { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          if (data.user) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              display_name: '名称未設定',
            }, { onConflict: 'id', ignoreDuplicates: true });
          }
          setSuccessMessage('アカウントを作成しました！ログインしています...');
          navigate('/home', { replace: true });
        } else {
          setSuccessMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
      } else if (msg.includes('User already registered')) {
        setErrorMessage('このメールアドレスはすでに登録されています。ログインしてください。');
      } else if (msg.includes('Password should be at least')) {
        setErrorMessage('パスワードは12文字以上で入力してください。');
      } else {
        setErrorMessage('エラーが発生しました。時間をおいて再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ backgroundColor: 'background.paper', borderRadius: '24px', boxShadow: theme.customShadows.md, p: { xs: 3, sm: 5 }, width: '100%', maxWidth: '420px' }}>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1.5 }}>
          <img src={theme.palette.mode === 'dark' ? studyLogLogoDark : studyLogLogo} alt="StudyLog" style={{ height: '36px' }} />
          <Typography variant="h5" sx={{ fontWeight: '900', fontSize: '28px', letterSpacing: '-0.5px', color: 'text.primary' }}>
            StudyLog
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 4, fontSize: '13px' }}>
          学習記録を、もっと楽しく。
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth" TabIndicatorProps={{ sx: { borderRadius: '3px 3px 0 0' } }}>
            <Tab label="ログイン" sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0', '&:hover': { backgroundColor: 'action.hover' } }} />
            <Tab label="新規登録" sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0', '&:hover': { backgroundColor: 'action.hover' } }} />
          </Tabs>
        </Box>

        {errorMessage && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{errorMessage}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{successMessage}</Alert>}

        <TextField
          label="メールアドレス" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth size="medium" disabled={isLoading}
          sx={{ mb: 2, ...textFieldSx }}
        />

        <TextField
          label="パスワード" type={showPassword ? 'text' : 'password'} value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth size="medium" disabled={isLoading}
          helperText={!isLogin ? '12文字以上で設定してください' : ''}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small">
                    {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 3, ...textFieldSx }}
        />

        <Button
          variant="contained" fullWidth size="large"
          onClick={handleSubmit} disabled={isLoading} disableElevation
          sx={{ borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', py: 1.5, boxShadow: 'none' }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : isLogin ? 'ログイン' : 'アカウントを作成'}
        </Button>
      </Box>
    </Box>
  );
}
