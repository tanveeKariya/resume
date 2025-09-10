import React, { useState } from 'react';
import { Calendar, Users, Clock, CheckCircle, Plus, Filter, Eye, MessageSquare } from 'lucide-react';
import { JobService, InterviewService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface JobWithApplicants {
  _id: string;
  title: string;
  company: string;
  location: string;
  applicants: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
      profile?: any;
    };
    resumeId: {
      _id: string;
      fileName: string;
      extractedData: any;
    };
    matchScore: number;
    appliedAt: string;
    status: string;
    candidateBrief?: string;
  }>;
}

export default function HRDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<'jobs' | 'applicants' | 'interviews'>('jobs');
  const [jobs, setJobs] = useState<JobWithApplicants[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const [applicationAction, setApplicationAction] = useState<{
    candidateId: string;
    jobId: string;
    action: 'approve' | 'reject';
  } | null>(null);

  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    description: '',
    location: '',
    type: 'full-time',
    skills: '',
    experienceMin: 0,
    experienceMax: 5,
    experienceLevel: 'mid',
    salaryMin: 50000,
    salaryMax: 100000,
    degree: '',
    stream: ''
  });

  const [newInterview, setNewInterview] = useState({
    scheduledDateTime: '',
    duration: 60,
    type: 'technical',
    meetingLink: '',
    notes: ''
  });

  React.useEffect(() => {
    if (user?.role === 'hr') {
      loadJobs();
      loadInterviews();
    }
  }, [user]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await JobService.getJobs();
      if (response.success) {
        setJobs(
          response.data.jobs.map((job: any) => ({
            ...job,
            applicants: (job.applicants || []).map((applicant: any) => ({
              ...applicant,
              userId: typeof applicant.userId === 'object' ? applicant.userId : { _id: applicant.userId, name: '', email: '' },
              resumeId: typeof applicant.resumeId === 'object' ? applicant.resumeId : { _id: applicant.resumeId, fileName: '', extractedData: {} }
            }))
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobApplicants = async (jobId: string) => {
    try {
      const response = await JobService.getJobApplicants(jobId);
      if (response.success) {
        const updatedJobs = jobs.map(job => 
          job._id === jobId 
            ? { ...job, applicants: response.data.applicants }
            : job
        );
        setJobs(updatedJobs);
      }
    } catch (error) {
      console.error('Failed to load applicants:', error);
    }
  };

  const loadInterviews = async () => {
    try {
      const response = await InterviewService.getUserInterviews();
      if (response.success) {
        setInterviews(response.data);
      }
    } catch (error) {
      console.error('Failed to load interviews:', error);
    }
  };

  const createJob = async () => {
    try {
      setLoading(true);
      const jobData = {
        title: newJob.title,
        company: newJob.company,
        description: newJob.description,
        location: newJob.location,
        type: newJob.type,
        requirements: {
          skills: newJob.skills.split(',').map(s => s.trim()),
          experience: {
            min: newJob.experienceMin,
            max: newJob.experienceMax,
            level: newJob.experienceLevel
          },
          education: {
            degree: newJob.degree,
            stream: newJob.stream.split(',').map(s => s.trim())
          }
        },
        salary: {
          min: newJob.salaryMin,
          max: newJob.salaryMax,
          currency: 'USD'
        }
      };

      const response = await JobService.createJob(jobData);
      if (response.success) {
        setJobs([{ ...response.data, applicants: [] }, ...jobs]);
        setShowCreateJob(false);
        setNewJob({
          title: '',
          company: '',
          description: '',
          location: '',
          type: 'full-time',
          skills: '',
          experienceMin: 0,
          experienceMax: 5,
          experienceLevel: 'mid',
          salaryMin: 50000,
          salaryMax: 100000,
          degree: '',
          stream: ''
        });
        alert('Job posted successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async () => {
    if (!selectedCandidate || !selectedJob) return;

    try {
      setLoading(true);
      const interviewData = {
        jobId: selectedJob,
        candidateId: selectedCandidate.userId._id,
        resumeId: selectedCandidate.resumeId._id,
        scheduledDateTime: newInterview.scheduledDateTime,
        duration: newInterview.duration,
        type: newInterview.type,
        meetingLink: newInterview.meetingLink,
        notes: newInterview.notes
      };

      const response = await InterviewService.scheduleInterview(interviewData);
      if (response.success) {
        setInterviews([response.data, ...interviews]);
        setShowScheduleModal(false);
        setSelectedCandidate(null);
        setNewInterview({
          scheduledDateTime: '',
          duration: 60,
          type: 'technical',
          meetingLink: '',
          notes: ''
        });
        alert('Interview scheduled successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (candidateId: string, jobId: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate the action
      const message = action === 'approve' 
        ? 'Congratulations! Your application has been approved. You will be contacted soon for the next steps.'
        : 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates at this time.';
      
      // Update the applicant status locally
      const updatedJobs = jobs.map(job => {
        if (job._id === jobId) {
          const updatedApplicants = job.applicants.map(applicant => {
            if (applicant.userId._id === candidateId) {
              return {
                ...applicant,
                status: action === 'approve' ? 'shortlisted' : 'rejected'
              };
            }
            return applicant;
          });
          return { ...job, applicants: updatedApplicants };
        }
        return job;
      });
      
      setJobs(updatedJobs);
      
      alert(`Application ${action}d successfully!\n\nCandidate will be notified: "${message}"`);
    } catch (error: any) {
      alert(`Failed to ${action} application`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-100 text-success-800';
      case 'pending': return 'bg-warning-100 text-warning-800';
      case 'completed': return 'bg-primary-100 text-primary-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Dashboard</h1>
          <p className="text-gray-600">Manage job postings, candidates, and interviews</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowCreateJob(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Post Job</span>
          </button>
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Post New Job</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Job Title *"
                value={newJob.title}
                onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <input
                type="text"
                placeholder="Company *"
                value={newJob.company}
                onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <input
                type="text"
                placeholder="Location *"
                value={newJob.location}
                onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <select
                value={newJob.type}
                onChange={(e) => setNewJob({...newJob, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
              
              <input
                type="text"
                placeholder="Required Skills (comma separated) *"
                value={newJob.skills}
                onChange={(e) => setNewJob({...newJob, skills: e.target.value})}
                className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Experience (years)"
                  value={newJob.experienceMin}
                  onChange={(e) => setNewJob({...newJob, experienceMin: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max Experience (years)"
                  value={newJob.experienceMax}
                  onChange={(e) => setNewJob({...newJob, experienceMax: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Salary"
                  value={newJob.salaryMin}
                  onChange={(e) => setNewJob({...newJob, salaryMin: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max Salary"
                  value={newJob.salaryMax}
                  onChange={(e) => setNewJob({...newJob, salaryMax: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <textarea
                placeholder="Job Description *"
                value={newJob.description}
                onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={4}
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={createJob}
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Post Job'}
              </button>
              <button
                onClick={() => setShowCreateJob(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Interview</h3>
            <p className="text-gray-600 mb-4">Candidate: {selectedCandidate.userId.name}</p>
            
            <div className="space-y-4">
              <input
                type="datetime-local"
                value={newInterview.scheduledDateTime}
                onChange={(e) => setNewInterview({...newInterview, scheduledDateTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <select
                value={newInterview.type}
                onChange={(e) => setNewInterview({...newInterview, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="technical">Technical Interview</option>
                <option value="hr">HR Interview</option>
                <option value="behavioral">Behavioral Interview</option>
                <option value="final">Final Interview</option>
              </select>
              
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={newInterview.duration}
                onChange={(e) => setNewInterview({...newInterview, duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <input
                type="url"
                placeholder="Meeting Link"
                value={newInterview.meetingLink}
                onChange={(e) => setNewInterview({...newInterview, meetingLink: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <textarea
                placeholder="Notes"
                value={newInterview.notes}
                onChange={(e) => setNewInterview({...newInterview, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={scheduleInterview}
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedCandidate(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Management Dashboard</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('jobs')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'jobs' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Jobs
            </button>
            <button
              onClick={() => setView('applicants')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'applicants' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Applicants
            </button>
            <button
              onClick={() => setView('interviews')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'interviews' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Interviews
            </button>
          </div>
        </div>

        {view === 'jobs' && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
                    <p className="text-gray-600">{job.company} • {job.location}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {job.applicants?.length || 0} applicants
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedJob(job._id);
                        setView('applicants');
                        loadJobApplicants(job._id);
                      }}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Applicants</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'applicants' && (
          <div className="space-y-4">
            {selectedJob ? (
              <>
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    onClick={() => setView('jobs')}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    ← Back to Jobs
                  </button>
                  <h3 className="font-semibold text-gray-900">
                    Applicants for {jobs.find(j => j._id === selectedJob)?.title}
                  </h3>
                </div>
                
                {jobs.find(j => j._id === selectedJob)?.applicants?.map((applicant) => (
                  <div key={applicant.userId._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{applicant.userId.name}</h4>
                        <p className="text-gray-600">{applicant.userId.email}</p>
                        <p className="text-sm text-primary-600 font-medium">
                          Match Score: {applicant.matchScore}%
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Applied: {new Date(applicant.appliedAt).toLocaleDateString()}
                        </p>
                        {applicant.candidateBrief && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">{applicant.candidateBrief}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedCandidate(applicant);
                            setShowScheduleModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-secondary-600 text-white rounded hover:bg-secondary-700 transition-colors flex items-center space-x-1"
                        >
                          <Calendar className="h-4 w-4" />
                          <span>Schedule</span>
                        </button>
                        {applicant.status === 'applied' && (
                          <>
                            <button 
                              onClick={() => handleApplicationAction(applicant.userId._id, selectedJob!, 'approve')}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApplicationAction(applicant.userId._id, selectedJob!, 'reject')}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {applicant.status !== 'applied' && (
                          <span className={`px-3 py-1 text-sm rounded font-medium ${
                            applicant.status === 'shortlisted' 
                              ? 'bg-green-100 text-green-800' 
                              : applicant.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">Select a job to view applicants</p>
            )}
          </div>
        )}

        {view === 'interviews' && (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div key={interview._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {interview.candidateId?.name} - {interview.jobId?.title}
                    </h4>
                    <p className="text-gray-600">{interview.jobId?.company}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>{new Date(interview.scheduledDateTime).toLocaleDateString()}</span>
                      <span>{new Date(interview.scheduledDateTime).toLocaleTimeString()}</span>
                      <span>{interview.duration} min</span>
                    </div>
                    {interview.candidateBrief && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">{interview.candidateBrief}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                      {interview.status}
                    </span>
                    {interview.meetingLink && (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}