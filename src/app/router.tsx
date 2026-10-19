// src/app/router.tsx

import { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { lazyWithReload } from '../lib/lazyWithReload';
import { HomeRoute, RecordRoute, EditProfileRoute } from './RouteWrappers';
import { FullScreenLoader, RouteErrorScreen } from './RouteFallbacks';
import AppShell from './AppShell';

// 各画面はルート単位でコード分割し、初回ロードのバンドルを軽くする
// 新しい版の公開後に古いチャンクを読み込めなかったら、自動で読み込み直す（src/lib/lazyWithReload.ts）
const AuthPage = lazyWithReload(() => import('../features/auth/AuthPage'));
const ReportPage = lazyWithReload(() => import('../features/report/ReportPage'));
const MaterialsPage = lazyWithReload(() => import('../features/materials/MaterialsPage'));
const SettingsPage = lazyWithReload(() => import('../features/settings/SettingsPage'));
const AddMaterialPage = lazyWithReload(() => import('../features/materials/AddMaterialPage'));
const ProfilePage = lazyWithReload(() => import('../features/users/ProfilePage'));
const UsersPage = lazyWithReload(() => import('../features/users/UsersPage'));
const ResetPasswordPage = lazyWithReload(() => import('../features/auth/ResetPasswordPage'));
const TermsOfServicePage = lazyWithReload(() => import('../features/legal/TermsOfServicePage'));
const PrivacyPolicyPage = lazyWithReload(() => import('../features/legal/PrivacyPolicyPage'));

// ==========================================
// ルーター定義
// ==========================================
export const router = createBrowserRouter([
  {
    // すべてのルートの表示エラーをここで受ける（ルートを追加しても errorElement を付け忘れないよう、1か所にまとめる）
    errorElement: <RouteErrorScreen />,
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<FullScreenLoader />}>
            <AuthPage />
          </Suspense>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <Suspense fallback={<FullScreenLoader />}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
      {
        path: '/terms',
        element: (
          <Suspense fallback={<FullScreenLoader />}>
            <TermsOfServicePage />
          </Suspense>
        ),
      },
      {
        path: '/privacy',
        element: (
          <Suspense fallback={<FullScreenLoader />}>
            <PrivacyPolicyPage />
          </Suspense>
        ),
      },
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            // 各画面のエラーはアプリの枠の中に出し、サイドバーなどから他の画面に移れるようにする
            errorElement: <RouteErrorScreen inline />,
            children: [
              { index: true, element: <Navigate to="/home" replace /> },
              { path: 'login', element: <Navigate to="/home" replace /> },
              { path: 'home', element: <HomeRoute /> },
              { path: 'record', element: <RecordRoute /> },
              { path: 'report', element: <ReportPage /> },
              { path: 'materials', element: <MaterialsPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'materials/add-new-material', element: <AddMaterialPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'profile/edit', element: <EditProfileRoute /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'users/:userId', element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
]);
