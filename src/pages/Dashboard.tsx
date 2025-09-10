import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload, Target, Calendar, MessageSquare, TrendingUp, Users, Clock, CheckCircle,
  BarChart3, FileText, Star, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/storageService';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<any>({});


  React.useEffect(() => {
    const loadStats = async () => {
      try {
        if (user?.role === 'candidate') {
          // Load candidate statistics
          const resumeResponse = await ResumeAnalysisService.getUserResumes();
          const interviewResponse = await InterviewService.getUserInterviews();
          
          setStats({
            totalResumes: resumeResponse.success ? resumeResponse.data.length : 0,
            totalMatches: resumeResponse.success ? resumeResponse.data.length * 3 : 0,
            pendingInterviews: interviewResponse.success ? interviewResponse.data.filter(i => i.status === 'pending').length : 0,
            confirmedInterviews: interviewResponse.success ? interviewResponse.data.filter(i => i.status === 'confirmed').length : 0,
            completedInterviews: interviewResponse.success ? interviewResponse.data.filter(i => i.status === 'completed').length : 0,
            averageMatchScore: 85
          });
        } else if (user?.role === 'hr') {
          // Load HR statistics
          const jobsResponse = await JobService.getJobs();
          const interviewResponse = await InterviewService.getUserInterviews();
          
          const totalApplicants = jobsResponse.success 
            ? jobsResponse.data.jobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0)
            : 0;
          
          setStats({
            totalJobs: jobsResponse.success ? jobsResponse.data.jobs.length : 0,
            totalApplicants,
            pendingInterviews: interviewResponse.success ? interviewResponse.data.filter(i => i.status === 'pending').length : 0,
            completedInterviews: interviewResponse.success ? interviewResponse.data.filter(i => i.status === 'completed').length : 0,
            shortlistedCandidates: Math.floor(totalApplicants * 0.6)
          });
        }
      } catch (error) {
        console.error('Failed to load statistics:', error);
        // Fallback to default stats
        setStats({
          totalResumes: 0,
          totalMatches: 0,
          pendingInterviews: 0,
          confirmedInterviews: 0,
          completedInterviews: 0,
          averageMatchScore: 0
        });
      }
    };

    if (user) {
      loadStats();
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const candidateStats = [
    {
      label: 'Resumes Uploaded',
      value: stats.totalResumes?.toString() || '0',
      icon: Upload,
      color: 'bg-primary-500',
      change: stats.totalResumes > 0 ? `${stats.totalResumes} total uploaded` : 'Upload your first resume'
    },
    {
      label: 'Job Matches',
      value: stats.totalMatches?.toString() || '0',
      icon: Target,
      color: 'bg-secondary-500',
      change: stats.averageMatchScore > 0 ? `${stats.averageMatchScore}% avg match` : 'No matches yet'
    },
    {
      label: 'Interviews Scheduled',
      value: stats.pendingInterviews?.toString() || '0',
      icon: Calendar,
      color: 'bg-accent-500',
      change: stats.confirmedInterviews > 0 ? `${stats.confirmedInterviews} confirmed` : 'No interviews scheduled'
    },
    {
      label: 'Applications',
      value: (stats.totalMatches * 2)?.toString() || '0',
      icon: CheckCircle,
      color: 'bg-success-500',
      change: stats.totalMatches > 0 ? `${Math.floor(stats.totalMatches * 0.6)} in progress` : 'No applications yet'
    }
  ];

  const hrStats = [
    {
      label: 'Candidates Reviewed',
      value: stats.totalResumes?.toString() || '0',
      icon: Users,
      color: 'bg-primary-500',
      change: stats.totalResumes > 0 ? `${stats.totalResumes} total reviewed` : 'No candidates yet'
    },
    {
      label: 'Shortlisted',
      value: Math.floor(stats.totalResumes * 0.6)?.toString() || '0',
      icon: Target,
      color: 'bg-secondary-500',
      change: stats.totalResumes > 0
        ? `${Math.round((Math.floor(stats.totalResumes * 0.6) / stats.totalResumes) * 100)}% rate`
        : '0% rate'
    },
    {
      label: 'Interviews Today',
      value: stats.pendingInterviews?.toString() || '0',
      icon: Calendar,
      color: 'bg-accent-500',
      change: stats.completedInterviews > 0 ? `${stats.completedInterviews} completed` : 'No interviews today'
    },
    {
      label: 'Avg. Response Time',
      value: '2.3h',
      icon: Clock,
      color: 'bg-success-500',
      change: '-15% this week'
    }
  ];

  const displayStats = user?.role === 'hr' ? hrStats : candidateStats;

  const quickActions = user?.role === 'hr'
    ? [
        { label: 'Review Candidates', path: '/matches', icon: Users, color: 'bg-primary-500' },
        { label: 'Schedule Interviews', path: '/hr-dashboard', icon: Calendar, color: 'bg-secondary-500' },
        { label: 'Analyze Feedback', path: '/feedback', icon: MessageSquare, color: 'bg-accent-500' }
      ]
    : [
        { label: 'Upload Resume', path: '/upload', icon: Upload, color: 'bg-primary-500' },
        { label: 'View Matches', path: '/matches', icon: Target, color: 'bg-secondary-500' },
        { label: 'My Interviews', path: '/candidate-dashboard', icon: Calendar, color: 'bg-accent-500' }
      ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">{getGreeting()}, {user?.name || 'Guest'}!</h1>
        <p className="opacity-90">
          {user?.role === 'hr'
            ? 'Here\'s your recruitment dashboard overview.'
            : user?.role === 'candidate'
            ? 'Ready to discover your next career opportunity?'
            : 'Welcome to CareerAI - your intelligent career assistant.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-gray-600 font-medium mb-1">{stat.label}</p>
              <p className="text-sm text-green-600">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.path}
                className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mr-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-gray-900 group-hover:text-primary-700">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {user?.role === 'hr' ? (
            <>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">New candidate applications</p>
                  <p className="text-sm text-gray-600">{stats.totalResumes || 0} resumes analyzed this week</p>
                </div>
                <span className="text-sm text-gray-500 ml-auto">2h ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-secondary-600" />
                <div>
                  <p className="font-medium text-gray-900">Interview completed</p>
                  <p className="text-sm text-gray-600">{stats.completedInterviews || 0} interviews completed</p>
                </div>
                <span className="text-sm text-gray-500 ml-auto">4h ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-accent-600" />
                <div>
                  <p className="font-medium text-gray-900">Feedback analyzed</p>
                  <p className="text-sm text-gray-600">{stats.totalFeedbacks || 0} feedback analyses completed</p>
                </div>
                <span className="text-sm text-gray-500 ml-auto">1d ago</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Target className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">New job matches found</p>
                  <p className="text-sm text-gray-600">{stats.totalMatches || 0} positions match your profile</p>
                </div>
                <span className="text-sm text-gray-500 ml-auto">1h ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-secondary-600" />
                <div>
                  <p className="font-medium text-gray-900">Interview scheduled</p>
                  <p className="text-sm text-gray-600">{stats.pendingInterviews || 0} interviews pending</p>
                </div>
                <span className="text-sm text-gray-500 ml-auto">3h ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Upload className="h-5 w-5 text-accent-600" />
                <div>
                  <p className="font-medium text-gray-900">Resume processed</p>
                  <p className="text-sm text-gray-600">Latest resume analysis completed</p>
                </div>
                <span className="text-sm text-gray-500 ml-auto">1d ago</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
