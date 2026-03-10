// src/components/AuthPage.tsx

import { useState, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Divider,
  Alert, CircularProgress, IconButton,
  useTheme, useMediaQuery,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import studyLogLogo from '../assets/studyLogLogo.svg';
import studyLogLogoDark from '../assets/studyLogLogo_dark.svg';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const OTP_LENGTH = 6;

const FEATURES = [
  { Icon: AutoStoriesOutlinedIcon, text: '毎日の学習をかんたんに記録。' },
  { Icon: BarChartOutlinedIcon,    text: '進捗をグラフで可視化。' },
  { Icon: EmojiEventsOutlinedIcon, text: 'ストリークで学習習慣を継続。' },
];

export default function AuthPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  const clearMessages = () => { setErrorMessage(''); setSuccessMessage(''); };

  // --- OTP 送信 ---
  const sendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  };

  const handleSendOtp = async () => {
    if (!email) {
      setErrorMessage('メールアドレスを入力してください。');
      return;
    }
    setIsLoading(true);
    clearMessages();
    try {
      await sendOtp();
      setStep('otp');
      setOtp(Array(OTP_LENGTH).fill(''));
      setSuccessMessage(`${email} に6桁の認証コードを送信しました。`);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setErrorMessage('送信回数の上限に達しました。しばらくしてから再度お試しください。');
      } else {
        setErrorMessage('コードの送信に失敗しました。メールアドレスを確認してください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    clearMessages();
    setOtp(Array(OTP_LENGTH).fill(''));
    try {
      await sendOtp();
      setSuccessMessage('コードを再送信しました。');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setErrorMessage('再送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- OTP 検証 ---
  const handleVerifyOtp = async (token: string) => {
    if (token.length < OTP_LENGTH) {
      setErrorMessage('6桁のコードをすべて入力してください。');
      return;
    }
    setIsLoading(true);
    clearMessages();
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from('profiles').upsert(
          { id: data.user.id, display_name: '名称未設定' },
          { onConflict: 'id', ignoreDuplicates: true },
        );
      }
      navigate('/home', { replace: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('Token')) {
        setErrorMessage('コードが無効または期限切れです。再送信してください。');
      } else {
        setErrorMessage('認証に失敗しました。コードを確認してください。');
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setIsLoading(false);
    }
  };

  // --- OTP 入力ハンドラ ---
  const handleOtpChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (digit && newOtp.every(d => d !== '')) handleVerifyOtp(newOtp.join(''));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!paste) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    paste.split('').forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    const focusIndex = Math.min(paste.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
    if (paste.length === OTP_LENGTH) handleVerifyOtp(paste);
  };

  // --- Google ログイン ---
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    clearMessages();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/home' },
    });
    if (error) {
      setErrorMessage('Google ログインに失敗しました。時間をおいて再度お試しください。');
      setIsGoogleLoading(false);
    }
  };

  // --- 共通スタイル ---
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

  const googleButton = (
    <Button
      variant="outlined" fullWidth size="large"
      onClick={handleGoogleSignIn}
      disabled={isLoading || isGoogleLoading}
      disableElevation
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
  );

  // --- Step 1: メールアドレス入力 ---
  const emailStepContent = (
    <>
      {googleButton}

      <Divider sx={{ my: 2.5 }}>
        <Typography sx={{ color: 'text.disabled', fontSize: '12px', px: 0.5, letterSpacing: '0.5px' }}>
          または
        </Typography>
      </Divider>

      <TextField
        label="メールアドレス"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
        fullWidth size="medium"
        disabled={isLoading || isGoogleLoading}
        sx={{ mb: 2.5, ...inputSx }}
      />

      <Button
        variant="contained" fullWidth size="large"
        onClick={handleSendOtp}
        disabled={isLoading || isGoogleLoading}
        disableElevation
        sx={primaryButtonSx}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : '続行'}
      </Button>
    </>
  );

  // --- Step 2: OTP 入力 ---
  const otpStepContent = (
    <>
      {/* 戻る + 送信先メール表示 */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 3.5 }}>
        <IconButton
          size="small"
          onClick={() => { setStep('email'); clearMessages(); setOtp(Array(OTP_LENGTH).fill('')); }}
          disabled={isLoading}
          sx={{
            mt: '-2px', color: 'text.secondary',
            '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
          }}
        >
          <ArrowBackOutlinedIcon fontSize="small" />
        </IconButton>
        <Box>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.6 }}>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{email}</Box>
            {' '}に送信した6桁のコードを入力してください。
          </Typography>
        </Box>
      </Box>

      {/* OTP ボックス */}
      <Box
        sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, justifyContent: 'center', mb: 3.5 }}
        onPaste={handleOtpPaste}
      >
        {otp.map((digit, index) => (
          <Box
            key={index}
            component="input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digit}
            ref={(el: HTMLInputElement | null) => { otpRefs.current[index] = el; }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOtpChange(index, e)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleOtpKeyDown(index, e)}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
            disabled={isLoading}
            sx={{
              width: { xs: '44px', sm: '54px' },
              height: { xs: '54px', sm: '64px' },
              borderRadius: '14px',
              border: `2px solid ${digit
                ? theme.palette.primary.main
                : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
              backgroundColor: digit
                ? (isDark ? 'rgba(66,133,244,0.12)' : 'rgba(66,133,244,0.06)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)'),
              fontSize: '26px',
              fontWeight: 700,
              textAlign: 'center',
              color: theme.palette.text.primary,
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
              fontFamily: 'inherit',
              cursor: isLoading ? 'not-allowed' : 'text',
              opacity: isLoading ? 0.6 : 1,
              '&:focus': {
                borderColor: theme.palette.primary.main,
                boxShadow: '0 0 0 3px rgba(66,133,244,0.22)',
                backgroundColor: isDark ? 'rgba(66,133,244,0.1)' : 'rgba(66,133,244,0.05)',
              },
            }}
          />
        ))}
      </Box>

      <Button
        variant="contained" fullWidth size="large"
        onClick={() => handleVerifyOtp(otp.join(''))}
        disabled={isLoading || otp.some(d => !d)}
        disableElevation
        sx={primaryButtonSx}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : '確認する'}
      </Button>

      <Button
        variant="text" fullWidth size="small"
        onClick={handleResendOtp}
        disabled={isLoading}
        sx={{
          mt: 1.5, color: 'text.secondary', fontSize: '13px',
          '&:hover': { color: 'primary.main', backgroundColor: 'transparent' },
        }}
      >
        コードを再送信する
      </Button>
    </>
  );

  // --- フォームパネル ---
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
      {/* ヘッダー */}
      {isMobile ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
          <img src={isDark ? studyLogLogoDark : studyLogLogo} alt="StudyLog" style={{ height: '30px' }} />
          <Typography sx={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px', color: 'text.primary' }}>
            StudyLog
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ fontWeight: 900, fontSize: '28px', letterSpacing: '-0.8px', color: 'text.primary', mb: 0.5 }}>
          {step === 'email' ? 'ログイン / 登録' : '認証コードを入力'}
        </Typography>
      )}

      <Typography sx={{
        textAlign: isMobile ? 'center' : 'left',
        color: 'text.secondary', mb: 3.5, fontSize: '13px',
      }}>
        {step === 'email'
          ? 'メールアドレスまたはGoogleで続行してください'
          : 'メールに届いたコードを入力してください'
        }
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>{errorMessage}</Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '13px' }}>{successMessage}</Alert>
      )}

      {step === 'email' ? emailStepContent : otpStepContent}
    </Box>
  );

  // --- ヒーローエリア (PC左側) ---
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 7 }}>
        <img src={studyLogLogoDark} alt="StudyLog" style={{ height: '40px' }} />
        <Typography sx={{ fontWeight: 900, fontSize: '30px', color: '#fff', letterSpacing: '-0.3px' }}>
          StudyLog
        </Typography>
      </Box>

      <Typography sx={{
        fontSize: { md: '36px', lg: '44px' },
        fontWeight: 900, color: '#fff',
        lineHeight: 1.2, letterSpacing: '-1px', mb: 2.5,
      }}>
        学習を、<br />習慣に変える。
      </Typography>
      <Typography sx={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', mb: 7, lineHeight: 1.8, maxWidth: '320px' }}>
        学習記録をもっと、楽しく。
      </Typography>

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

  // --- モバイルレイアウト ---
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

  // --- PC レイアウト ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {heroSection}
      <Box sx={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'background.default',
        px: { md: 5, lg: 8 },
        overflowY: 'auto',
      }}>
        {formPanel}
      </Box>
    </Box>
  );
}
