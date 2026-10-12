import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { ActivityPage } from './pages/ActivityPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BoardPage } from './pages/BoardPage';
import { TicketsPage } from './pages/TicketsPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
