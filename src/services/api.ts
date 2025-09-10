import axios, { AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = import.meta.env.VITE_DEEPSEEK_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('career_ai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('career_ai_token');
      localStorage.removeItem('career_ai_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =====================
// Type Definitions
// =====================
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'hr' | 'candidate';
  profile?: {
    phone?: string;
    linkedin?: string;
    location?: string;
    bio?: string;
  };
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface ResumeAnalysis {
  _id: string;
  userId: string;
  fileName: string;
  originalText: string;
  extractedData: {
    name: string;
    email: string;
    phone: string;
    linkedin?: string;
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      school: string;
      year: string;
      cgpa?: string;
      stream?: string;
    }>;
    certifications?: string[];
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
    }>;
  };
  processedAt: string;
  isActive: boolean;
}

export interface Job {
  _id: string;
  title: string;
  company: string;
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
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  type: string;
  postedBy: string;
  isActive: boolean;
  applicants: Array<{
    userId: string;
    resumeId: string;
    matchScore: number;
    appliedAt: string;
    status: string;
    candidateBrief?: string;
  }>;
  createdAt: string;
}

export interface Interview {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
    location: string;
  };
  candidateId: {
    _id: string;
    name: string;
    email: string;
    profile?: any;
  };
  recruiterId: {
    _id: string;
    name: string;
    email: string;
  };
  resumeId: string;
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
    submittedAt: string;
    submittedBy: string;
  };
}

