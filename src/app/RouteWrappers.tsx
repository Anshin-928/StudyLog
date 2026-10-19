// src/app/RouteWrappers.tsx
// アプリ全体のコールバック（ストリーク・プロフィールの再取得）を Context から受け取り、画面に props で渡す

import { useContext } from 'react';

import { lazyWithReload } from '../lib/lazyWithReload';
import { AppCallbacksContext } from './contexts';

const HomePage = lazyWithReload(() => import('../features/home/HomePage'));
const RecordPage = lazyWithReload(() => import('../features/record/RecordPage'));
const EditProfilePage = lazyWithReload(() => import('../features/users/EditProfilePage'));

export function RecordRoute() {
  const { onRecordSaved } = useContext(AppCallbacksContext);
  return <RecordPage onRecordSaved={onRecordSaved} />;
}

export function HomeRoute() {
  const { onRecordSaved } = useContext(AppCallbacksContext);
  return <HomePage onRecordDeleted={onRecordSaved} />;
}

export function EditProfileRoute() {
  const { onProfileSaved } = useContext(AppCallbacksContext);
  return <EditProfilePage onProfileSaved={onProfileSaved} />;
}
