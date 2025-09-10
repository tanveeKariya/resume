import React, { useState } from 'react';
import { Target, Calendar, TrendingUp, RefreshCw, Download, CheckCircle, MapPin, DollarSign } from 'lucide-react';
import { JobService, ResumeAnalysisService, JobMatchingService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface JobMatch {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: {
    skills: string[];
    experience: {
      min: number;
      max: number;
      level: string;
    };
    education: {
      degree: string;
      stream: string[];
      cgpa?: number;
    };
  };
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  type: string;
  matchScore?: number;
  skillsMatch?: number;
  experienceMatch?: number;
  educationMatch?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
}

export default function JobMatches() {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await JobService.getJobs();
      if (response.success) {
        setJobMatches(response.data.jobs);
        setAnalyzed(true);
      }
    } catch (error: any) {
      console.error('Failed to load jobs:', error);
      setError('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToJob = async (job: JobMatch) => {
    try {
      setLoading(true);
      const resumeAnalyses = await ResumeAnalysisService.getUserResumes();
      
      if (!resumeAnalyses.success || resumeAnalyses.data.length === 0) {
        alert('Please upload and analyze a resume first');
        return;
      }

      const latestResume = resumeAnalyses.data[resumeAnalyses.data.length - 1];
      const response = await JobMatchingService.applyToJob(job._id, latestResume._id);
      
      if (response.success) {
        alert(`Successfully applied to ${job.title} at ${job.company}!\n\nMatch Score: ${response.data.matchScore}%\n\nYou will be notified once the recruiter reviews your application.`);
        
        // Update the job in the list to show it's been applied to
        setJobMatches(prevJobs => 
          prevJobs.map(j => 
            j._id === job._id 
              ? { ...j, hasApplied: true }
              : j
          )
        );
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to apply to job');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = (job: JobMatch) => {
    alert(`Interview scheduling for ${job.title} at ${job.company} - Feature will open scheduling modal`);
  };

  const handleDownloadMatches = () => {
    if (jobMatches.length > 0) {
      const dataStr = JSON.stringify(jobMatches, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `job-matches-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getMatchColor = (score: number = 75) => {
    if (score >= 90) return 'text-success-600 bg-success-50';
    if (score >= 80) return 'text-primary-600 bg-primary-50';
    if (score >= 70) return 'text-accent-600 bg-accent-50';
    return 'text-warning-600 bg-warning-50';
  };

  const formatSalary = (salary: any) => {
    if (salary?.min && salary?.max) {
      return `${salary.currency || '$'}${salary.min.toLocaleString()} - ${salary.currency || '$'}${salary.max.toLocaleString()}`;
    }
    return 'Salary not specified';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Opportunities</h1>
        <p className="text-gray-600">Discover job opportunities that match your profile</p>
      </div>

      {/* Match Summary */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Available Positions</h2>
            <p className="opacity-90">
              {analyzed 
                ? `We found ${jobMatches.length} positions available for application`
                : 'Loading available job positions...'
              }
            </p>
            {error && (
              <div className="mt-3 p-3 bg-red-500 bg-opacity-20 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            {analyzed && jobMatches.length > 0 && (
              <>
                <div className="text-3xl font-bold">{jobMatches.length}</div>
                <div className="text-sm opacity-90">Open Positions</div>
                <button
                  onClick={handleDownloadMatches}
                  className="mt-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </>
            )}
            {!analyzed && (
              <button
                onClick={loadJobs}
                disabled={loading}
                className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <span>Load Jobs</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Job Cards */}
      {analyzed && jobMatches.length > 0 ? (
        <div className="grid gap-6">
          {jobMatches.map((job) => (
            <div 
              key={job._id}
              className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer ${
                selectedJob === job._id ? 'border-primary-300 shadow-md' : 'border-gray-200 hover:shadow-md'
              }`}
              onClick={() => setSelectedJob(selectedJob === job._id ? null : job._id)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getMatchColor(job.matchScore || 75)}`}>
                        {job.matchScore || 75}% Match
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-600 mb-2">
                      <span className="font-medium">{job.company}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <span>•</span>
                      <span className="capitalize">{job.type}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 font-semibold">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatSalary(job.salary)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <TrendingUp className={`h-8 w-8 mb-2 ${(job.matchScore || 75) >= 90 ? 'text-success-500' : 'text-primary-500'}`} />
                  </div>
                </div>

                {/* Job Description */}
                <div className="mb-4">
                  <p className="text-gray-700 text-sm line-clamp-3">{job.description}</p>
                </div>

                {/* Required Skills */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.requirements.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience Requirements */}
                <div className="mb-4 text-sm text-gray-600">
                  <span className="font-medium">Experience:</span> {job.requirements.experience.min}-{job.requirements.experience.max} years ({job.requirements.experience.level} level)
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyToJob(job);
                    }}
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 ${
                      job.hasApplied 
                        ? 'bg-green-600 text-white cursor-not-allowed' 
                        : 'bg-secondary-600 text-white hover:bg-secondary-700'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{job.hasApplied ? 'Applied' : 'Apply Now'}</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScheduleInterview(job);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : analyzed && jobMatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No job opportunities found. Please check back later.</p>
        </div>
      ) : null}
    </div>
  );
}