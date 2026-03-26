/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Dialog } from '@headlessui/react';
import { XIcon, PencilIcon, DocumentTextIcon, CheckCircleIcon, ExclamationIcon, CalendarIcon, ChatAlt2Icon } from '@heroicons/react/outline';
import toast from 'react-hot-toast';

// FormField component
const FormField = memo(({ label, name, value, onChange, rows, placeholder, required = false }) => {
  const handleChange = useCallback((e) => {
    onChange(e);
  }, [onChange]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
});

FormField.displayName = 'FormField';

// ViewSection component
const ViewSection = memo(({ icon: Icon, title, content }) => (
  <div className="rounded-lg p-4 transition-all">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <Icon className="h-5 w-5" style={{ color: '#020c4c' }} />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        {content ? (
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <p className="text-gray-400 italic">Not provided</p>
        )}
      </div>
    </div>
  </div>
));

ViewSection.displayName = 'ViewSection';

const ReportModal = ({ 
  isOpen, 
  onClose, 
  date, 
  existingReport, 
  onSubmit, 
  onAddRemark,
  isEditing = false,
  onEdit 
}) => {
  const [formData, setFormData] = useState({
    workDone: '',
    accomplishments: '',
    challenges: '',
    tomorrowPlan: ''
  });
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(isEditing);
  const [isAddingRemark, setIsAddingRemark] = useState(false);
  const formRef = useRef(null);

  // Memoized handlers
  const handleWorkDoneChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, workDone: e.target.value }));
  }, []);

  const handleAccomplishmentsChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, accomplishments: e.target.value }));
  }, []);

  const handleChallengesChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, challenges: e.target.value }));
  }, []);

  const handleTomorrowPlanChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, tomorrowPlan: e.target.value }));
  }, []);

  const handleRemarksChange = useCallback((e) => {
    setRemarks(e.target.value);
  }, []);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingReport) {
        setFormData({
          workDone: existingReport.workDone || '',
          accomplishments: existingReport.accomplishments || '',
          challenges: existingReport.challenges || '',
          tomorrowPlan: existingReport.tomorrowPlan || ''
        });
        setRemarks(existingReport.remarks || '');
        setIsEditingMode(isEditing);
        setIsAddingRemark(false);
      } else {
        setFormData({
          workDone: '',
          accomplishments: '',
          challenges: '',
          tomorrowPlan: ''
        });
        setRemarks('');
        setIsEditingMode(true);
        setIsAddingRemark(false);
      }
      
      setTimeout(() => {
        if (formRef.current && (isEditingMode || !existingReport)) {
          const firstTextarea = formRef.current.querySelector('textarea');
          if (firstTextarea) {
            firstTextarea.focus();
          }
        }
      }, 100);
    }
  }, [isOpen, existingReport, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.workDone.trim()) {
      toast.error('Please describe what you did today');
      const workDoneField = formRef.current?.querySelector('textarea[name="workDone"]');
      if (workDoneField) workDoneField.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(existingReport ? 'Report updated successfully' : 'Daily report submitted successfully');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRemark = async () => {
    if (!remarks.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    setSubmittingRemark(true);
    try {
      await onAddRemark(remarks);
      toast.success('Remark added successfully');
      setRemarks('');
      setIsAddingRemark(false);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add remark');
    } finally {
      setSubmittingRemark(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Determine if we're in view mode (past report, not editing)
  const isViewMode = existingReport && !isEditingMode && !onEdit && !isAddingRemark;

  // Determine if this is a past report (can add remarks)
  const isPastReport = existingReport && !isEditingMode && !onEdit;

  // Determine title based on mode
  const getTitle = () => {
    if (isAddingRemark) return 'Add Remark to Report';
    if (isViewMode) return 'Daily Report';
    if (existingReport) return 'Edit Daily Report';
    return 'Submit Daily Report';
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
            <div className="flex items-center space-x-3">
              {isAddingRemark ? (
                <ChatAlt2Icon className="h-6 w-6" style={{ color: '#020c4c' }} />
              ) : (
                <DocumentTextIcon className="h-6 w-6" style={{ color: '#020c4c' }} />
              )}
              <Dialog.Title className="text-xl font-bold" style={{ color: '#020c4c' }}>
                {getTitle()}
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Date and Status Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(date)}</span>
              </div>

              {/* Action Buttons for Past Reports */}
              {isPastReport && !isAddingRemark && (
                <div className="flex gap-2">
                  {onAddRemark && (
                    <button
                      onClick={() => setIsAddingRemark(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <ChatAlt2Icon className="h-4 w-4" />
                      <span>Add Remark</span>
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => {
                        setIsEditingMode(true);
                        if (onEdit) onEdit();
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span>Edit Report</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Add Remark Mode */}
            {isAddingRemark ? (
              <div className="space-y-5">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Remark / Update <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={remarks}
                    onChange={handleRemarksChange}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional notes, updates, or comments about this day's work..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingRemark(false);
                      setRemarks('');
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddRemark}
                    disabled={submittingRemark}
                    className="px-5 py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#020c4c' }}
                  >
                    {submittingRemark ? 'Adding...' : 'Add Remark'}
                  </button>
                </div>
              </div>
            ) : isViewMode ? (
              /* View Mode - Display as styled cards with remarks at top */
              <div className="space-y-4">
                {/* Remarks Section - Display first for past reports */}
                {existingReport?.remarks && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ChatAlt2Icon className="h-5 w-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-blue-800">Remarks / Additional Notes</h3>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{existingReport.remarks}</p>
                    {existingReport.remarkAddedAt && (
                      <p className="text-xs text-blue-600 mt-2">
                        Last added on: {new Date(existingReport.remarkAddedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                
                <ViewSection 
                  icon={DocumentTextIcon}
                  title="Work Done"
                  content={formData.workDone}
                />
                
                <ViewSection 
                  icon={CheckCircleIcon}
                  title="Key Accomplishments"
                  content={formData.accomplishments}
                />
                
                <ViewSection 
                  icon={ExclamationIcon}
                  title="Challenges / Blockers"
                  content={formData.challenges}
                />
                
                <ViewSection 
                  icon={CalendarIcon}
                  title="Plan for Tomorrow"
                  content={formData.tomorrowPlan}
                />
              </div>
            ) : (
              /* Edit/Create Mode - Form */
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <FormField
                  label="What did you do today?"
                  name="workDone"
                  value={formData.workDone}
                  onChange={handleWorkDoneChange}
                  rows={4}
                  placeholder="Describe the tasks you worked on, meetings attended, etc..."
                  required
                />

                <FormField
                  label="Key Accomplishments"
                  name="accomplishments"
                  value={formData.accomplishments}
                  onChange={handleAccomplishmentsChange}
                  rows={3}
                  placeholder="What were your main achievements today?"
                />

                <FormField
                  label="Challenges / Blockers"
                  name="challenges"
                  value={formData.challenges}
                  onChange={handleChallengesChange}
                  rows={3}
                  placeholder="Any challenges you faced that need attention?"
                />

                <FormField
                  label="Plan for Tomorrow"
                  name="tomorrowPlan"
                  value={formData.tomorrowPlan}
                  onChange={handleTomorrowPlanChange}
                  rows={3}
                  placeholder="What do you plan to work on tomorrow?"
                />

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (existingReport && !isEditingMode) {
                        setIsEditingMode(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-5 py-2.5 text-white rounded-lg font-medium transition-all ${
                      submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 hover:scale-105'
                    }`}
                    style={{ background: '#020c4c' }}
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      existingReport ? 'Update Report' : 'Submit Report'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Close Button for View Mode */}
            {isViewMode && (
              <div className="flex justify-end pt-6 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ReportModal;