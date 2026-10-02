import type { RouteObject } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { ExplorePage } from '../pages/ExplorePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PeoplePage } from '../pages/PeoplePage';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <ExplorePage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
