import React, { useState } from 'react';
import { TestTube, Send, Save, RotateCcw, XCircle, CheckCircle } from 'lucide-react';
import { NotificationSettingsData } from './types';

interface NotificationSettingsProps {
    notifications: NotificationSettingsData;
    onUpdate: (newNotifications: NotificationSettingsData) => void;
    onTestNotification: () => void;
    testingNotification: boolean;
    onTestHrReport: () => void;
    testingHrReport: boolean;
    onSave: () => void;
    onReset: () => void;
    loading: boolean;
    saving: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
    notifications,
    onUpdate,
    onTestNotification,
    testingNotification,
    onTestHrReport,
    testingHrReport,
    onSave,
    onReset,
    loading,
    saving
}) => {
    const updateField = (field: keyof NotificationSettingsData, value: any) => {
        onUpdate({ ...notifications, [field]: value });
    };

    const updateNestedField = (parent: keyof NotificationSettingsData, field: string, value: any) => {
        onUpdate({
            ...notifications,
            [parent]: {
                ...(notifications[parent] as any),
                [field]: value
            }
        });
    };

    const handleAddEmail = () => {
        updateField('hrEmails', [...notifications.hrEmails, '']);
    };

    const handleRemoveEmail = (index: number) => {
        const newEmails = notifications.hrEmails.filter((_, i) => i !== index);
        updateField('hrEmails', newEmails);
    };

    const handleEmailChange = (index: number, value: string) => {
        const newEmails = [...notifications.hrEmails];
        newEmails[index] = value;
        updateField('hrEmails', newEmails);
    };

    const handleAddPhone = () => {
        updateField('hrPhones', [...notifications.hrPhones, '']);
    };

    const handleRemovePhone = (index: number) => {
        const newPhones = notifications.hrPhones.filter((_, i) => i !== index);
        updateField('hrPhones', newPhones);
    };

    const handlePhoneChange = (index: number, value: string) => {
        const newPhones = [...notifications.hrPhones];
        newPhones[index] = value;
        updateField('hrPhones', newPhones);
    };

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={onReset}
                    disabled={loading || saving}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Discard changes and reload"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset</span>
                </button>
                <button
                    onClick={onSave}
                    disabled={saving || loading}
                    className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
            </div>

            {/* HR Contact Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">HR Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            HR Email Addresses
                        </label>
                        <div className="space-y-2">
                            {notifications.hrEmails.map((email, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => handleEmailChange(index, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                                        placeholder="hr@company.com"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveEmail(index)}
                                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm"
                                    >
                                        <span className="hidden sm:inline">Remove</span>
                                        <span className="sm:hidden">×</span>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddEmail}
                                className="w-full px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                + Add Email
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            HR WhatsApp Numbers
                        </label>
                        <div className="space-y-2">
                            {notifications.hrPhones.map((phone, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => handlePhoneChange(index, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                                        placeholder="+919876543210"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePhone(index)}
                                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm"
                                    >
                                        <span className="hidden sm:inline">Remove</span>
                                        <span className="sm:hidden">×</span>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddPhone}
                                className="w-full px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                + Add Phone
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Channels */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Notification Channels</h3>
                    <button
                        type="button"
                        onClick={onTestNotification}
                        disabled={testingNotification}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        {testingNotification ? (
                            <>
                                <TestTube className="w-4 h-4 animate-pulse" />
                                <span>Testing...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>Test All</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">Email Notifications</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Send detailed notifications via email</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications.emailEnabled}
                            onChange={(e) => updateField('emailEnabled', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">WhatsApp Notifications</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Send instant alerts via WhatsApp</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications.whatsappEnabled}
                            onChange={(e) => updateField('whatsappEnabled', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">Browser Push Notifications</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Show notifications in browser</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications.pushEnabled}
                            onChange={(e) => updateField('pushEnabled', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Employee Milestone Alerts */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Employee Milestone Alerts</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Get notified about employee anniversaries</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={notifications.milestoneAlertsEnabled}
                        onChange={(e) => updateField('milestoneAlertsEnabled', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                </div>
                {notifications.milestoneAlertsEnabled && (
                    <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={notifications.milestoneTypes.threeMonths}
                                onChange={(e) => updateNestedField('milestoneTypes', 'threeMonths', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">3 Month Anniversary</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={notifications.milestoneTypes.sixMonths}
                                onChange={(e) => updateNestedField('milestoneTypes', 'sixMonths', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">6 Month Anniversary</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={notifications.milestoneTypes.oneYear}
                                onChange={(e) => updateNestedField('milestoneTypes', 'oneYear', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">1 Year Anniversary</label>
                        </div>
                    </div>
                )}
            </div>

            {/* Holiday Reminders */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Holiday Reminders</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Notify employees about upcoming holidays</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={notifications.holidayReminderEnabled}
                        onChange={(e) => updateField('holidayReminderEnabled', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                </div>
                {notifications.holidayReminderEnabled && (
                    <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Days before holiday to remind:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="7"
                                value={notifications.holidayReminderDays}
                                onChange={(e) => updateField('holidayReminderDays', parseInt(e.target.value))}
                                className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* HR Email Type Preferences */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">HR Email Preferences</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Choose which email notifications HR team should receive</p>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    {[
                        { key: 'leaveRequests', label: 'Leave Requests', desc: 'Notifications when employees submit leave requests' },
                        { key: 'wfhRequests', label: 'Work From Home Requests', desc: 'Notifications when employees request to work from home' },
                        { key: 'regularizationRequests', label: 'Regularization Requests', desc: 'Notifications for attendance regularization requests' },
                        { key: 'helpRequests', label: 'Help Requests', desc: 'Notifications when employees need assistance' },
                        { key: 'employeeMilestones', label: 'Employee Milestones', desc: 'Work anniversary notifications' },
                        { key: 'expenseRequests', label: 'Expense Requests', desc: 'Notifications for employee reimbursement claims' }
                    ].map(type => (
                        <div key={type.key} className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">{type.label}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{type.desc}</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.hrEmailTypes?.[type.key as keyof typeof notifications.hrEmailTypes] ?? true}
                                onChange={(e) => updateNestedField('hrEmailTypes', type.key, e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Daily HR Attendance Report */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Daily HR Attendance Report</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Automated attendance reports grouped by office location</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={notifications.dailyHrAttendanceReport?.enabled || false}
                        onChange={(e) => updateNestedField('dailyHrAttendanceReport', 'enabled', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                </div>

                {notifications.dailyHrAttendanceReport?.enabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                        {/* Send Time */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">
                                Send time:
                            </label>
                            <div className="flex-1">
                                <input
                                    type="time"
                                    value={notifications.dailyHrAttendanceReport?.sendTime || '19:00'}
                                    onChange={(e) => updateNestedField('dailyHrAttendanceReport', 'sendTime', e.target.value)}
                                    className="w-32 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Best after work hours to capture full day attendance
                                </p>
                            </div>
                        </div>

                        {/* Include Absentees */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="includeAbsentees"
                                checked={notifications.dailyHrAttendanceReport?.includeAbsentees !== false}
                                onChange={(e) => updateNestedField('dailyHrAttendanceReport', 'includeAbsentees', e.target.checked)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded"
                            />
                            <label htmlFor="includeAbsentees" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Include absent employees
                            </label>
                        </div>

                        {/* Subject Line */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Email subject:
                            </label>
                            <input
                                type="text"
                                value={notifications.dailyHrAttendanceReport?.subjectLine || 'Daily Attendance Report - {date}'}
                                onChange={(e) => updateNestedField('dailyHrAttendanceReport', 'subjectLine', e.target.value)}
                                maxLength={200}
                                placeholder="Daily Attendance Report - {date}"
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Use <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{date}'}</code> for current date
                            </p>
                        </div>

                        {/* Recipients Display */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Recipients</p>
                            <div className="flex flex-wrap gap-2">
                                {notifications.hrEmails && notifications.hrEmails.length > 0 ? (
                                    notifications.hrEmails.map((email, index) => (
                                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                                            {email}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-red-600 dark:text-red-400">⚠️ Configure HR emails above first</span>
                                )}
                            </div>
                        </div>

                        {/* Test Button */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={onTestHrReport}
                                disabled={testingHrReport || !notifications.hrEmails || notifications.hrEmails.length === 0}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {testingHrReport ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Send Test Report</span>
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Sends report to all HR emails immediately for testing
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationSettings;
