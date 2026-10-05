import type { RouteObject } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { ApprovalsPage } from '../features/accounts/ApprovalsPage';
import { AuditPage } from '../features/audit/AuditPage';
import { RequireAdmin, RequireSignIn } from '../features/auth/RequireSignIn';
import { SignInPage } from '../features/auth/SignInPage';
import { SignUpPage } from '../features/auth/SignUpPage';
import { ExplorePage } from '../pages/ExplorePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PeoplePage } from '../pages/PeoplePage';

export const routes: RouteObject[] = [
  { path: 'signin', element: <SignInPage /> },
  { path: 'signup', element: <SignUpPage /> },
  {
    // everything else needs you to be signed in
    element: <RequireSignIn />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <ExplorePage /> },
          { path: 'people', element: <PeoplePage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'accounts', element: <ApprovalsPage /> },
              { path: 'audit', element: <AuditPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
