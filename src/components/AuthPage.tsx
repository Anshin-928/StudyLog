// src/components/AuthPage.tsx

import { useState } from 'react';
import {
  Box, Typography, TextField, Button, Divider,
  Tab, Tabs, Alert, CircularProgress, InputAdornment, IconButton,
  useTheme, useMediaQuery,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import studyLogLogo from '../assets/studyLogLogo.svg';
import studyLogLogoDark from '../assets/studyLogLogo_dark.svg';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const FEATURES = [
  { Icon: AutoStoriesOutlinedIcon, text: '毎日の学習をかんたんに記録。' },
  { Icon: BarChartOutlinedIcon,  text: '進捗をグラフで可視化。' },
  { Icon: EmojiEventsOutlinedIcon, text: 'ストリークで学習習慣を継続。' },
];

export default function AuthPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const [tabIndex, setTabIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();
  const isLogin = tabIndex === 0;

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
        // identities が空の場合、そのメールはすでに登録済み（Supabaseの仕様）
        if (data.user?.identities?.length === 0) {
          setErrorMessage('このメールアドレスはすでに登録されています。ログインしてください。');
          return;
        }
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/home' },
    });
    if (error) {
      setErrorMessage('Google ログインに失敗しました。時間をおいて再度お試しください。');
      setIsGoogleLoading(false);
    }
    // 成功時はページがリダイレクトされるため何もしない
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      transition: 'box-shadow 0.2s',
      '& fieldset': {
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)',
      },
      '&:hover fieldset': { borderColor: theme.palette.primary.main },
      '&.Mui-focused': {
        boxShadow: '0 0 0 3px rgba(66, 133, 244, 0.18)',
      },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
      '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.subtle} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: theme.palette.text.primary,
        borderRadius: 'inherit',
      },
    },
  };

  const heroSection = (
    <Box
      sx={{
        flex: '0 0 52%',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 45%, #2563eb 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { md: 6, lg: 8 },
        py: 8,
      }}
    >
      {/* Decorative blobs */}
      <Box sx={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(66,133,244,0.4) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', top: '45%', left: '55%',
        width: '220px', height: '220px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
        filter: 'blur(35px)', pointerEvents: 'none',
      }} />

      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 7 }}>
        <img src={studyLogLogoDark} alt="StudyLog" style={{ height: '40px' }} />
        <Typography sx={{ fontWeight: 900, fontSize: '30px', color: '#fff', letterSpacing: '-0.3px' }}>
          StudyLog
        </Typography>
      </Box>

      {/* Catch copy */}
      <Typography
        sx={{
          fontSize: { md: '36px', lg: '44px' },
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.2,
          letterSpacing: '-1px',
          mb: 2.5,
        }}
      >
        学習を、<br />習慣に変える。
      </Typography>
      <Typography sx={{
        fontSize: '20px', color: 'rgba(255,255,255,0.6)',
        mb: 7, lineHeight: 1.8, maxWidth: '320px',
      }}>
        学習記録をもっと、楽しく。
      </Typography>

      {/* Features */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {FEATURES.map(({ Icon, text }) => (
          <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: '11px', flexShrink: 0,
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: 500 }}>
              {text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const formPanel = (
    <Box
      sx={isMobile ? {
        backgroundColor: 'background.paper',
        borderRadius: '24px',
        p: { xs: 3.5, sm: 5 },
        width: '100%',
        maxWidth: '420px',
        boxShadow: theme.customShadows.lg,
      } : {
        width: '100%',
        maxWidth: '400px',
      }}
    >
      {/* Header */}
      {isMobile ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
          <img src={isDark ? studyLogLogoDark : studyLogLogo} alt="StudyLog" style={{ height: '30px' }} />
          <Typography sx={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px', color: 'text.primary' }}>
            StudyLog
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ fontWeight: 900, fontSize: '28px', letterSpacing: '-0.8px', color: 'text.primary', mb: 0.5 }}>
          {isLogin ? 'おかえりなさい' : 'はじめましょう'}
        </Typography>
      )}

      <Typography sx={{
        textAlign: isMobile ? 'center' : 'left',
        color: 'text.secondary', mb: 4, fontSize: '13px',
      }}>
        {isLogin ? 'アカウントにログインしてください' : 'アカウントを作成してください'}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3.5 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          variant="fullWidth"
          slotProps={{ indicator: { sx: { borderRadius: '3px 3px 0 0', height: '3px' } } }}
        >
          <Tab label="ログイン" sx={{ fontWeight: 'bold', fontSize: '14px', borderRadius: '12px 12px 0 0', '&:hover': { backgroundColor: 'action.hover' } }} />
          <Tab label="新規登録" sx={{ fontWeight: 'bold', fontSize: '14px', borderRadius: '12px 12px 0 0', '&:hover': { backgroundColor: 'action.hover' } }} />
        </Tabs>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>{errorMessage}</Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>{successMessage}</Alert>
      )}

      <TextField
        label="メールアドレス" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        fullWidth size="medium" disabled={isLoading}
        sx={{ mb: 2.5, ...inputSx }}
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
        sx={{ mb: 4, ...inputSx }}
      />

      <Button
        variant="contained" fullWidth size="large"
        onClick={handleSubmit} disabled={isLoading || isGoogleLoading} disableElevation
        sx={{
          borderRadius: '14px',
          fontWeight: 'bold',
          fontSize: '16px',
          py: 1.8,
          background: isLoading ? undefined : 'linear-gradient(135deg, #1d4ed8 0%, #4285F4 100%)',
          boxShadow: isLoading ? 'none' : '0 4px 16px rgba(66, 133, 244, 0.45)',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            boxShadow: '0 6px 22px rgba(66, 133, 244, 0.55)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        }}
      >
        {isLoading
          ? <CircularProgress size={24} color="inherit" />
          : isLogin ? 'ログイン' : 'アカウントを作成'
        }
      </Button>

      <Divider sx={{ my: 2.5 }}>
        <Typography sx={{ color: 'text.disabled', fontSize: '12px', px: 0.5, letterSpacing: '0.5px' }}>
          または
        </Typography>
      </Divider>

      <Button
        variant="outlined" fullWidth size="large"
        onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading} disableElevation
        startIcon={isGoogleLoading
          ? <CircularProgress size={18} color="inherit" />
          : (
            <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </Box>
          )
        }
        sx={{
          borderRadius: '14px',
          fontWeight: 600,
          fontSize: '15px',
          py: 1.6,
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
          color: 'text.primary',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f8ff',
            borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(66,133,244,0.45)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        }}
      >
        Google でログイン
      </Button>
    </Box>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <Box sx={{
        minHeight: '100vh',
        background: isDark
          ? 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 100%)'
          : 'linear-gradient(145deg, #dbeafe 0%, #ede9fe 55%, #fce7f3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: '-120px', right: '-120px',
          width: '380px', height: '380px', borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(66,133,244,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', bottom: '-80px', left: '-80px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        {formPanel}
      </Box>
    );
  }

  // PC layout
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {heroSection}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        px: { md: 5, lg: 8 },
        overflowY: 'auto',
      }}>
        {formPanel}
      </Box>
    </Box>
  );
}
