// src/components/ResetPasswordPage.tsx

import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button,
  Alert, CircularProgress, InputAdornment, IconButton,
  useTheme, useMediaQuery,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import studyLogLogo from '../assets/studyLogLogo.svg';
import studyLogLogoDark from '../assets/studyLogLogo_dark.svg';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Status = 'loading' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // PASSWORD_RECOVERY イベントを受信したらフォームを表示
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready');
      }
    });

    // イベントが一定時間内に来なければリンク無効と判断
    const fallbackTimer = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'invalid' : prev);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      setErrorMessage('パスワードを入力してください。');
      return;
    }
    if (password.length < 12) {
      setErrorMessage('パスワードは12文字以上で入力してください。');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('パスワードが一致しません。確認用パスワードを再入力してください。');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMessage('パスワードを更新しました。ホーム画面へ移動します...');
      setTimeout(() => navigate('/home', { replace: true }), 2000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('different from the old password')) {
        setErrorMessage('現在のパスワードと同じです。別のパスワードを設定してください。');
      } else {
        setErrorMessage('パスワードの更新に失敗しました。リンクが期限切れの可能性があります。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ---- 共通スタイル ----
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      transition: 'box-shadow 0.2s',
      '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)' },
      '&:hover fieldset': { borderColor: theme.palette.primary.main },
      '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(66, 133, 244, 0.18)' },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
      '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.subtle} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: theme.palette.text.primary,
        borderRadius: 'inherit',
      },
    },
  };

  const primaryButtonSx = {
    borderRadius: '14px',
    fontWeight: 'bold',
    fontSize: '16px',
    py: 1.8,
    background: 'linear-gradient(135deg, #1d4ed8 0%, #4285F4 100%)',
    boxShadow: '0 4px 16px rgba(66, 133, 244, 0.45)',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
      boxShadow: '0 6px 22px rgba(66, 133, 244, 0.55)',
      transform: 'translateY(-1px)',
    },
    '&:active': { transform: 'translateY(0)' },
    '&.Mui-disabled': {
      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
      boxShadow: 'none',
    },
  };

  const eyeAdornment = (visible: boolean, toggle: () => void) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton onClick={toggle} edge="end" size="small" tabIndex={-1}>
          {visible
            ? <VisibilityOffOutlinedIcon fontSize="small" />
            : <VisibilityOutlinedIcon fontSize="small" />}
        </IconButton>
      </InputAdornment>
    ),
  });

  // ---- コンテンツ ----
  const content = () => {
    if (status === 'loading') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={36} />
          <Typography sx={{ color: 'text.secondary', fontSize: '14px' }}>
            認証情報を確認しています...
          </Typography>
        </Box>
      );
    }

    if (status === 'invalid') {
      return (
        <>
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontSize: '13px' }}>
            リンクが無効または期限切れです。パスワードリセットをもう一度お試しください。
          </Alert>
          <Button
            variant="outlined" fullWidth size="large"
            onClick={() => navigate('/login', { replace: true })}
            sx={{ borderRadius: '14px', fontWeight: 600, py: 1.8 }}
          >
            ログイン画面へ戻る
          </Button>
        </>
      );
    }

    return (
      <>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>{errorMessage}</Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>{successMessage}</Alert>
        )}

        <TextField
          label="新しいパスワード"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
          fullWidth size="medium" disabled={isLoading || !!successMessage}
          helperText="12文字以上で設定してください"
          slotProps={{ input: eyeAdornment(showPassword, () => setShowPassword(v => !v)) }}
          sx={{ mb: 2.5, ...inputSx }}
        />
        <TextField
          label="新しいパスワード（確認用）"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
          fullWidth size="medium" disabled={isLoading || !!successMessage}
          slotProps={{ input: eyeAdornment(showConfirmPassword, () => setShowConfirmPassword(v => !v)) }}
          sx={{ mb: 3, ...inputSx }}
        />
        <Button
          variant="contained" fullWidth size="large"
          onClick={handleUpdatePassword}
          disabled={isLoading || !!successMessage}
          disableElevation sx={primaryButtonSx}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'パスワードを更新する'}
        </Button>
      </>
    );
  };

  const cardContent = (
    <Box
      sx={isMobile ? {
        backgroundColor: 'background.paper',
        borderRadius: '24px',
        p: { xs: 3.5, sm: 5 },
        width: '100%', maxWidth: '420px',
        boxShadow: theme.customShadows.lg,
      } : {
        width: '100%', maxWidth: '400px',
      }}
    >
      {isMobile && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
          <img src={isDark ? studyLogLogoDark : studyLogLogo} alt="StudyLog" style={{ height: '30px' }} />
          <Typography sx={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px', color: 'text.primary' }}>
            StudyLog
          </Typography>
        </Box>
      )}

      {!isMobile && (
        <Typography sx={{ fontWeight: 900, fontSize: '28px', letterSpacing: '-0.8px', color: 'text.primary', mb: 0.5 }}>
          パスワードの再設定
        </Typography>
      )}

      <Typography sx={{ textAlign: isMobile ? 'center' : 'left', color: 'text.secondary', mb: 3.5, fontSize: '13px' }}>
        {status === 'ready' ? '新しいパスワードを入力してください' : ''}
      </Typography>

      {content()}
    </Box>
  );

  if (isMobile) {
    return (
      <Box sx={{
        minHeight: '100vh',
        background: isDark
          ? 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 100%)'
          : 'linear-gradient(145deg, #dbeafe 0%, #ede9fe 55%, #fce7f3 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 2, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: '-120px', right: '-120px', width: '380px', height: '380px', borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(66,133,244,0.2) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        {cardContent}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* PC 左側: シンプルなグラデーションパネル */}
      <Box sx={{
        flex: '0 0 52%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 45%, #2563eb 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        px: { md: 6, lg: 8 }, py: 8,
      }}>
        <Box sx={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(66,133,244,0.4) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <img src={studyLogLogoDark} alt="StudyLog" style={{ height: '40px' }} />
          <Typography sx={{ fontWeight: 900, fontSize: '30px', color: '#fff', letterSpacing: '-0.3px' }}>
            StudyLog
          </Typography>
        </Box>
        <Typography sx={{ fontSize: { md: '28px', lg: '36px' }, fontWeight: 900, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.8px', textAlign: 'center' }}>
          パスワードを<br />再設定します
        </Typography>
      </Box>

      {/* PC 右側: フォーム */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default', px: { md: 5, lg: 8 }, overflowY: 'auto' }}>
        {cardContent}
      </Box>
    </Box>
  );
}
