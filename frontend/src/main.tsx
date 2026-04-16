import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import Login from "./components/login-form";
import Signup from "./components/signup-form";
import ForgotPassword from "./components/ForgotPassword";

import NotFound from './components/NotFoundPage';
import SidebarDemo from './components/Sidebar';
import LoaderGate from './components/LoadingAnimation';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toast';
import ErrorBoundary from './components/ErrorBoundary';
import DebugPanel from './components/DebugPanel';

// Lazy load heavy components
const LandingPage = lazy(() => import('./components/landingPage/LandingPage'));
const HRMSDashboard = lazy(() => import('./components/dashboard'));
const GetProfile = lazy(() => import('./components/ProfileDisplay'));
const EmployeeDirectory = lazy(() => import('./components/hr/employeeDirectory/EmployeeDirectory'));
const AddEmployee = lazy(() => import('./components/hr/employeeDirectory/AddEmployee'));
const EmployeeLink = lazy(() => import('./components/hr/employeeDirectory/EmployeeLink'));
const HolidayManagementPage = lazy(() => import('./components/hr/HolidaysPage'));
const AnnouncementsPage = lazy(() => import('./components/hr/AnnouncementsPage'));
const TaskReportsManage = lazy(() => import('./components/hr/TaskReportsPage'));
const TaskReportGenerator = lazy(() => import('./components/hr/TaskReportGenerator'));
const MyAttendance = lazy(() => import('./components/employee/MyAttendance'));
const MyTaskReports = lazy(() => import('./components/employee/MyTaskReports'));
const MySalarySlips = lazy(() => import('./components/employee/MySalarySlips'));
const SalarySlipManagement = lazy(() => import('./components/hr/salary/SalarySlipManagement'));
const SalaryStructureManagement = lazy(() => import('./components/hr/salary/SalaryStructureManagement'));
const SalaryHub = lazy(() => import('./components/hr/salary/SalaryHub'));
const MyRequests = lazy(() => import('./components/employee/MyRequests'));
const DocumentsPage = lazy(() => import('./components/employee/DocumentsPage'));
const AdminRequestsPage = lazy(() => import('./components/hr/AdminRequestsPage'));
const PoliciesPage = lazy(() => import('./components/hr/PoliciesPage'));
const SettingsPage = lazy(() => import('./components/hr/SettingsPage'));
const ChatBot = lazy(() => import('./components/chatbot/chatbot'));
const MyExpenses = lazy(() => import('./components/employee/MyExpenses'));
const ExpenseManagement = lazy(() => import('./components/hr/ExpenseManagement'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));

// 🚀 PHASE 2 OPTIMIZATION: Enhanced loading component with skeleton
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <div className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">Loading...</div>
            {/* Skeleton loading for better UX */}
            <div className="hidden sm:block space-y-2 w-64">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
            </div>
        </div>
    </div>
);

// 🚀 PHASE 2 OPTIMIZATION: Component-specific loading states for better UX


// Enhanced loading states for different component types




createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <ErrorBoundary>
            <LoaderGate>
                <Toaster>
                    <QueryClientProvider client={queryClient}>
                        <ThemeProvider>
                            <BrowserRouter>
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        {/* Landing Page */}
                                        <Route path="/" element={<LandingPage />} />

                                        {/* Authentication Routes */}
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/auth/login" element={<Login />} />
                                        <Route path="/auth/signup" element={<Signup />} />
                                        <Route path="/auth/forgotPassword" element={<ForgotPassword />} />

                                        {/* HRMS Application Routes */}
                                        <Route path="/dashboard" element={<SidebarDemo />}>
                                            <Route index element={<HRMSDashboard />} />
                                        </Route>
                                        <Route path="/employees" element={<SidebarDemo />}>
                                            <Route index element={<EmployeeDirectory />} />
                                            <Route path=":employeeId" element={<EmployeeDirectory />} />
                                            <Route path="add" element={<AddEmployee />} />
                                            <Route path="link" element={<EmployeeLink />} />
                                        </Route>
                                        <Route path="/holidays" element={<SidebarDemo />}>
                                            <Route index element={<HolidayManagementPage />} />
                                        </Route>
                                        <Route path="/announcements" element={<SidebarDemo />}>
                                            <Route index element={<AnnouncementsPage />} />
                                        </Route>
                                        <Route path="/policies" element={<SidebarDemo />}>
                                            <Route index element={<PoliciesPage />} />
                                        </Route>
                                        <Route path="/settings" element={<SidebarDemo />}>
                                            <Route index element={<SettingsPage />} />
                                        </Route>
                                        <Route path="/attendance" element={<SidebarDemo />}>
                                            <Route path="my" element={<MyAttendance />} />
                                        </Route>
                                        <Route path="/task-reports" element={<SidebarDemo />}>
                                            <Route index element={<TaskReportsManage />} />
                                            <Route path="generate" element={<TaskReportGenerator />} />
                                            <Route path="my" element={<MyTaskReports />} />
                                        </Route>
                                        <Route path="/salary-slips" element={<SidebarDemo />}>
                                            <Route index element={<SalarySlipManagement />} />
                                            <Route path="my" element={<MySalarySlips />} />
                                        </Route>
                                        <Route path="/profile" element={<SidebarDemo />}>
                                            <Route index element={<GetProfile />} />
                                            <Route path="documents" element={<DocumentsPage />} />
                                        </Route>
                                        <Route path="/salary" element={<SidebarDemo />}>
                                            <Route index element={<SalaryHub />} />
                                        </Route>
                                        <Route path="/salary-structures" element={<SidebarDemo />}>
                                            <Route index element={<SalaryStructureManagement />} />
                                        </Route>
                                        <Route path="/requests" element={<SidebarDemo />}>
                                            <Route index element={<MyRequests />} />
                                        </Route>
                                        <Route path="/expenses" element={<SidebarDemo />}>
                                            <Route path="my" element={<MyExpenses />} />
                                        </Route>
                                        <Route path="/admin" element={<SidebarDemo />}>
                                            <Route path="requests" element={<AdminRequestsPage />} />
                                            <Route path="expenses" element={<ExpenseManagement />} />
                                        </Route>
                                        <Route path="/chatbot" element={<SidebarDemo />}>
                                            <Route index element={<ChatBot />} />
                                        </Route>

                                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                                        <Route path="*" element={<NotFound />} />
                                    </Routes>
                                </Suspense>
                            </BrowserRouter>
                            <DebugPanel />
                            <ReactQueryDevtools initialIsOpen={false} />
                        </ThemeProvider>
                    </QueryClientProvider>
                </Toaster>
            </LoaderGate>
        </ErrorBoundary>
    </StrictMode>,
)
