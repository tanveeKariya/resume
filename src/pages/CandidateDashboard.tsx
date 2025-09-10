import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, CheckCircle, AlertCircle, User } from 'lucide-react';
import { InterviewService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Interview {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
    location: string;
  };
  recruiterId: {
    _id: string;
    name: string;
    email: string;
  };
  scheduledDateTime: string;
  duration: number;
  type: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  meetingLink?: string;
  notes?: string;
  candidateBrief?: string;
  slotExpiresAt: string;
  feedback?: {
    rating: number;
    comments: string;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  };
}

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user?.role === 'candidate') {
      loadInterviews();
    }
  }, [user]);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const response = await InterviewService.getUserInterviews();
      if (response.success) {
        setInterviews(response.data);
      }
    } catch (error) {
      console.error('Failed to load interviews:', error);
      // Set empty array if no interviews found
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const respondToInterview = async (interviewId: string, response: 'accept' | 'decline') => {
    try {
      setLoading(true);
      const result = await InterviewService.respondToInterview(interviewId, response);
      if (result.success) {
        await loadInterviews();
        const message = response === 'accept' 
          ? 'Interview accepted successfully! You will receive a calendar invite shortly.'
          : 'Interview declined. Thank you for letting us know.';
        alert(message);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || `Failed to ${response} interview`);
    } finally {
      setLoading(false);
    }
  };

  const upcomingInterviews = interviews.filter(i => 
    i.status !== 'completed' && new Date(i.scheduledDateTime) > new Date()
  );
  const pastInterviews = interviews.filter(i => 
    i.status === 'completed' || new Date(i.scheduledDateTime) <= new Date()
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Interviews</h1>
        <p className="text-gray-600">Manage your interview schedule and view feedback</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{upcomingInterviews.length}</span>
          </div>
          <p className="text-gray-600 font-medium mt-2">Upcoming</p>
          <p className="text-sm text-blue-600">
            {upcomingInterviews.length > 0 
              ? `Next: ${formatDate(upcomingInterviews[0].scheduledDateTime)}` 
              : 'None scheduled'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-secondary-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{pastInterviews.length}</span>
          </div>
          <p className="text-gray-600 font-medium mt-2">Completed</p>
          <p className="text-sm text-green-600">
            {pastInterviews.length > 0 ? 'Recently completed' : 'No completed interviews'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-accent-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {interviews.filter(i => i.status === 'pending').length}
            </span>
          </div>
          <p className="text-gray-600 font-medium mt-2">Pending Response</p>
          <p className="text-sm text-accent-600">Awaiting your response</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-success-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {pastInterviews.filter(i => i.feedback && typeof i.feedback.rating === 'number' && i.feedback.rating >= 4).length}
            </span>
          </div>
          <p className="text-gray-600 font-medium mt-2">Positive Feedback</p>
          <p className="text-sm text-success-600">High-rated interviews</p>
        </div>
      </div>

      {/* Upcoming Interviews */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Interviews</h2>
        {upcomingInterviews.length > 0 ? (
          <div className="space-y-4">
            {upcomingInterviews.map((interview) => (
              <div key={interview._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{interview.jobId.title}</h3>
                    <p className="text-primary-600 font-medium">{interview.jobId.company}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(interview.status)}`}>
                    {interview.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(interview.scheduledDateTime)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(interview.scheduledDateTime)} ({interview.duration} min)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{interview.jobId.location}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium">Type:</span> {interview.type} Interview
                    </p>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{interview.recruiterId.name}</span>
                    </div>
                    {interview.meetingLink && (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:underline"
                      >
                        <Video className="h-4 w-4 mr-1" />
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>

                {interview.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Note:</span> {interview.notes}
                    </p>
                  </div>
                )}

                {interview.status === 'pending' && (
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => respondToInterview(interview._id, 'accept')}
                      disabled={loading}
                      className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors text-sm disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => respondToInterview(interview._id, 'decline')}
                      disabled={loading}
                      className="px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors text-sm disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <div className="text-sm text-gray-500 flex items-center">
                      Expires: {formatDate(interview.slotExpiresAt)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No upcoming interviews scheduled</p>
        )}
      </div>

      {/* Past Interviews */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview History</h2>
        {pastInterviews.length > 0 ? (
          <div className="space-y-4">
            {pastInterviews.map((interview) => (
              <div key={interview._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{interview.jobId.title}</h3>
                    <p className="text-gray-600">{interview.jobId.company}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span>{formatDate(interview.scheduledDateTime)}</span>
                      <span>•</span>
                      <span>with {interview.recruiterId.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {interview.feedback?.rating && (
                      <>
                        <div className="flex items-center space-x-1 mb-1">
                          {getRatingStars(interview.feedback.rating)}
                        </div>
                        <span className="text-sm text-gray-500">{interview.feedback.rating}/5.0</span>
                      </>
                    )}
                  </div>
                </div>
                
                {interview.feedback?.comments && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Feedback:</span> {interview.feedback.comments}
                    </p>
                    {interview.feedback.strengths.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium text-green-700">Strengths:</span>
                        <ul className="text-sm text-green-600 ml-4">
                          {interview.feedback.strengths.map((strength, index) => (
                            <li key={index}>• {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No interview history available</p>
        )}
      </div>
    </div>
  );
}