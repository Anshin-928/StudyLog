// src/app/RouteWrappers.tsx
// アプリ全体のコールバック（ストリーク・プロフィールの再取得）を Context から受け取り、画面に props で渡す

import { useContext } from 'react';

import { lazyWithReload } from '../lib/lazyWithReload';
import { AppCallbacksContext } from './contexts';

const HomePage = lazyWithReload(() => import('../features/home/HomePage'));
const RecordPage = lazyWithReload(() => import('../features/record/RecordPage'));
const EditProfilePage = lazyWithReload(() => import('../features/users/EditProfilePage'));

export function RecordRoute() {
  const { onRecordChanged } = useContext(AppCallbacksContext);
  return <RecordPage onRecordChanged={onRecordChanged} />;
}

export function HomeRoute() {
  const { onRecordChanged } = useContext(AppCallbacksContext);
  return <HomePage onRecordChanged={onRecordChanged} />;
}

export function EditProfileRoute() {
  const { onProfileSaved } = useContext(AppCallbacksContext);
  return <EditProfilePage onProfileSaved={onProfileSaved} />;
}