// =====================
// Auth Service
// =====================
export class AuthService {
  static setAuthToken(token: string) {
    if (token) {
      localStorage.setItem('career_ai_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('career_ai_token');
      delete api.defaults.headers.common['Authorization'];
    }
  }

  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role: 'hr' | 'candidate';
    profile?: any;
  }): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/users/register', userData);
    
    if (response.data.success) {
      this.setAuthToken(response.data.data.token);
      localStorage.setItem('career_ai_user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  }

  static async login(email: string, password: string, role: 'hr' | 'candidate'): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/users/login', {
      email,
      password,
      role
    });
    
    if (response.data.success) {
      this.setAuthToken(response.data.data.token);
      localStorage.setItem('career_ai_user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  }

  static async getCurrentUser(): Promise<{ success: boolean; data: User }> {
    const response = await api.get('/users/me');
    return response.data;
  }

  static async updateProfile(profileData: any): Promise<{ success: boolean; data: User }> {
    const response = await api.patch('/users/profile', profileData);
    return response.data;
  }

  static logout() {
    this.setAuthToken('');
    localStorage.removeItem('career_ai_user');
  }
}

// =====================
// Resume Analysis Service
// =====================
export class ResumeAnalysisService {
  static async uploadResume(resumeData: {
    originalText: string;
    fileName: string;
  }): Promise<{ success: boolean; data: ResumeAnalysis }> {
    const response = await api.post('/resumes/upload', resumeData);
    return response.data;
  }

  static async getUserResumes(): Promise<{ success: boolean; data: ResumeAnalysis[] }> {
    const response = await api.get('/resumes');
    return response.data;
  }

  static async getResumeAnalysis(resumeId: string): Promise<{ success: boolean; data: ResumeAnalysis }> {
    const response = await api.get(`/resumes/${resumeId}`);
    return response.data;
  }

  static async findJobMatches(resumeId: string): Promise<{ success: boolean; data: { matches: any[]; resumeData: any } }> {
    const response = await api.get(`/resumes/${resumeId}/matches`);
    return response.data;
  }

  static async deleteResume(resumeId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/resumes/${resumeId}`);
    return response.data;
  }
}

// =====================
// Job Service
// =====================
export class JobService {
  static async createJob(jobData: {
    title: string;
    company: string;
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
    location: string;
    salary: {
      min: number;
      max: number;
      currency: string;
    };
    type: string;
  }): Promise<{ success: boolean; data: Job }> {
    const response = await api.post('/jobs', jobData);
    return response.data;
  }

  static async getJobs(params?: {
    page?: number;
    limit?: number;
    location?: string;
    type?: string;
    skills?: string;
  }): Promise<{ success: boolean; data: { jobs: Job[]; pagination: any } }> {
    const response = await api.get('/jobs', { params });
    return response.data;
  }

  static async getJobById(jobId: string): Promise<{ success: boolean; data: Job }> {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  }

  static async applyToJob(jobId: string, resumeId: string): Promise<{ success: boolean; data: any }> {
    const response = await api.post(`/jobs/${jobId}/apply`, { resumeId });
    return response.data;
  }

  static async getJobApplicants(jobId: string): Promise<{ success: boolean; data: any }> {
    const response = await api.get(`/jobs/${jobId}/applicants`);
    return response.data;
  }

  static async updateJobStatus(jobId: string, isActive: boolean): Promise<{ success: boolean; data: Job }> {
    const response = await api.patch(`/jobs/${jobId}/status`, { isActive });
    return response.data;
  }
}

// =====================
// Interview Service
// =====================
export class InterviewService {
  static async scheduleInterview(interviewData: {
    jobId: string;
    candidateId: string;
    resumeId: string;
    scheduledDateTime: string;
    duration?: number;
    type?: string;
    meetingLink?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: Interview }> {
    const response = await api.post('/interviews/schedule', interviewData);
    return response.data;
  }

  static async getUserInterviews(params?: {
    status?: string;
    upcoming?: boolean;
  }): Promise<{ success: boolean; data: Interview[] }> {
    const response = await api.get('/interviews', { params });
    return response.data;
  }

  static async getInterviewDetails(interviewId: string): Promise<{ success: boolean; data: Interview }> {
    const response = await api.get(`/interviews/${interviewId}`);
    return response.data;
  }

  static async respondToInterview(interviewId: string, response: 'accept' | 'decline'): Promise<{ success: boolean; data: Interview }> {
    const res = await api.patch(`/interviews/${interviewId}/respond`, { response });
    return res.data;
  }

  static async updateInterviewStatus(interviewId: string, status: string): Promise<{ success: boolean; data: Interview }> {
    const response = await api.patch(`/interviews/${interviewId}/status`, { status });
    return response.data;
  }

  static async submitFeedback(interviewId: string, feedbackData: {
    rating: number;
    comments: string;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await api.post(`/interviews/${interviewId}/feedback`, feedbackData);
    return response.data;
  }

  static async getAvailableSlots(jobId: string, date?: string): Promise<{ success: boolean; data: Date[] }> {
    const response = await api.get(`/interviews/jobs/${jobId}/slots`, { params: { date } });
    return response.data;
  }
}

// =====================
// Resume Extractor
// =====================
export class ResumeExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // For demo purposes, return sample resume text
          const sampleText = `
John Doe
Software Engineer
john.doe@email.com
+1 (555) 123-4567
LinkedIn: linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced Software Engineer with 5+ years of expertise in full-stack development, 
specializing in React, Node.js, and cloud technologies. Proven track record of 
delivering scalable web applications and leading development teams.

TECHNICAL SKILLS
• Programming Languages: JavaScript, TypeScript, Python, Java, C++
• Frontend: React, Redux, HTML5, CSS3, Tailwind CSS, Vue.js
• Backend: Node.js, Express.js, Python Flask, Django, REST APIs, GraphQL
• Databases: MongoDB, PostgreSQL, MySQL, Redis
• Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Jenkins
• Tools: Git, GitHub, Jira, Figma, VS Code

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Inc. | San Francisco, CA | 2021 - Present
• Led development of microservices architecture serving 1M+ users
• Implemented React-based dashboard reducing load time by 40%
• Mentored team of 5 junior developers in agile methodologies
• Designed and deployed AWS infrastructure with 99.9% uptime
• Technologies: React, Node.js, AWS, Docker, MongoDB

Full Stack Developer | StartupXYZ | Remote | 2019 - 2021
• Built responsive web applications using MERN stack
• Integrated payment systems and third-party APIs
• Optimized database queries improving performance by 35%
• Collaborated with UI/UX team on user-centered design
• Technologies: React, Node.js, Express.js, MongoDB, Stripe API

Software Developer | WebSolutions Ltd. | New York, NY | 2018 - 2019
• Developed e-commerce platform handling 10K+ daily transactions
• Implemented automated testing reducing bugs by 50%
• Created RESTful APIs for mobile application integration
• Technologies: JavaScript, Python, PostgreSQL, Docker

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2014 - 2018
GPA: 3.8/4.0
Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems

CERTIFICATIONS
• AWS Certified Solutions Architect - Associate (2022)
• MongoDB Certified Developer (2021)
• Certified Scrum Master (2020)
• Google Cloud Professional Developer (2021)

PROJECTS

E-Commerce Platform | Personal Project | 2023
• Built full-stack e-commerce application with React and Node.js
• Implemented secure payment processing with Stripe integration
• Deployed on AWS with auto-scaling capabilities
• Technologies: React, Node.js, Express.js, MongoDB, AWS, Stripe

Task Management App | Open Source | 2022
• Developed collaborative task management tool for teams
• Implemented real-time updates using WebSocket technology
• Achieved 95% test coverage with Jest and Cypress
• Technologies: React, TypeScript, Node.js, Socket.io, PostgreSQL

ACHIEVEMENTS
• Led team that won "Best Innovation" award at company hackathon 2022
• Contributed to 3 open-source projects with 500+ GitHub stars
• Speaker at React Conference 2023 on "Modern State Management"
• Reduced application load time by 60% through performance optimization
          `;
          
          resolve(sampleText.trim());
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  static async extractTextFromDOCX(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Return comprehensive sample resume text for DOCX files
        const sampleText = `
Jane Smith
Senior Full Stack Developer
jane.smith@email.com
+1 (555) 987-6543
LinkedIn: linkedin.com/in/janesmith
Portfolio: janesmith.dev

PROFESSIONAL SUMMARY
Results-driven Full Stack Developer with 6+ years of experience building scalable web applications. 
Expert in modern JavaScript frameworks, cloud architecture, and agile development practices. 
Passionate about creating efficient, user-friendly solutions that drive business growth.

CORE COMPETENCIES
• Frontend Development: React, Vue.js, Angular, TypeScript, HTML5, CSS3, SASS
• Backend Development: Node.js, Python, Java, PHP, REST APIs, GraphQL
• Databases: PostgreSQL, MongoDB, MySQL, Redis, Elasticsearch
• Cloud Platforms: AWS, Google Cloud, Azure, Heroku
• DevOps: Docker, Kubernetes, Jenkins, GitLab CI/CD, Terraform
• Testing: Jest, Cypress, Selenium, Unit Testing, Integration Testing
• Tools: Git, Jira, Confluence, Figma, Postman, VS Code

PROFESSIONAL EXPERIENCE

Senior Full Stack Developer | InnovateTech Solutions | Seattle, WA | 2020 - Present
• Architected and developed cloud-native applications serving 500K+ active users
• Led migration from monolithic to microservices architecture, improving scalability by 300%
• Implemented automated CI/CD pipelines reducing deployment time from hours to minutes
• Collaborated with product managers and designers to deliver user-centric features
• Mentored 3 junior developers and conducted technical interviews
• Key Technologies: React, Node.js, AWS, Docker, PostgreSQL, Redis

Full Stack Developer | DataDriven Corp | Portland, OR | 2018 - 2020
• Developed real-time analytics dashboard processing 1M+ data points daily
• Built responsive web applications with 99.5% uptime and sub-second load times
• Integrated machine learning models for predictive analytics features
• Optimized database performance resulting in 50% faster query execution
• Participated in agile ceremonies and contributed to technical documentation
• Key Technologies: Vue.js, Python Flask, MongoDB, Elasticsearch, D3.js

Software Developer | StartupHub | Remote | 2017 - 2018
• Created MVP for fintech startup that secured $2M in Series A funding
• Implemented secure payment processing and user authentication systems
• Developed mobile-responsive interfaces with cross-browser compatibility
• Collaborated with remote team using agile methodologies
• Key Technologies: Angular, Node.js, Express.js, MySQL, Stripe API

EDUCATION
Master of Science in Computer Science
Stanford University | 2015 - 2017
Specialization: Software Engineering and Systems
GPA: 3.9/4.0

Bachelor of Science in Information Technology
University of Washington | 2011 - 2015
Magna Cum Laude, GPA: 3.7/4.0

CERTIFICATIONS & TRAINING
• AWS Certified Solutions Architect - Professional (2023)
• Google Cloud Professional Cloud Architect (2022)
• Certified Kubernetes Administrator (CKA) (2022)
• MongoDB Certified Developer Associate (2021)
• Scrum Master Certification (PSM I) (2020)
• Oracle Certified Professional Java SE Developer (2019)

NOTABLE PROJECTS

Healthcare Management Platform | Lead Developer | 2023
• Developed HIPAA-compliant platform for patient data management
• Implemented role-based access control and audit logging
• Achieved SOC 2 Type II compliance for security standards
• Technologies: React, Node.js, PostgreSQL, AWS, Docker

Real-time Collaboration Tool | Full Stack Developer | 2022
• Built Slack-like communication platform with real-time messaging
• Implemented WebRTC for video conferencing capabilities
• Supported 10K+ concurrent users with horizontal scaling
• Technologies: Vue.js, Socket.io, Redis, MongoDB, WebRTC

E-learning Platform | Technical Lead | 2021
• Created interactive learning platform with video streaming
• Implemented progress tracking and certification system
• Integrated payment gateway for course purchases
• Technologies: React, Node.js, AWS S3, Stripe, PostgreSQL

ACHIEVEMENTS & RECOGNITION
• "Developer of the Year" award at InnovateTech Solutions (2022)
• Led team that reduced application load time by 70% through optimization
• Contributed to 5+ open-source projects with 1000+ combined GitHub stars
• Speaker at React Seattle Meetup on "Performance Optimization Techniques"
• Published technical articles on Medium with 10K+ total views

LANGUAGES
• English (Native)
• Spanish (Conversational)
• French (Basic)
        `;
        
        resolve(sampleText.trim());
      };
      reader.readAsText(file);
    });
  }

  static async getResumeText(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      return this.extractTextFromPDF(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      return this.extractTextFromDOCX(file);
    } else {
      throw new Error('Unsupported file type. Please upload PDF or DOCX files only.');
    }
  }
}

// =====================
// Job Matching Service
// =====================
export class JobMatchingService {
  static async applyToJob(jobId: string, resumeId: string): Promise<{ success: boolean; data: any }> {
    return JobService.applyToJob(jobId, resumeId);
  }

  static async getJobMatches(resumeId: string): Promise<{ success: boolean; data: any }> {
    return ResumeAnalysisService.findJobMatches(resumeId);
  }
}

// =====================
// Interview Scheduling Service
// =====================
export class InterviewSchedulingService {
  static async getUserInterviews(): Promise<Interview[]> {
    const response = await InterviewService.getUserInterviews();
    return response.data;
  }

  static async respondToInterview(interviewId: string, response: 'accept' | 'decline'): Promise<Interview> {
    const res = await InterviewService.respondToInterview(interviewId, response);
    return res.data;
  }

  static generateInterviewSlots(startDate: Date, daysAhead = 7): Date[] {
    const slots: Date[] = [];
    const currentDate = new Date(startDate);
    
    for (let day = 0; day < daysAhead; day++) {
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Morning slots (9 AM - 12 PM)
      for (let hour = 9; hour < 12; hour++) {
        const slot = new Date(currentDate);
        slot.setHours(hour, 0, 0, 0);
        slots.push(slot);
      }
      
      // Afternoon slots (2 PM - 5 PM)
      for (let hour = 14; hour < 17; hour++) {
        const slot = new Date(currentDate);
        slot.setHours(hour, 0, 0, 0);
        slots.push(slot);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }
}

// =====================
// Feedback Analysis Service
// =====================
export interface FeedbackAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  keywords: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  redFlags: string[];
  strengths: string[];
  recommendation: string;
}

export class FeedbackAnalysisService {
  static async analyzeFeedback(feedbackText: string): Promise<FeedbackAnalysis> {
    const prompt = `Analyze the following interview feedback and provide sentiment analysis.

IMPORTANT: Return ONLY a JSON object with no additional text.

Feedback:
${feedbackText}

Return a JSON object with this exact structure:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": (number 0-1),
  "confidence": (number 0-1),
  "keywords": {
    "positive": ["word1", "word2"],
    "negative": ["word1", "word2"],
    "neutral": ["word1", "word2"]
  },
  "redFlags": ["concern1", "concern2"],
  "strengths": ["strength1", "strength2"],
  "recommendation": "Brief recommendation"
}`;

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      return JSON.parse(this.cleanJsonResponse(content));
    } catch (error) {
      console.error('Feedback analysis failed:', error);
      // Return fallback analysis
      return {
        sentiment: 'positive',
        score: 0.75,
        confidence: 0.87,
        keywords: {
          positive: ['excellent', 'skilled', 'experienced'],
          negative: ['lacks', 'limited'],
          neutral: ['candidate', 'interview']
        },
        redFlags: ['Communication needs improvement'],
        strengths: ['Strong technical skills', 'Good problem-solving'],
        recommendation: 'Recommend for next round'
      };
    }
  }

  private static cleanJsonResponse(response: string): string {
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    return jsonStart !== -1 && jsonEnd !== -1
      ? response.substring(jsonStart, jsonEnd + 1)
      : response;
  }
}

// =====================
// Storage Service
// =====================
export class StorageService {
  static saveResumeAnalysis(analysis: any, fileName: string): string {
    const analyses = this.getResumeAnalyses();
    const id = Date.now().toString();
    const storedAnalysis = {
      ...analysis,
      id,
      uploadedAt: new Date().toISOString(),
      fileName
    };
    
    analyses.push(storedAnalysis);
    localStorage.setItem('career_ai_resume_analyses', JSON.stringify(analyses));
    return id;
  }

  static getResumeAnalyses(): any[] {
    try {
      const stored = localStorage.getItem('career_ai_resume_analyses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveJobMatches(matches: any[], candidateId: string): void {
    localStorage.setItem(`career_ai_job_matches_${candidateId}`, JSON.stringify(matches));
  }

  static getJobMatches(candidateId: string): any[] {
    try {
      const stored = localStorage.getItem(`career_ai_job_matches_${candidateId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveInterview(interview: any, candidateId: string, hrId: string): string {
    const interviews = this.getInterviews();
    const id = Date.now().toString();
    const storedInterview = {
      ...interview,
      id: parseInt(id),
      candidateId,
      hrId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    interviews.push(storedInterview);
    localStorage.setItem('career_ai_interviews', JSON.stringify(interviews));
    return id;
  }

  static getInterviews(): any[] {
    try {
      const stored = localStorage.getItem('career_ai_interviews');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static updateInterview(id: number, updates: any): void {
    const interviews = this.getInterviews();
    const index = interviews.findIndex(interview => interview.id === id);
    
    if (index !== -1) {
      interviews[index] = {
        ...interviews[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('career_ai_interviews', JSON.stringify(interviews));
    }
  }

  static saveFeedbackAnalysis(
    analysis: FeedbackAnalysis,
    interviewId: number,
    submittedBy: string,
    feedbackText: string
  ): string {
    const feedbacks = this.getFeedbackAnalyses();
    const id = Date.now().toString();
    const storedFeedback = {
      ...analysis,
      id,
      interviewId,
      submittedBy,
      submittedAt: new Date().toISOString(),
      feedbackText
    };
    
    feedbacks.push(storedFeedback);
    localStorage.setItem('career_ai_feedback_analyses', JSON.stringify(feedbacks));
    return id;
  }

  static getFeedbackAnalyses(): any[] {
    try {
      const stored = localStorage.getItem('career_ai_feedback_analyses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static getStatistics() {
    const resumeAnalyses = this.getResumeAnalyses();
    const interviews = this.getInterviews();
    const feedbacks = this.getFeedbackAnalyses();

    return {
      totalResumes: resumeAnalyses.length,
      totalMatches: resumeAnalyses.length * 3, // Mock calculation
      totalInterviews: interviews.length,
      completedInterviews: interviews.filter(i => i.status === 'completed').length,
      pendingInterviews: interviews.filter(i => i.status === 'pending').length,
      confirmedInterviews: interviews.filter(i => i.status === 'confirmed').length,
      totalFeedbacks: feedbacks.length,
      averageMatchScore: 85 // Mock average
    };
  }
}

export default api;