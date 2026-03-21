/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XIcon, PencilIcon, DocumentTextIcon, CheckCircleIcon, ExclamationIcon, CalendarIcon } from '@heroicons/react/outline';
import toast from 'react-hot-toast';

const ReportModal = ({ isOpen, onClose, date, existingReport, onSubmit }) => {
  const [formData, setFormData] = useState({
    workDone: '',
    accomplishments: '',
    challenges: '',
    tomorrowPlan: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (existingReport) {
      setFormData({
        workDone: existingReport.workDone || '',
        accomplishments: existingReport.accomplishments || '',
        challenges: existingReport.challenges || '',
        tomorrowPlan: existingReport.tomorrowPlan || ''
      });
      setIsEditing(existingReport.editable || false);
    } else {
      setFormData({
        workDone: '',
        accomplishments: '',
        challenges: '',
        tomorrowPlan: ''
      });
      setIsEditing(true);
    }
  }, [existingReport, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.workDone.trim()) {
      toast.error('Please describe what you did today');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Daily report submitted successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to submit report', error);
    } finally {
      setSubmitting(false);
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

  // View Mode Component
  const ViewSection = ({ icon: Icon, title, content }) => (
    <div className={`rounded-lg p-4 transition-all`}>
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
  );

  // Edit Mode Form Field
  const FormField = ({ label, name, value, onChange, rows, placeholder, required = false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  const isViewMode = existingReport && !existingReport.editable && !isEditing;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-6 w-6" style={{ color: '#020c4c' }} />
              <Dialog.Title className="text-xl font-bold" style={{ color: '#020c4c' }}>
                {isViewMode ? 'Daily Report' : existingReport ? 'Edit Daily Report' : 'Submit Daily Report'}
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

              {/* Edit Button for View Mode */}
              {isViewMode && existingReport?.editable !== false && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit Report</span>
                </button>
              )}
            </div>

            {/* View Mode - Display as styled cards */}
            {isViewMode ? (
              <div className="space-y-4">
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
              <form onSubmit={handleSubmit} className="space-y-5">
                <FormField
                  label="What did you do today?"
                  name="workDone"
                  value={formData.workDone}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe the tasks you worked on, meetings attended, etc..."
                  required
                />

                <FormField
                  label="Key Accomplishments"
                  name="accomplishments"
                  value={formData.accomplishments}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What were your main achievements today?"
                />

                <FormField
                  label="Challenges / Blockers"
                  name="challenges"
                  value={formData.challenges}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any challenges you faced that need attention?"
                />

                <FormField
                  label="Plan for Tomorrow"
                  name="tomorrowPlan"
                  value={formData.tomorrowPlan}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What do you plan to work on tomorrow?"
                />

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (existingReport && !existingReport.editable) {
                        setIsEditing(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    {existingReport && !existingReport.editable ? 'Cancel' : 'Cancel'}
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
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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